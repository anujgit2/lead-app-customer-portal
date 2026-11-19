import { Suspense } from "react";
import { RegisterEntry } from "@/features/auth/RegisterEntry";

export const metadata = { title: "Create your LoanPortal account" };

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-[18px] py-10">
          <div className="h-[420px] w-full max-w-[420px] rounded-[10px] border border-border bg-card shadow-2" />
        </div>
      }
    >
      <RegisterEntry />
    </Suspense>
  );
}
