import { BadgeCheck, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DocumentSource } from "../types";

export function SourceBadge({ source, className }: { source: DocumentSource; className?: string }) {
  const verified = source === "DIGILOCKER";
  return (
    <Badge variant={verified ? "success" : "draft"} dot={false} className={className}>
      {verified ? <BadgeCheck className="h-3 w-3" aria-hidden /> : <Upload className="h-3 w-3" aria-hidden />}
      {verified ? "Verified via DigiLocker" : "Uploaded"}
    </Badge>
  );
}
