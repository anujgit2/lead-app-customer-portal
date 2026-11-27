"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FormWizard } from "@/features/loan-application/FormWizard";
import { ApplicationViewScreen } from "@/features/loan-application/ApplicationViewScreen";
import { PageShell } from "@/components/PageShell";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { propertiesToFormData } from "@/services/application.service";
import { leadService, leadWizardBackend, type LeadDetail } from "@/services/lead.service";
import { normalizeTemplateAuto } from "@/utils/template-mapper";
import { RequestedDocumentsChecklist } from "@/features/leads/RequestedDocumentsChecklist";
import { agentEditedForms } from "@/utils/lead-provenance";
import type { LoanApplication } from "@/types";

/** A submitted lead shaped as a loan application, for the application view. Leads have no application record. */
function leadAsApplication(id: string, lead: LeadDetail): LoanApplication {
  const underReview = lead.status === "UNDER_REVIEW" || lead.status === "FORWARDED";
  return {
    id,
    applicationNumber: `LEAD-${id.slice(0, 8).toUpperCase()}`,
    loanType: "",
    loanAmount: 0,
    status: underReview ? "under_review" : "submitted",
    createdAt: "",
    submittedAt: lead.submittedAt ?? undefined,
    updatedAt: lead.updatedAt ?? "",
    userId: "",
    programId: lead.programId,
  };
}
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
    // The same read-only application view used for stored applications.
    return (
      <ApplicationViewScreen
        application={leadAsApplication(leadId, lead.data)}
        product={product}
        formData={initialFormData}
      />
    );
  }

  if (!wizardBackend) return null;

  const latestRequest = lead.data.requests.at(-1);
  const agentEdited = agentEditedForms(lead.data.properties, product.templates);

  return (
    <>
      {latestRequest && lead.data.status === "INFO_REQUESTED" && (
        <p role="status" className="mx-auto mt-4 max-w-3xl rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          Your partner asked for more information: {latestRequest.reason}
        </p>
      )}
      {agentEdited.length > 0 && (
        <p role="status" className="mx-auto mt-4 max-w-3xl rounded border p-3 text-sm">
          Your partner filled in or changed: <strong>{agentEdited.join(", ")}</strong>. Check these before you submit.
        </p>
      )}
      <RequestedDocumentsChecklist
        leadId={leadId}
        rows={lead.data.requestedDocuments ?? []}
        properties={lead.data.properties}
        onChanged={() => void lead.refetch()}
      />
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
