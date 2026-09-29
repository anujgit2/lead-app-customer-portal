import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormPlaygroundPage } from "@/features/dev-playground/components/FormPlaygroundPage";

export const metadata: Metadata = {
  title: "Dynamic Form Playground — Dev Tools",
  robots: { index: false, follow: false },
};

/**
 * Dev-only route. There's no admin/developer role in this app yet (see
 * src/store/auth.store.ts), so this gates on environment instead:
 * always available under `next dev`, and available in built environments
 * only when NEXT_PUBLIC_ENABLE_DEV_TOOLS=true is set (local/dev env files).
 * UAT/Prod env files intentionally omit the flag, so it 404s there.
 */
export default function FormPlaygroundRoute() {
  const isDevRuntime = process.env.NODE_ENV === "development";
  const isExplicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

  if (!isDevRuntime && !isExplicitlyEnabled) {
    notFound();
  }

  return <FormPlaygroundPage />;
}
