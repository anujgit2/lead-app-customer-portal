"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
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
import { parseApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/utils";
import { applicationService } from "@/services/application.service";
import { programService } from "@/services/program.service";
import type { CustomerProfileDetail } from "@/types";

interface ProfileApplicationsTabProps {
  profile: CustomerProfileDetail;
}

export function ProfileApplicationsTab({ profile }: ProfileApplicationsTabProps) {
  const applications = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });
  const linked = (applications.data ?? []).filter((item) => item.customerProfileId === profile.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold tracking-tight text-slate-900">Applications</h2>
        <StartApplicationMenu profileId={profile.id} versionNo={profile.currentVersionNo} />
      </div>
      {applications.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true">
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
      {!applications.isLoading && !applications.isError && linked.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-card p-6 text-sm text-muted-foreground shadow-sm" role="status">
          No applications use this profile yet.
        </p>
      ) : null}
      <ul className="space-y-3">
        {linked.map((application) => {
          let when = application.updatedAt;
          try {
            when = formatDate(application.updatedAt);
          } catch {
            when = application.updatedAt;
          }
          return (
            <li key={application.id}>
              <Link
                href={getApplicationHref(application)}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-card p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block font-semibold tracking-tight text-slate-900">
                    {application.applicationNumber || application.loanType}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {application.programName || application.loanType}
                    {" · "}
                    {when}
                    {application.customerProfileVersionNo
                      ? ` · Profile v${application.customerProfileVersionNo}`
                      : ""}
                  </span>
                </span>
                <ApplicationStatusBadge status={application.status} />
              </Link>
            </li>
          );
        })}
      </ul>
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
        <Button type="button" className="h-11 gap-2">
          Start application
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
