"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import type { LoanProduct, FormData, WizardStepStatus } from "@/types";
import { WizardProgress } from "./WizardProgress";
import { WizardStep, type WizardStepHandle } from "./WizardStep";
import { ReviewScreen } from "./ReviewScreen";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/store/wizard.store";
import { applicationService } from "@/services/application.service";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  SaveAll,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplicationIdProvider, PersistDocumentStepProvider } from "@/components/forms/application-context";
import { PanVerificationProvider } from "./pan-search-context";
import { buildWizardSchema } from "@/utils/schema-builder";
import { parseApiError } from "@/lib/api-error";
import type { ApiError } from "@/types";

interface FormWizardProps {
  product: LoanProduct;
  draftId?: string;
  initialFormData?: FormData;
  programId?: string;
  applicationNumber?: string;
}

function isEmptyFormValue(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyFormValue);
  if (typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);
    return entries.length === 0 || entries.every(isEmptyFormValue);
  }
  return false;
}

function mergeWizardFormData(
  local: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  if (Object.keys(local).length === 0) return { ...incoming };
  const merged: Record<string, unknown> = { ...incoming, ...local };
  for (const [key, incomingValue] of Object.entries(incoming)) {
    if (isEmptyFormValue(local[key]) && !isEmptyFormValue(incomingValue)) {
      merged[key] = incomingValue;
    }
  }
  return merged;
}

function formatValidationErrors(result: {
  success: false;
  error: { issues: { path: (string | number)[]; message: string }[] };
}): string {
  const unique = [...new Set(result.error.issues.map((issue) => issue.message))];
  const messages = unique.slice(0, 3);
  const suffix = unique.length > 3 ? ` (+${unique.length - 3} more)` : "";
  return messages.join(". ") + suffix;
}

