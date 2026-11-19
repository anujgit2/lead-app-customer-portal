"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PendingLeadInviteRedirect } from "@/features/leads/PendingLeadInviteRedirect";
import { PendingProgramLinkRedirect } from "@/features/leads/PendingProgramLinkRedirect";

export default function Dashboard() {
  return (
    <AppLayout>
      <PendingLeadInviteRedirect />
      <PendingProgramLinkRedirect />
      <DashboardPage />
    </AppLayout>
  );
}
