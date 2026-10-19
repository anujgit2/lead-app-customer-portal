import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { resolveApiBaseUrl } from "@/lib/api-base-url";

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
});
