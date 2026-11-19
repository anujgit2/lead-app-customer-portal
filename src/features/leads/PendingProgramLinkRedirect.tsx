"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { peekPendingProgramLink } from "@/services/lead.service";

/** After sign-in or registration, a visitor who came from a share link returns to it to open their application. */
export function PendingProgramLinkRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = peekPendingProgramLink();
    if (token) {
      router.replace(`/program-link/?token=${encodeURIComponent(token)}`);
    }
  }, [router]);

  return null;
}
