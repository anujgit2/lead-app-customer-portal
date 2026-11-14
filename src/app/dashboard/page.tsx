"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PendingLeadInviteRedirect } from "@/features/leads/PendingLeadInviteRedirect";

export default function Dashboard() {
  return (
    <AppLayout>
      <PendingLeadInviteRedirect />
      <DashboardPage />
    </AppLayout>
  );
}
