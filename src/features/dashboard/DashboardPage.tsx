"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Layers,
  PenLine,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { applicationService } from "@/services/application.service";
import { useAuthStore } from "@/store/auth.store";
import { ErrorState } from "@/components/ErrorState";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { parseApiError } from "@/lib/api-error";

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <span className={cn("grid h-9 w-9 place-items-center rounded-md", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="num text-[28px] font-[650] leading-8 tracking-[-0.02em]">{value}</p>
        <p className="mt-0 text-[13px] leading-[18px] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const {
    data: applications,
    isLoading: appsLoading,
    isFetching: appsFetching,
    isError: appsError,
    error: appsQueryError,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
    retry: (failureCount, error) => {
      const status = parseApiError(error).status;
      return status !== 401 && status !== 403 && failureCount < 2;
    },
  });

  const summary = useMemo(() => {
    const list = applications ?? [];
    return {
      total: list.length,
      drafts: list.filter((a) => a.status === "draft").length,
      inReview: list.filter(
        (a) => a.status === "submitted" || a.status === "under_review"
      ).length,
      approved: list.filter(
        (a) => a.status === "approved" || a.status === "disbursed"
      ).length,
    };
  }, [applications]);

  if (appsError) {
    const apiError = parseApiError(appsQueryError);
    return (
      <div className="p-6 sm:p-8 max-w-2xl mx-auto">
        <ErrorState
          compact
          title="Unable to load dashboard"
          message={apiError.message}
          code={
            apiError.status === 401
              ? "SESSION_EXPIRED"
              : apiError.status === 403
                ? "FORBIDDEN"
                : "UNKNOWN"
          }
          status={apiError.status}
          onRetry={refetchApps}
        />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-[650] leading-8 tracking-[-0.02em]">
          {greeting}, {user?.firstName ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s an overview of your loan applications
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Layers}
          label="Total applications"
          value={summary.total}
          tone="tone-brand"
        />
        <SummaryCard
          icon={PenLine}
          label="Drafts in progress"
          value={summary.drafts}
          tone="tone-warning"
        />
        <SummaryCard
          icon={Send}
          label="Submitted / in review"
          value={summary.inReview}
          tone="tone-info"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Approved"
          value={summary.approved}
          tone="tone-success"
        />
      </div>

      <div>
        {/* Loan Applications List */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Loan Applications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ApplicationsTable
                applications={applications}
                isLoading={appsLoading}
                isRefreshing={appsFetching && !appsLoading}
                onRefresh={() => {
                  void refetchApps();
                }}
                emptyState={
                  <div className="px-6 py-12 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">No applications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use Apply for a Loan in the header to get started
                    </p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
