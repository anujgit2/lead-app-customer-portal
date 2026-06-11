"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import { clearAuthTokens, getAuthError } from "@/lib/session";

export default function SessionExpiredPage() {
  const authError = getAuthError();

  useEffect(() => {
    clearAuthTokens();
  }, []);

  return (
    <ErrorState
      code={authError?.code ?? "SESSION_EXPIRED"}
      title="Session expired"
      message={
        authError?.message ??
        "Your session has expired. Please sign in again to continue."
      }
      status={authError?.status ?? 401}
    />
  );
}
