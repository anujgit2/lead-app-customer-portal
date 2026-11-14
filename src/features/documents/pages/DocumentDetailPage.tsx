"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { formatFileSize } from "@/lib/utils";
import { useDocument } from "../api/queries";
import { useDocumentRouteId } from "../hooks/usePathSegment";
import { useFileDownload } from "../hooks/useFileDownload";
import type { DocumentDetail, DocumentSource, DocumentVersion } from "../types";
import { downloadDocumentFile } from "../api/documentsApi";
import { categoryLabel, categoryKey, formatDisplayDate, previewKind } from "../utils/format";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { ShareDialog } from "../components/ShareDialog";
import { SharingTab } from "../components/SharingTab";
import { UploadDialog } from "../components/UploadDialog";
import { FilePreview } from "../components/FilePreview";
import { VersionsTab } from "../components/VersionsTab";

const heroInverse =
  "border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90 focus-visible:outline-primary-foreground";
const heroOutline =
  "border-primary-foreground/55 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-primary-foreground";

interface PreviewTarget {
  version: number;
  fileName: string;
  contentType: string;
}

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

function documentTypeCode(typeId: string, typeName: string): string {
  const compact = typeId.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(compact);
  if (!isUuid && /^[A-Za-z][A-Za-z0-9_-]{1,40}$/.test(compact)) {
    return compact.toUpperCase().replace(/-/g, "_");
  }
  return (
    typeName
      .trim()
      .toUpperCase()
      .replace(/&/g, " AND ")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "DOCUMENT"
  );
}

function statusLabel(source: DocumentSource): string {
  return source === "DIGILOCKER" ? "Verified" : "Uploaded";
}

function latestVersion(document: DocumentDetail): DocumentVersion | undefined {
  return document.versions.find((version) => version.latest) ?? document.versions[0];
}

function PageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 pb-16 sm:px-8 sm:pb-20">{children}</div>;
}

