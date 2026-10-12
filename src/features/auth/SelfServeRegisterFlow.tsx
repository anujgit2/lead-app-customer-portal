"use client";

import React, { useState } from "react";
import { SelfServeRegisterForm } from "@/features/auth/SelfServeRegisterForm";
import { AccountReady, EmailVerificationForm } from "@/features/auth/EmailVerificationForm";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { RegisterApiRequest } from "@/types";
import {
  AuthScreen,
  SignInLink,
  SIGN_UP_POINTS,
  SignupProgress,
  signUpAside,
} from "@/features/auth/AuthScreen";

type FlowStep = "register" | "verify-email" | "ready";

export function SelfServeRegisterFlow() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<FlowStep>("register");
  const [userId, setUserId] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState<RegisterApiRequest | null>(null);

  const progressStep: 1 | 2 | 3 =
    step === "register" ? 1 : step === "verify-email" ? 2 : 3;

  const handleRegisterSuccess = (result: {
    userId: string;
    registerData: RegisterApiRequest;
    emailVerificationPending: boolean;
    accessToken: string | null;
  }) => {
    setUserId(result.userId);
    setRegisterData(result.registerData);

    if (result.emailVerificationPending) {
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
      topRight={<SignInLink />}
      asideTitle={signUpAside.title}
      asideDescription={signUpAside.description}
      points={SIGN_UP_POINTS}
      contentClassName="max-w-[420px]"
    >
      <SignupProgress step={progressStep} />

      <div className={step === "register" ? "contents" : "hidden"}>
        <SelfServeRegisterForm onSuccess={handleRegisterSuccess} />
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
