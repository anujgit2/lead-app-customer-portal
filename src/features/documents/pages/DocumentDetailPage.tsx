"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Link2, Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseApiError } from "@/lib/api-error";
import { formatFileSize } from "@/lib/utils";
import { useDocument } from "../api/queries";
import { useDocumentRouteId } from "../hooks/usePathSegment";
import { useFileDownload } from "../hooks/useFileDownload";
import type { DocumentDetail } from "../types";
import { categoryLabel, categoryKey, formatDisplayDate, formatVersionLabel } from "../utils/format";
import { ShareDialog } from "../components/ShareDialog";
import { SharingTab } from "../components/SharingTab";
import { SourceBadge } from "../components/SourceBadge";
import { UploadDialog } from "../components/UploadDialog";
import { DocumentProfileLinks } from "../components/DocumentProfileLinks";
import { VersionsTab } from "../components/VersionsTab";

function fileKindLabel(contentType?: string, fileName?: string): string {
  const type = (contentType ?? "").toLowerCase();
  const name = fileName?.toLowerCase() ?? "";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (type.startsWith("image/")) return type.slice("image/".length).split("+")[0]?.toUpperCase() || "Image";
  if (type.includes("spreadsheet") || type.includes("excel") || /\.xlsx?$/.test(name)) return "Spreadsheet";
  if (type.includes("word") || /\.docx?$/.test(name)) return "Word";
  if (type.includes("csv") || name.endsWith(".csv")) return "CSV";
  const extension = name.includes(".") ? name.split(".").pop() : "";
  if (extension) return extension.toUpperCase();
  return contentType || "—";
}

function DocumentFileMeta({
  document,
  onShare,
  onUpload,
  onLinkProfile,
}: {
  document: DocumentDetail;
  onShare: () => void;
  onUpload: () => void;
  onLinkProfile: () => void;
}) {
  const latest = document.versions.find((version) => version.latest) ?? document.versions[0];
  const fileName = latest?.fileName || document.fileName || "—";
  const sizeBytes = latest?.sizeBytes ?? document.sizeBytes;
  const contentType = latest?.contentType || document.contentType;
  const updatedAt = latest?.createdAt || document.updatedAt;
  const fields = [
    { label: "File name", value: fileName },
    { label: "Type", value: document.typeName },
    { label: "Category", value: categoryLabel(categoryKey(document.category), document.category) },
    { label: "Size", value: sizeBytes ? formatFileSize(sizeBytes) : "—" },
    { label: "Format", value: fileKindLabel(contentType, fileName === "—" ? undefined : fileName) },
    {
      label: "Version",
      value: formatVersionLabel(latest?.version ?? document.latestVersion, true, "detail"),
    },
    { label: "Updated", value: formatDisplayDate(updatedAt) },
    ...(document.label ? [{ label: "Label", value: document.label }] : []),
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-100 bg-card shadow-sm">
      <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-xs font-medium text-slate-500">{field.label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold tracking-tight text-slate-900">{field.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap justify-end gap-1 border-t border-slate-100 px-4 py-3">
        <Button type="button" variant="link" className="gap-1.5 px-2" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button type="button" variant="link" className="gap-1.5 px-2" onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Upload New
        </Button>
        <Button type="button" variant="link" className="gap-1.5 px-2" onClick={onLinkProfile}>
          <Link2 className="h-4 w-4" />
          Link Profile
        </Button>
      </div>
    </section>
  );
}

export function DocumentDetailPage() {
  const route = useDocumentRouteId();
  const id = route.value ?? "";
  const documentQuery = useDocument(id);
  const { download, pendingKey } = useFileDownload();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  if (!route.ready || documentQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6 sm:p-8" aria-busy="true">
        <p className="sr-only">Loading document</p>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (documentQuery.isError) {
    const apiError = parseApiError(documentQuery.error);
    if (apiError.status === 404) {
      return (
        <div className="mx-auto max-w-xl space-y-4 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            We couldn&apos;t find this document
          </h1>
          <p className="text-sm font-normal text-slate-500">It may have been removed.</p>
          <Button asChild className="h-11">
            <Link href="/documents">Back to documents</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <ErrorState
          compact
          title="Unable to load document"
          message={apiError.message}
          status={apiError.status}
          code={apiError.status === 401 ? "SESSION_EXPIRED" : apiError.status === 403 ? "FORBIDDEN" : "UNKNOWN"}
          onRetry={() => {
            void documentQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!documentQuery.data) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          We couldn&apos;t find this document
        </h1>
        <Button asChild className="h-11">
          <Link href="/documents">Back to documents</Link>
        </Button>
      </div>
    );
  }

  const document = documentQuery.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 sm:p-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link
          href="/documents"
          className="rounded-sm transition-colors duration-200 hover:text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          Documents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
        <span className="font-medium text-slate-900" aria-current="page">
          {document.typeName}
        </span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{document.typeName}</h1>
        {document.label ? <p className="text-sm font-normal text-slate-500">{document.label}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">
            {categoryLabel(categoryKey(document.category), document.category)}
          </span>
          <SourceBadge source={document.source} />
        </div>
      </div>

      <DocumentFileMeta
        document={document}
        onShare={() => setShareOpen(true)}
        onUpload={() => setUploadOpen(true)}
        onLinkProfile={() => setLinkOpen(true)}
      />

      <DocumentProfileLinks
        documentId={document.id}
        linked={document.linked ?? []}
        linkOpen={linkOpen}
        onLinkOpenChange={setLinkOpen}
      />

      <Tabs defaultValue="versions">
        <TabsList className="h-11">
          <TabsTrigger value="versions" className="min-h-9 px-4">
            Versions
          </TabsTrigger>
          <TabsTrigger value="sharing" className="min-h-9 px-4">
            Sharing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="versions" className="mt-6">
          <VersionsTab
            document={document}
            pendingDownloadKey={pendingKey}
            onDownload={(version, fileName) => {
              void download(document.id, version, fileName);
            }}
          />
        </TabsContent>
        <TabsContent value="sharing" className="mt-6">
          <SharingTab documentId={document.id} onShare={() => setShareOpen(true)} />
        </TabsContent>
      </Tabs>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        locked={{
          documentId: document.id,
          typeId: document.typeId,
          typeName: document.typeName,
          label: document.label,
          category: document.category,
        }}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        documents={[
          {
            id: document.id,
            name: document.fileName || document.typeName,
            fileName: document.fileName,
            typeName: document.typeName,
            tag: document.label || undefined,
          },
        ]}
      />
    </div>
  );
}
