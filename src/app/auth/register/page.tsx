import { Suspense } from "react";
import { RegisterEntry } from "@/features/auth/RegisterEntry";

export const metadata = { title: "Create your LoanPortal account" };

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(120deg,#eef3f7,#dfeaf1,#d9e9e4,#e2ecf0)] px-[18px] py-10">
          <div className="h-[420px] w-full max-w-[420px] rounded-2xl border border-[#dfe8ee] bg-white shadow-[0_12px_40px_rgba(15,32,48,0.08)]" />
        </div>
      }
    >
      <RegisterEntry />
    </Suspense>
  );
}
