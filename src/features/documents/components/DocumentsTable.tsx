"use client";

import Link from "next/link";
import { Download, Files, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PortalDocument } from "../types";
import { formatDisplayDate, formatVersionLabel } from "../utils/format";
import { SourceBadge } from "./SourceBadge";

interface DocumentsTableProps {
  documents: PortalDocument[];
  isLoading?: boolean;
  isFiltered?: boolean;
  selectedIds: string[];
  pendingDownloadId?: string | null;
  onSelectedChange: (id: string, selected: boolean) => void;
  onSelectVisible: (selected: boolean) => void;
  onShare: (document: PortalDocument) => void;
  onDownload: (document: PortalDocument) => void;
  onUpload: () => void;
}

export function DocumentsTable({
  documents,
  isLoading,
  isFiltered,
  selectedIds,
  pendingDownloadId,
  onSelectedChange,
  onSelectVisible,
  onShare,
  onDownload,
  onUpload,
}: DocumentsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true">
        <p className="sr-only">Loading documents</p>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <Files className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        {isFiltered ? (
          <>
            <p className="text-base font-semibold tracking-tight text-slate-900">No matching documents</p>
            <p className="mt-1 text-sm font-normal text-slate-500">Try another category or search.</p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold tracking-tight text-slate-900">No documents yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm font-normal text-slate-500">
              Upload a file to keep statements, identity proof and other paperwork in one place.
            </p>
            <Button type="button" className="mt-6 h-11" onClick={onUpload}>
              Upload document
            </Button>
          </>
        )}
      </div>
    );
  }

  const selected = new Set(selectedIds);
  const allSelected = documents.every((document) => selected.has(document.id));
  const someSelected = documents.some((document) => selected.has(document.id));

  return (
    <Table className="min-w-[920px]">
      <TableHeader>
        <TableRow className="bg-slate-50/60 hover:bg-transparent">
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => onSelectVisible(!allSelected)}
              aria-label="Select all documents"
              className="h-5 w-5"
            />
          </TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((document) => {
          const isSelected = selected.has(document.id);
          const label = document.label ? `${document.typeName}, ${document.label}` : document.typeName;
          return (
          <TableRow
            key={document.id}
            data-state={isSelected ? "selected" : undefined}
            className={cn("hover:bg-slate-50", isSelected && "bg-slate-50")}
          >
            <TableCell className="py-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectedChange(document.id, checked === true)}
                aria-label={`Select ${label}`}
                className="h-5 w-5"
              />
            </TableCell>
            <TableCell className="py-3">
              <Link
                href={`/documents/${document.id}`}
                className="block rounded-md transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <span className="block text-sm font-semibold tracking-tight text-slate-900">
                  {document.typeName}
                </span>
                {document.label ? (
                  <span className="mt-0.5 block text-sm font-normal text-slate-500">{document.label}</span>
                ) : null}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-slate-600">{document.category}</TableCell>
            <TableCell className="whitespace-nowrap text-sm font-medium text-slate-700">
              {formatVersionLabel(document.latestVersion, true)}
            </TableCell>
            <TableCell>
              <SourceBadge source={document.source} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-slate-500">
              {formatDisplayDate(document.updatedAt)}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2"
                  onClick={() => onShare(document)}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2"
                  loading={pendingDownloadId === document.id}
                  onClick={() => onDownload(document)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
