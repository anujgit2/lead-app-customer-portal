"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SelfServeRegisterForm } from "@/features/auth/SelfServeRegisterForm";
import { EmailVerificationForm } from "@/features/auth/EmailVerificationForm";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import type { RegisterApiRequest } from "@/types";

type FlowStep = "register" | "verify-email";

export function SelfServeRegisterFlow() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<FlowStep>("register");
  const [userId, setUserId] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState<RegisterApiRequest | null>(null);

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
        router.push("/dashboard");
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

  if (step === "verify-email" && userId && registerData) {
    return (
      <EmailVerificationForm
        userId={userId}
        email={registerData.email}
        registerData={registerData}
      />
    );
  }

  return <SelfServeRegisterForm onSuccess={handleRegisterSuccess} />;
}
