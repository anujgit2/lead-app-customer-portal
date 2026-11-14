"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FormWizard } from "@/features/loan-application/FormWizard";
import { PageShell } from "@/components/PageShell";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { propertiesToFormData } from "@/services/application.service";
import { leadService, leadWizardBackend } from "@/services/lead.service";
import { normalizeTemplateAuto } from "@/utils/template-mapper";
import type { FormData, LoanProduct } from "@/types";

export function LeadViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id") ?? "";

  const lead = useQuery({
    queryKey: ["customer-lead", leadId],
    queryFn: () => leadService.get(leadId),
    enabled: !!leadId,
  });

  // The product is rebuilt from the snapshot the lead was created with, so later catalog edits
  // do not change this form.
  const product = useMemo<LoanProduct | null>(() => {
    if (!lead.data) return null;
    try {
      return normalizeTemplateAuto(lead.data.configuration);
    } catch {
      return null;
    }
  }, [lead.data]);

  const initialFormData = useMemo<FormData>(
    () => (product && lead.data ? (propertiesToFormData(lead.data.properties, product.templates) as FormData) : ({} as FormData)),
    [product, lead.data]
  );

  const wizardBackend = useMemo(
    () => (product ? leadWizardBackend(leadId, product.templates) : null),
    [leadId, product]
  );

  if (!leadId) {
    return (
      <PageShell width="narrow">
        <ErrorState compact title="Invalid link" message="This application link is incomplete." />
      </PageShell>
    );
  }

  if (lead.isError) {
    return (
      <PageShell width="narrow">
        <ErrorState
          compact
          title="Unable to open this application"
          message={parseApiError(lead.error).message}
          onRetry={() => lead.refetch()}
        />
      </PageShell>
    );
  }

  if (lead.isLoading || !lead.data) {
    return <PageShell width="narrow"><p className="text-sm text-muted-foreground">Loading…</p></PageShell>;
  }

  if (!product) {
    return (
      <PageShell width="narrow">
        <ErrorState compact title="Form unavailable" message="This application's form could not be loaded." />
      </PageShell>
    );
  }

  if (lead.data.submitted) {
    return (
      <PageShell width="narrow">
        <h1 className="text-2xl font-semibold">Application submitted</h1>
        <p className="text-sm text-muted-foreground">
          Thank you. Your partner will contact you if anything else is needed.
        </p>
      </PageShell>
    );
  }

  if (!wizardBackend) return null;

  const latestRequest = lead.data.requests.at(-1);

  return (
    <>
      {latestRequest && lead.data.status === "INFO_REQUESTED" && (
        <p role="status" className="mx-auto mt-4 max-w-3xl rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          Your partner asked for more information: {latestRequest.reason}
        </p>
      )}
    <FormWizard
      product={product}
      draftId={leadId}
      initialFormData={initialFormData}
      programId={lead.data.programId}
      backend={wizardBackend}
      onExit={() => router.push("/leads/")}
    />
    </>
  );
}
