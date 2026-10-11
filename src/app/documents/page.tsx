"use client";

import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { DocumentsPage } from "@/features/documents/pages/DocumentsPage";

export default function DocumentsRoute() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-8 sm:py-9">
            <p className="text-sm text-muted-foreground">Loading documents…</p>
          </div>
        }
      >
        <DocumentsPage />
      </Suspense>
    </AppLayout>
  );
}
