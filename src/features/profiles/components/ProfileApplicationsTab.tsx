"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileText, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/ErrorState";
import { ApplicationStatusBadge } from "@/features/applications/ApplicationStatusBadge";
import { getApplicationHref } from "@/features/applications/ApplicationsTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";
import { applicationService } from "@/services/application.service";
import { programService } from "@/services/program.service";
import type { CustomerProfileDetail } from "@/types";

interface ProfileApplicationsTabProps {
  profile: CustomerProfileDetail;
}

export function ProfileApplicationsTab({ profile }: ProfileApplicationsTabProps) {
  const router = useRouter();
  const applications = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });
  const linked = (applications.data ?? []).filter((item) => item.customerProfileId === profile.id);

  const empty = !applications.isLoading && !applications.isError && linked.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {empty ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold leading-6 tracking-[-0.01em]">Applications</h2>
            <p className="text-[13px] leading-[18px] text-muted-foreground">
              Loan applications started for this profile.
            </p>
          </div>
          <StartApplicationMenu profileId={profile.id} versionNo={profile.currentVersionNo} />
        </div>
      )}
      {applications.isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" aria-busy="true">
          <p className="sr-only">Loading applications</p>
        </div>
      ) : null}
      {applications.isError ? (
        <ErrorState
          compact
          title="Unable to load applications"
          message={parseApiError(applications.error).message}
          onRetry={() => {
            void applications.refetch();
          }}
        />
      ) : null}
      {empty ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-1)]">
          <div className="flex flex-col items-center px-6 py-10 text-center" role="status">
            <span className="tone-brand mb-3 grid h-12 w-12 place-items-center rounded-lg">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="text-base font-semibold leading-6">No applications yet</h3>
            <p className="mt-1 max-w-[36ch] text-sm text-muted-foreground">
              Loan applications started for this profile will show up here.
            </p>
            <div className="mt-4">
              <StartApplicationMenu profileId={profile.id} versionNo={profile.currentVersionNo} />
            </div>
          </div>
        </section>
      ) : null}
      {!applications.isLoading && !applications.isError && linked.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-1)]">
          <Table className="text-[13px]">
            <caption className="sr-only">Applications for this profile</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[38px] px-3 text-xs">Application</TableHead>
                <TableHead className="h-[38px] px-3 text-xs">Status</TableHead>
                <TableHead className="hidden h-[38px] px-3 text-xs sm:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linked.map((application) => {
                let when = application.updatedAt;
                try {
                  when = formatDate(application.updatedAt);
                } catch {
                  when = application.updatedAt;
                }
                const title = application.applicationNumber || application.loanType;
                return (
                  <TableRow
                    key={application.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => router.push(getApplicationHref(application))}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(getApplicationHref(application));
                      }
                    }}
                  >
                    <TableCell className="px-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="tone-brand grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm">
                          <FileText className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold leading-[18px]">{title}</span>
                          <span className="block truncate font-mono text-[11px] leading-[14px] text-muted-foreground">
                            {application.programName || application.loanType}
                            {application.customerProfileVersionNo
                              ? ` · v${application.customerProfileVersionNo}`
                              : ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap px-3 text-muted-foreground tabular-nums sm:table-cell">
                      {when}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </div>
  );
}

function StartApplicationMenu({ profileId, versionNo }: { profileId: string; versionNo: number }) {
  const router = useRouter();
  const programs = useQuery({
    queryKey: ["tenant-programs"],
    queryFn: () => programService.getTenantPrograms(),
  });
  const available = useMemo(
    () => (programs.data ?? []).filter((program) => program.id),
    [programs.data]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Apply for a loan
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Loan program</DropdownMenuLabel>
        {programs.isLoading ? <p className="px-2.5 py-2 text-xs text-slate-500">Loading programs…</p> : null}
        {programs.isError ? (
          <p className="px-2.5 py-2 text-xs text-destructive">{parseApiError(programs.error).message}</p>
        ) : null}
        {available.map((program) => (
          <DropdownMenuItem
            key={program.id}
            onSelect={() => {
              const params = new URLSearchParams({
                programId: program.id,
                customerProfileId: profileId,
                customerProfileVersionNo: String(versionNo),
              });
              if (program.programCode) params.set("programCode", program.programCode);
              router.push(`/loan-application/new?${params.toString()}`);
            }}
          >
            <span className="font-medium text-slate-900">{program.displayName || program.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