function DocumentPreviewPanel({
  documentId,
  target,
  onDownload,
}: {
  documentId: string;
  target: PreviewTarget | null;
  onDownload: (version: number, fileName: string) => void;
}) {
  const file = useQuery({
    queryKey: ["document-file", documentId, target?.version ?? 0],
    queryFn: () => downloadDocumentFile(documentId, target!.version, target!.fileName),
    enabled: !!target && target.version > 0,
    staleTime: Infinity,
    retry: false,
  });
  const url = useObjectUrl(file.data?.blob ?? null);
  const fileName = file.data?.fileName || target?.fileName || "document";
  const kind = target ? previewKind(file.data?.contentType || target.contentType, fileName) : null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby="preview-h">
      <div className="border-b border-border px-5 py-4">
        <h2 id="preview-h" className="text-base font-semibold leading-6 tracking-tight">
          Preview
        </h2>
        <p className="truncate text-[13px] leading-[18px] text-muted-foreground">
          {target ? `${fileName} · v${target.version}` : "No file to preview yet."}
        </p>
      </div>
      <div className="p-5">
        {!target ? (
          <p className="text-sm text-muted-foreground">Upload a version to preview this document.</p>
        ) : null}
        {file.isLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted" aria-busy="true">
            <p className="sr-only">Preparing preview</p>
          </div>
        ) : null}
        {file.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              We couldn&apos;t open the preview.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void file.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {url && kind ? <FilePreview kind={kind} url={url} title={fileName} /> : null}
        {file.data && !kind ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This file can&apos;t be shown here. You can download it instead.</p>
            <Button type="button" size="sm" onClick={() => onDownload(target!.version, fileName)}>
              <Download />
              Download
            </Button>
          </div>
        ) : null}
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
  const [tab, setTab] = useState("versions");
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  if (!route.ready || documentQuery.isLoading) {
    return (
      <PageFrame>
        <div className="space-y-6" aria-busy="true">
          <p className="sr-only">Loading document</p>
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-44 animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
        </div>
      </PageFrame>
    );
  }

  if (documentQuery.isError) {
    const apiError = parseApiError(documentQuery.error);
    if (apiError.status === 404) {
      return (
        <PageFrame>
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">We couldn&apos;t find this document</h1>
            <p className="text-sm text-muted-foreground">It may have been removed.</p>
            <Button asChild size="sm">
              <Link href="/documents">Back to documents</Link>
            </Button>
          </div>
        </PageFrame>
      );
    }
    return (
      <PageFrame>
        <div className="max-w-2xl">
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
      </PageFrame>
    );
  }

  if (!documentQuery.data) {
    return (
      <PageFrame>
        <div className="max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">We couldn&apos;t find this document</h1>
          <Button asChild size="sm">
            <Link href="/documents">Back to documents</Link>
          </Button>
        </div>
      </PageFrame>
    );
  }

  const document = documentQuery.data;
  const latest = latestVersion(document);
  const fileName = latest?.fileName || document.fileName || document.typeName;
  const sizeBytes = latest?.sizeBytes ?? document.sizeBytes;
  const contentType = latest?.contentType || document.contentType;
  const updatedAt = latest?.createdAt || document.updatedAt;
  const downloadKey = latest ? `${document.id}:${latest.version}` : null;
  const category = categoryLabel(categoryKey(document.category), document.category);

  const shownPreview =
    previewTarget ??
    (latest
      ? { version: latest.version, fileName: latest.fileName, contentType: latest.contentType }
      : null);

  const openPreview = (target: PreviewTarget) => {
    setPreviewTarget(target);
    setTab("preview");
  };

  return (
    <PageFrame>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/documents"
          className="rounded-sm transition-colors duration-200 hover:text-foreground hover:underline"
        >
          Documents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
        <span className="font-medium text-foreground" aria-current="page">
          {document.typeName}
        </span>
      </nav>

      <section
        aria-labelledby="doc-title"
        className="relative grid items-center gap-5 overflow-hidden rounded-xl bg-primary px-4 py-4 text-primary-foreground sm:px-6 sm:py-5 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[90px] -right-[60px] h-[200px] w-[200px] rounded-full border-[32px] border-primary-foreground/[0.07]"
        />
        <div className="relative z-10 min-w-0">
          <p className="mb-1.5 inline-flex flex-wrap items-center gap-2 text-[13px] font-semibold opacity-[0.85]">
            {category}
            <code className="rounded-full bg-primary-foreground/15 px-2 py-0.5 font-mono text-xs font-normal">
              {documentTypeCode(document.typeId, document.typeName)}
            </code>
          </p>
          <h1 id="doc-title" className="text-[22px] font-semibold leading-7 tracking-tight sm:text-[26px] sm:leading-8">
            {document.typeName}
          </h1>
          <p className="mt-1 max-w-[46ch] text-sm leading-5 opacity-90">
            {document.label ? (
              <>
                Label <b className="num font-semibold">{document.label}</b>
                {" · "}
              </>
            ) : null}
            Updated <span className="num">{formatDisplayDate(updatedAt)}</span>
            {latest ? <> · Version {latest.version} is the latest.</> : null}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5 max-sm:[&>button]:min-w-0 max-sm:[&>button]:flex-1">
            <Button type="button" size="sm" className={heroInverse} onClick={() => setShareOpen(true)}>
              <Share2 />
              Share securely
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={heroOutline}
              disabled={!latest}
              loading={pendingKey === downloadKey}
              onClick={() => {
                if (!latest) return;
                void download(document.id, latest.version, latest.fileName);
              }}
            >
              <Download />
              Download
            </Button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-3 rounded-lg bg-card px-4 py-3.5 text-foreground shadow-lg">
          <div className="flex min-w-0 items-center gap-3">
            <span className="tone-brand grid h-9 w-9 shrink-0 place-items-center rounded-md">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={fileName}>
                {fileName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="success">{statusLabel(latest?.source ?? document.source)}</Badge>
                {latest ? (
                  <Badge variant="brand" dot={false}>
                    v{latest.version}
                    {latest.latest ? " · Latest" : ""}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-4 text-[13px] text-muted-foreground">
            <div className="min-w-0">
              <span>Size</span>
              <b className="num mt-0.5 block text-sm font-semibold text-foreground">
                {sizeBytes ? formatFileSize(sizeBytes) : "—"}
              </b>
            </div>
            <div className="min-w-0">
              <span>Format</span>
              <b className="mt-0.5 block text-sm font-semibold text-foreground">
                {fileKindLabel(contentType, fileName)}
              </b>
            </div>
            <div className="min-w-0">
              <span>Updated</span>
              <b className="num mt-0.5 block text-sm font-semibold text-foreground">{formatDisplayDate(updatedAt)}</b>
            </div>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Document sections">
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="versions">
          <VersionsTab
            document={document}
            pendingDownloadKey={pendingKey}
            onUpload={() => setUploadOpen(true)}
            onPreview={openPreview}
            onDownload={(version, fileNameToSave) => {
              void download(document.id, version, fileNameToSave);
            }}
          />
        </TabsContent>
        <TabsContent value="sharing">
          <SharingTab documentId={document.id} onShare={() => setShareOpen(true)} />
        </TabsContent>
        <TabsContent value="preview">
          <DocumentPreviewPanel
            documentId={document.id}
            target={shownPreview}
            onDownload={(version, name) => {
              void download(document.id, version, name);
            }}
          />
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
    </PageFrame>
  );
}
