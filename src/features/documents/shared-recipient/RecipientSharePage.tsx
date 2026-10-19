"use client";

import { FormEvent, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Check, Clock, Download, FileText, ShieldCheck } from "lucide-react";
import {
  downloadAllSharedDocuments,
  downloadSharedBundleDocument,
  fetchSharedBundleDocuments,
  fetchSharedBundleMeta,
  requestNewSharedLink,
  SharedRequestError,
  verifySharedEmail,
  verifySharedOtp,
  type SharedBundleDocument,
} from "../api/sharedApi";
import { useSharedBundleToken } from "../hooks/usePathSegment";
import { formatDisplayDate, safeFileName } from "../utils/format";
import {
  initialSharedAccessState,
  lockoutCopy,
  reduceSharedAccess,
  resendSecondsLeft,
  type SharedAccessState,
} from "./machine";
import { backspaceOtpDigit, emptyOtpDigits, otpCode, OTP_LENGTH, typeOtpDigit } from "./otp";

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(fileName);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function senderLabel(name?: string): string {
  return name?.trim() || "the sender";
}

export function RecipientSharePage() {
  const route = useSharedBundleToken();
  const token = route.value ?? "";
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [state, setState] = useState<SharedAccessState>(initialSharedAccessState);
  const [senderName, setSenderName] = useState<string | undefined>();
  const [documentCount, setDocumentCount] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [digits, setDigits] = useState(emptyOtpDigits);
  const [digitFocus, setDigitFocus] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [documents, setDocuments] = useState<SharedBundleDocument[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [appliedRouteKey, setAppliedRouteKey] = useState<string | null>(null);
  const [loadedAccessToken, setLoadedAccessToken] = useState("");
  const routeKey = route.ready ? token : null;
  if (routeKey !== appliedRouteKey) {
    setAppliedRouteKey(routeKey);
    setState(
      routeKey
        ? initialSharedAccessState()
        : reduceSharedAccess(initialSharedAccessState(), { type: "meta-unavailable" })
    );
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchSharedBundleMeta(token)
      .then((meta) => {
        if (cancelled) return;
        setSenderName(meta.senderName);
        setDocumentCount(meta.documentCount);
        setExpiresAt(meta.expiresAt);
        setState(
          reduceSharedAccess(initialSharedAccessState(), meta.status === "valid" ? { type: "meta-valid" } : { type: "meta-unavailable", senderName: meta.senderName })
        );
      })
      .catch(() => {
        if (cancelled) return;
        setState(reduceSharedAccess(initialSharedAccessState(), { type: "meta-unavailable" }));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const mismatch = state.step === "verify" && state.mismatch;
  useEffect(() => {
    if (state.step === "verify") {
      if (mismatch) headingRef.current?.focus();
      else emailRef.current?.focus();
      return;
    }
    if (state.step === "otp") {
      digitRefs.current[0]?.focus();
      return;
    }
    if (state.step !== "loading") headingRef.current?.focus();
  }, [state.step, mismatch]);

  useEffect(() => {
    if (state.step !== "otp") return;
    digitRefs.current[digitFocus]?.focus();
  }, [digitFocus, state.step]);

  useEffect(() => {
    if (state.step !== "otp") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.step]);

  const accessToken = state.step === "ready" ? state.accessToken : "";
  if (accessToken !== loadedAccessToken) {
    setLoadedAccessToken(accessToken);
    setListError(null);
  }
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetchSharedBundleDocuments(token, accessToken)
      .then((items) => {
        if (!cancelled) setDocuments(items);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof SharedRequestError && error.status === 401) {
          setState((current) => reduceSharedAccess(current, { type: "session-expired" }));
          return;
        }
        setListError("We couldn't load these documents. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, token]);

  const applyLock = (error: SharedRequestError) => {
    if (error.status === 429) {
      setState((current) =>
        reduceSharedAccess(current, { type: "rate-limited", minutes: error.retryAfterMinutes ?? 1 })
      );
      return true;
    }
    return false;
  };

  const verifyEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (state.step !== "verify" || pending || state.lockMinutes) return;
    setPending(true);
    setFollowUp(null);
    try {
      const result = await verifySharedEmail(token, state.email.trim());
      setDigits(emptyOtpDigits());
      setDigitFocus(0);
      setState((current) =>
        reduceSharedAccess(current, { type: "otp-sent", maskedEmail: result.maskedEmail, now: Date.now() })
      );
    } catch (error) {
      if (error instanceof SharedRequestError && applyLock(error)) return;
      if (error instanceof SharedRequestError && error.status === 403) {
        setState((current) => reduceSharedAccess(current, { type: "mismatch" }));
        return;
      }
      setFollowUp("We couldn't verify that email. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const confirmCode = async (event: FormEvent) => {
    event.preventDefault();
    if (state.step !== "otp" || pending || state.lockMinutes) return;
    const code = otpCode(digits);
    if (!code) return;
    setPending(true);
    try {
      const result = await verifySharedOtp(token, state.email, code);
      setState((current) => reduceSharedAccess(current, { type: "otp-accepted", accessToken: result.accessToken }));
    } catch (error) {
      if (error instanceof SharedRequestError && applyLock(error)) return;
      setState((current) => reduceSharedAccess(current, { type: "otp-rejected" }));
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    if (state.step !== "otp" || pending) return;
    if (resendSecondsLeft(now, state.resendAvailableAt) > 0) return;
    setPending(true);
    try {
      const result = await verifySharedEmail(token, state.email);
      setDigits(emptyOtpDigits());
      setDigitFocus(0);
      setState((current) =>
        reduceSharedAccess(
          reduceSharedAccess(current, { type: "resend", now: Date.now() }),
          { type: "otp-sent", maskedEmail: result.maskedEmail, now: Date.now() }
        )
      );
    } catch (error) {
      if (error instanceof SharedRequestError && applyLock(error)) return;
    } finally {
      setPending(false);
    }
  };

  const askForNewLink = async () => {
    setPending(true);
    try {
      await requestNewSharedLink(token);
      if (state.step === "expired") {
        setState((current) => reduceSharedAccess(current, { type: "request-sent" }));
      } else {
        setFollowUp("We've asked the sender for a new link.");
      }
    } catch {
      setFollowUp("We couldn't send that request. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const downloadOne = async (document: SharedBundleDocument) => {
    if (state.step !== "ready") return;
    setDownloading(document.id);
    try {
      const file = await downloadSharedBundleDocument(token, document.id, state.accessToken, document.name);
      saveBlob(file.blob, file.fileName || document.name);
    } catch (error) {
      if (error instanceof SharedRequestError && error.status === 401) {
        setState((current) => reduceSharedAccess(current, { type: "session-expired" }));
      }
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    if (state.step !== "ready") return;
    setDownloading("all");
    try {
      const file = await downloadAllSharedDocuments(token, state.accessToken);
      saveBlob(file.blob, file.fileName || "documents.zip");
    } catch (error) {
      if (error instanceof SharedRequestError && error.status === 401) {
        setState((current) => reduceSharedAccess(current, { type: "session-expired" }));
        return;
      }
      if (error instanceof SharedRequestError && error.status === 404) {
        for (const document of documents) {
          try {
            const file = await downloadSharedBundleDocument(token, document.id, state.accessToken, document.name);
            saveBlob(file.blob, file.fileName || document.name);
          } catch (itemError) {
            if (itemError instanceof SharedRequestError && itemError.status === 401) {
              setState((current) => reduceSharedAccess(current, { type: "session-expired" }));
              return;
            }
          }
        }
        return;
      }
    } finally {
      setDownloading(null);
    }
  };

  const locked = (state.step === "verify" || state.step === "otp") && !!state.lockMinutes;
  const resendLeft = state.step === "otp" ? resendSecondsLeft(now, state.resendAvailableAt) : 0;
  const countLabel = documentCount === 1 ? "1 document" : `${documentCount} documents`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-10 text-foreground">
      <section className="w-full max-w-[460px] rounded-[20px] bg-card p-8 shadow-[0_24px_60px_rgba(21,26,39,0.12)]">
        {state.step === "loading" || !route.ready ? <ShareOpening /> : null}

        {state.step === "expired" ? (
          <div className="space-y-6">
            <IconBadge tone="warning">
              <Clock className="h-6 w-6" />
            </IconBadge>
            <div className="space-y-2">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
                This link has expired
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Shared links stop working after a set time for your security. Ask {senderLabel(state.senderName ?? senderName)} to send a new one.
              </p>
            </div>
            {state.confirmation ? (
              <p className="text-sm text-success-strong" role="status">
                {state.confirmation}
              </p>
            ) : (
              <>
                {followUp ? (
                  <p className="text-sm text-danger-strong" role="status">
                    {followUp}
                  </p>
                ) : null}
                <button type="button" className={primaryClass} disabled={pending} onClick={() => void askForNewLink()}>
                  Request a new link
                </button>
              </>
            )}
          </div>
        ) : null}

        {state.step === "verify" ? (
          <form className="space-y-6" onSubmit={(event) => void verifyEmail(event)}>
            {state.mismatch ? (
              <IconBadge tone="error">
                <AlertCircle className="h-6 w-6" />
              </IconBadge>
            ) : (
              <IconBadge tone="info">
                <ShieldCheck className="h-6 w-6" />
              </IconBadge>
            )}
            <div className="space-y-2">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
                {state.mismatch ? "Email doesn't match" : "Verify your email to view documents"}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {state.mismatch
                  ? "This link was shared with a different email address. Use the address where you received it."
                  : `${senderLabel(senderName)} shared ${countLabel} with you. Enter the email address this link was sent to.`}
              </p>
            </div>
            <div aria-live="polite" className="space-y-2">
              {state.notice ? <p className="text-sm text-warning-strong">{state.notice}</p> : null}
              {locked ? <p className="text-sm text-warning-strong">{lockoutCopy(state.lockMinutes ?? 1)}</p> : null}
              {followUp ? <p className="text-sm text-muted-foreground">{followUp}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor={`${formId}-email`} className="text-sm font-medium">
                Email
              </label>
              <input
                ref={emailRef}
                id={`${formId}-email`}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={state.email}
                aria-invalid={state.mismatch}
                aria-describedby={state.mismatch ? `${formId}-mismatch` : undefined}
                disabled={locked}
                onChange={(event) =>
                  setState((current) => reduceSharedAccess(current, { type: "edit-email", email: event.target.value }))
                }
                className={state.mismatch ? inputClassError : inputClass}
              />
              {state.mismatch ? (
                <p id={`${formId}-mismatch`} className="text-sm text-danger-strong">
                  This email doesn&apos;t match the one this link was sent to.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Documents open only for the email that received this link.</p>
              )}
            </div>
            {state.mismatch ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className={primaryClass}
                  onClick={() => setState((current) => reduceSharedAccess(current, { type: "try-again" }))}
                >
                  Try again
                </button>
                <button
                  type="button"
                  className={textButtonClass}
                  disabled={pending}
                  onClick={() => void askForNewLink()}
                >
                  Ask sender for a new link
                </button>
              </div>
            ) : (
              <button type="submit" className={primaryClass} disabled={pending || locked || !state.email.trim()}>
                Verify and continue
              </button>
            )}
          </form>
        ) : null}

        {state.step === "otp" ? (
          <form className="space-y-6" onSubmit={(event) => void confirmCode(event)}>
            <div className="space-y-2">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
                Enter the 6-digit code
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                We sent a code to {state.maskedEmail}. It works for a few minutes only.
              </p>
            </div>
            <div aria-live="polite">
              {state.error ? (
                <p id={`${formId}-otp-error`} className="text-sm text-danger-strong">
                  {state.error}
                </p>
              ) : null}
              {locked ? (
                <p id={`${formId}-otp-lock`} className="text-sm text-warning-strong">
                  {lockoutCopy(state.lockMinutes ?? 1)}
                </p>
              ) : null}
            </div>
            <div className="flex justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    digitRefs.current[index] = node;
                  }}
                  value={digit}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${index + 1}`}
                  aria-invalid={Boolean(state.error)}
                  aria-describedby={state.error ? `${formId}-otp-error` : locked ? `${formId}-otp-lock` : undefined}
                  maxLength={index === 0 ? OTP_LENGTH : 1}
                  disabled={locked}
                  onChange={(event) => {
                    const next = typeOtpDigit(digits, index, event.target.value);
                    setDigits(next.digits);
                    setDigitFocus(next.focusIndex);
                    if (state.error) setState((current) => (current.step === "otp" ? { ...current, error: undefined } : current));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Backspace") return;
                    event.preventDefault();
                    const next = backspaceOtpDigit(digits, index);
                    setDigits(next.digits);
                    setDigitFocus(next.focusIndex);
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    const next = typeOtpDigit(digits, index, event.clipboardData.getData("text"));
                    setDigits(next.digits);
                    setDigitFocus(next.focusIndex);
                  }}
                  className="h-12 w-12 rounded-[10px] border border-input bg-muted/60 text-center text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ))}
            </div>
            <button type="submit" className={primaryClass} disabled={pending || locked || !otpCode(digits)}>
              Confirm and open
            </button>
            <button type="button" className={textButtonClass} disabled={pending || resendLeft > 0} onClick={() => void resend()}>
              {resendLeft > 0 ? `Resend code (${resendLeft}s)` : "Resend code"}
            </button>
          </form>
        ) : null}

        {state.step === "ready" ? (
          <div className="space-y-6">
            <IconBadge tone="success">
              <Check className="h-6 w-6" />
            </IconBadge>
            <div className="space-y-2">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
                Email verified
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                You can download the documents shared by {senderLabel(senderName)}.
              </p>
            </div>
            {listError ? (
              <p className="text-sm text-danger-strong" role="status">
                {listError}
              </p>
            ) : null}
            <ul className="space-y-3">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center gap-3 rounded-[14px] border border-border p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                    <FileText className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{document.name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      Type: {document.typeName}
                      {document.tag ? ` · Tag ${document.tag}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-11 shrink-0 items-center gap-1.5 px-2 text-sm font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={downloading !== null}
                    onClick={() => void downloadOne(document)}
                  >
                    <Download className="h-4 w-4" />
                    {downloading === document.id ? "Downloading" : "Download"}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={primaryClass} disabled={downloading !== null || documents.length === 0} onClick={() => void downloadAll()}>
              {downloading === "all" ? "Downloading" : "Download all"}
            </button>
            {expiresAt ? (
              <p className="text-sm text-muted-foreground">This link expires on {formatDisplayDate(expiresAt)}.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function useShareLoadProgress(): number {
  const [value, setValue] = useState(12);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setValue(68);
      return;
    }

    const started = performance.now();
    const timer = window.setInterval(() => {
      const seconds = (performance.now() - started) / 1000;
      const next = 12 + 80 * (1 - Math.exp(-seconds / 1.7));
      setValue(Math.min(92, Math.round(next)));
    }, 80);

    return () => window.clearInterval(timer);
  }, []);

  return value;
}

function ShareOpening() {
  const value = useShareLoadProgress();
  const detail =
    value < 38
      ? "Confirming this secure link"
      : value < 70
        ? "Checking the documents shared with you"
        : "Preparing the page";

  return (
    <div className="space-y-6" aria-busy="true">
      <IconBadge tone="info">
        <ShieldCheck className="h-6 w-6" />
      </IconBadge>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Opening shared documents</h1>
        <p className="text-sm leading-6 text-muted-foreground" role="status">
          {detail}
        </p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Loading shared documents"
      >
        <div
          className="h-full rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] transition-[width] duration-300 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function IconBadge({ tone, children }: { tone: "success" | "error" | "warning" | "info"; children: ReactNode }) {
  const tones = {
    success: "bg-success-soft text-success-strong",
    error: "bg-danger-soft text-danger-strong",
    warning: "bg-warning-soft text-warning-strong",
    info: "bg-primary-soft text-primary",
  };
  return <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{children}</div>;
}

const primaryClass =
  "flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const textButtonClass =
  "flex min-h-11 w-full items-center justify-center text-sm font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const inputClass =
  "h-12 w-full rounded-[10px] border border-input bg-muted/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const inputClassError =
  "h-12 w-full rounded-[10px] border border-danger bg-danger-soft px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-danger";
