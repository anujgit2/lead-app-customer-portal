"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

export default function Dashboard() {
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}
