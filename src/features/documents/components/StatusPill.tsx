import { Badge } from "@/components/ui/badge";
import type { ShareStatus } from "../types";

const STYLES: Record<ShareStatus, "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  EXPIRED: "warning",
  REVOKED: "destructive",
};

const LABELS: Record<ShareStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export function StatusPill({ status }: { status: ShareStatus }) {
  return <Badge variant={STYLES[status]}>{LABELS[status]}</Badge>;
}
