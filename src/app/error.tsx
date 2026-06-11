"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const apiError = parseApiError(error);

  return (
    <ErrorState
      message={apiError.message || "An unexpected error occurred. Please try again."}
      status={apiError.status}
      onRetry={reset}
    />
  );
}
