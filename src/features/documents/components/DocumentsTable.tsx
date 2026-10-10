"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Download, Eye, Files, Loader2, Share2, Upload } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PortalDocument } from "../types";
import { formatDisplayDate, formatVersionLabel } from "../utils/format";
import { documentRelationLabel } from "@/features/profiles/utils/display";
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
  onView: (document: PortalDocument) => void;
  onUpdate: (document: PortalDocument) => void;
  onUpload: () => void;
}

function RowAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="h-8 w-8 border-slate-100 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
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
  onView,
  onUpdate,
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
            <p className="mt-1 text-sm font-normal text-slate-500">Try another type or search.</p>
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
    <Table className="min-w-[760px]">
      <TableHeader>
        <TableRow className="bg-slate-50/60 hover:bg-transparent">
          <TableHead className="h-9 w-10 px-3">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => onSelectVisible(!allSelected)}
              aria-label="Select all documents"
              className="h-4 w-4"
            />
          </TableHead>
          <TableHead className="h-9 px-3">Type</TableHead>
          <TableHead className="h-9 px-3">Category</TableHead>
          <TableHead className="h-9 px-3">Version</TableHead>
          <TableHead className="h-9 px-3">Source</TableHead>
          <TableHead className="h-9 px-3">Updated</TableHead>
          <TableHead className="h-9 px-3 text-right">Actions</TableHead>
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
            <TableCell className="h-11 px-3 py-1.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectedChange(document.id, checked === true)}
                aria-label={`Select ${label}`}
                className="h-4 w-4"
              />
            </TableCell>
            <TableCell className="h-11 px-3 py-1.5">
              <Link
                href={`/documents/${document.id}`}
                className="block rounded-md transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <span className="block text-[13px] font-semibold leading-4 tracking-tight text-slate-900">
                  {document.typeName}
                </span>
                {document.label ? (
                  <span className="mt-0.5 block text-xs font-normal leading-4 text-slate-500">{document.label}</span>
                ) : null}
              </Link>
              {document.linked && document.linked.length > 0 ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  {document.linked.map((item) => (
                    <Link
                      key={`${item.profileId}-${item.relation}`}
                      href={`/profiles/${item.profileId}`}
                      className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] leading-4 text-slate-600 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {item.displayName || "Profile"} · {documentRelationLabel(item.relation)}
                    </Link>
                  ))}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="h-11 px-3 py-1.5 text-[13px] text-slate-600">{document.category}</TableCell>
            <TableCell className="h-11 whitespace-nowrap px-3 py-1.5 text-[13px] font-medium text-slate-700">
              {formatVersionLabel(document.latestVersion, true)}
            </TableCell>
            <TableCell className="h-11 px-3 py-1.5">
              <SourceBadge source={document.source} />
            </TableCell>
            <TableCell className="h-11 whitespace-nowrap px-3 py-1.5 text-[13px] text-slate-500">
              {formatDisplayDate(document.updatedAt)}
            </TableCell>
            <TableCell className="h-11 px-3 py-1.5">
              <div className="flex justify-end gap-1">
                <RowAction label="Share" onClick={() => onShare(document)}>
                  <Share2 />
                </RowAction>
                <RowAction
                  label="Download"
                  disabled={pendingDownloadId === document.id}
                  onClick={() => onDownload(document)}
                >
                  {pendingDownloadId === document.id ? <Loader2 className="animate-spin" /> : <Download />}
                </RowAction>
                <RowAction label="View" onClick={() => onView(document)}>
                  <Eye />
                </RowAction>
                <RowAction label="Update" onClick={() => onUpdate(document)}>
                  <Upload />
                </RowAction>
              </div>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
