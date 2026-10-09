"use client";

import { useState } from "react";
import { Download, Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import type { DocumentDetail } from "../types";
import { formatDisplayDate, formatVersionLabel } from "../utils/format";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { SourceBadge } from "./SourceBadge";

interface VersionsTabProps {
  document: DocumentDetail;
  onUploadVersion: () => void;
  onDownload: (version: number, fileName: string) => void;
  pendingDownloadKey?: string | null;
}

export function VersionsTab({
  document,
  onUploadVersion,
  onDownload,
  pendingDownloadKey,
}: VersionsTabProps) {
  const [preview, setPreview] = useState<{ version: number; fileName: string; contentType: string } | null>(
    null
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="h-11 gap-2" onClick={onUploadVersion}>
          <Upload className="h-4 w-4" />
          Upload new version
        </Button>
      </div>

      {document.versions.length === 0 ? (
        <p className="text-sm text-slate-500">No versions yet.</p>
      ) : (
        <ul className="space-y-3">
          {document.versions.map((version) => {
            const downloadKey = `${document.id}:${version.version}`;
            return (
              <li
                key={version.version}
                className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold tracking-tight text-slate-900">
                    {formatVersionLabel(version.version, version.latest, "detail")}
                  </p>
                  <p className="text-sm font-normal text-slate-500">
                    {formatDisplayDate(version.createdAt)}
                    {version.createdBy ? ` · ${version.createdBy}` : ""}
                    {version.sizeBytes ? ` · ${formatFileSize(version.sizeBytes)}` : ""}
                  </p>
                  <SourceBadge source={version.source} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2"
                    onClick={() =>
                      setPreview({
                        version: version.version,
                        fileName: version.fileName,
                        contentType: version.contentType,
                      })
                    }
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2"
                    loading={pendingDownloadKey === downloadKey}
                    onClick={() => onDownload(version.version, version.fileName)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FilePreviewDialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        documentId={document.id}
        version={preview?.version ?? 0}
        fileName={preview?.fileName ?? "document"}
        contentType={preview?.contentType ?? ""}
        onDownload={onDownload}
      />
    </div>
  );
}
