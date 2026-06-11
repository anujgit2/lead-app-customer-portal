import { Suspense } from "react";
import { ApplyPage } from "@/features/auth/ApplyPage";

export const metadata = { title: "Apply – LoanPortal" };

export default function Apply() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      }
    >
      <ApplyPage />
    </Suspense>
  );
}
