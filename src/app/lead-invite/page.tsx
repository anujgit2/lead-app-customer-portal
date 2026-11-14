"use client";

import React, { Suspense } from "react";
import { LeadInvitePage } from "@/features/leads/LeadInvitePage";

export default function LeadInviteRoute() {
  return (
    <Suspense fallback={null}>
      <LeadInvitePage />
    </Suspense>
  );
}
