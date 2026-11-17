import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { resolveApiBaseUrl, resolveAuthApiBaseUrl } from "@/lib/api-base-url";

const originalBase = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
const originalApi = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  restore("NEXT_PUBLIC_TENANT_BASE_DOMAIN", originalBase);
  restore("NEXT_PUBLIC_API_URL", originalApi);
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("resolveApiBaseUrl", () => {
  it("maps a portal host to its services host", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://leads-services.local";
    process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN = "einfra.local";

    assert.equal(
      resolveApiBaseUrl({ hostname: "south.einfra.local", origin: "http://south.einfra.local" }),
      "http://south-services.einfra.local"
    );
    assert.equal(
      resolveApiBaseUrl({ hostname: "north.einfra.local", origin: "http://north.einfra.local" }),
      "http://north-services.einfra.local"
    );
  });

  it("keeps the configured API host for other portals", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://leads-services.local";
    process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN = "einfra.local";

    assert.equal(
      resolveApiBaseUrl({
        hostname: "customer.bizloandev.local",
        origin: "http://customer.bizloandev.local",
      }),
      "http://leads-services.local"
    );
  });

  it("keeps loan calls on the host and sends auth calls to /accounts", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://leads-services.local/accounts";
    process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN = "einfra.local";

    assert.equal(
      resolveApiBaseUrl({
        hostname: "customer.bizloandev.local",
        origin: "http://customer.bizloandev.local",
      }),
      "http://leads-services.local"
    );
    assert.equal(
      resolveAuthApiBaseUrl({
        hostname: "customer.bizloandev.local",
        origin: "http://customer.bizloandev.local",
      }),
      "http://leads-services.local/accounts"
    );
    assert.equal(
      resolveAuthApiBaseUrl({ hostname: "south.einfra.local", origin: "http://south.einfra.local" }),
      "http://south-services.einfra.local/accounts"
    );
  });

  it("uses /accounts for auth when the API base is a same-origin proxy path", () => {
    process.env.NEXT_PUBLIC_API_URL = "/api";
    delete process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;

    // "/api" is stripped so call-site paths like "/api/document-types" are not doubled.
    assert.equal(resolveApiBaseUrl({ hostname: "portal.example.com", origin: "https://portal.example.com" }), "");
    assert.equal(
      resolveAuthApiBaseUrl({ hostname: "portal.example.com", origin: "https://portal.example.com" }),
      "/accounts"
    );
  });
});

describe("applicationBase via resolveApiBaseUrl", () => {
  const origin = { hostname: "portal.example.com", origin: "https://portal.example.com" };

  function baseFor(value: string | undefined): string {
    if (value === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = value;
    delete process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
    return resolveApiBaseUrl(origin);
  }

  it("returns an empty origin-relative base for the production /api value", () => {
    assert.equal(baseFor("/api"), "");
    assert.equal(baseFor("/api/"), "");
  });

  it("returns an empty base when the variable is unset or empty", () => {
    assert.equal(baseFor(undefined), "");
    assert.equal(baseFor(""), "");
    assert.equal(baseFor("/"), "");
  });

  it("strips a trailing /api from an absolute base", () => {
    assert.equal(baseFor("https://leads-services.example.com/api"), "https://leads-services.example.com");
    assert.equal(baseFor("https://leads-services.example.com/api/"), "https://leads-services.example.com");
  });

  it("strips /accounts and /api together", () => {
    assert.equal(baseFor("https://leads-services.example.com/api/accounts"), "https://leads-services.example.com");
  });

  it("keeps an origin-only base unchanged (UAT and dev shape)", () => {
    assert.equal(baseFor("https://leads-services.bizloandev.in/accounts"), "https://leads-services.bizloandev.in");
    assert.equal(baseFor("https://leads-services.bizloandev.in"), "https://leads-services.bizloandev.in");
  });

  it("does not strip an /api that is not the final segment", () => {
    assert.equal(baseFor("https://gateway.example.com/api/v2"), "https://gateway.example.com/api/v2");
  });

  it("sends auth calls to /accounts for an origin-relative base", () => {
    process.env.NEXT_PUBLIC_API_URL = "";
    delete process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
    assert.equal(resolveAuthApiBaseUrl(origin), "/accounts");
  });

  it("sends auth calls to the stripped origin plus /accounts for /api", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://leads-services.example.com/api";
    delete process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN;
    assert.equal(resolveAuthApiBaseUrl(origin), "https://leads-services.example.com/accounts");
  });
});
