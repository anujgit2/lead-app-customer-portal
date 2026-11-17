import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getTypes, listDocuments } from "@/features/documents/api/documentsApi";
import {
  fetchSharedBundleMeta,
  lookupSharedDocument,
  sharedClient,
} from "@/features/documents/api/sharedApi";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { apiClient } from "@/lib/axios";
import { fileStorageService } from "@/services/file-storage.service";
import { programService } from "@/services/program.service";

type Captured = { url: string; authorization?: string; tenant?: string };

const ENV_KEYS = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_TENANT_BASE_DOMAIN"] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
const originalWindow = (globalThis as { window?: unknown }).window;
const hadLocalStorage = Object.prototype.hasOwnProperty.call(globalThis, "localStorage");
const hadSessionStorage = Object.prototype.hasOwnProperty.call(globalThis, "sessionStorage");
const originalAdapter = apiClient.defaults.adapter;

let captured: Captured[] = [];

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  } as Storage;
}

const recordingAdapter: AxiosAdapter = async (config) => {
  const cfg = config as InternalAxiosRequestConfig;
  const headers = cfg.headers as unknown as Record<string, string | undefined>;
  captured.push({
    url: apiClient.getUri(cfg),
    authorization: headers.Authorization,
    tenant: headers["X-Tenant-ID"],
  });
  return { data: [], status: 200, statusText: "OK", headers: {}, config: cfg, request: {} } as AxiosResponse;
};

function setEnv(apiUrl: string | undefined) {
  if (apiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = apiUrl;
  delete process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
}

function pathOf(url: string): string {
  return url.split("?")[0];
}

beforeEach(() => {
  captured = [];
  apiClient.defaults.adapter = recordingAdapter;
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  if (hadWindow) (globalThis as { window?: unknown }).window = originalWindow;
  else delete (globalThis as { window?: unknown }).window;
  if (!hadLocalStorage) delete (globalThis as { localStorage?: Storage }).localStorage;
  if (!hadSessionStorage) delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
});

describe("URL composition with the production base (NEXT_PUBLIC_API_URL=/api)", () => {
  beforeEach(() => setEnv("/api"));

  it("requests document types once, at /api/document-types (AC-1)", async () => {
    await getTypes();
    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, "/api/document-types");
    assert.ok(!captured[0].url.includes("/api/api/"));
  });

  it("requests the document list at /api/documents (AC-2)", async () => {
    await listDocuments({});
    assert.equal(captured.length, 1);
    assert.equal(pathOf(captured[0].url), "/api/documents");
    assert.ok(!captured[0].url.includes("/api/api/"));
  });

  it("requests tenant programs at /api/tenant/programs (AC-3)", async () => {
    await programService.getTenantPrograms();
    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, "/api/tenant/programs");
    assert.ok(!captured[0].url.includes("/api/api/"));
  });

  it("sends Authorization and X-Tenant-ID as before on the single-prefix calls (AC-11)", async () => {
    const storage = memoryStorage({ accessToken: "token-123" });
    const session = memoryStorage({ accessToken: "token-123", "tenant-id": "tenant-a" });
    (globalThis as { window?: unknown }).window = { location: { hostname: "", origin: "" } };
    (globalThis as { localStorage?: Storage }).localStorage = storage;
    (globalThis as { sessionStorage?: Storage }).sessionStorage = session;

    await getTypes();
    await programService.getTenantPrograms();

    assert.equal(captured.length, 2);
    for (const call of captured) {
      assert.equal(call.authorization, "Bearer token-123");
      assert.equal(call.tenant, "tenant-a");
    }
  });
});

describe("URL composition with non-production bases (AC-10)", () => {
  it("keeps the UAT host path for document types", async () => {
    setEnv("https://leads-services.bizloandev.in/accounts");
    await getTypes();
    assert.equal(captured[0].url, "https://leads-services.bizloandev.in/api/document-types");
  });

  it("keeps the dev host path for document types and programs", async () => {
    setEnv("https://leads-services.bizloandev.in");
    await getTypes();
    await programService.getTenantPrograms();
    assert.equal(captured[0].url, "https://leads-services.bizloandev.in/api/document-types");
    assert.equal(captured[1].url, "https://leads-services.bizloandev.in/api/tenant/programs");
  });

  it("keeps the document list path on a local origin", async () => {
    setEnv("http://localhost:8080");
    await listDocuments({});
    assert.equal(pathOf(captured[0].url), "http://localhost:8080/api/documents");
  });
});

