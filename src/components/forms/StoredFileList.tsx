"use client";

import { FileText } from "lucide-react";
import { FileDownloadButton } from "@/components/forms/FileDownloadButton";
import { formatFileSize } from "@/lib/utils";
import type { StoredFileReference } from "@/types";

export function StoredFileList({ files }: { files: StoredFileReference[] }) {
  if (files.length === 0) {
    return <span className="text-xs font-normal italic text-slate-500">Not provided</span>;
  }

  return (
    <ul className="mt-1 space-y-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm"
        >
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{file.fileName}</p>
            <p className="text-xs font-normal text-slate-500">{formatFileSize(file.meta.sizeBytes)}</p>
          </div>
          <FileDownloadButton fileId={file.id} fileName={file.fileName} />
        </li>
      ))}
    </ul>
  );
}
