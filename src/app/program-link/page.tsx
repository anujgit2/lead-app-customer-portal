"use client";

import { Suspense } from "react";
import { LeadTemplateLinkPage } from "@/features/leads/LeadTemplateLinkPage";

export default function LeadTemplatePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <LeadTemplateLinkPage />
    </Suspense>
  );
}
