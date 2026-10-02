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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const {
    data: applications,
    isLoading: appsLoading,
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
        <h1 className="text-2xl font-semibold">
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
          tone="bg-primary/10 text-primary"
        />
        <SummaryCard
          icon={PenLine}
          label="Drafts in progress"
          value={summary.drafts}
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={Send}
          label="Submitted / in review"
          value={summary.inReview}
          tone="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Approved"
          value={summary.approved}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div>
        {/* Loan Applications List */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Loan Applications</CardTitle>
              <CardDescription>
                {appsLoading
                  ? "Loading your applications…"
                  : summary.total === 1
                    ? "1 application on your account"
                    : `All ${summary.total} applications on your account`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ApplicationsTable
                applications={applications}
                isLoading={appsLoading}
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
