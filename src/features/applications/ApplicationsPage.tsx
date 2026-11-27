"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { ApplyLoanMenu } from "@/features/loan-application/ApplyLoanMenu";
import { parseApiError } from "@/lib/api-error";
import { applicationService, programNameCatalog } from "@/services/application.service";
import { leadService, type LeadSummary } from "@/services/lead.service";
import type { ApplicationStatus, LoanApplication } from "@/types";

/** How a lead's status reads in the Applications table. Closed leads are left out. */
const LEAD_ROW_STATUS: Partial<Record<string, ApplicationStatus>> = {
  CREATED: "draft",
  INVITED: "draft",
  IN_PROGRESS: "draft",
  INFO_REQUESTED: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  FORWARDED: "under_review",
  REJECTED: "rejected",
};

/**
 * The leads the customer has accepted, as rows. A converted lead already appears as an application,
 * so it is not repeated here.
 */
function leadRows(leads: LeadSummary[], programNames: Map<string, string>): LoanApplication[] {
  return leads.flatMap((lead) => {
    const status = LEAD_ROW_STATUS[lead.status];
    if (!status) return [];
    return [
      {
        id: lead.id,
        applicationNumber: `LEAD-${lead.id.slice(0, 8).toUpperCase()}`,
        loanType: "",
        programName: programNames.get(lead.programId),
        loanAmount: 0,
        status,
        createdAt: lead.updatedAt,
        updatedAt: lead.updatedAt,
        userId: "",
        programId: lead.programId,
        href: `/leads/view/?id=${lead.id}`,
      },
    ];
  });
}

export function ApplicationsPage() {
  const applicationsQuery = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });
  const leadsQuery = useQuery({
    queryKey: ["customer-leads"],
    queryFn: () => leadService.list(),
  });
  const programNamesQuery = useQuery({
    queryKey: ["program-name-catalog"],
    queryFn: programNameCatalog,
  });

  const { data: applications, isLoading, isFetching, isError, error, refetch } = applicationsQuery;
  const apiError = isError ? parseApiError(error) : null;

  const rows = useMemo(
    () => [
      ...(applications ?? []),
      ...leadRows(leadsQuery.data ?? [], programNamesQuery.data ?? new Map<string, string>()),
    ],
    [applications, leadsQuery.data, programNamesQuery.data]
  );

  return (
    <PageShell>
      <PageHeader
        title="Applications"
        description="All your loan applications"
        actions={<ApplyLoanMenu label="New Application" compact={false} className="w-full sm:w-auto" />}
      />

      {isError ? (
        <ErrorState
          compact
          title="Unable to load applications"
          message={apiError?.message ?? "Something went wrong."}
          status={apiError?.status}
          code={
            apiError?.status === 401
              ? "SESSION_EXPIRED"
              : apiError?.status === 403
                ? "FORBIDDEN"
                : "UNKNOWN"
          }
          onRetry={() => {
            void refetch();
            void leadsQuery.refetch();
          }}
        />
      ) : (
        <ApplicationsTable
          separateFilters
          applications={applications ? rows : undefined}
          isLoading={isLoading || leadsQuery.isLoading}
          isRefreshing={(isFetching || leadsQuery.isFetching) && !isLoading}
          onRefresh={() => {
            void refetch();
            void leadsQuery.refetch();
          }}
        />
      )}
    </PageShell>
  );
}
