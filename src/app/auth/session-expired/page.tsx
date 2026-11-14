"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { ErrorState } from "@/components/ErrorState";
import { clearAuthTokens, parseAuthError, readStoredAuthError } from "@/lib/session";
import { useAuthStore } from "@/store/auth.store";

const subscribeNoop = () => () => {};

export default function SessionExpiredPage() {
  const stored = useSyncExternalStore(subscribeNoop, readStoredAuthError, () => null);
  const authError = useMemo(() => parseAuthError(stored), [stored]);

  useEffect(() => {
    clearAuthTokens();
    useAuthStore.getState().logout();
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
