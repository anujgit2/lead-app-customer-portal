"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { fileStorageService } from "@/services/file-storage.service";

interface FileDownloadButtonProps {
  fileId: string;
  fileName: string;
}

export function FileDownloadButton({ fileId, fileName }: FileDownloadButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Download ${fileName}`}
      onClick={() => {
        setPending(true);
        void fileStorageService
          .download(fileId, fileName)
          .catch((error: unknown) => {
            toast.error(parseApiError(error).message);
          })
          .finally(() => setPending(false));
      }}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-100 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm",
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-200 hover:text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-60"
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {pending ? "Downloading" : "Download"}
    </button>
  );
}
