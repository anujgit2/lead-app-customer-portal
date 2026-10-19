"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import type { FormTemplate, LoanProduct, FormData, WizardStepStatus } from "@/types";
import { WizardProgress } from "./WizardProgress";
import { WizardStep, type WizardStepHandle } from "./WizardStep";
import { ReviewScreen } from "./ReviewScreen";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/store/wizard.store";
import { applicationService } from "@/services/application.service";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, AlertCircle, Save } from "lucide-react";
import { StepperRecordHeader } from "@/features/loan-application/steppers/StepperRecordHeader";
import { ApplicationIdProvider, PersistDocumentStepProvider, WizardAnswersProvider } from "@/components/forms/application-context";
import { PanVerificationProvider } from "./pan-search-context";
import { buildWizardSchema } from "@/utils/schema-builder";
import { isFieldRequired, isFieldVisible } from "@/utils/rule-engine";
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

function isFilledValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some(isFilledValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(isFilledValue);
  return true;
}

function requiredFieldProgress(
  template: FormTemplate | null,
  data: unknown,
  wizardData?: Record<string, unknown>
): { done: number; total: number } {
  if (!template) return { done: 0, total: 0 };
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  let done = 0;
  let total = 0;

  for (const section of template.sections) {
    const sectionValue = root[section.code];
    const rows = section.repeatable
      ? Array.isArray(sectionValue) && sectionValue.length > 0
        ? sectionValue
        : [{}]
      : [sectionValue];

    for (const row of rows) {
      const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      for (const field of section.fields) {
        if (field.type === "hidden") continue;
        if (!isFieldVisible(field, record, root, wizardData)) continue;
        if (!isFieldRequired(field, record, root, wizardData)) continue;
        total += 1;
        if (isFilledValue(record[field.name])) done += 1;
      }
    }
  }

  return { done, total };
}

function formatSavedTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
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
  const [savedAt, setSavedAt] = useState<Date | null>(null);

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

    const schema = buildWizardSchema(
      template,
      template.repeatable ?? false,
      stepDataRef.current
    );
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
        setSavedAt(new Date());
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

      const saved = new Date();
      setSavedAt(saved);
      if (closeAfterSave) {
        toast.success("Draft saved. You can pick up where you left off anytime.");
        router.push("/dashboard");
        return;
      }
      toast.success("Draft saved");
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
        const schema = buildWizardSchema(
          template,
          template.repeatable ?? false,
          stepDataRef.current
        );
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
  const required = requiredFieldProgress(
    currentTemplate,
    currentTemplate ? stepData[currentTemplate.code] : undefined,
    stepData
  );
  const requiredPct = required.total === 0 ? 100 : Math.round((required.done / required.total) * 100);
  const savedLabel = savingMode === "draft" || savingMode === "close"
    ? "Saving…"
    : savedAt
      ? `Draft saved · ${formatSavedTime(savedAt)}`
      : "Draft";

  return (
    <PanVerificationProvider>
    <WizardAnswersProvider value={stepData}>
    <ApplicationIdProvider applicationId={draftId}>
    <PersistDocumentStepProvider onPersist={persistDocumentStep}>
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 pb-10 pt-6 sm:px-6">
      <section
        aria-label="Application progress"
        className="relative z-10 overflow-visible rounded-2xl border border-slate-200 bg-white px-6 pb-6 pt-[22px] shadow-[0_5px_18px_rgba(29,58,94,0.055)] max-[600px]:rounded-xl max-[600px]:px-2.5 max-[600px]:pb-4 max-[600px]:pt-4"
      >
        <StepperRecordHeader
          title={product.name}
          applicationNumber={applicationNumber}
          applicationId={draftId}
          savedLabel={savedLabel}
          saved={Boolean(savedAt && savingMode === null)}
        />
        <WizardProgress
          variant={product.stepper}
          templates={templates}
          currentStep={currentStep}
          stepStatuses={stepStatuses}
          onStepClick={navigateToStep}
        />
      </section>

      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-2xl font-semibold leading-8 tracking-tight text-slate-900">
            {currentTemplate?.title ?? "Review"}
          </h2>
          <span className="whitespace-nowrap text-sm font-normal text-slate-500">
            Step {currentStep + 1} of {totalSteps + 1}
          </span>
        </div>
        {currentTemplate?.description ? (
          <p className="mt-0.5 max-w-2xl text-sm leading-5 text-muted-foreground">
            {currentTemplate.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        {stepError && !isReviewStep(currentStep) && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-danger-strong"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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

        {!isReviewStep(currentStep) && (
          <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-30 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-border bg-card py-2.5 pl-4 pr-3 shadow-[var(--shadow-2)]">
            <div className="min-w-[200px] flex-1" aria-live="polite">
              <div className="mb-1.5 flex justify-between text-[12.5px] tabular-nums text-muted-foreground">
                <span>Required fields</span>
                <b className="font-semibold text-foreground">
                  {required.total === 0 ? "None" : `${required.done} of ${required.total}`}
                </b>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Required fields completed"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={requiredPct}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${requiredPct}%` }}
                />
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {currentStep > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={savingMode !== null || isSubmitting}
                  className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] max-sm:flex-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveDraft(false)}
                loading={savingMode === "draft"}
                disabled={savingMode !== null || isSubmitting}
                className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] max-sm:flex-1"
              >
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={savingMode !== null || isSubmitting}
                className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] max-sm:flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PersistDocumentStepProvider>
    </ApplicationIdProvider>
    </WizardAnswersProvider>
    </PanVerificationProvider>
  );
}
