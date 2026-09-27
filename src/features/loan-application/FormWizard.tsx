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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  SaveAll,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { buildWizardSchema } from "@/utils/schema-builder";
import { parseApiError } from "@/lib/api-error";
import type { ApiError } from "@/types";

interface FormWizardProps {
  product: LoanProduct;
  draftId?: string;
  initialFormData?: FormData;
  programId?: string;
}

function formatValidationErrors(result: {
  success: false;
  error: { issues: { path: (string | number)[]; message: string }[] };
}): string {
  const messages = result.error.issues
    .slice(0, 3)
    .map((issue) => issue.message);
  const suffix =
    result.error.issues.length > 3
      ? ` (+${result.error.issues.length - 3} more)`
      : "";
  return messages.join(". ") + suffix;
}

export function FormWizard({
  product,
  draftId: initialDraftId,
  initialFormData,
  programId,
}: FormWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { initDraft, setCurrentStep, updateFormData, setStepStatus, getDraft } =
    useWizardStore();
  const stepRef = useRef<WizardStepHandle>(null);

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
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      // Keep the wizard state aligned when an existing application loads after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepData(initialFormData as Record<string, unknown>);
    }
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
      const updated = { ...stepData, [template.code]: data };
      setStepData(updated);
      updateFormData(draftId, template.code, data);
      setStepError(null);
    },
    [currentStep, totalSteps, templates, stepData, draftId, updateFormData]
  );

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
    const data = stepData[template.code];

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
          formData: stepData as FormData,
          stepStatuses: updatedStatuses,
        });
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
        formData: stepData as FormData,
        stepStatuses,
      });
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
          stepData[template.code] ?? (template.repeatable ? [] : {})
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
        formData: stepData as FormData,
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

  const currentTemplate = !isReviewStep(currentStep) ? templates[currentStep] : null;
  const currentDefaultValues = currentTemplate
    ? (stepData[currentTemplate.code] as Record<string, unknown>)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50/70">
      {/* ── Sticky header ── */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-30 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-base font-semibold tracking-tight text-slate-900 leading-snug">
                {product.name}
              </h1>
              <p className="text-xs text-slate-400 font-normal">{product.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveDraft(false)}
                loading={savingMode === "draft"}
                disabled={savingMode !== null || isSubmitting}
                className="gap-1.5 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 active:scale-[0.98]"
              >
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveDraft(true)}
                loading={savingMode === "close"}
                disabled={savingMode !== null || isSubmitting}
                className="gap-1.5 transition-all duration-200 active:scale-[0.98]"
              >
                <SaveAll className="h-3.5 w-3.5" />
                Save &amp; Close
              </Button>
            </div>
          </div>
          <WizardProgress
            templates={templates}
            currentStep={currentStep}
            stepStatuses={stepStatuses}
            onStepClick={navigateToStep}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {currentTemplate && (
          <div className="mb-8">
            <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-2">
              Step {currentStep + 1} of {totalSteps + 1}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {currentTemplate.title}
            </h2>
            {currentTemplate.description && (
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
                {currentTemplate.description}
              </p>
            )}
          </div>
        )}

        {stepError && !isReviewStep(currentStep) && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3.5 text-sm text-destructive shadow-sm"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        <div className="animate-fade-in">
          {isReviewStep(currentStep) ? (
            <ReviewScreen
              templates={templates}
              formData={stepData as FormData}
              onEditStep={navigateToStep}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          ) : (
            currentTemplate && (
              <WizardStep
                key={currentTemplate.code}
                ref={stepRef}
                template={currentTemplate}
                defaultValues={currentDefaultValues}
                onValidChange={handleValidChange}
                onDataChange={handleDataChange}
              />
            )
          )}
        </div>

        {/* ── Navigation footer ── */}
        {!isReviewStep(currentStep) && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 transition-all duration-200 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSaveDraft(false)}
                loading={savingMode === "draft"}
                disabled={savingMode !== null}
                className="gap-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 active:scale-[0.98]"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveDraft(true)}
                loading={savingMode === "close"}
                disabled={savingMode !== null}
                className="gap-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 active:scale-[0.98]"
              >
                <SaveAll className="h-4 w-4" />
                Save &amp; Close
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="gap-2 min-w-[130px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
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
  );
}