export function FormWizard({
  product,
  draftId: initialDraftId,
  initialFormData,
  programId,
  applicationNumber,
}: FormWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { initDraft, setCurrentStep, updateFormData, setStepStatus, getDraft } =
    useWizardStore();
  const stepRef = useRef<WizardStepHandle>(null);
  const stepDataRef = useRef<Record<string, unknown>>({});

  const templates = product.templates;
  const totalSteps = templates.length;
  const isReviewStep = (step: number) => step === totalSteps;

  const [draftId] = useState<string>(() => {
    if (initialDraftId) return initialDraftId;
    return initDraft(product.code, totalSteps);
  });

  const draft = getDraft(draftId);
  const [currentStep, setCurrentStepLocal] = useState(draft?.currentStep ?? 0);
  const [stepData, setStepData] = useState<Record<string, unknown>>(
    () =>
      (initialFormData as Record<string, unknown>) ??
      (draft?.formData as Record<string, unknown>) ??
      {}
  );

  useEffect(() => {
    stepDataRef.current = stepData;
  }, [stepData]);
  const [stepStatuses, setStepStatuses] = useState<WizardStepStatus[]>(
    draft?.stepStatuses ??
      templates.map((t) => ({
        templateCode: t.code,
        completed: false,
        valid: false,
        touched: false,
      }))
  );
  const [savingMode, setSavingMode] = useState<"draft" | "close" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialFormData || Object.keys(initialFormData).length === 0) return;
    // Fill in server data without wiping values the user already entered in this session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStepData((prev) => mergeWizardFormData(prev, initialFormData as Record<string, unknown>));
  }, [initialFormData]);

  const navigateToStep = (step: number) => {
    setStepError(null);
    setCurrentStepLocal(step);
    setCurrentStep(draftId, step);
  };

  const handleDataChange = useCallback(
    (data: unknown) => {
      if (currentStep >= totalSteps) return;
      const template = templates[currentStep];
      const updated = { ...stepDataRef.current, [template.code]: data };
      stepDataRef.current = updated;
      setStepData(updated);
      updateFormData(draftId, template.code, data);
      setStepError(null);
    },
    [currentStep, totalSteps, templates, draftId, updateFormData]
  );

  const persistDocumentStep = useCallback(() => {
    const template = templates[currentStep];
    
    if (!template || template.propertyType !== "DocumentProperty") {
      return;
    }
    
    const stepData = stepDataRef.current[template.code];
    
    if (stepData === undefined) {
      return;
    }

    void applicationService
      .saveDraft(
        {
          applicationId: draftId,
          productCode: product.code,
          programId,
          currentStep,
          formData: stepDataRef.current as FormData,
          stepStatuses,
        },
        [template]
      )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      })
      .catch((err: unknown) => {
        toast.error(parseApiError(err).message);
      });
  }, [
    templates,
    currentStep,
    draftId,
    product.code,
    programId,
    stepStatuses,
    queryClient,
  ]);

  const handleValidChange = useCallback(
    (valid: boolean) => {
      if (currentStep < totalSteps) {
        setStepStatuses((prev) => {
          const updated = [...prev];
          updated[currentStep] = {
            ...updated[currentStep],
            valid,
            touched: true,
          };
          return updated;
        });
        setStepStatus(draftId, currentStep, { valid, touched: true });
      }
    },
    [currentStep, totalSteps, draftId, setStepStatus]
  );

  const validateCurrentStep = async (): Promise<boolean> => {
    if (isReviewStep(currentStep)) return true;

    const template = templates[currentStep];
    const data = stepDataRef.current[template.code];

    if (stepRef.current) {
      const valid = await stepRef.current.validate();
      if (!valid) {
        setStepError("Please fix the highlighted fields before continuing.");
        return false;
      }
    }

    const schema = buildWizardSchema(template, template.repeatable ?? false);
    const result = schema.safeParse(data ?? (template.repeatable ? [] : {}));
    if (!result.success) {
      setStepError(formatValidationErrors(result));
      return false;
    }

    setStepError(null);
    return true;
  };

  const handleNext = async () => {
    const valid = await validateCurrentStep();
    if (!valid) {
      toast.error(stepError ?? "Please fix all errors before proceeding");
      return;
    }

    const updatedStatuses = [...stepStatuses];
    if (!isReviewStep(currentStep)) {
      updatedStatuses[currentStep] = {
        ...updatedStatuses[currentStep],
        completed: true,
        valid: true,
      };
      setStepStatuses(updatedStatuses);
      setStepStatus(draftId, currentStep, { completed: true, valid: true });

      // Save current step data to backend via PATCH API
      try {
        setSavingMode("draft");
        await applicationService.saveDraft({
          applicationId: draftId,
          productCode: product.code,
          programId,
          currentStep,
          formData: stepDataRef.current as FormData,
          stepStatuses: updatedStatuses,
        }, [templates[currentStep]]);
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      } catch (err) {
        showApiValidationErrors(parseApiError(err));
        setSavingMode(null);
        return;
      } finally {
        setSavingMode(null);
      }
    }

    navigateToStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) navigateToStep(currentStep - 1);
  };

  const showApiValidationErrors = (error: ApiError) => {
    if (error.errors) {
      const messages = Object.entries(error.errors)
        .flatMap(([, msgs]) => msgs)
        .slice(0, 5);
      toast.error(messages.join("\n") || error.message);
      return;
    }
    toast.error(error.message);
  };

  const handleSaveDraft = async (closeAfterSave = false) => {
    setSavingMode(closeAfterSave ? "close" : "draft");
    try {
      await applicationService.saveDraft({
        applicationId: draftId,
        productCode: product.code,
        programId,
        currentStep,
        formData: stepDataRef.current as FormData,
        stepStatuses,
      }, isReviewStep(currentStep) ? [] : [templates[currentStep]]);
      // Refresh the dashboard and applications lists so the saved draft is current.
      queryClient.invalidateQueries({ queryKey: ["applications"] });

      if (closeAfterSave) {
        toast.success("Draft saved. You can pick up where you left off anytime.");
        router.push("/dashboard");
        return;
      }
      toast.success("Draft saved successfully");
    } catch (err) {
      showApiValidationErrors(parseApiError(err));
    } finally {
      setSavingMode(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const schema = buildWizardSchema(template, template.repeatable ?? false);
        const result = schema.safeParse(
          stepDataRef.current[template.code] ?? (template.repeatable ? [] : {})
        );
        if (!result.success) {
          navigateToStep(i);
          setStepError(formatValidationErrors(result));
          toast.error(`Please complete ${template.title} before submitting.`);
          setIsSubmitting(false);
          return;
        }
      }

      await applicationService.submitApplication({
        applicationId: draftId,
        productCode: product.code,
        programId,
        currentStep,
        formData: stepDataRef.current as FormData,
        stepStatuses,
        lastSavedAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application submitted successfully!");
      router.push("/dashboard");
    } catch (err) {
      showApiValidationErrors(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewing = isReviewStep(currentStep);
  const currentTemplate = !reviewing ? templates[currentStep] : null;
  const mountedTemplate = currentTemplate ?? templates[totalSteps - 1] ?? null;
  const currentDefaultValues = mountedTemplate
    ? (stepData[mountedTemplate.code] as Record<string, unknown>)
    : undefined;

  return (
    <PanVerificationProvider>
    <ApplicationIdProvider applicationId={draftId}>
    <PersistDocumentStepProvider onPersist={persistDocumentStep}>
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <div
        className={cn(
          "sticky top-0 z-30 border-b border-border bg-card",
          !reviewing && "bg-card/95 backdrop-blur-sm"
        )}
      >
        <div
          className={cn(
            "mx-auto",
            reviewing
              ? "flex max-w-[880px] flex-col gap-3 px-4 pb-2.5 pt-3 sm:px-6 sm:pb-3 sm:pt-3.5"
              : "max-w-5xl px-4 py-4 sm:px-6"
          )}
        >
          <div className={cn("flex items-center justify-between gap-3", !reviewing && "mb-4 items-start")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-semibold tracking-[-0.01em] text-foreground",
                  reviewing ? "text-lg font-[650] leading-[26px]" : "text-base leading-snug"
                )}
              >
                {product.name}
                {reviewing && applicationNumber ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11.5px] font-medium text-muted-foreground">
                    {applicationNumber}
                  </span>
                ) : null}
              </h1>
              {!reviewing && (
                <p className="text-xs text-muted-foreground">{product.description}</p>
              )}
            </div>
            <Button
              asChild
              variant={reviewing ? "ghost" : "outline"}
              size="sm"
              className="shrink-0 gap-2"
            >
              <Link href="/dashboard" aria-label={reviewing ? "Dashboard" : "Back to dashboard"}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{reviewing ? "Dashboard" : "Back to dashboard"}</span>
                {!reviewing && <span className="sm:hidden">Dashboard</span>}
              </Link>
            </Button>
          </div>
          <div
            className={
              reviewing
                ? cn("mx-auto w-full", templates.length <= 2 && "max-w-[420px]")
                : undefined
            }
          >
            <WizardProgress
              templates={templates}
              currentStep={currentStep}
              stepStatuses={stepStatuses}
              onStepClick={navigateToStep}
              compact={reviewing}
            />
          </div>
          {!reviewing && (
          <div className="mt-3 grid grid-cols-3 items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="justify-self-start px-2 text-muted-foreground"
            >
              Back
            </Button>
            <span className="justify-self-center whitespace-nowrap text-xs font-medium text-muted-foreground">
              Step {currentStep + 1} of {totalSteps + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSaveDraft(false)}
              loading={savingMode === "draft"}
              disabled={savingMode !== null || isSubmitting}
              className="justify-self-end px-2 text-muted-foreground"
            >
              Save
            </Button>
          </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          reviewing ? "max-w-[880px] pb-8 pt-5 sm:pb-10 sm:pt-7" : "max-w-5xl py-8 sm:py-10"
        )}
      >
        {currentTemplate && (
          <div className="mb-8">
            <h2 className="text-2xl font-[650] leading-8 tracking-[-0.02em] text-foreground">
              {currentTemplate.title}
            </h2>
            {currentTemplate.description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {currentTemplate.description}
              </p>
            )}
          </div>
        )}

        {stepError && !isReviewStep(currentStep) && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-danger-strong"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        <div className="animate-fade-in">
          {mountedTemplate && (
            <div className={isReviewStep(currentStep) ? "hidden" : undefined}>
              <WizardStep
                key={mountedTemplate.code}
                ref={stepRef}
                template={mountedTemplate}
                defaultValues={currentDefaultValues}
                onValidChange={handleValidChange}
                onDataChange={handleDataChange}
              />
            </div>
          )}
          {isReviewStep(currentStep) && (
            <ReviewScreen
              templates={templates}
              formData={stepData as FormData}
              onEditStep={navigateToStep}
              onBack={handlePrev}
              onSubmit={handleSubmit}
              onSaveClose={() => handleSaveDraft(true)}
              isSubmitting={isSubmitting}
              isSaving={savingMode === "close"}
            />
          )}
        </div>

        {/* ── Navigation footer ── */}
        {!isReviewStep(currentStep) && (
          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveDraft(true)}
                loading={savingMode === "close"}
                disabled={savingMode !== null}
                className="gap-2"
              >
                <SaveAll className="h-4 w-4" />
                Save &amp; Close
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="min-w-[130px] gap-2"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    Review
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PersistDocumentStepProvider>
    </ApplicationIdProvider>
    </PanVerificationProvider>
  );
}
