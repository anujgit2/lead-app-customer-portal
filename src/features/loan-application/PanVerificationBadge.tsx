"use client";

import { Badge } from "@/components/ui/badge";
import { usePanSearchScopeId, usePanVerification } from "./pan-search-context";
import { normalizePan } from "@/utils/pan-search";

interface PanVerificationBadgeProps {
  currentPan?: unknown;
}

export function PanVerificationBadge({ currentPan }: PanVerificationBadgeProps) {
  const scopeId = usePanSearchScopeId();
  const { getRecord } = usePanVerification();
  const record = getRecord(scopeId);

  if (!record) return null;

  const current = typeof currentPan === "string" ? normalizePan(currentPan) : "";
  const queried = normalizePan(record.queried.pan);
  if (current && queried && current !== queried) return null;

  const { result } = record;
  const hasMismatch = result.nameMatch === false || result.dobMatch === false;

  if (result.valid && !hasMismatch) {
    return (
      <Badge variant="success" className="shrink-0 font-medium">
        Verified
      </Badge>
    );
  }

  if (result.valid && hasMismatch) {
    return (
      <Badge variant="warning" className="shrink-0 font-medium">
        Verified with mismatch
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="shrink-0 font-medium">
      Not verified
    </Badge>
  );
}
