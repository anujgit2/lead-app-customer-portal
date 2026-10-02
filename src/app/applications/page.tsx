"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { applicationService } from "@/services/application.service";
import { ApplicationsTable } from "@/features/applications/ApplicationsTable";
import { FileText } from "lucide-react";

export default function ApplicationsPage() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
  });

  return (
    <AppLayout>
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All your loan applications
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <ApplicationsTable
              applications={applications}
              isLoading={isLoading}
              emptyState={
                <div className="py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-base font-medium">No applications yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use Apply for a Loan in the header to get started
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
