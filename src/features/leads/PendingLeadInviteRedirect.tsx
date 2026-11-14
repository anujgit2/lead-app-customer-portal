"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { peekPendingInvite } from "@/services/lead.service";

/**
 * After registration or sign-in, a customer who came from a partner's invite is sent back to the
 * invite page, which opens the application.
 */
export function PendingLeadInviteRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = peekPendingInvite();
    if (token) {
      router.replace(`/lead-invite/?token=${encodeURIComponent(token)}`);
    }
  }, [router]);

  return null;
}
