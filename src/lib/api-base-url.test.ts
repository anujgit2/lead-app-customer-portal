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

    assert.equal(resolveApiBaseUrl({ hostname: "portal.example.com", origin: "https://portal.example.com" }), "/api");
    assert.equal(
      resolveAuthApiBaseUrl({ hostname: "portal.example.com", origin: "https://portal.example.com" }),
      "/accounts"
    );
  });
});
