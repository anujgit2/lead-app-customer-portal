"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationStatusBadge } from "@/features/applications/ApplicationStatusBadge";
import { cn, formatDate } from "@/lib/utils";
import type { LoanApplication } from "@/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

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

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

interface ApplicationsTableProps {
  applications?: LoanApplication[];
  isLoading?: boolean;
  emptyState?: ReactNode;
}

export function ApplicationsTable({
  applications,
  isLoading,
  emptyState,
}: ApplicationsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const total = applications?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    if (!applications?.length) return [];
    const start = (currentPage - 1) * pageSize;
    return applications.slice(start, start + pageSize);
  }, [applications, currentPage, pageSize]);

  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="px-2 py-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-4 px-4 py-3 animate-pulse ${i % 2 === 1 ? "bg-slate-50/80" : ""}`}
          >
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-28" />
          </div>
        ))}
      </div>
    );
  }

  if (!applications?.length) {
    return (
      emptyState ?? (
        <div className="px-6 py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No applications yet</p>
        </div>
      )
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-slate-50/60">
            <TableHead>ID</TableHead>
            <TableHead>Application Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Submitted Date</TableHead>
            <TableHead>Program Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((app) => (
            <TableRow
              key={app.id}
              className="even:bg-slate-50/80 odd:bg-white hover:bg-slate-100"
            >
              <TableCell className="whitespace-nowrap">
                <Link
                  href={getApplicationHref(app)}
                  title={app.status === "draft" ? "Open application form" : "View application"}
                  className="font-mono text-xs font-medium text-primary transition-all duration-200 ease-out hover:underline hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:rounded-sm"
                >
                  {app.id}
                </Link>
              </TableCell>
              <TableCell className="font-medium text-slate-900 whitespace-nowrap">
                {app.applicationNumber || "—"}
              </TableCell>
              <TableCell>
                <ApplicationStatusBadge status={app.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-500">
                {displayDate(app.createdAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-500">
                {displayDate(app.submittedAt)}
              </TableCell>
              <TableCell className="text-slate-700">
                {app.programName || app.loanType || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-700">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of <span className="font-medium text-slate-700">{total}</span>
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Rows</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[72px] px-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="h-8 w-8 p-0 text-slate-500 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageNumbers(currentPage, totalPages).map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1.5 text-xs text-slate-400"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(item)}
                  className={cn(
                    "h-8 min-w-8 px-2 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
                    item === currentPage
                      ? "bg-white text-slate-900 shadow-sm border border-slate-100 font-semibold"
                      : "text-slate-500"
                  )}
                  aria-current={item === currentPage ? "page" : undefined}
                >
                  {item}
                </Button>
              )
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="h-8 w-8 p-0 text-slate-500 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
