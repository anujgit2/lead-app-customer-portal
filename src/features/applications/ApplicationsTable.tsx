"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/SortableTableHead";
import { TableSkeletonRows } from "@/components/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApplicationStatusBadge,
  applicationStatusLabel,
} from "@/features/applications/ApplicationStatusBadge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStatus, LoanApplication } from "@/types";

const PAGE_SIZES = [10, 25, 50] as const;
const STATUS_FILTERS: { id: "ALL" | ApplicationStatus; label: string }[] = [
  { id: "ALL", label: "All statuses" },
  { id: "draft", label: "Draft" },
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "disbursed", label: "Disbursed" },
];

type SortKey = "application" | "program" | "amount" | "updated";
type SortDir = SortDirection;

export function getApplicationHref(app: LoanApplication): string {
  const params = new URLSearchParams({ id: app.id });
  if (app.programId) params.set("programId", app.programId);
  if (app.programCode) params.set("programCode", app.programCode);
  return `/loan-application/resume?${params.toString()}`;
}

function displayDate(value?: string) {
  if (!value) return "—";
  let formatted = value;
  try {
    formatted = formatDate(value);
  } catch {
    /* keep original */
  }
  return formatted;
}

function updatedTime(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function programLabel(app: LoanApplication): string {
  return app.programName || app.loanType || "—";
}

function applicationTitle(app: LoanApplication): string {
  return app.applicationNumber || "Draft";
}

function matchesQuery(app: LoanApplication, query: string): boolean {
  if (!query) return true;
  const haystack = [
    app.applicationNumber,
    app.id,
    app.programName,
    app.loanType,
    applicationStatusLabel(app.status),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function shownCount(loading: boolean, count: number): string {
  return loading ? "–" : String(count);
}

function listCount(total: number, page: number, size: number, visible: number): string {
  if (total === 0) return "0 applications";
  if (total <= size) return total === 1 ? "1 application" : `${total} applications`;
  const start = page * size + 1;
  return `Showing ${start}–${start + visible - 1} of ${total} applications`;
}

const SortHeader = SortableTableHead<SortKey>;

interface ApplicationsTableProps {
  applications?: LoanApplication[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  emptyState?: ReactNode;
  /** Place search and status filters above the table, with the same gap as Profiles. */
  separateFilters?: boolean;
}

export function ApplicationsTable({
  applications,
  isLoading,
  isRefreshing,
  onRefresh,
  emptyState,
  separateFilters = false,
}: ApplicationsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(10);
  const [sort, setSort] = useState<SortKey>("updated");
  const [dir, setDir] = useState<SortDir>("desc");

  const query = search.trim().toLowerCase();
  const loading = !!isLoading && !applications;

  const searched = useMemo(
    () => (applications ?? []).filter((app) => matchesQuery(app, query)),
    [applications, query]
  );
  const visible = useMemo(
    () => searched.filter((app) => status === "ALL" || app.status === status),
    [searched, status]
  );
  const sorted = useMemo(() => {
    const next = [...visible];
    next.sort((left, right) => {
      const result =
        sort === "application"
          ? applicationTitle(left).localeCompare(applicationTitle(right), undefined, { sensitivity: "base" })
          : sort === "program"
            ? programLabel(left).localeCompare(programLabel(right), undefined, { sensitivity: "base" })
            : sort === "amount"
              ? (left.loanAmount || 0) - (right.loanAmount || 0)
              : updatedTime(left.updatedAt) - updatedTime(right.updatedAt);
      return dir === "asc" ? result : -result;
    });
    return next;
  }, [visible, sort, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const pageIndex = Math.min(page, pageCount - 1);
  const pageItems = sorted.slice(pageIndex * size, pageIndex * size + size);
  const filtered = status !== "ALL" || query.length > 0;

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setPage(0);
  }

  function changeSort(column: SortKey) {
    setPage(0);
    if (sort === column) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(column);
    setDir(column === "application" || column === "program" ? "asc" : "desc");
  }

  const filters = (
      <div
        className={cn(
          "flex flex-wrap items-center",
          separateFilters ? "gap-x-4 gap-y-3" : "gap-3 border-b border-border px-3 py-2.5"
        )}
      >
        <div className="min-w-0 flex-1 basis-full sm:max-w-[420px] sm:basis-[280px]">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            type="search"
            placeholder="Search applications"
            aria-label="Search applications"
            autoComplete="off"
            startAdornment={<Search className="h-4 w-4" />}
            className="h-8 text-[13px]"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as "ALL" | ApplicationStatus);
            setPage(0);
          }}
        >
          <SelectTrigger
            className={cn(
              "h-8 rounded-md px-3 text-[13px] font-medium",
              separateFilters
                ? "w-full sm:w-auto sm:min-w-[150px]"
                : "w-auto min-w-[140px] flex-1 basis-[140px] sm:min-w-[180px] sm:flex-none"
            )}
            aria-label="Filter by status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label} (
                {shownCount(
                  loading,
                  option.id === "ALL"
                    ? searched.length
                    : searched.filter((app) => app.status === option.id).length
                )}
                )
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="sm:ml-auto"
            disabled={isRefreshing || isLoading}
            onClick={() => onRefresh()}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        ) : null}
      </div>
  );

  const grid = (
    <>
      <Table className="[&_td]:h-[52px] [&_td]:px-3 [&_th]:h-[38px] [&_th]:px-3">
        <caption className="sr-only">Loan applications</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHeader label="Application" column="application" sort={sort} dir={dir} onSort={changeSort} />
            <SortHeader
              label="Program"
              column="program"
              sort={sort}
              dir={dir}
              onSort={changeSort}
              className="hidden min-[901px]:table-cell"
            />
            <SortHeader label="Amount" column="amount" sort={sort} dir={dir} onSort={changeSort} align="right" />
            <TableHead>Status</TableHead>
            <SortHeader
              label="Updated"
              column="updated"
              sort={sort}
              dir={dir}
              onSort={changeSort}
              className="hidden sm:table-cell"
            />
            <TableHead className="w-10 pr-3 text-right">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeletonRows label="Loading applications" columns={6} />
          ) : pageItems.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="h-auto !p-0">
                {emptyState && !filtered ? (
                  emptyState
                ) : (
                  <EmptyState
                    icon={filtered ? Search : FileText}
                    title={filtered ? "No applications found" : "No applications yet"}
                    description={
                      filtered
                        ? "Try a different search or clear the filters."
                        : "Create an application to get started."
                    }
                    action={
                      filtered ? (
                        <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : null
                    }
                  />
                )}
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((app) => {
              const title = applicationTitle(app);
              const href = getApplicationHref(app);
              return (
                <TableRow
                  key={app.id}
                  tabIndex={0}
                  aria-label={title}
                  className="group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => router.push(href)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(href);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="tone-brand grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm">
                        <FileText className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={href}
                          title={app.status === "draft" ? "Open application form" : "View application"}
                          className="block truncate font-semibold leading-[18px] text-foreground hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {title}
                        </Link>
                        <span className="mt-px block truncate font-mono text-xs leading-4 text-muted-foreground">
                          {app.id}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground min-[901px]:hidden">
                          {programLabel(app)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden min-[901px]:table-cell">{programLabel(app)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(app.loanAmount || 0)}
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={app.status} size="sm" />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                    {displayDate(app.updatedAt)}
                  </TableCell>
                  <TableCell className="w-10 pr-3 text-right text-muted-foreground">
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
        <p className="text-[13px] text-muted-foreground" role="status">
          {loading ? "Loading applications" : listCount(sorted.length, pageIndex, size, pageItems.length)}
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
            <span className="min-w-14 text-center text-[13px] tabular-nums text-muted-foreground" aria-live="polite">
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
    </>
  );

  if (separateFilters) {
    return (
      <>
        {filters}
        <section
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          aria-label="Applications list"
        >
          {grid}
        </section>
      </>
    );
  }

  return (
    <div>
      {filters}
      {grid}
    </div>
  );
}
