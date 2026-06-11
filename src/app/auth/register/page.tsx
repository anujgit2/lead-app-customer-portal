import { Suspense } from "react";
import { RegisterPageClient } from "@/features/auth/RegisterPageClient";

export const metadata = { title: "Create Account – LoanPortal" };

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      }
    >
      <RegisterPageClient />
    </Suspense>
  );
}
