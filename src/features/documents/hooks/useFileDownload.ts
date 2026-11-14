"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { parseApiError } from "@/lib/api-error";
import { downloadDocumentFile, fileErrorMessage } from "../api/documentsApi";
import { safeFileName } from "../utils/format";

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(fileName);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useFileDownload() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const download = useCallback(async (documentId: string, version: number, fileName: string) => {
    const key = `${documentId}:${version}`;
    setPendingKey(key);
    try {
      const file = await downloadDocumentFile(documentId, version, fileName);
      saveBlob(file.blob, file.fileName || fileName);
    } catch (error) {
      if (parseApiError(error).status !== 401) {
        toast.error(fileErrorMessage(error, "download"));
      }
    } finally {
      setPendingKey((current) => (current === key ? null : current));
    }
  }, []);

  return { download, pendingKey };
}
