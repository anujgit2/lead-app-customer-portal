"use client";

import React, { useMemo } from "react";
import type { FormTemplate } from "@/types";
import { WizardStep } from "@/features/loan-application/WizardStep";
import { usePlayground } from "../playground-context";

/**
 * Renders exactly one `FormTemplate` using the app's real `WizardStep`
 * (the same component `FormWizard` uses in production) — no bespoke renderer.
 * When only a single section is selected, it builds a synthetic template
 * containing just that section so `WizardStep`/`DynamicSection` are still
 * doing all the actual rendering/repeatable/validation work unmodified.
 */
export function TemplatePreview({ template, sectionCode }: { template: FormTemplate; sectionCode: string | null }) {
  const { testData, previewKey, setLiveDataForTemplate, setLiveErrorsForTemplate } = usePlayground();

  const effectiveTemplate = useMemo<FormTemplate>(() => {
    if (!sectionCode) return template;
    const section = template.sections.find((s) => s.code === sectionCode);
    if (!section) return template;
    return { ...template, sections: [section] };
  }, [template, sectionCode]);

  const defaultValues = (testData[template.code] as Record<string, unknown> | undefined) ?? {};

  return (
    <WizardStep
      key={`${effectiveTemplate.code}-${sectionCode ?? "all"}-${previewKey}`}
      template={effectiveTemplate}
      defaultValues={defaultValues}
      onDataChange={(data) => setLiveDataForTemplate(template.code, data)}
      onErrorsChange={(errors) => setLiveErrorsForTemplate(template.code, errors)}
    />
  );
}
