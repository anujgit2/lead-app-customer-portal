"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FormWizard } from "@/features/loan-application/FormWizard";
import {
  applicationService,
  resolveApplicationFormData,
} from "@/services/application.service";
import { Building2 } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import type { FormData } from "@/types";

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm">Loading application...</p>
      </div>
    </div>
  );
}

function ResumeContent() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("id") ?? "";

  const {
    data: application,
    isLoading: appLoading,
    isError: appError,
    error: appQueryError,
  } = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () => applicationService.getApplication(applicationId),
    enabled: !!applicationId,
    retry: 1,
  });

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["loan-product", application?.programId],
    queryFn: () =>
      application?.programId
        ? applicationService.getLoanProductByProgramId(application.programId)
        : applicationService.getLoanProducts().then((p) => p[0]),
    enabled: !!application,
  });

  const initialFormData = useMemo(
    () =>
      application && product
        ? resolveApplicationFormData(application, product)
        : ({} as FormData),
    [application, product]
  );

  if (!applicationId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState
          compact
          title="Invalid link"
          message="No application ID was provided. Please go back and try again."
        />
      </div>
    );
  }

  if (appError) {
    const apiError = parseApiError(appQueryError);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState
          compact
          title="Unable to load application"
          message={apiError.message}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (appLoading || productLoading || !product || !application) {
    return <LoadingState />;
  }

  if (application.status !== "draft") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState
          compact
          title="Application is read-only"
          message={`This application has been ${application.status.replace("_", " ")} and can no longer be edited.`}
        />
      </div>
    );
  }

  return (
    <FormWizard
      product={product}
      draftId={applicationId}
      initialFormData={initialFormData}
      programId={application.programId}
    />
  );
}

export default function ResumeLoanApplicationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResumeContent />
    </Suspense>
  );
}
