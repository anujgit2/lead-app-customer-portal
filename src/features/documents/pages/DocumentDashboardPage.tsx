"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileImage, FileSpreadsheet, FileText, FolderOpen, Upload } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageShell } from "@/components/PageShell";
import { BlockSkeleton } from "@/components/TableSkeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseApiError } from "@/lib/api-error";
import { cn, formatFileSize } from "@/lib/utils";
import { useDocument, useDocumentTypes, useDocuments } from "../api/queries";
import type { DocumentDetail, PortalDocument } from "../types";
import { UploadDialog } from "../components/UploadDialog";
import { SelectionPanel } from "../components/SelectionPanel";
import { categoryKey, categoryLabel, formatDisplayDateTime } from "../utils/format";
import {
  STATUS_NOT_REPORTED,
  buildWorkspaceTiles,
  countByTile,
  documentTypeOptions,
  fileKindOf,
  firstTileWithDocuments,
  sortDocuments,
  tileIdFor,
  type FileKind,
  type WorkspaceSort,
} from "../utils/workspace";

type PanelTab = "details" | "activity" | "operations";

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "activity", label: "Activity" },
  { id: "operations", label: "Operations" },
];

const SORT_OPTIONS: { id: WorkspaceSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "name", label: "Name" },
];

function displayName(document: PortalDocument): string {
  return document.fileName?.trim() || document.typeName;
}

function profileNames(document: PortalDocument): string {
  const names = (document.linked ?? []).map((item) => item.displayName?.trim() || "Untitled profile");
  return names.length > 0 ? names.join(", ") : "Not linked";
}

function FileIcon({ kind }: { kind: FileKind }) {
  const Icon = kind === "image" ? FileImage : kind === "sheet" ? FileSpreadsheet : FileText;
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-muted text-[10px] font-semibold uppercase text-muted-foreground",
      )}
      aria-hidden="true"
    >
      {kind === "pdf" ? <FileText className="h-4 w-4 text-danger" /> : <Icon className="h-4 w-4" />}
    </span>
  );
}

function CategoryTile({
  label,
  count,
  active,
  onSelect,
}: {
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "card flex shrink-0 snap-start items-center gap-2 whitespace-nowrap px-3 py-2 text-left transition-colors duration-150 hover:bg-muted/60",
        active && "border-primary/30 bg-primary-soft",
      )}
    >
      <FolderOpen className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <span className="text-[12px] text-muted-foreground">{count}</span>
    </button>
  );
}

function DocumentRow({
  document,
  selected,
  focused,
  onToggle,
  onFocus,
}: {
  document: PortalDocument;
  selected: boolean;
  focused: boolean;
  onToggle: (checked: boolean) => void;
  onFocus: () => void;
}) {
  const name = displayName(document);
  return (
    <tr className={cn("border-t border-border", focused && "bg-primary-soft")}>
      <td className="w-10 px-3 py-2.5">
        <Checkbox checked={selected} onCheckedChange={(checked) => onToggle(checked === true)} aria-label={`Select ${name}`} className="h-4 w-4" />
      </td>
      <td className="px-3 py-2.5">
        <button type="button" onClick={onFocus} className="flex min-w-0 items-center gap-3 text-left">
          <FileIcon kind={fileKindOf(document.fileName)} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {document.typeName}
              {document.sizeBytes ? ` · ${formatFileSize(document.sizeBytes)}` : ""}
            </span>
          </span>
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] tabular-nums text-muted-foreground">
        {formatDisplayDateTime(document.updatedAt)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-[13px] tabular-nums text-muted-foreground">v{document.latestVersion}</td>
      <td className="px-3 py-2.5">
        <span className="pill neu">{STATUS_NOT_REPORTED}</span>
      </td>
    </tr>
  );
}

