"use client";

import { ErrorState } from "@/components/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorState
          title="Application error"
          message={error.message || "A critical error occurred. Please reload the page."}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
