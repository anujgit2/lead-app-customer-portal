import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/types";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    variant: "success" | "warning" | "destructive" | "info" | "draft" | "default";
  }
> = {
  draft: { label: "Draft", variant: "draft" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  disbursed: { label: "Disbursed", variant: "success" },
};

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
