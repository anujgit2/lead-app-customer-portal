"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadDocumentFile } from "../api/documentsApi";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { DOCUMENT_DIALOG_CLASS } from "../utils/constants";
import { previewKind } from "../utils/format";
import { FilePreview } from "./FilePreview";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  version: number;
  fileName: string;
  contentType: string;
  onDownload: (version: number, fileName: string) => void;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  documentId,
  version,
  fileName,
  contentType,
  onDownload,
}: FilePreviewDialogProps) {
  const file = useQuery({
    queryKey: ["document-file", documentId, version],
    queryFn: () => downloadDocumentFile(documentId, version, fileName),
    enabled: open && version > 0,
    staleTime: Infinity,
    retry: false,
  });
  const url = useObjectUrl(open ? file.data?.blob : null);
  const kind = previewKind(file.data?.contentType || contentType, file.data?.fileName || fileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${DOCUMENT_DIALOG_CLASS} max-w-3xl`}>
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">Preview</DialogTitle>
          <DialogDescription className="truncate text-sm font-normal text-slate-500">
            {fileName}
          </DialogDescription>
        </DialogHeader>

        {file.isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" aria-busy="true">
            <p className="sr-only">Preparing preview</p>
          </div>
        ) : null}

        {file.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              We couldn&apos;t open the preview.
            </p>
            <Button type="button" variant="outline" className="h-11" onClick={() => void file.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        {url && kind ? <FilePreview kind={kind} url={url} title={fileName} /> : null}

        {file.data && !kind ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">This file can&apos;t be shown here. You can download it instead.</p>
            <Button type="button" className="h-11 gap-2" onClick={() => onDownload(version, fileName)}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
