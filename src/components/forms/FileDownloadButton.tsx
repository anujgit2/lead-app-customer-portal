"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseApiError } from "@/lib/api-error";
import { fileStorageService } from "@/services/file-storage.service";

interface FileDownloadButtonProps {
  fileId: string;
  fileName: string;
}

export function FileDownloadButton({ fileId, fileName }: FileDownloadButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="shrink-0"
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
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {pending ? "Downloading" : "Download"}
    </Button>
  );
}
