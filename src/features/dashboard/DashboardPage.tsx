"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  PlusCircle,
  ArrowRight,
  Layers,
  PenLine,
  Send,
  CheckCircle2,
  Loader,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applicationService } from "@/services/application.service";
import { programService } from "@/services/program.service";
import { useAuthStore } from "@/store/auth.store";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
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
  const router = useRouter();
  const [applyingProgramCode, setApplyingProgramCode] = useState<string | null>(null);

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

  const {
    data: programs = [],
    isLoading: programsLoading,
  } = useQuery({
    queryKey: ["tenant-programs"],
    queryFn: () => programService.getTenantPrograms(),
    retry: 1,
  });

  const handleApplyProgram = async (programCode: string) => {
    setApplyingProgramCode(programCode);
    try {
      await programService.getProgramConfig(programCode);
      router.push(`/loan-application/new?programCode=${programCode}`);
    } catch (err) {
      const apiError = parseApiError(err);
      toast.error(`Failed to load program: ${apiError.message}`);
      setApplyingProgramCode(null);
    }
  };

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

      {/* Available Loan Programs */}
      {!programsLoading && programs.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Apply for a Loan</h2>
            <p className="text-sm text-slate-500 mt-1">Select a loan program to start your application</p>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {programs.map((program) => (
              <Button
                key={program.id}
                onClick={() => handleApplyProgram(program.programCode)}
                disabled={applyingProgramCode !== null}
                loading={applyingProgramCode === program.programCode}
                variant="outline"
                className="h-auto flex flex-col items-start justify-start p-4 gap-2 border-slate-200 text-left transition-all duration-200 ease-out hover:shadow-md hover:border-slate-300 active:scale-[0.98]"
              >
                <span className="font-semibold text-slate-900 text-sm">
                  {applyingProgramCode === program.programCode ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Apply ${program.displayName || program.name}`
                  )}
                </span>
                {program.description && (
                  <span className="text-xs text-slate-500 line-clamp-2">{program.description}</span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Loan Applications</CardTitle>
                  <CardDescription>
                    {appsLoading
                      ? "Loading your applications…"
                      : summary.total === 1
                        ? "1 application on your account"
                        : `All ${summary.total} applications on your account`}
                  </CardDescription>
                </div>
                <Link href="/applications">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    Manage
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
                  <p className="text-xs text-muted-foreground mt-1 mb-5">
                    Start your first loan application
                  </p>
                  <Link href="/loan-application/new">
                    <Button size="sm" className="gap-2">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Start Application
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y max-h-[32rem] overflow-y-auto">
                  {applications?.map((app) => (
                    <div
                      key={app.id}
                      className="px-6 py-4 flex items-center justify-between transition-colors duration-200 ease-out hover:bg-muted/30"
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
                          <Link href={`/loan-application/resume?id=${app.id}`}>
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

      </div>
    </div>
  );
}
