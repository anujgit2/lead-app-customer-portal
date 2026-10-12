"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  FileText,
  Files,
  Loader2,
  MoreHorizontal,
  Search,
  Share2,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/SortableTableHead";
import { TableSkeletonRows } from "@/components/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProfileAvatar } from "@/features/profiles/components/ProfileBadges";
import type { LinkedDocumentProfile } from "@/types";
import type { PortalDocument } from "../types";
import { categoryKey, categoryLabel, formatDisplayDate } from "../utils/format";
import { SourceBadge } from "./SourceBadge";

export type DocumentSortKey = "name" | "updated";
export type DocumentSortDir = SortDirection;

interface DocumentsTableProps {
  documents: PortalDocument[];
  isLoading?: boolean;
  isFiltered?: boolean;
  selectedIds: string[];
  pendingDownloadId?: string | null;
  sort: DocumentSortKey;
  dir: DocumentSortDir;
  onSort: (column: DocumentSortKey) => void;
  onSelectedChange: (id: string, selected: boolean) => void;
  onSelectVisible: (selected: boolean) => void;
  onShare: (document: PortalDocument) => void;
  onDownload: (document: PortalDocument) => void;
  onView: (document: PortalDocument) => void;
  onUpdate: (document: PortalDocument) => void;
  onUpload: () => void;
  onOpen: (document: PortalDocument) => void;
  onClearFilters: () => void;
}

function documentTypeCode(typeId: string, typeName: string): string {
  const id = typeId.trim();
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(id) && (id.includes("_") || id === id.toUpperCase()) && id.length > 1) {
    return id.toUpperCase();
  }
  const fromName = typeName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return fromName || "DOCUMENT";
}

function primaryProfile(document: PortalDocument): LinkedDocumentProfile | undefined {
  const linked = document.linked ?? [];
  return linked.find((item) => item.relation === "FOR") ?? linked[0];
}

function profileName(profile: LinkedDocumentProfile | undefined): string {
  return profile?.displayName?.trim() || "Untitled profile";
}

const SortHeader = SortableTableHead<DocumentSortKey>;

function MenuAction({
  icon,
  children,
  disabled,
  onSelect,
}: {
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      className="px-2.5 py-[7px] text-[13px]"
      onSelect={onSelect}
    >
      {icon}
      {children}
    </DropdownMenuItem>
  );
}

export function DocumentsTable({
  documents,
  isLoading,
  isFiltered,
  selectedIds,
  pendingDownloadId,
  sort,
  dir,
  onSort,
  onSelectedChange,
  onSelectVisible,
  onShare,
  onDownload,
  onView,
  onUpdate,
  onUpload,
  onOpen,
  onClearFilters,
}: DocumentsTableProps) {
  const selected = new Set(selectedIds);
  const allSelected = documents.length > 0 && documents.every((document) => selected.has(document.id));
  const someSelected = documents.some((document) => selected.has(document.id));

  return (
    <Table className="text-[13px] [&_td]:h-[52px] [&_td]:px-3 [&_th]:h-[38px] [&_th]:px-3 [&_th]:text-xs">
      <caption className="sr-only">Documents</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-9 pr-0">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={() => onSelectVisible(!allSelected)}
              aria-label="Select all on this page"
              disabled={isLoading || documents.length === 0}
              className="h-4 w-4"
            />
          </TableHead>
          <SortHeader label="Document" column="name" sort={sort} dir={dir} onSort={onSort} />
          <TableHead className="hidden min-[901px]:table-cell">Category</TableHead>
          <TableHead className="hidden min-[901px]:table-cell">Profile</TableHead>
          <TableHead>Version</TableHead>
          <TableHead className="hidden min-[901px]:table-cell">Source</TableHead>
          <SortHeader
            label="Updated"
            column="updated"
            sort={sort}
            dir={dir}
            onSort={onSort}
            className="hidden sm:table-cell"
          />
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows label="Loading documents" columns={8} />
        ) : documents.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={8} className="h-auto !p-0">
              <EmptyState
                icon={isFiltered ? Search : Files}
                title={isFiltered ? "No documents found" : "No documents yet"}
                description={
                  isFiltered
                    ? "Try a different search or clear the filters."
                    : "Upload a file to keep statements, identity proof and other paperwork in one place."
                }
                action={
                  isFiltered ? (
                    <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={onUpload}>
                      Upload document
                    </Button>
                  )
                }
              />
            </TableCell>
          </TableRow>
        ) : (
          documents.map((document) => {
            const isSelected = selected.has(document.id);
            const fileName = document.fileName?.trim() ?? "";
            const title = fileName || document.typeName;
            const label = document.label ? `${title} ${document.label}` : title;
            const profile = primaryProfile(document);
            const extraProfiles = Math.max(0, (document.linked?.length ?? 0) - (profile ? 1 : 0));
            const name = profile ? profileName(profile) : "";
            const updated = formatDisplayDate(document.updatedAt);
            const financial = categoryKey(document.category) === "FINANCIALS";
            const downloading = pendingDownloadId === document.id;
            return (
              <TableRow
                key={document.id}
                tabIndex={0}
                aria-selected={isSelected}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpen(document)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(document);
                  }
                }}
              >
                <TableCell className="w-9 pr-0" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectedChange(document.id, checked === true)}
                    aria-label={`Select ${label}`}
                    className="h-4 w-4"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="tone-brand grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold leading-[18px] text-foreground">
                        <Link
                          href={`/documents/${document.id}`}
                          className="min-w-0 truncate rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {title}
                        </Link>
                        {document.label ? (
                          <Badge variant="outline" dot={false} size="sm">
                            {document.label}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-px block truncate text-[12px] leading-4 text-muted-foreground">
                        {fileName && fileName !== document.typeName
                          ? document.typeName
                          : documentTypeCode(document.typeId, document.typeName)}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground min-[901px]:hidden">
                        {name ? `${name} · ${updated}` : updated}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden min-[901px]:table-cell">
                  <Badge variant={financial ? "brand" : "info"} size="sm">
                    {categoryLabel(categoryKey(document.category), document.category)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden min-[901px]:table-cell">
                  {profile ? (
                    <div className="flex min-w-0 items-center gap-1.5">
                      <ProfileAvatar name={name} size="xs" />
                      <span className="truncate">{name}</span>
                      {extraProfiles > 0 ? (
                        <span className="shrink-0 text-xs text-muted-foreground">+{extraProfiles}</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="secondary" dot={false} size="xs" className="rounded-md tabular-nums">
                    v{document.latestVersion}
                  </Badge>
                  <Badge variant="success" dot={false} size="sm" className="ml-1">
                    Latest
                  </Badge>
                </TableCell>
                <TableCell className="hidden min-[901px]:table-cell">
                  <SourceBadge source={document.source} size="sm" />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                  {updated}
                </TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${label}`}
                        className="text-muted-foreground hover:bg-primary-soft hover:text-primary data-[state=open]:bg-primary-soft data-[state=open]:text-primary"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[210px]">
                      <MenuAction
                        icon={<Eye className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => onView(document)}
                      >
                        Preview
                      </MenuAction>
                      <MenuAction
                        disabled={downloading}
                        icon={
                          downloading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Download className="h-4 w-4 text-muted-foreground" />
                          )
                        }
                        onSelect={() => onDownload(document)}
                      >
                        Download
                      </MenuAction>
                      <MenuAction
                        icon={<Share2 className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => onShare(document)}
                      >
                        Share
                      </MenuAction>
                      <DropdownMenuSeparator />
                      <MenuAction
                        icon={<Upload className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => onUpdate(document)}
                      >
                        Upload new version
                      </MenuAction>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