function DetailsTab({ document }: { document: PortalDocument }) {
  const rows: [string, string][] = [
    ["Category", categoryLabel(document.category, document.categoryLabel)],
    ["Subcategory", document.typeName],
    ["Label", document.label || "—"],
    ["Source", document.source === "DIGILOCKER" ? "DigiLocker" : "Uploaded"],
    ["Version", `v${document.latestVersion}`],
    ["File size", document.sizeBytes ? formatFileSize(document.sizeBytes) : "—"],
    ["Updated", formatDisplayDateTime(document.updatedAt)],
    ["Linked to", profileNames(document)],
    ["Review status", STATUS_NOT_REPORTED],
  ];
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ActivityTab({ detail, loading, failed }: { detail?: DocumentDetail | null; loading: boolean; failed: boolean }) {
  if (loading) return <p className="text-[13px] text-muted-foreground">Loading history…</p>;
  if (failed) return <p className="text-[13px] text-danger-strong">We could not load this document&rsquo;s history.</p>;
  const versions = [...(detail?.versions ?? [])].sort((left, right) => right.version - left.version);
  if (versions.length === 0) return <p className="text-[13px] text-muted-foreground">No history for this document yet.</p>;
  return (
    <ol className="flex flex-col gap-3" aria-label="Document history">
      {versions.map((version) => (
        <li key={version.version} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
          <span className="text-[13px] font-semibold text-foreground">
            {version.source === "DIGILOCKER" ? "Imported from DigiLocker" : "Uploaded"} · v{version.version}
          </span>
          <span className="text-[12px] text-muted-foreground">
            {formatDisplayDateTime(version.createdAt)}
            {version.createdBy ? ` · ${version.createdBy}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function OperationsTab() {
  return (
    <p className="text-[13px] text-muted-foreground">
      Bulk operations such as multi-file downloads and sharing will appear here once the backend supports them.
    </p>
  );
}

/**
 * Horizontal row with no visible scrollbar. Arrows appear when the pointer is over the row, and the
 * mouse wheel scrolls it sideways (the page keeps scrolling once the row reaches either end).
 */
function TileScroller({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    update();
  }, [update, count]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const atStart = el.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 160), behavior: "smooth" });
  };

  const arrowClass =
    "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted";

  return (
    <div className="group relative -mx-4 sm:mx-0">
      <div
        ref={ref}
        className="flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={label}
      >
        {children}
      </div>
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll categories left"
          onClick={() => scrollByPage(-1)}
          className={cn(arrowClass, "left-1")}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={() => scrollByPage(1)}
          className={cn(arrowClass, "right-1")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function DocumentDashboardPage() {
  const documents = useDocuments({});
  const all = useMemo(() => documents.data ?? [], [documents.data]);
  const loading = documents.isLoading && !documents.data;

  const [tileOverride, setTileOverride] = useState<string | null>(null);
  const documentTypes = useDocumentTypes();
  const tiles = useMemo(() => buildWorkspaceTiles(documentTypes.data ?? [], all), [documentTypes.data, all]);
  const activeTile = tileOverride ?? firstTileWithDocuments(all, tiles);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sort, setSort] = useState<WorkspaceSort>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("details");
  const [uploadOpen, setUploadOpen] = useState(false);

  const counts = useMemo(() => countByTile(all, tiles), [all, tiles]);
  const tileDocuments = useMemo(() => all.filter((document) => tileIdFor(document) === activeTile), [all, activeTile]);
  // Sub categories are the document types of the active category. Include types already seen on documents too,
  // so a type that is only in the document list still shows.
  const typeOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();
    for (const type of documentTypes.data ?? []) {
      if (categoryKey(type.category) === activeTile) options.set(type.id, { id: type.id, name: type.name });
    }
    for (const option of documentTypeOptions(tileDocuments)) {
      if (!options.has(option.id)) options.set(option.id, option);
    }
    return [...options.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [documentTypes.data, activeTile, tileDocuments]);
  const visible = useMemo(() => {
    const filtered = typeFilter === "ALL" ? tileDocuments : tileDocuments.filter((document) => document.typeId === typeFilter);
    return sortDocuments(filtered, sort);
  }, [tileDocuments, typeFilter, sort]);

  const focused = all.find((document) => document.id === focusId) ?? null;
  const selectedDocs = useMemo(() => all.filter((document) => selectedIds.includes(document.id)), [all, selectedIds]);
  const handleDeleted = (ids: string[]) => {
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    if (focusId && ids.includes(focusId)) setFocusId(null);
  };
  const detail = useDocument(focused?.id ?? "");
  const tileLabel = tiles.find((tile) => tile.id === activeTile)?.label ?? "Documents";
  const visibleIds = new Set(visible.map((document) => document.id));
  const allVisibleSelected = visible.length > 0 && visible.every((document) => selectedIds.includes(document.id));

  if (documents.isError) {
    const apiError = parseApiError(documents.error);
    return (
      <PageShell>
        <ErrorState
          compact
          title="Unable to load your documents"
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
          <h1>Documents</h1>
          <p>Upload, organize, view and manage your documents in one place.</p>
        </div>
      </div>

      <TileScroller label="Document categories" count={tiles.length}>
        {tiles.map((tile) => (
          <CategoryTile
            key={tile.id}
            label={tile.label}
            count={counts[tile.id] ?? 0}
            active={activeTile === tile.id}
            onSelect={() => {
              setTileOverride(tile.id);
              setTypeFilter("ALL");
              setFocusId(null);
            }}
          />
        ))}
      </TileScroller>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 p-0" aria-label={`${tileLabel} documents`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <h2 className="mr-auto text-[15px] font-semibold text-foreground">
              {tileLabel} <span className="text-muted-foreground">({tileDocuments.length})</span>
            </h2>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setFocusId(null);
              }}
            >
              <SelectTrigger className="h-8 w-auto min-w-[170px] rounded-md border-border/60 px-3 text-[13px] hover:border-border data-[state=open]:border-border/60" aria-label="Filter by document type">
                <SelectValue placeholder="Document type" />
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
            <button
              type="button"
              className="btn p sm:h-8"
              onClick={() => setUploadOpen(true)}
            >
              <Upload aria-hidden="true" />
              Upload
            </button>
            <Select value={sort} onValueChange={(value) => setSort(value as WorkspaceSort)}>
              <SelectTrigger className="h-8 w-auto min-w-[120px] rounded-md border-border/60 px-3 text-[13px] hover:border-border data-[state=open]:border-border/60" aria-label="Sort documents">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-primary-soft px-4 py-2 text-[13px] font-semibold text-primary-soft-foreground" role="status">
              <span>{selectedIds.length} selected</span>
              <button type="button" className="btn sm" onClick={() => setSelectedIds([])}>
                Clear
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="p-4">
              <BlockSkeleton label="Loading documents" />
            </div>
          ) : all.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No documents yet"
              description="Upload your first document and it will appear here, grouped by category."
              action={
                <button type="button" className="btn p" onClick={() => setUploadOpen(true)}>
                  <Upload aria-hidden="true" />
                  Upload a document
                </button>
              }
            />
          ) : visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">No documents in this category yet.</p>
          ) : (
            <div className="scroll overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-muted/50 text-[12px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => {
                          setSelectedIds((current) => {
                            const hidden = current.filter((id) => !visibleIds.has(id));
                            return checked === true ? [...hidden, ...visible.map((document) => document.id)] : hidden;
                          });
                        }}
                        aria-label="Select all documents in this category"
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-3 py-2 font-semibold">Document name</th>
                    <th className="px-3 py-2 font-semibold">Updated on</th>
                    <th className="px-3 py-2 font-semibold">Version</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((document) => (
                    <DocumentRow
                      key={document.id}
                      document={document}
                      selected={selectedIds.includes(document.id)}
                      focused={focusId === document.id}
                      onToggle={(checked) => {
                        setSelectedIds((current) =>
                          checked ? [...current.filter((id) => id !== document.id), document.id] : current.filter((id) => id !== document.id),
                        );
                      }}
                      onFocus={() => {
                        setFocusId(document.id);
                        setPanelTab("details");
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="card flex min-w-0 flex-col gap-4" aria-label="Document panel">
          {selectedDocs.length > 1 ? (
            <SelectionPanel
              documents={selectedDocs}
              onClear={() => setSelectedIds([])}
              onDeleted={handleDeleted}
            />
          ) : (
          <>
          <div role="tablist" aria-label="Document panel sections" className="flex gap-4 border-b border-border">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={panelTab === tab.id}
                onClick={() => setPanelTab(tab.id)}
                className={cn(
                  "-mb-px border-b-2 pb-2 text-[13px] font-semibold transition-colors duration-150",
                  panelTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!focused ? (
            <p className="text-[13px] text-muted-foreground">Select a document to see its details.</p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <FileIcon kind={fileKindOf(focused.fileName)} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-foreground">{displayName(focused)}</p>
                  <Link href={`/documents/${encodeURIComponent(focused.id)}`} className="text-[12px] font-medium text-primary hover:underline">
                    Open document
                  </Link>
                </div>
              </div>
              {panelTab === "details" ? <DetailsTab document={focused} /> : null}
              {panelTab === "activity" ? (
                <ActivityTab detail={detail.data} loading={detail.isLoading && !detail.data} failed={detail.isError} />
              ) : null}
              {panelTab === "operations" ? <OperationsTab /> : null}
            </>
          )}
          </>
          )}
        </aside>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        initialCategory={activeTile}
        initialTypeId={typeFilter !== "ALL" ? typeFilter : undefined}
      />
    </PageShell>
  );
}
