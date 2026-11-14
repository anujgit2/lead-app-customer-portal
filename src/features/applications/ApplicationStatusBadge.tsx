import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/types";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    variant: "success" | "warning" | "destructive" | "info" | "draft" | "brand";
  }
> = {
  draft: { label: "Draft", variant: "draft" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  disbursed: { label: "Disbursed", variant: "brand" },
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return (STATUS_CONFIG[status] ?? STATUS_CONFIG.draft).label;
}

export function ApplicationStatusBadge({
  status,
  size,
  className,
}: {
  status: ApplicationStatus;
  size?: BadgeProps["size"];
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
