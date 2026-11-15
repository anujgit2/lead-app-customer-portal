"use client";

import React, { useState } from "react";
import { SelfServeRegisterForm } from "@/features/auth/SelfServeRegisterForm";
import { AccountReady, EmailVerificationForm } from "@/features/auth/EmailVerificationForm";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { RegisterApiRequest } from "@/types";
import Link from "next/link";
import { BRAND_TAGLINE } from "@/components/Logo";
import { AuthScreen, BackHomeLink, CUSTOMER_ASIDE_POINTS } from "@/features/auth/AuthScreen";
import { AUTH_FORM_ROUTES } from "@/features/tenant-ui/form-routes";
import { PARTNER_PORTAL_URL } from "@/lib/portal-urls";

type FlowStep = "register" | "verify-email" | "ready";

interface SelfServeRegisterFlowProps {
  /** Set when the visitor arrived through a user-to-user invitation link. */
  invitation?: { token: string; email: string };
}

export function SelfServeRegisterFlow({ invitation }: SelfServeRegisterFlowProps = {}) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<FlowStep>("register");
  const [userId, setUserId] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState<RegisterApiRequest | null>(null);

  const handleRegisterSuccess = (result: {
    userId: string;
    registerData: RegisterApiRequest;
    activated: boolean;
    emailVerificationPending: boolean;
    accessToken: string | null;
  }) => {
    setUserId(result.userId);
    setRegisterData(result.registerData);

    // An inactive account cannot sign in yet. Send it to OTP verification even
    // when the OTP dispatch failed and emailVerificationPending came back false.
    if (!result.activated || result.emailVerificationPending) {
      setStep("verify-email");
      return;
    }

    authService
      .completeRegistration(result.registerData, result.userId, result.accessToken)
      .then((authResult) => {
        setUser(authResult.user);
        toast.success("Registration complete. Welcome!");
        setStep("ready");
      })
      .catch((err: unknown) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Registration completed, but sign in is required.";
        toast.error(message);
        router.push("/auth/login");
      });
  };

  return (
    <AuthScreen
      topRight={<BackHomeLink />}
      asideTitle={BRAND_TAGLINE}
      asideDescription="Manage your personal and business profiles, apply for financing and keep every document close at hand."
      asideFootnote="For customers and business owners"
      points={CUSTOMER_ASIDE_POINTS}
      contentClassName="max-w-[420px]"
    >
      <div className={step === "register" ? "contents" : "hidden"}>
        <SelfServeRegisterForm onSuccess={handleRegisterSuccess} invitation={invitation} />

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link href={AUTH_FORM_ROUTES.signin} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p>
            Are you a partner?{" "}
            <a href={PARTNER_PORTAL_URL} className="font-semibold text-primary hover:underline">
              Go to partner sign in
            </a>
          </p>
        </div>
      </div>

      {step === "verify-email" && userId && registerData && (
        <EmailVerificationForm
          embedded
          userId={userId}
          email={registerData.email}
          registerData={registerData}
          onChangeEmail={() => setStep("register")}
          onVerified={() => setStep("ready")}
        />
      )}

      {step === "ready" && <AccountReady />}
    </AuthScreen>
  );
}
