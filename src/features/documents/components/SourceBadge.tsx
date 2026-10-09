import { BadgeCheck, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentSource } from "../types";

export function SourceBadge({ source }: { source: DocumentSource }) {
  const verified = source === "DIGILOCKER";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        verified
          ? "border-emerald-100 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600"
      )}
    >
      {verified ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
      {verified ? "Verified via DigiLocker" : "Uploaded"}
    </span>
  );
}
