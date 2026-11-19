"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { peekPendingTemplateLink } from "@/services/lead.service";

/** After sign-in or registration, a visitor who came from a share link returns to it to open their application. */
export function PendingTemplateLinkRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = peekPendingTemplateLink();
    if (token) {
      router.replace(`/lead-template/?token=${encodeURIComponent(token)}`);
    }
  }, [router]);

  return null;
}
