"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  PlusCircle,
  User,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applicationService } from "@/services/application.service";
import { useAuthStore } from "@/store/auth.store";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";

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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Loan Applications List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Loan Applications</CardTitle>
                  <CardDescription>Your loan applications</CardDescription>
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

        {/* Profile */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <Link href="/profile" className="block">
                <Button variant="outline" className="w-full gap-2">
                  <User className="h-4 w-4" />
                  Manage Profile
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
