"use client";

import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageShell } from "@/components/PageShell";
import { BlockSkeleton } from "@/components/TableSkeleton";
import { DocumentDashboardPage } from "@/features/documents/pages/DocumentDashboardPage";

export default function DocumentDashboardRoute() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <PageShell>
            <BlockSkeleton label="Loading document dashboard" />
          </PageShell>
        }
      >
        <DocumentDashboardPage />
      </Suspense>
    </AppLayout>
  );
}
