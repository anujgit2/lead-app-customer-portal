import { BadgeCheck, Upload } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { DocumentSource } from "../types";

export function SourceBadge({
  source,
  size,
  className,
}: {
  source: DocumentSource;
  size?: BadgeProps["size"];
  className?: string;
}) {
  const verified = source === "DIGILOCKER";
  return (
    <Badge variant={verified ? "success" : "draft"} dot={false} size={size} className={className}>
      {verified ? <BadgeCheck className="h-3 w-3" aria-hidden /> : <Upload className="h-3 w-3" aria-hidden />}
      {verified ? "Verified via DigiLocker" : "Uploaded"}
    </Badge>
  );
}
