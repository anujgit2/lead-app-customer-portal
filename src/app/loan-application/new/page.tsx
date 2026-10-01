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
  const programCode = searchParams?.get("programCode");

  const { isError, error } = useQuery({
    queryKey: ["create-application", programCode],
    queryFn: async () => {
      const app = await applicationService.createApplication(programCode ?? undefined);
      router.replace(`/loan-application/resume?id=${app.id}`);
      return app;
    },
    retry: 1,
  });

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
