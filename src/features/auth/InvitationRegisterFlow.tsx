"use client";

import React, { useState } from "react";
import { RegisterForm } from "@/features/auth/RegisterForm";
import { EmailVerificationForm } from "@/features/auth/EmailVerificationForm";
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
  const [step, setStep] = useState<FlowStep>("register");
  const [userId, setUserId] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState<RegisterApiRequest | null>(
    null
  );

  const handleRegisterSuccess = (result: {
    userId: string;
    registerData: RegisterApiRequest;
    emailVerificationPending: boolean;
  }) => {
    setUserId(result.userId);
    setRegisterData(result.registerData);

    if (result.emailVerificationPending) {
      setStep("verify-email");
      return;
    }

    setStep("verify-email");
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
