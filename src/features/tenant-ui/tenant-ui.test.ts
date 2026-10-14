import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTenantUi, groupFieldRows } from "@/features/tenant-ui/parse-ui-config";
import { resolveLandingPageName } from "@/features/tenant-ui/landing-pages";
import { resolveTenantId } from "@/features/tenant-ui/resolve-tenant";
import { hexToHslChannels, themeCssVars } from "@/features/tenant-ui/theme-vars";

describe("parseTenantUi", () => {
  it("keeps portal defaults when the payload is missing", () => {
    const config = parseTenantUi(null);
    assert.equal(config.landingPage, "default");
    assert.equal(config.forms.signin.title, "Sign in");
    assert.equal(config.forms.signin.fields.some((field) => field.key === "password"), true);
  });

  it("applies copy and drops unknown fields", () => {
    const config = parseTenantUi({
      ui: {
        landingPage: "Acme",
        forms: {
          signin: {
            title: "Welcome",
            submitLabel: "Continue",
            fields: [
              { key: "password", type: "password", label: "Secret", width: "full" },
              { key: "favouriteColor", type: "text", label: "Color" },
              { key: "identifier", type: "email", label: "Mail" },
            ],
          },
        },
      },
    });

    assert.equal(config.landingPage, "acme");
    assert.equal(config.forms.signin.title, "Welcome");
    assert.equal(config.forms.signin.submitLabel, "Continue");
    assert.deepEqual(
      config.forms.signin.fields.map((field) => field.key),
      ["password", "identifier"]
    );
    assert.equal(config.forms.signin.fields[1]?.type, "text");
    assert.equal(config.forms.signin.subtitle, "Welcome back. Pick up your application where you left it.");
  });

  it("puts a required credential field back when the payload omits it", () => {
    const config = parseTenantUi({
      ui: {
        forms: {
          signin: {
            fields: [{ key: "rememberMe", type: "checkbox", label: "Stay signed in" }],
          },
        },
      },
    });
    assert.deepEqual(
      config.forms.signin.fields.map((field) => field.key),
      ["rememberMe", "identifier", "password"]
    );
  });

  it("ignores colors and fonts the portal cannot apply", () => {
    const config = parseTenantUi({
      ui: {
        theme: {
          logoUrl: "http://cdn.example.com/logo.svg",
          fontFamily: "Comic Sans",
          borderRadius: "20px",
          colors: { primary: "green", background: "#F7F5F2" },
        },
      },
    });
    assert.equal(config.theme.logoUrl, undefined);
    assert.equal(config.theme.fontFamily, undefined);
    assert.equal(config.theme.borderRadius, undefined);
    assert.equal(config.theme.colors.primary, undefined);
    assert.equal(config.theme.colors.background, "#F7F5F2");
  });

  it("loads a logo file name from the ui folder", () => {
    const config = parseTenantUi({
      ui: { theme: { logoUrl: "logo.svg" } },
    });
    assert.equal(config.theme.logoUrl, "/ui/logo.svg");
    const blocked = parseTenantUi({
      ui: { theme: { logoUrl: "../logo.svg" } },
    });
    assert.equal(blocked.theme.logoUrl, undefined);
  });

  it("applies the tenant UI payload to sign-in copy", () => {
    const config = parseTenantUi({
      ui: {
        forms: {
          signin: {
            title: "Sign in",
            subtitle: "Use the email on your account",
            submitLabel: "Sign in",
            fields: [
              { key: "identifier", type: "text", label: "Email or mobile number", placeholder: "you@company.com", width: "full", required: true },
              { key: "password", type: "password", label: "Password", placeholder: "Enter your password", width: "full", required: true },
            ],
            links: [{ key: "signup", label: "Create an account", prefix: "New to the portal?" }],
          },
        },
      },
    });
    assert.equal(config.forms.signin.subtitle, "Use the email on your account");
    assert.equal(config.forms.signin.fields[0]?.placeholder, "you@company.com");
    assert.equal(config.forms.signin.links[0]?.prefix, "New to the portal?");
    assert.equal(config.forms.signup.submitLabel, "Create account");
  });

  it("keeps a custom font only when a font file is provided", () => {
    const config = parseTenantUi({
      ui: {
        theme: {
          fontFamily: "Brand Sans",
          fontUrl: "https://cdn.example.com/brand.woff2",
          borderRadius: "12px",
        },
      },
    });
    assert.equal(config.theme.fontFamily, "Brand Sans");
    assert.equal(config.theme.fontUrl, "https://cdn.example.com/brand.woff2");
    assert.equal(config.theme.borderRadius, "12px");
  });
});

describe("landing page name", () => {
  it("falls back when the name is not registered", () => {
    assert.equal(resolveLandingPageName("default"), "default");
    assert.equal(resolveLandingPageName("acme"), "default");
  });
});

describe("themeCssVars", () => {
  it("turns a hex primary into HSL channels and related tokens", () => {
    const primary = hexToHslChannels("#0F3D2E");
    assert.equal(primary, "160 61% 15%");
    const vars = themeCssVars({
      borderRadius: "8px",
      colors: { primary: "#0F3D2E", primaryForeground: "#FFFFFF" },
    });
    assert.equal(vars["--primary"], "160 61% 15%");
    assert.equal(vars["--primary-foreground"], "0 0% 100%");
    assert.equal(vars["--radius"], "8px");
    assert.equal(vars["--r-md"], "8px");
  });
});

describe("resolveTenantId", () => {
  it("prefers the subdomain, then the path, then the query", () => {
    assert.equal(
      resolveTenantId({
        hostname: "acme.portal.example.com",
        pathname: "/t/other/",
        search: "?tenant=query",
      }),
      "acme"
    );
    assert.equal(
      resolveTenantId({
        hostname: "portal.example.com",
        pathname: "/t/other/",
        search: "?tenant=query",
      }),
      "other"
    );
    assert.equal(
      resolveTenantId({
        hostname: "localhost",
        pathname: "/",
        search: "?tenant=query",
      }),
      "query"
    );
    assert.equal(
      resolveTenantId({
        hostname: "acme.portal.example.com",
        pathname: "/",
        search: "",
        baseDomain: "portal.example.com",
      }),
      "acme"
    );
    assert.equal(
      resolveTenantId({ hostname: "localhost", pathname: "/", search: "?tenant=../bad" }),
      null
    );
  });
});

describe("groupFieldRows", () => {
  it("pairs adjacent half-width fields", () => {
    const rows = groupFieldRows([
      { key: "name", width: "full" as const },
      { key: "email", width: "half" as const },
      { key: "phone", width: "half" as const },
      { key: "password", width: "full" as const },
    ]);
    assert.deepEqual(
      rows.map((row) => row.map((field) => field.key)),
      [["name"], ["email", "phone"], ["password"]]
    );
  });
});
