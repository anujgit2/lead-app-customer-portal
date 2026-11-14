"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeletonRows } from "@/components/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePreviewDialog } from "@/features/documents/components/FilePreviewDialog";
import { ShareDialog } from "@/features/documents/components/ShareDialog";
import { UploadDialog, type LockedUpload } from "@/features/documents/components/UploadDialog";
import { useDocuments } from "@/features/documents/api/queries";
import { useLinkDocumentProfile } from "@/features/documents/api/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFileDownload } from "@/features/documents/hooks/useFileDownload";
import { categoryKey, categoryLabel } from "@/features/documents/utils/format";
import type { PortalDocument } from "@/features/documents/types";
import { parseApiError } from "@/lib/api-error";
import { cn, formatFileSize } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerProfileDetail, DocumentProfileRelation } from "@/types";
import { formatProfileDay } from "../utils/display";

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

interface ProfileDocumentsTabProps {
  profile: CustomerProfileDetail;
}

export function ProfileDocumentsTab({ profile }: ProfileDocumentsTabProps) {
  const router = useRouter();
  const [relation, setRelation] = useState<"ALL" | DocumentProfileRelation>("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lockedUpload, setLockedUpload] = useState<LockedUpload | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PortalDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<PortalDocument | null>(null);
  const { download, pendingKey } = useFileDownload();
  const documents = useDocuments({
    profileId: profile.id,
    ...(relation === "ALL" ? {} : { relation }),
  });
  const rows = documents.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold leading-6 tracking-[-0.01em]">Documents</h2>
          <p className="text-[13px] leading-[18px] text-muted-foreground">Files uploaded for this profile.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-md bg-muted p-[3px]" role="toolbar" aria-label="Document relation">
            {(
              [
                ["ALL", "All"],
                ["RELATED_TO", "Related to"],
                ["FOR", "For"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={relation === id}
                onClick={() => setRelation(id)}
                className={cn(
                  "h-7 shrink-0 rounded-sm px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  relation === id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            Link existing
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setLockedUpload(null);
              setUploadOpen(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Upload document
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-1)]">
        <Table>
          <caption className="sr-only">Documents for this profile</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[38px] px-3">Document</TableHead>
              <TableHead className="h-[38px] px-3">Category</TableHead>
              <TableHead className="h-[38px] px-3">Version</TableHead>
              <TableHead className="hidden h-[38px] px-3 sm:table-cell">Size</TableHead>
              <TableHead className="hidden h-[38px] px-3 sm:table-cell">Updated</TableHead>
              <TableHead className="h-[38px] w-16 px-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.isLoading ? (
              <TableSkeletonRows label="Loading documents" columns={6} rows={3} />
            ) : null}
            {documents.isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-auto p-4">
                  <ErrorState
                    compact
                    title="Unable to load documents"
                    message={parseApiError(documents.error).message}
                    onRetry={() => {
                      void documents.refetch();
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : null}
            {!documents.isLoading && !documents.isError && rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-auto p-0">
                  <EmptyState
                    icon={Files}
                    title="No documents yet"
                    description="Upload a document for this profile."
                  />
                </TableCell>
              </TableRow>
            ) : null}
            {!documents.isLoading && !documents.isError
              ? rows.map((document) => {
                  const financial = categoryKey(document.category) === "FINANCIALS";
                  const downloading = pendingKey === `${document.id}:${document.latestVersion}`;
                  const label = document.label ? `${document.typeName} ${document.label}` : document.typeName;
                  return (
                    <TableRow
                      key={document.id}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => router.push(`/documents/${document.id}`)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/documents/${document.id}`);
                        }
                      }}
                    >
                      <TableCell className="px-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="tone-brand grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm">
                            <FileText className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5 font-semibold leading-[18px]">
                              {document.typeName}
                              {document.label ? (
                                <Badge variant="outline" dot={false} size="sm">
                                  {document.label}
                                </Badge>
                              ) : null}
                            </span>
                            <span className="block truncate font-mono text-xs leading-4 text-muted-foreground">
                              {documentTypeCode(document.typeId, document.typeName)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3">
                        <Badge variant={financial ? "brand" : "info"} size="sm">
                          {categoryLabel(categoryKey(document.category), document.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3">
                        <Badge variant="secondary" dot={false} size="sm" className="rounded-md tabular-nums">
                          v{document.latestVersion}
                        </Badge>
                        <Badge variant="success" dot={false} size="sm" className="ml-1">
                          Latest
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap px-3 text-muted-foreground tabular-nums sm:table-cell">
                        {document.sizeBytes ? formatFileSize(document.sizeBytes) : "—"}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap px-3 text-muted-foreground tabular-nums sm:table-cell">
                        {formatProfileDay(document.updatedAt)}
                      </TableCell>
                      <TableCell className="w-16 px-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-primary-soft hover:text-primary"
                              aria-label={`Actions for ${label}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[210px]">
                            <DropdownMenuItem className="px-2.5 py-[7px] text-[13px]" onSelect={() => setPreviewTarget(document)}>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="px-2.5 py-[7px] text-[13px]"
                              disabled={downloading}
                              onSelect={() => {
                                void download(
                                  document.id,
                                  document.latestVersion,
                                  document.fileName || document.typeName
                                );
                              }}
                            >
                              {downloading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Download className="h-4 w-4 text-muted-foreground" />
                              )}
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="px-2.5 py-[7px] text-[13px]" onSelect={() => setShareTarget(document)}>
                              <Share2 className="h-4 w-4 text-muted-foreground" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="px-2.5 py-[7px] text-[13px]"
                              onSelect={() => {
                                setLockedUpload({
                                  documentId: document.id,
                                  typeId: document.typeId,
                                  typeName: document.typeName,
                                  label: document.label,
                                  category: document.category,
                                });
                                setUploadOpen(true);
                              }}
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              Upload new version
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              : null}
          </TableBody>
        </Table>
      </section>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) setLockedUpload(null);
        }}
        locked={lockedUpload ?? undefined}
        presetProfile={
          lockedUpload
            ? undefined
            : {
                profileId: profile.id,
                displayName: profile.displayName || "This profile",
                relation: relation === "ALL" ? "RELATED_TO" : relation,
              }
        }
      />
      <FilePreviewDialog
        open={!!previewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
        documentId={previewTarget?.id ?? ""}
        version={previewTarget?.latestVersion ?? 0}
        fileName={previewTarget?.fileName || previewTarget?.typeName || "document"}
        contentType={previewTarget?.contentType ?? ""}
        onDownload={(version, fileName) => {
          if (!previewTarget) return;
          void download(previewTarget.id, version, fileName);
        }}
      />
      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
        documents={
          shareTarget
            ? [
                {
                  id: shareTarget.id,
                  name: shareTarget.fileName || shareTarget.typeName,
                  fileName: shareTarget.fileName,
                  typeName: shareTarget.typeName,
                  tag: shareTarget.label || undefined,
                },
              ]
            : []
        }
      />
      {linkOpen ? <LinkExistingDialog profileId={profile.id} onOpenChange={setLinkOpen} /> : null}
    </div>
  );
}

function LinkExistingDialog({
  profileId,
  onOpenChange,
}: {
  profileId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [relation, setRelation] = useState<DocumentProfileRelation>("RELATED_TO");
  const [documentId, setDocumentId] = useState("");
  const query = useDebouncedValue(search, 300).trim();
  const filters = useMemo(() => ({ ...(query ? { q: query } : {}) }), [query]);
  const documents = useDocuments(filters);
  const link = useLinkDocumentProfile();

  return (
    <Dialog open onOpenChange={(next) => !link.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight text-foreground">Link an existing document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="existing-relation">Relation</Label>
            <Select value={relation} onValueChange={(value) => setRelation(value as DocumentProfileRelation)}>
              <SelectTrigger id="existing-relation" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RELATED_TO">Related to</SelectItem>
                <SelectItem value="FOR">For</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            startAdornment={<Search className="h-4 w-4" />}
            className="h-11"
          />
          {documents.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {parseApiError(documents.error).message}
            </p>
          ) : null}
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {(documents.data ?? []).map((document) => (
              <li key={document.id}>
                <button
                  type="button"
                  aria-pressed={documentId === document.id}
                  onClick={() => setDocumentId(document.id)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-all duration-200 ease-out hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
                >
                  <span className="font-medium text-foreground">{document.typeName}</span>
                  {document.label ? <span className="mt-0.5 block text-muted-foreground">{document.label}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!documentId}
            loading={link.isPending}
            onClick={() => {
              link.mutate(
                { documentId, profileId, relation },
                {
                  onSuccess: () => {
                    toast.success("Document linked");
                    onOpenChange(false);
                  },
                  onError: (error) => toast.error(parseApiError(error).message),
                }
              );
            }}
          >
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
