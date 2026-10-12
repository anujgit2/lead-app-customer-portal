import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CustomerProfileSummary, CustomerProfileType } from "@/types";
import { profileInitials, profileStatusLabel, profileTypeLabel } from "../utils/display";

type BadgeSize = BadgeProps["size"];

export function ProfileTypeBadge({ type, size }: { type: CustomerProfileType; size?: BadgeSize }) {
  return (
    <Badge variant={type === "BUSINESS" ? "info" : "secondary"} size={size}>
      {profileTypeLabel(type)}
    </Badge>
  );
}

export function ProfileStatusBadge({
  status,
  size,
}: {
  status: CustomerProfileSummary["status"];
  size?: BadgeSize;
}) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "secondary"} size={size}>
      {profileStatusLabel(status)}
    </Badge>
  );
}

const AVATAR_SIZES = {
  xs: "h-[22px] w-[22px] text-[10px]",
  sm: "h-[30px] w-[30px] text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-10 w-10 text-sm",
} as const;

export function ProfileAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  return (
    <Avatar aria-hidden className={cn(AVATAR_SIZES[size], className)}>
      <AvatarFallback className="text-[length:inherit]">{profileInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
