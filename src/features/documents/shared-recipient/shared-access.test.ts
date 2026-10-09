import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialSharedAccessState,
  lockoutCopy,
  reduceSharedAccess,
  resendSecondsLeft,
  RESEND_COOLDOWN_MS,
} from "./machine";
import { backspaceOtpDigit, emptyOtpDigits, otpCode, pasteOtpDigits, typeOtpDigit } from "./otp";
import { shareTokenFromLocation, sharedRecipientUrl, toPublicShareLink } from "./links";

describe("shared access state machine", () => {
  it("opens the verify step only for a valid link", () => {
    const loading = initialSharedAccessState();
    assert.deepEqual(reduceSharedAccess(loading, { type: "meta-valid" }), {
      step: "verify",
      email: "",
      mismatch: false,
    });
    assert.equal(reduceSharedAccess(loading, { type: "meta-unavailable" }).step, "expired");
  });

  it("keeps the typed email on a mismatch and clears it when trying again", () => {
    const verify = reduceSharedAccess(
      { step: "verify", email: "other@example.com", mismatch: false },
      { type: "mismatch" }
    );
    assert.equal(verify.step, "verify");
    if (verify.step !== "verify") return;
    assert.equal(verify.mismatch, true);
    assert.equal(verify.email, "other@example.com");
    const again = reduceSharedAccess(verify, { type: "try-again" });
    if (again.step !== "verify") return;
    assert.equal(again.mismatch, false);
    assert.equal(again.email, "other@example.com");
  });

  it("moves to the code step, then ready, and drops the token on session expiry", () => {
    const otp = reduceSharedAccess(
      { step: "verify", email: "a@b.co", mismatch: false },
      { type: "otp-sent", maskedEmail: "a***@b.co", now: 1_000 }
    );
    assert.equal(otp.step, "otp");
    if (otp.step !== "otp") return;
    assert.equal(otp.resendAvailableAt, 1_000 + RESEND_COOLDOWN_MS);
    const rejected = reduceSharedAccess(otp, { type: "otp-rejected" });
    if (rejected.step !== "otp") return;
    assert.equal(rejected.error, "That code is incorrect or expired.");
    const ready = reduceSharedAccess(otp, { type: "otp-accepted", accessToken: "memory-token" });
    assert.deepEqual(ready, { step: "ready", accessToken: "memory-token", email: "a@b.co" });
    const expired = reduceSharedAccess(ready, { type: "session-expired" });
    assert.equal(expired.step, "verify");
    if (expired.step !== "verify") return;
    assert.equal(expired.notice, "Session expired. Please verify again.");
    assert.equal(expired.email, "a@b.co");
    assert.equal("accessToken" in expired, false);
  });

  it("describes a rate limit in minutes", () => {
    assert.equal(lockoutCopy(2), "Too many attempts. Try again in 2 minutes.");
    const locked = reduceSharedAccess(
      { step: "verify", email: "a@b.co", mismatch: false },
      { type: "rate-limited", minutes: 2 }
    );
    if (locked.step !== "verify") return;
    assert.equal(locked.lockMinutes, 2);
  });

  it("counts down the resend cooldown", () => {
    assert.equal(resendSecondsLeft(1_000, 1_000 + 30_000), 30);
    assert.equal(resendSecondsLeft(31_000, 30_000), 0);
  });
});

describe("otp input", () => {
  it("advances one digit and fills a pasted code", () => {
    const first = typeOtpDigit(emptyOtpDigits(), 0, "4");
    assert.deepEqual(first.digits, ["4", "", "", "", "", ""]);
    assert.equal(first.focusIndex, 1);
    const pasted = pasteOtpDigits("12ab345678");
    assert.deepEqual(pasted.digits, ["1", "2", "3", "4", "5", "6"]);
    assert.equal(pasted.focusIndex, 5);
    assert.equal(otpCode(pasted.digits), "123456");
    assert.equal(otpCode(first.digits), "");
  });

  it("moves back on backspace when the current digit is empty", () => {
    const typed = typeOtpDigit(emptyOtpDigits(), 0, "8");
    const cleared = backspaceOtpDigit(typed.digits, 1);
    assert.deepEqual(cleared.digits, ["", "", "", "", "", ""]);
    assert.equal(cleared.focusIndex, 0);
  });
});

describe("recipient links", () => {
  it("builds the UI url from APP_PUBLIC_URL and ignores the API host", () => {
    assert.equal(shareTokenFromLocation("http://leads-services.local/api/shared/abc%2F123"), "abc/123");
    const link = toPublicShareLink(
      "http://api.internal/api/shared/tok_1",
      undefined,
      "https://portal.example.com"
    );
    assert.equal(link, "https://portal.example.com/shared/tok_1/");
    assert.equal(link.includes("api.internal"), false);
    assert.equal(sharedRecipientUrl("tok_1", "https://portal.example.com/"), link);
  });
});
