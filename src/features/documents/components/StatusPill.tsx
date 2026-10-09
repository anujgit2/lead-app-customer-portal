import { cn } from "@/lib/utils";
import type { ShareStatus } from "../types";

const STYLES: Record<ShareStatus, string> = {
  ACTIVE: "border-teal-100 bg-teal-50 text-teal-800",
  EXPIRED: "border-slate-200 bg-slate-100 text-slate-600",
  REVOKED: "border-slate-200 bg-slate-100 text-slate-600",
};

const LABELS: Record<ShareStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export function StatusPill({ status }: { status: ShareStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