describe("runtime URL composition for the public shared client and file storage", () => {
  beforeEach(() => setEnv("/api"));

  describe("sharedClient (features/documents/api/sharedApi.ts)", () => {
    const originalSharedAdapter = sharedClient.defaults.adapter;

    beforeEach(() => {
      sharedClient.defaults.adapter = recordingAdapter;
    });

    afterEach(() => {
      sharedClient.defaults.adapter = originalSharedAdapter;
    });

    it("requests the shared lookup at /api/shared/<token> once (AC-4)", async () => {
      await lookupSharedDocument("tok-1");
      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/api/shared/tok-1");
      assert.ok(!captured[0].url.includes("/api/api/"));
    });

    it("requests the bundle meta at /api/shared/<token>/meta once (AC-4)", async () => {
      await fetchSharedBundleMeta("tok-2");
      assert.equal(captured.length, 1);
      assert.equal(captured[0].url, "/api/shared/tok-2/meta");
      assert.ok(!captured[0].url.includes("/api/api/"));
    });

    it("sends no owner Authorization or tenant header on the public shared client", async () => {
      (globalThis as { window?: unknown }).window = { location: { hostname: "", origin: "" } };
      (globalThis as { localStorage?: Storage }).localStorage = memoryStorage({ accessToken: "token-123" });
      (globalThis as { sessionStorage?: Storage }).sessionStorage = memoryStorage({ "tenant-id": "tenant-a" });

      await fetchSharedBundleMeta("tok-3");
      assert.equal(captured.length, 1);
      assert.equal(captured[0].authorization, undefined);
      assert.equal(captured[0].tenant, undefined);
    });
  });

  describe("apiFetch (services/file-storage.service.ts)", () => {
    const originalFetch = globalThis.fetch;
    let fetched: Array<{ url: string; headers: Record<string, string> }> = [];

    beforeEach(() => {
      fetched = [];
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        fetched.push({
          url: String(input),
          headers: (init?.headers ?? {}) as Record<string, string>,
        });
        return new Response(new Blob(["x"], { type: "application/pdf" }), {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      }) as typeof fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("requests file content at /api/files/<id>/content once (AC-4)", async () => {
      await fileStorageService.fetchContent("file-1", "a.pdf");
      assert.equal(fetched.length, 1);
      assert.equal(fetched[0].url, "/api/files/file-1/content");
      assert.ok(!fetched[0].url.includes("/api/api/"));
    });

    it("sends Authorization and X-Tenant-ID on file requests (AC-11)", async () => {
      (globalThis as { window?: unknown }).window = { location: { hostname: "", origin: "" } };
      (globalThis as { localStorage?: Storage }).localStorage = memoryStorage({ accessToken: "token-123" });
      (globalThis as { sessionStorage?: Storage }).sessionStorage = memoryStorage({ "tenant-id": "tenant-a" });

      await fileStorageService.fetchContent("file-2", "b.pdf");
      assert.equal(fetched.length, 1);
      assert.equal(fetched[0].headers.Authorization, "Bearer token-123");
      assert.equal(fetched[0].headers["X-Tenant-ID"], "tenant-a");
    });
  });
});

describe("source sweep", () => {
  const srcRoot = path.resolve(process.cwd(), "src");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      if (!/\.(ts|tsx)$/.test(entry) || /\.test\.ts$/.test(entry)) return [];
      return [full];
    });
  }

  it("finds no /api/api text in non-test src (AC-4)", () => {
    const offenders = sourceFiles(srcRoot).filter((file) =>
      readFileSync(file, "utf8").includes("/api/api")
    );
    assert.deepEqual(
      offenders.map((file) => path.relative(srcRoot, file)),
      [],
      "a source file contains the literal /api/api"
    );
  });

  it("joins every literal /api/ call path to the production base with one /api segment (AC-4)", () => {
    setEnv("/api");
    const base = resolveApiBaseUrl({ hostname: "", origin: "" });
    const literals = sourceFiles(srcRoot).flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return [...text.matchAll(/(["'`])(\/api\/[^"'`\n]*)/g)].map((match) => ({
        file: path.relative(srcRoot, file),
        path: match[2].split("${")[0],
      }));
    });
    assert.ok(literals.length > 20, `expected many /api/ literals, found ${literals.length}`);
    const doubled = literals
      .filter((literal) => `${base}${literal.path}`.split("/").filter((segment) => segment === "api").length !== 1)
      .map((literal) => `${literal.file}: ${base}${literal.path}`);
    assert.deepEqual(doubled, [], "a literal path gets a second /api segment from the base");
  });
});
