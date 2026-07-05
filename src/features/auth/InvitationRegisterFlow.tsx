"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/features/auth/RegisterForm";
import { EmailVerificationForm } from "@/features/auth/EmailVerificationForm";
import { authService } from "@/services/auth.service";
import { invitationService } from "@/services/invitation.service";
import { acceptStoredInvitation } from "@/utils/invitation-flow";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import type { InvitationDetails, RegisterApiRequest } from "@/types";

type FlowStep = "register" | "verify-email";

interface InvitationRegisterFlowProps {
  invitation: InvitationDetails;
  invitationToken: string;
}

export function InvitationRegisterFlow({
  invitation,
  invitationToken,
}: InvitationRegisterFlowProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<FlowStep>("register");
  const [userId, setUserId] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState<RegisterApiRequest | null>(
    null
  );

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
      .then(async (authResult) => {
        setUser(authResult.user);
        const accepted = await acceptStoredInvitation();
        invitationService.clearStoredInvitation();
        toast.success("Registration complete. Welcome!");
        if (accepted?.applicationId) {
          router.push(`/loan-application/${accepted.applicationId}`);
        } else {
          router.push("/dashboard");
        }
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

  return (
    <RegisterForm
      invitation={invitation}
      invitationToken={invitationToken}
      onSuccess={handleRegisterSuccess}
    />
  );
}
