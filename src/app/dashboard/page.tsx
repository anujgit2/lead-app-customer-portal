"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PendingLeadInviteRedirect } from "@/features/leads/PendingLeadInviteRedirect";
import { PendingTemplateLinkRedirect } from "@/features/leads/PendingTemplateLinkRedirect";

export default function Dashboard() {
  return (
    <AppLayout>
      <PendingLeadInviteRedirect />
      <PendingTemplateLinkRedirect />
      <DashboardPage />
    </AppLayout>
  );
}
