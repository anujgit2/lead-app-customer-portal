"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { useProfiles } from "@/features/profiles/api/queries";
import { useDocuments, useDocumentTypes } from "../api/queries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useFileDownload } from "../hooks/useFileDownload";
import type { PortalDocument } from "../types";
import { filterDocuments } from "../utils/format";
import { DocumentsTable } from "../components/DocumentsTable";
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

export function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [typeId, setTypeId] = useState("ALL");
  const [profileId, setProfileId] = useState("ALL");
  const [search, setSearch] = useState("");
  const deferredSearch = useDebouncedValue(search, 300);
  const importRequested = searchParams.get("import") === "digilocker";
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lockedUpload, setLockedUpload] = useState<LockedUpload | null>(null);
  const [importOpen, setImportOpen] = useState(importRequested);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareTargets, setShareTargets] = useState<PortalDocument[] | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PortalDocument | null>(null);
  const { download, pendingKey } = useFileDownload();

  const query = deferredSearch.trim();
  const filters = useMemo(
    () => ({
      ...(profileId !== "ALL" ? { profileId } : {}),
    }),
    [profileId]
  );

  const documents = useDocuments(filters);
  const documentTypes = useDocumentTypes();
  const profiles = useProfiles({ page: 0, size: 100, status: "ACTIVE" });
  const typeOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const type of documentTypes.data ?? []) names.set(type.id, type.name);
    for (const document of documents.data ?? []) {
      if (!names.has(document.typeId)) names.set(document.typeId, document.typeName);
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [documentTypes.data, documents.data]);
  const profileOptions = profiles.data?.content ?? [];
  const visible = filterDocuments(documents.data ?? [], {
    typeId: typeId === "ALL" ? undefined : typeId,
    q: query || undefined,
  });
  const visibleIds = new Set(visible.map((document) => document.id));
  const selectedDocuments = visible.filter((document) => selectedIds.includes(document.id));
  const isFiltered = typeId !== "ALL" || profileId !== "ALL" || query.length > 0;

  useEffect(() => {
    if (!importRequested) return;
    router.replace("/documents");
  }, [importRequested, router]);

  if (importRequested && !importOpen) setImportOpen(true);

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

  function openUpload(locked?: LockedUpload) {
    setLockedUpload(locked ?? null);
    setUploadOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Documents</h1>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Upload, find and share files for your application.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" className="h-11 gap-2" onClick={() => openUpload()}>
            <Upload className="h-4 w-4" />
            Upload document
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, type, label, file, or profile"
          aria-label="Search documents"
          startAdornment={<Search className="h-4 w-4" />}
          className="h-11 min-w-0 flex-1 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="w-full sm:w-48">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger className="h-11" aria-label="Document type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger className="h-11" aria-label="Profile">
              <SelectValue placeholder="All profiles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All profiles</SelectItem>
              {profileOptions.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.displayName || "Untitled profile"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedDocuments.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 ease-out sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm font-semibold tracking-tight text-slate-900" role="status">
            {selectedDocuments.length === 1
              ? "1 document selected"
              : `${selectedDocuments.length} documents selected`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)))}
            >
              Clear
            </Button>
            <Button
              type="button"
              className="h-11 gap-2"
              onClick={() => setShareTargets(selectedDocuments)}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="border-slate-100 shadow-sm">
        <CardContent className="p-0">
          <DocumentsTable
            documents={visible}
            isLoading={documents.isLoading}
            isFiltered={isFiltered}
            selectedIds={selectedIds}
            pendingDownloadId={pendingKey?.split(":")[0] ?? null}
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
                const hidden = current.filter((id) => !visibleIds.has(id));
                return selected ? [...hidden, ...visible.map((document) => document.id)] : hidden;
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
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
