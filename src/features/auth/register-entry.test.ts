import test from "node:test";
import assert from "node:assert/strict";
import { resolveRegisterEntry } from "@/features/auth/register-entry";

const none = { token: null, tenant: null, userInvitation: null };

test("plain register page follows the tenant policy", () => {
  assert.deepEqual(resolveRegisterEntry({ ...none, policy: "OPEN" }), { kind: "self-serve" });
  assert.deepEqual(resolveRegisterEntry({ ...none, policy: null }), { kind: "self-serve" });
  assert.deepEqual(resolveRegisterEntry({ ...none, policy: "INVITE_ONLY" }), { kind: "invitation-required" });
  assert.deepEqual(resolveRegisterEntry({ ...none, policy: "CLOSED" }), { kind: "closed" });
});

test("user invitation link opens the form even when the tenant is invite-only or closed", () => {
  assert.deepEqual(
    resolveRegisterEntry({ ...none, userInvitation: "abc", policy: "INVITE_ONLY" }),
    { kind: "user-invitation", token: "abc" }
  );
  assert.deepEqual(
    resolveRegisterEntry({ ...none, userInvitation: "abc", policy: "CLOSED" }),
    { kind: "user-invitation", token: "abc" }
  );
});

test("application invitation links keep their existing handling", () => {
  assert.deepEqual(
    resolveRegisterEntry({ token: "t", tenant: "acme", userInvitation: null, policy: "CLOSED" }),
    { kind: "application-invitation" }
  );
  assert.deepEqual(
    resolveRegisterEntry({ token: "t", tenant: null, userInvitation: null, policy: "OPEN" }),
    { kind: "broken-application-invitation" }
  );
});
