"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Share2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { useDocuments } from "../api/queries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useFileDownload } from "../hooks/useFileDownload";
import type { PortalDocument } from "../types";
import { categoryFiltersFor, filterDocuments } from "../utils/format";
import { CategoryFilter } from "../components/CategoryFilter";
import { DocumentsTable } from "../components/DocumentsTable";
import { ImportDialog } from "../components/ImportDialog";
import { ShareDialog } from "../components/ShareDialog";
import { UploadDialog } from "../components/UploadDialog";

export function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const deferredSearch = useDebouncedValue(search, 300);
  const importRequested = searchParams.get("import") === "digilocker";
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(importRequested);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareTargets, setShareTargets] = useState<PortalDocument[] | null>(null);
  const { download, pendingKey } = useFileDownload();

  const query = deferredSearch.trim();
  const filters = useMemo(() => ({ q: query || undefined }), [query]);

  const documents = useDocuments(filters);
  const categories = categoryFiltersFor((documents.data ?? []).map((document) => document.category));
  const visible = filterDocuments(documents.data ?? [], {
    category: category === "ALL" ? undefined : category,
    q: query || undefined,
  });
  const visibleIds = new Set(visible.map((document) => document.id));
  const selectedDocuments = visible.filter((document) => selectedIds.includes(document.id));

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
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            onClick={() => setImportOpen(true)}
          >
            <ShieldCheck className="h-4 w-4" />
            Import from DigiLocker
          </Button>
          <Button type="button" className="h-11 gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload document
          </Button>
        </div>
      </div>

      <CategoryFilter categories={categories} value={category} onChange={setCategory} />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by type or label"
        aria-label="Search by type or label"
        startAdornment={<Search className="h-4 w-4" />}
        className="h-11 max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

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
            isFiltered={category !== "ALL" || query.length > 0}
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
            onUpload={() => setUploadOpen(true)}
          />
        </CardContent>
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
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
          typeName: document.typeName,
          tag: document.label || undefined,
        }))}
      />
    </div>
  );
}
