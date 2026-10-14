"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { invitationService } from "@/services/invitation.service";
import { acceptStoredInvitation } from "@/utils/invitation-flow";
import { toast } from "sonner";
import type { RegisterApiRequest } from "@/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AuthScreen,
  FieldError,
  SignInLink,
  SIGN_UP_POINTS,
  SignupProgress,
  signUpAside,
} from "@/features/auth/AuthScreen";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";

interface EmailVerificationFormProps {
  userId: string;
  email: string;
  registerData: RegisterApiRequest;
  embedded?: boolean;
  onChangeEmail?: () => void;
  onVerified?: () => void;
}

function maskEmail(email: string) {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at > 1) return `${trimmed.charAt(0)}•••${trimmed.slice(at)}`;
  return trimmed || "your email address";
}

export function EmailVerificationForm({
  userId,
  email,
  registerData,
  embedded = false,
  onChangeEmail,
  onVerified,
}: EmailVerificationFormProps) {
  const router = useRouter();
  const { config } = useTenantUi();
  const formCopy = config.forms.otp;
  const { setUser } = useAuthStore();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const otpField = formCopy.fields.find((field) => field.key === "otp");
  const masked = maskEmail(email);
  const subtitleParts = formCopy.subtitle.split("{email}");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const otp = digits.join("");
    if (otp.length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await authService.verifyEmailOtp({ userId, otp });

      if (!result.verified) {
        toast.error(result.message || "Verification failed. Please try again.");
        return;
      }

      const authResult = await authService.completeRegistration(
        registerData,
        userId,
        result.accessToken
      );
      setUser(authResult.user);

      const accepted = await acceptStoredInvitation();
      invitationService.clearStoredInvitation();
      toast.success(result.message || "Email verified successfully!");

      if (onVerified) {
        onVerified();
        return;
      }

      if (accepted?.applicationId) {
        router.push(`/loan-application/resume?id=${accepted.applicationId}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Verification failed. Please try again.";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const content = (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">{formCopy.title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {subtitleParts.length > 1 ? (
            <>
              {subtitleParts[0]}
              <b className="font-semibold text-foreground">{masked}</b>
              {subtitleParts.slice(1).join("{email}")}
            </>
          ) : (
            formCopy.subtitle
          )}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div role="group" aria-labelledby="otp-l" className="flex flex-col gap-2">
          <span id="otp-l" className="text-sm font-medium leading-5">
            {otpField?.label ?? "Verification code"}
          </span>
          <div className="flex gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1}`}
                aria-invalid={!!error}
                value={digit}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "").slice(-1);
                  setDigits((current) => {
                    const next = current.slice();
                    next[index] = value;
                    return next;
                  });
                  setError("");
                  if (value) inputs.current[index + 1]?.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index]) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  if (!text) return;
                  event.preventDefault();
                  const next = ["", "", "", "", "", ""];
                  text.split("").forEach((char, charIndex) => {
                    next[charIndex] = char;
                  });
                  setDigits(next);
                  setError("");
                  inputs.current[Math.min(text.length, 5)]?.focus();
                }}
                className={cn(
                  "h-12 w-full min-w-0 max-w-12 rounded-md border bg-card text-center text-lg font-semibold tabular-nums text-foreground transition-[border-color,box-shadow] duration-150",
                  "placeholder:text-placeholder hover:border-foreground/55 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.22)]",
                  error
                    ? "border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_hsl(var(--danger)/0.2)]"
                    : "border-input focus-visible:border-ring"
                )}
              />
            ))}
          </div>
          <FieldError>{error}</FieldError>
          <p aria-live="polite" className="text-xs leading-[18px] text-muted-foreground">
            {resent ? "A new code is on its way. " : "Did not get it? Check your spam folder or "}
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={() => {
                setResent(true);
                const wait = formCopy.resendCooldownSeconds ?? 0;
                if (wait > 0) setCooldown(wait);
              }}
              className="inline min-h-6 p-0 text-xs font-semibold text-primary transition-all duration-200 ease-out hover:underline disabled:pointer-events-none disabled:opacity-60"
            >
              {cooldown > 0 ? `${formCopy.resendLabel} (${cooldown}s)` : formCopy.resendLabel}
            </button>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="lg"
            loading={isVerifying}
            className="lp-glow h-11 w-full font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {isVerifying ? formCopy.submittingLabel : formCopy.submitLabel}
          </Button>
          {onChangeEmail && (
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={onChangeEmail}
              className="h-10 w-full text-sm text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Change email address
            </Button>
          )}
        </div>
      </form>
    </div>
  );

  if (embedded) return content;

  return (
    <AuthScreen
      topRight={<SignInLink />}
      asideTitle={signUpAside.title}
      asideDescription={signUpAside.description}
      points={SIGN_UP_POINTS}
      contentClassName="max-w-[420px]"
    >
      <SignupProgress step={2} />
      {content}
    </AuthScreen>
  );
}

export function AccountReady() {
  return (
    <div className="flex flex-col items-start gap-5">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-success-soft text-success-strong">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">Your account is ready</h1>
        <p className="mt-1 max-w-[46ch] text-sm leading-6 text-muted-foreground">
          Next, set up your profile so your details are ready for every application.
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        <Button
          asChild
          size="lg"
          className="lp-glow h-11 font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Link href="/profiles/new">Set up my profile</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-11 bg-card transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
