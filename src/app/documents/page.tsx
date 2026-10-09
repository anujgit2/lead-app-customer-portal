"use client";

import { Suspense } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { DocumentsPage } from "@/features/documents/pages/DocumentsPage";

export default function DocumentsRoute() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl p-6 sm:p-8">
            <p className="text-sm text-slate-500">Loading documents…</p>
          </div>
        }
      >
        <DocumentsPage />
      </Suspense>
    </AppLayout>
  );
}
