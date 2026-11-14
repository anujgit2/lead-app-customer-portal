"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { LeadsListPage } from "@/features/leads/LeadsListPage";

export default function LeadsPage() {
  return (
    <AppLayout>
      <LeadsListPage />
    </AppLayout>
  );
}
