"use client";

import { AppLayout } from "@/layouts/AppLayout";
import { ApplicationsPage } from "@/features/applications/ApplicationsPage";

export default function Applications() {
  return (
    <AppLayout>
      <ApplicationsPage />
    </AppLayout>
  );
}
