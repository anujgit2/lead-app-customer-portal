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
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, CheckCircle2 } from "lucide-react";
import { buildTemplateSchema } from "@/utils/schema-builder";
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
  const [isSaving, setIsSaving] = useState(false);
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

    const schema = buildTemplateSchema(template);
    const result = schema.safeParse(data ?? {});
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

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await applicationService.saveDraft({
        applicationId: draftId,
        productCode: product.code,
        programId,
        currentStep,
        formData: stepData as FormData,
        stepStatuses,
      });
      toast.success("Draft saved successfully");
    } catch (err) {
      showApiValidationErrors(parseApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const schema = buildTemplateSchema(template);
        const result = schema.safeParse(stepData[template.code] ?? {});
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
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{product.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              loading={isSaving}
              className="gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </Button>
          </div>
          <WizardProgress
            templates={templates}
            currentStep={currentStep}
            stepStatuses={stepStatuses}
            onStepClick={navigateToStep}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {currentTemplate && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>
                Step {currentStep + 1} of {totalSteps + 1}
              </span>
            </div>
            <h2 className="text-xl font-semibold">{currentTemplate.title}</h2>
            {currentTemplate.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentTemplate.description}
              </p>
            )}
          </div>
        )}

        {stepError && !isReviewStep(currentStep) && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {stepError}
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

        {!isReviewStep(currentStep) && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSaveDraft}
                loading={isSaving}
                className="gap-2 text-muted-foreground"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                className="gap-2 min-w-[120px]"
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
