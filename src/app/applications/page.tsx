"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/AppLayout";
import { ErrorState } from "@/components/ErrorState";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { ApplyLoanMenu } from "@/features/loan-application/ApplyLoanMenu";
import { parseApiError } from "@/lib/api-error";
import { applicationService } from "@/services/application.service";

export default function ApplicationsPage() {
  const { data: applications, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });
  const apiError = isError ? parseApiError(error) : null;

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-4 py-5 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-8 tracking-[-0.02em] text-foreground">
              Applications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">All your loan applications</p>
          </div>
          <ApplyLoanMenu label="New Application" compact={false} className="w-full sm:w-auto" />
        </div>

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
      </div>
    </AppLayout>
  );
}
