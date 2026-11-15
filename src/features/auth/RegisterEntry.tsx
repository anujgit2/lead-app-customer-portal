"use client";

import { RegisterPageClient } from "@/features/auth/RegisterPageClient";

// /auth/register is the customer signup form, in the sign-in layout from the redesign.
// Partners sign up from the partner portal.
export function RegisterEntry() {
  return <RegisterPageClient />;
}
