"use client";

import React, { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { applicationService } from "@/services/application.service";
import { Building2 } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";

export default function NewLoanApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams?.get("programId");
  const programCode = searchParams?.get("programCode");
  const programKey = programId || programCode;

  const { isError, error } = useQuery({
    queryKey: ["create-application", programKey],
    queryFn: async () => {
      const app = await applicationService.createApplication(programKey ?? undefined);
      const resumeQuery = new URLSearchParams({ id: app.id });
      const resolvedId = app.programId || programId;
      const resolvedCode = app.programCode || programCode;
      if (resolvedId) resumeQuery.set("programId", resolvedId);
      if (resolvedCode) resumeQuery.set("programCode", resolvedCode);
      router.replace(`/loan-application/resume?${resumeQuery.toString()}`);
      return app;
    },
    enabled: !!programKey,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  if (!programKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState
          compact
          title="No program selected"
          message="Choose a loan program from the dashboard to start an application."
        />
      </div>
    );
  }

  if (isError) {
    const apiError = parseApiError(error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState
          compact
          title="Unable to start application"
          message={apiError.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm">Creating your application...</p>
      </div>
    </div>
  );
}
