"use client";

import { Suspense } from "react";
import { ProgramLinkPage } from "@/features/leads/ProgramLinkPage";

export default function ProgramLinkRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ProgramLinkPage />
    </Suspense>
  );
}
