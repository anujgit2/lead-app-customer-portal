"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Files, FolderOpen, Upload } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageShell } from "@/components/PageShell";
import { BlockSkeleton } from "@/components/TableSkeleton";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useDocuments } from "../api/queries";
import type { PortalDocument } from "../types";
import { formatDisplayDate } from "../utils/format";
import {
  summarizeDocuments,
  sourceLabel,
  sourceTone,
  type CategoryTile,
  type DocumentDashboardSummary,
} from "../utils/dashboard";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function documentTitle(document: PortalDocument): string {
  return document.fileName?.trim() || document.typeName;
}

function profileName(document: PortalDocument): string {
  const linked = document.linked ?? [];
  const primary = linked.find((item) => item.relation === "FOR") ?? linked[0];
  return primary?.displayName?.trim() || "";
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className="text-[22px] font-semibold leading-7 tabular-nums text-foreground">{value}</p>
      <p className="text-[12px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function CategoryTileCard({ tile }: { tile: CategoryTile }) {
  const empty = tile.count === 0;
  return (
    <div className={cn("card flex flex-col gap-2", empty && "bg-muted/40")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground">{tile.label}</p>
        <FolderOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-[22px] font-semibold leading-7 tabular-nums text-foreground">{tile.count}</p>
      <p className="text-[12px] text-muted-foreground">
        {empty
          ? "No documents yet"
          : `Updated ${formatDisplayDate(tile.latestUpdatedAt)}`}
      </p>
    </div>
  );
}

function RecentRow({ document }: { document: PortalDocument }) {
  const profile = profileName(document);
  const detail = [document.typeName, document.label, profile].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/documents/${encodeURIComponent(document.id)}`}
        className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-foreground">
            {documentTitle(document)}
          </span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{detail || "—"}</span>
        </span>
        <span className={cn("pill shrink-0", sourceTone(document.source))}>{sourceLabel(document.source)}</span>
        <span className="hidden w-[110px] shrink-0 text-right text-[12.5px] tabular-nums text-muted-foreground md:block">
          {formatDisplayDate(document.updatedAt)}
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

function DashboardBody({ summary }: { summary: DocumentDashboardSummary }) {
  return (
    <>
      <section aria-labelledby="doc-summary-heading" className="flex flex-col gap-3">
        <h2 id="doc-summary-heading" className="sr-only">
          Summary
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total documents"
            value={String(summary.total)}
            detail={summary.total === 0 ? "Nothing uploaded yet" : plural(summary.total, "file")}
          />
          <SummaryCard
            label="Categories in use"
            value={String(summary.categoryCount)}
            detail={`of ${summary.categories.length} categories`}
          />
          <SummaryCard
            label="Linked to a profile"
            value={String(summary.linkedCount)}
            detail={`${summary.total - summary.linkedCount} not linked yet`}
          />
          <SummaryCard
            label="Uploaded or imported"
            value={`${summary.uploadedCount} / ${summary.digiLockerCount}`}
            detail="Uploaded / from DigiLocker"
          />
        </div>
      </section>

      <section aria-labelledby="doc-category-heading" className="flex flex-col gap-3">
        <h2 id="doc-category-heading" className="text-[15px] font-semibold text-foreground">
          By category
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.categories.map((tile) => (
            <CategoryTileCard key={tile.id} tile={tile} />
          ))}
        </div>
      </section>

      <section aria-labelledby="doc-recent-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="doc-recent-heading" className="text-[15px] font-semibold text-foreground">
            Recently updated
          </h2>
          <Link href="/documents/" className="text-[13px] font-medium text-primary hover:underline">
            View all documents
          </Link>
        </div>
        <div className="card overflow-hidden p-0">
          {summary.recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">No documents to show yet.</p>
          ) : (
            <ul className="divide-y divide-border" aria-label="Recently updated documents">
              {summary.recent.map((document) => (
                <RecentRow key={document.id} document={document} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

export function DocumentDashboardPage() {
  const documents = useDocuments({});
  const loading = documents.isLoading && !documents.data;
  const summary = useMemo(() => summarizeDocuments(documents.data ?? []), [documents.data]);

  if (documents.isError) {
    const apiError = parseApiError(documents.error);
    return (
      <PageShell>
        <ErrorState
          compact
          title="Unable to load your document dashboard"
          message={apiError.message}
          code={apiError.status === 401 ? "SESSION_EXPIRED" : apiError.status === 403 ? "FORBIDDEN" : "UNKNOWN"}
          status={apiError.status}
          onRetry={() => {
            void documents.refetch();
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="head" data-testid="document-dashboard">
        <div>
          <h1>Document dashboard</h1>
          <p>Overview of your documents by category, profile and recent activity.</p>
        </div>
        <Link href="/documents/" className="btn p">
          <Upload aria-hidden="true" />
          Manage documents
        </Link>
      </div>

      {loading ? (
        <BlockSkeleton label="Loading document dashboard" />
      ) : summary.total === 0 ? (
        <div className="card">
          <EmptyState
            icon={Files}
            title="No documents yet"
            description="Upload your first document to see it summarised here by category and profile."
            action={
              <Link href="/documents/" className="btn p">
                <Upload aria-hidden="true" />
                Upload a document
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <p className="sr-only" role="status">
            {plural(summary.total, "document")} across {summary.categoryCount} categories.
          </p>
          <DashboardBody summary={summary} />
        </>
      )}
    </PageShell>
  );
}
