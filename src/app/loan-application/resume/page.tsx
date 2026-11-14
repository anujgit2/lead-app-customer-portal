"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FormWizard } from "@/features/loan-application/FormWizard";
import { ApplicationViewScreen } from "@/features/loan-application/ApplicationViewScreen";
import {
  applicationService,
  resolveApplicationFormData,
} from "@/services/application.service";
import { AppLayout } from "@/layouts/AppLayout";
import { PageShell } from "@/components/PageShell";
import { LoadingProgressDialog } from "@/features/loan-application/LoadingProgressDialog";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import type { FormData } from "@/types";

function LoadingState() {
  return (
    <LoadingProgressDialog open title="Opening your application" message="Loading application…" />
  );
}

function ResumeContent() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("id") ?? "";
  const programIdParam = searchParams.get("programId") ?? "";
  const programCode = searchParams.get("programCode") ?? "";

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

  const productLookup =
    application?.programId || programIdParam || application?.programCode || programCode || "";

  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
    error: productQueryError,
  } = useQuery({
    queryKey: ["loan-product", applicationId, productLookup],
    queryFn: () => applicationService.getLoanProductByProgramId(productLookup),
    enabled: !!application && !!productLookup,
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
      <PageShell width="narrow">
        <ErrorState
          compact
          title="Invalid link"
          message="No application ID was provided. Please go back and try again."
        />
      </PageShell>
    );
  }

  if (appError || productError) {
    const apiError = parseApiError(appError ? appQueryError : productQueryError);
    return (
      <PageShell width="narrow">
        <ErrorState
          compact
          title={appError ? "Unable to load application" : "Unable to load application form"}
          message={apiError.message}
          onRetry={() => window.location.reload()}
        />
      </PageShell>
    );
  }

  if (appLoading || productLoading || !product || !application) {
    return <LoadingState />;
  }

  if (application.status !== "draft") {
    return (
      <ApplicationViewScreen
        application={application}
        product={product}
        formData={initialFormData}
      />
    );
  }

  return (
    <FormWizard
      product={product}
      draftId={applicationId}
      initialFormData={initialFormData}
      programId={application.programId}
      applicationNumber={application.applicationNumber}
    />
  );
}

export default function ResumeLoanApplicationPage() {
  return (
    <AppLayout>
      <Suspense fallback={<LoadingState />}>
        <ResumeContent />
      </Suspense>
    </AppLayout>
  );
}
