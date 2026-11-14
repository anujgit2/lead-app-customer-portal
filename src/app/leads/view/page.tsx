"use client";

import React, { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { LeadViewPage } from "@/features/leads/LeadViewPage";

export default function LeadViewRoute() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <LeadViewPage />
      </Suspense>
    </AppLayout>
  );
}
