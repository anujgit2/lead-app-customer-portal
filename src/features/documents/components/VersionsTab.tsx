"use client";

import { Download, Eye, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFileSize } from "@/lib/utils";
import type { DocumentDetail, DocumentVersion } from "../types";
import { formatDisplayDate } from "../utils/format";

interface VersionsTabProps {
  document: DocumentDetail;
  onDownload: (version: number, fileName: string) => void;
  onPreview: (target: { version: number; fileName: string; contentType: string }) => void;
  onUpload: () => void;
  pendingDownloadKey?: string | null;
}

function versionStatus(source: DocumentVersion["source"]): string {
  return source === "DIGILOCKER" ? "Verified" : "Uploaded";
}

export function VersionsTab({
  document,
  onDownload,
  onPreview,
  onUpload,
  pendingDownloadKey,
}: VersionsTabProps) {
  const versions = document.versions;
  const countLabel = `${versions.length} ${versions.length === 1 ? "version" : "versions"}`;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby="ver-h">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="ver-h" className="text-base font-semibold leading-6 tracking-tight">
            Versions
          </h2>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Newest first. Sharing and downloads use the latest version unless you pick another.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onUpload}>
          <Upload />
          Upload new version
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No versions yet.</p>
      ) : (
        <Table>
          <caption className="sr-only">Versions of {document.typeName}</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Version</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => {
              const downloadKey = `${document.id}:${version.version}`;
              return (
                <TableRow key={version.version}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="num font-semibold">v{version.version}</span>
                      {version.latest ? (
                        <Badge variant="brand" dot={false}>
                          Latest
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="num whitespace-nowrap">{formatDisplayDate(version.createdAt)}</TableCell>
                  <TableCell className="num whitespace-nowrap">
                    {version.sizeBytes ? formatFileSize(version.sizeBytes) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{versionStatus(version.source)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex flex-wrap justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onPreview({
                            version: version.version,
                            fileName: version.fileName,
                            contentType: version.contentType,
                          })
                        }
                      >
                        <Eye />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={pendingDownloadKey === downloadKey}
                        onClick={() => onDownload(version.version, version.fileName)}
                      >
                        <Download />
                        Download
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <div className="border-t border-border px-4 py-3">
        <p className="text-[13px] leading-[18px] text-muted-foreground">{countLabel}</p>
      </div>
    </section>
  );
}
