"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  Upload,
  User,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { applicationService } from "@/services/application.service";
import { useAuthStore } from "@/store/auth.store";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config: Record<ApplicationStatus, { label: string; variant: "success" | "warning" | "destructive" | "info" | "draft" | "default" }> = {
    draft: { label: "Draft", variant: "draft" },
    submitted: { label: "Submitted", variant: "info" },
    under_review: { label: "Under Review", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
    disbursed: { label: "Disbursed", variant: "success" },
  };
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  description: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const {
    data: summary,
    isError: summaryError,
    error: summaryQueryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["application-summary"],
    queryFn: () => applicationService.getSummary(),
    retry: (failureCount, error) => {
      const status = parseApiError(error).status;
      return status !== 401 && status !== 403 && failureCount < 2;
    },
  });

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

  const dashboardError = summaryError ? summaryQueryError : appsError ? appsQueryError : null;

  if (dashboardError) {
    const apiError = parseApiError(dashboardError);
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
          onRetry={() => {
            refetchSummary();
            refetchApps();
          }}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}, {user?.firstName ?? "there"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s an overview of your loan applications
          </p>
        </div>
        <Link href="/loan-application/new">
          <Button size="lg" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Start New Application
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Draft Applications"
          value={summary?.draft ?? 0}
          icon={FileText}
          color="bg-gray-100 text-gray-600"
          description="In progress"
        />
        <SummaryCard
          title="Submitted"
          value={summary?.submitted ?? 0}
          icon={Clock}
          color="bg-blue-100 text-blue-600"
          description="Under processing"
        />
        <SummaryCard
          title="Approved"
          value={summary?.approved ?? 0}
          icon={CheckCircle2}
          color="bg-green-100 text-green-600"
          description="Ready for disbursal"
        />
        <SummaryCard
          title="Rejected"
          value={summary?.rejected ?? 0}
          icon={XCircle}
          color="bg-red-100 text-red-600"
          description="Review required"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Applications</CardTitle>
                  <CardDescription>Your latest loan applications</CardDescription>
                </div>
                <Link href="/applications">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {appsLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-6 py-4 border-b last:border-0 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : applications?.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">No applications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start your first loan application
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {applications?.slice(0, 5).map((app) => (
                    <div
                      key={app.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{app.applicationNumber}</p>
                          <StatusBadge status={app.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {app.loanType} · {formatCurrency(app.loanAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(app.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {app.status === "draft" && (
                          <Link href={`/loan-application/${app.id}`}>
                            <Button variant="outline" size="sm">
                              Continue
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/loan-application/new" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <PlusCircle className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New Application</p>
                    <p className="text-xs text-muted-foreground">Start a loan application</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </div>
              </Link>

              <Link href="/applications" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Upload className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Upload Documents</p>
                    <p className="text-xs text-muted-foreground">Add missing documents</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </div>
              </Link>

              <Link href="/profile" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <User className="h-4.5 w-4.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">View Profile</p>
                    <p className="text-xs text-muted-foreground">Manage your account</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Status Banner */}
          {summary && summary.approved > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Application Approved!
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {summary.approved} application(s) approved. Check your email for next steps.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
