"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { parseApiError } from "@/lib/api-error";
import { useProfiles } from "@/features/profiles/api/queries";
import { useDocuments, useDocumentTypes } from "../api/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFileDownload } from "../hooks/useFileDownload";
import type { PortalDocument } from "../types";
import { filterDocuments } from "../utils/format";
import {
  DocumentsTable,
  type DocumentSortDir,
  type DocumentSortKey,
} from "../components/DocumentsTable";
import { FilePreviewDialog } from "../components/FilePreviewDialog";
import { ImportDialog } from "../components/ImportDialog";
import { ShareDialog } from "../components/ShareDialog";
import { UploadDialog, type LockedUpload } from "../components/UploadDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [10, 25, 50] as const;

function shownCount(loading: boolean, count: number): string {
  return loading ? "–" : String(count);
}

function updatedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function documentSortName(document: PortalDocument): string {
  const fileName = document.fileName?.trim();
  return `${fileName || document.typeName}${document.label}`;
}

function listCount(total: number, page: number, size: number, visible: number): string {
  if (total === 0) return "0 documents";
  if (total <= size) return total === 1 ? "1 document" : `${total} documents`;
  const start = page * size + 1;
  return `Showing ${start}–${start + visible - 1} of ${total} documents`;
}

export function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [typeId, setTypeId] = useState("ALL");
  const [profileId, setProfileId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(10);
  const [sort, setSort] = useState<DocumentSortKey>("updated");
  const [dir, setDir] = useState<DocumentSortDir>("desc");
  const deferredSearch = useDebouncedValue(search, 300);
  const importRequested = searchParams.get("import") === "digilocker";
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lockedUpload, setLockedUpload] = useState<LockedUpload | null>(null);
  const [importOpen, setImportOpen] = useState(importRequested);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareTargets, setShareTargets] = useState<PortalDocument[] | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PortalDocument | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const { download, pendingKey } = useFileDownload();

  const query = deferredSearch.trim();
  const documents = useDocuments({});
  const documentTypes = useDocumentTypes();
  const profiles = useProfiles({ page: 0, size: 100, status: "ACTIVE" });
  const allDocuments = documents.data;

  const typeScope = useMemo(
    () =>
      filterDocuments(allDocuments ?? [], {
        q: query || undefined,
        profileId: profileId === "ALL" ? undefined : profileId,
      }),
    [allDocuments, query, profileId]
  );
  const profileScope = useMemo(
    () =>
      filterDocuments(allDocuments ?? [], {
        q: query || undefined,
        typeId: typeId === "ALL" ? undefined : typeId,
      }),
    [allDocuments, query, typeId]
  );
  const visible = useMemo(
    () =>
      filterDocuments(allDocuments ?? [], {
        typeId: typeId === "ALL" ? undefined : typeId,
        profileId: profileId === "ALL" ? undefined : profileId,
        q: query || undefined,
      }),
    [allDocuments, typeId, profileId, query]
  );

  const typeOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const type of documentTypes.data ?? []) names.set(type.id, type.name);
    const present = new Map<string, string>();
    for (const document of allDocuments ?? []) {
      present.set(document.typeId, names.get(document.typeId) || document.typeName);
    }
    return [...present.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [documentTypes.data, allDocuments]);

  const profileOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const profile of profiles.data?.content ?? []) {
      names.set(profile.id, profile.displayName || "Untitled profile");
    }
    for (const document of allDocuments ?? []) {
      for (const item of document.linked ?? []) {
        if (!names.has(item.profileId)) names.set(item.profileId, item.displayName || "Untitled profile");
      }
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [profiles.data, allDocuments]);

  const sorted = useMemo(() => {
    const rows = [...visible];
    rows.sort((left, right) => {
      const result =
        sort === "name"
          ? documentSortName(left).localeCompare(documentSortName(right), undefined, { sensitivity: "base" })
          : updatedTime(left.updatedAt) - updatedTime(right.updatedAt);
      return dir === "asc" ? result : -result;
    });
    return rows;
  }, [visible, sort, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const pageIndex = Math.min(page, pageCount - 1);
  const pageDocuments = sorted.slice(pageIndex * size, pageIndex * size + size);
  const pageIds = new Set(pageDocuments.map((document) => document.id));
  const selectedDocuments = (allDocuments ?? []).filter((document) => selectedIds.includes(document.id));
  const isFiltered = typeId !== "ALL" || profileId !== "ALL" || query.length > 0;
  const loading = documents.isLoading && !documents.data;

  useEffect(() => {
    if (!importRequested) return;
    router.replace("/documents");
  }, [importRequested, router]);

  if (importRequested && !importOpen) setImportOpen(true);

  function openUpload(locked?: LockedUpload) {
    setLockedUpload(locked ?? null);
    setUploadOpen(true);
  }

  function clearFilters() {
    setTypeId("ALL");
    setProfileId("ALL");
    setSearch("");
    setPage(0);
  }

  function changeSort(column: DocumentSortKey) {
    setPage(0);
    if (sort === column) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(column);
    setDir(column === "name" ? "asc" : "desc");
  }

  async function downloadSelected() {
    setBulkDownloading(true);
    try {
      for (const document of selectedDocuments) {
        await download(document.id, document.latestVersion, document.fileName || document.typeName);
      }
    } finally {
      setBulkDownloading(false);
    }
  }

  if (documents.isError) {
    const apiError = parseApiError(documents.error);
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <ErrorState
          compact
          title="Unable to load documents"
          message={apiError.message}
          code={apiError.status === 401 ? "SESSION_EXPIRED" : apiError.status === 403 ? "FORBIDDEN" : "UNKNOWN"}
          status={apiError.status}
          onRetry={() => {
            void documents.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Documents"
        description="Upload, find and share files for your application."
        actions={
          <Button type="button" className="w-full sm:w-auto" onClick={() => openUpload()} size="sm">
            <Upload className="h-4 w-4" />
            Upload document
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-full sm:max-w-[420px] sm:basis-[280px]">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            type="search"
            placeholder="Search name, type, label, file, or profile"
            aria-label="Search documents"
            autoComplete="off"
            startAdornment={<Search className="h-4 w-4" />}
            className="h-8 text-[13px]"
          />
        </div>
        <Select
          value={typeId}
          onValueChange={(value) => {
            setTypeId(value);
            setPage(0);
          }}
        >
          <SelectTrigger
            className="h-8 w-auto min-w-[140px] flex-1 basis-[140px] rounded-md px-3 text-[13px] font-medium sm:w-auto sm:min-w-[168px] sm:flex-none"
            aria-label="Filter by type"
          >
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types ({shownCount(loading, typeScope.length)})</SelectItem>
            {typeOptions.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name} ({shownCount(loading, typeScope.filter((document) => document.typeId === type.id).length)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={profileId}
          onValueChange={(value) => {
            setProfileId(value);
            setPage(0);
          }}
        >
          <SelectTrigger
            className="h-8 w-auto min-w-[140px] flex-1 basis-[140px] rounded-md px-3 text-[13px] font-medium sm:w-auto sm:min-w-[180px] sm:flex-none"
            aria-label="Filter by profile"
          >
            <SelectValue placeholder="All profiles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">
              All profiles ({shownCount(loading, profileScope.length)})
            </SelectItem>
            {profileOptions.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name} (
                {shownCount(
                  loading,
                  profileScope.filter((document) =>
                    (document.linked ?? []).some((item) => item.profileId === profile.id)
                  ).length
                )}
                )
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section
        className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        aria-label="Documents list"
      >
        {selectedDocuments.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-primary-soft px-3 py-1.5 text-[13px] font-semibold text-primary-soft-foreground">
            <p role="status">{selectedDocuments.length} selected</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShareTargets(selectedDocuments)}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={bulkDownloading || !!pendingKey}
                onClick={() => {
                  void downloadSelected();
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary-soft-foreground hover:bg-card/70"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}
        <DocumentsTable
          documents={pageDocuments}
          isLoading={loading}
          isFiltered={isFiltered}
          selectedIds={selectedIds}
          pendingDownloadId={pendingKey?.split(":")[0] ?? null}
          sort={sort}
          dir={dir}
          onSort={changeSort}
          onSelectedChange={(id, selected) => {
            setSelectedIds((current) =>
              selected
                ? current.includes(id)
                  ? current
                  : [...current, id]
                : current.filter((item) => item !== id)
            );
          }}
          onSelectVisible={(selected) => {
            setSelectedIds((current) => {
              const hidden = current.filter((id) => !pageIds.has(id));
              return selected ? [...hidden, ...pageDocuments.map((document) => document.id)] : hidden;
            });
          }}
          onShare={(document) => setShareTargets([document])}
          onDownload={(document) => {
            void download(document.id, document.latestVersion, document.fileName || document.typeName);
          }}
          onView={setPreviewTarget}
          onUpdate={(document) =>
            openUpload({
              documentId: document.id,
              typeId: document.typeId,
              typeName: document.typeName,
              label: document.label,
              category: document.category,
            })
          }
          onUpload={() => openUpload()}
          onOpen={(document) => router.push(`/documents/${document.id}`)}
          onClearFilters={clearFilters}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
          <p className="text-[13px] text-muted-foreground" role="status">
            {loading ? "Loading documents" : listCount(sorted.length, pageIndex, size, pageDocuments.length)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(size)}
              onValueChange={(value) => {
                setSize(Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-auto rounded-md px-3 text-[13px] font-medium" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={loading || pageIndex <= 0}
                onClick={() => setPage(Math.max(0, pageIndex - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span
                className="min-w-14 text-center text-[13px] tabular-nums text-muted-foreground"
                aria-live="polite"
              >
                {pageIndex + 1} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={loading || pageIndex + 1 >= pageCount}
                onClick={() => setPage(pageIndex + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) setLockedUpload(null);
        }}
        locked={lockedUpload ?? undefined}
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
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onUploadInstead={() => {
          setImportOpen(false);
          setUploadOpen(true);
        }}
      />
      <ShareDialog
        open={!!shareTargets?.length}
        onOpenChange={(open) => {
          if (!open) setShareTargets(null);
        }}
        documents={(shareTargets ?? []).map((document) => ({
          id: document.id,
          name: document.fileName || document.typeName,
          fileName: document.fileName,
          typeName: document.typeName,
          tag: document.label || undefined,
        }))}
      />
    </PageShell>
  );
}
