"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppLayout } from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationService } from "@/services/application.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";
import { FileText, PlusCircle } from "lucide-react";

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

export default function ApplicationsPage() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });

  return (
    <AppLayout>
      <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Applications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              All your loan applications
            </p>
          </div>
          <Link href="/loan-application/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Application
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-6 py-5 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : applications?.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-base font-medium">No applications yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Start your first loan application today
                </p>
                <Link href="/loan-application/new">
                  <Button>Start Application</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {applications?.map((app) => (
                  <div key={app.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{app.applicationNumber}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.loanType} · <span className="font-medium text-foreground">{formatCurrency(app.loanAmount)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last updated: {formatDate(app.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === "draft" && (
                        <Link href={`/loan-application/${app.id}`}>
                          <Button variant="outline" size="sm">Continue</Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
