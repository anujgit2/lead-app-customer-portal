import { resetBrowserStorage } from "@/test/browser-env";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiClient } from "@/lib/axios";
import { isDemoEnabled } from "@/lib/demo";
import { clearFullSession, getAuthError, handleSessionExpired, hasAccessToken } from "@/lib/session";
import { getTenantId, setTenantId } from "@/lib/tenant";
import { authService } from "@/services/auth.service";
import { MOCK_USER } from "@/services/mock-data";
import { useAuthStore } from "@/store/auth.store";
import { useWizardStore } from "@/store/wizard.store";

const DEMO = { email: "demo@example.com", password: "Password@123", rememberMe: true };
const originalPost = apiClient.post;
const originalGet = apiClient.get;
const originalDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO;

function rejectWith(status: number) {
  return async () => {
    throw { message: `HTTP ${status}`, status };
  };
}

function signIn() {
  localStorage.setItem("accessToken", "token-1");
  localStorage.setItem("refreshToken", "refresh-1");
  localStorage.setItem("user", JSON.stringify(MOCK_USER));
  setTenantId("tenant-a");
  useAuthStore.getState().setUser(MOCK_USER);
  useWizardStore.setState({
    drafts: { d1: { id: "d1" } } as unknown as ReturnType<typeof useWizardStore.getState>["drafts"],
    currentDraftId: "d1",
  });
}

beforeEach(() => {
  resetBrowserStorage();
  useAuthStore.getState().logout();
  useWizardStore.getState().reset();
});

afterEach(() => {
  apiClient.post = originalPost;
  apiClient.get = originalGet;
  if (originalDemo === undefined) delete process.env.NEXT_PUBLIC_ENABLE_DEMO;
  else process.env.NEXT_PUBLIC_ENABLE_DEMO = originalDemo;
});

describe("demo mode flag", () => {
  it("is off unless explicitly enabled", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_DEMO;
    assert.equal(isDemoEnabled(), false);
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "1";
    assert.equal(isDemoEnabled(), false);
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true";
    assert.equal(isDemoEnabled(), true);
  });
});

describe("demo login fallback", () => {
  it("rejects the demo credentials when demo mode is off", async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_DEMO;
    apiClient.post = rejectWith(401) as typeof apiClient.post;
    await assert.rejects(authService.login(DEMO), { status: 401 });
    assert.equal(hasAccessToken(), false);
  });

  it("signs in with the demo credentials only when demo mode is on", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true";
    apiClient.post = rejectWith(401) as typeof apiClient.post;
    const result = await authService.login(DEMO);
    assert.equal(result.user.email, MOCK_USER.email);
    assert.equal(hasAccessToken(), true);
  });

  it("never falls back on server errors, even in demo mode", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true";
    apiClient.post = rejectWith(500) as typeof apiClient.post;
    await assert.rejects(authService.login(DEMO), { status: 500 });
  });

  it("never falls back for other credentials", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true";
    apiClient.post = rejectWith(401) as typeof apiClient.post;
    await assert.rejects(authService.login({ ...DEMO, password: "wrong" }), { status: 401 });
  });
});

describe("token storage", () => {
  it("keeps the access token and never stores a refresh token", async () => {
    apiClient.post = (async () => ({
      data: { accessToken: "access-1", refreshToken: "refresh-1", user: MOCK_USER },
    })) as unknown as typeof apiClient.post;
    localStorage.setItem("refreshToken", "stale");
    await authService.login(DEMO);
    assert.equal(localStorage.getItem("accessToken"), "access-1");
    assert.equal(localStorage.getItem("refreshToken"), null);
  });

  it("uses session storage when remember me is off", async () => {
    apiClient.post = (async () => ({
      data: { accessToken: "access-2", user: MOCK_USER },
    })) as unknown as typeof apiClient.post;
    await authService.login({ ...DEMO, rememberMe: false });
    assert.equal(sessionStorage.getItem("accessToken"), "access-2");
    assert.equal(localStorage.getItem("accessToken"), null);
  });
});

describe("profile fetch", () => {
  it("rethrows auth failures instead of returning a cached user", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true";
    localStorage.setItem("user", JSON.stringify(MOCK_USER));
    apiClient.get = rejectWith(401) as typeof apiClient.get;
    await assert.rejects(authService.getProfile(), { status: 401 });
  });

  it("rethrows network failures when demo mode is off", async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_DEMO;
    localStorage.setItem("user", JSON.stringify(MOCK_USER));
    apiClient.get = rejectWith(503) as typeof apiClient.get;
    await assert.rejects(authService.getProfile(), { status: 503 });
  });
});

describe("session teardown", () => {
  it("clears tokens, user, tenant and wizard drafts", () => {
    signIn();
    clearFullSession();
    assert.equal(hasAccessToken(), false);
    assert.equal(localStorage.getItem("refreshToken"), null);
    assert.equal(localStorage.getItem("user"), null);
    assert.equal(getTenantId(), "default");
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(useAuthStore.getState().user, null);
    assert.deepEqual(useWizardStore.getState().drafts, {});
    assert.equal(useWizardStore.getState().currentDraftId, null);
  });

  it("signs out on expiry but keeps the reason for the expired page", () => {
    signIn();
    handleSessionExpired("/dashboard");
    assert.equal(hasAccessToken(), false);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.deepEqual(getAuthError(), {
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please sign in again to continue.",
      from: "/dashboard",
      status: 401,
    });
  });
});
