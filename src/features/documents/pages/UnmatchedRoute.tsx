"use client";

import { usePathname } from "next/navigation";
import { AppLayout } from "@/layouts/AppLayout";
import { segmentFromPath } from "../hooks/usePathSegment";
import { DocumentDetailPage } from "./DocumentDetailPage";
import { SharedViewerPage } from "./SharedViewerPage";

export function UnmatchedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (segmentFromPath(pathname, "s")) return <SharedViewerPage />;
  if (segmentFromPath(pathname, "documents")) {
    return (
      <AppLayout>
        <DocumentDetailPage />
      </AppLayout>
    );
  }
  return children;
}
