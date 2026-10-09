"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseApiError } from "@/lib/api-error";
import { useDocument } from "../api/queries";
import { useDocumentRouteId } from "../hooks/usePathSegment";
import { useFileDownload } from "../hooks/useFileDownload";
import { categoryLabel, categoryKey } from "../utils/format";
import { ShareDialog } from "../components/ShareDialog";
import { SharingTab } from "../components/SharingTab";
import { SourceBadge } from "../components/SourceBadge";
import { UploadDialog } from "../components/UploadDialog";
import { VersionsTab } from "../components/VersionsTab";

export function DocumentDetailPage() {
  const route = useDocumentRouteId();
  const id = route.value ?? "";
  const documentQuery = useDocument(id);
  const { download, pendingKey } = useFileDownload();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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
      <Link
        href="/documents"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-500 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Documents
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        <Button type="button" className="h-11 gap-2" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" />
          Share securely
        </Button>
      </div>

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
            onUploadVersion={() => setUploadOpen(true)}
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
            typeName: document.typeName,
            tag: document.label || undefined,
          },
        ]}
      />
    </div>
  );
}
