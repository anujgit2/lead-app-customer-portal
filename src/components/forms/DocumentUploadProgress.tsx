"use client";

import { useFormContext } from "react-hook-form";
import type { FormTemplate } from "@/types";
import { useWizardStore } from "@/store/wizard.store";
import { useWizardAnswers } from "@/components/forms/application-context";
import { isFieldRequired, isFieldVisible } from "@/utils/rule-engine";
import { cn } from "@/lib/utils";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fileCount(value: unknown): number {
  return Array.isArray(value) ? value.filter((item) => item != null && item !== "").length : 0;
}

export { isDocumentTemplate } from "@/utils/document-template";

export function DocumentUploadProgress({ template }: { template: FormTemplate }) {
  const { watch } = useFormContext();
  const values = watch();
  const wizardAnswers = useWizardAnswers();
  const wizardFormData = useWizardStore((state) => {
    const id = state.currentDraftId;
    return id ? state.drafts[id]?.formData : undefined;
  });

  let requiredTotal = 0;
  let requiredDone = 0;

  for (const section of template.sections) {
    const sectionValue = isPlainObject(values) ? values[section.code] : undefined;
    const scope = isPlainObject(sectionValue) ? sectionValue : {};
    for (const field of section.fields) {
      if (field.type !== "document" && field.type !== "file") continue;
      if (!isFieldVisible(field, scope, values, wizardAnswers, wizardFormData)) continue;
      if (!isFieldRequired(field, scope, values, wizardAnswers, wizardFormData)) continue;
      requiredTotal += 1;
      const min = field.minFiles && field.minFiles > 0 ? field.minFiles : 1;
      if (fileCount(scope[field.name]) >= min) requiredDone += 1;
    }
  }

  if (requiredTotal === 0) return null;

  const complete = requiredDone === requiredTotal;
  const percent = Math.round((requiredDone / requiredTotal) * 100);

  return (
    <div className="mb-2 flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <p className="shrink-0 text-sm font-semibold tracking-tight text-foreground">
        {requiredDone} of {requiredTotal} required
      </p>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={cn("hidden text-xs sm:block", complete ? "text-emerald-600" : "text-muted-foreground")}>
        {complete ? "Ready to continue" : "Add the required documents to continue"}
      </p>
    </div>
  );
}
