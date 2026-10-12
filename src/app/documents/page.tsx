"use client";

import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageShell } from "@/components/PageShell";
import { BlockSkeleton } from "@/components/TableSkeleton";
import { DocumentsPage } from "@/features/documents/pages/DocumentsPage";

export default function DocumentsRoute() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <PageShell>
            <BlockSkeleton label="Loading documents" />
          </PageShell>
        }
      >
        <DocumentsPage />
      </Suspense>
    </AppLayout>
  );
}
