"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { ApplyLoanMenu } from "@/features/loan-application/ApplyLoanMenu";
import { parseApiError } from "@/lib/api-error";
import { applicationService } from "@/services/application.service";

export function ApplicationsPage() {
  const { data: applications, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });
  const apiError = isError ? parseApiError(error) : null;

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
          }}
        />
      ) : (
        <ApplicationsTable
          separateFilters
          applications={applications}
          isLoading={isLoading}
          isRefreshing={isFetching && !isLoading}
          onRefresh={() => {
            void refetch();
          }}
        />
      )}
    </PageShell>
  );
}
