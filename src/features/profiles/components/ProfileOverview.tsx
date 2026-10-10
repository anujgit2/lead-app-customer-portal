"use client";

import { useMemo } from "react";
import type { FormField, FormSection, FormTemplate } from "@/types";
import { DynamicForm } from "@/components/forms/DynamicForm";
import { mergeTemplateDefaults } from "@/utils/schema-builder";
import { profileDataToFormValues } from "../utils/profile-data";

function lockField(field: FormField): FormField {
  return { ...field, readonly: true, disabled: true };
}

function lockSection(section: FormSection): FormSection {
  return { ...section, fields: section.fields.map(lockField) };
}

function lockTemplate(template: FormTemplate): FormTemplate {
  return { ...template, sections: template.sections.map(lockSection) };
}

interface ProfileOverviewProps {
  template: FormTemplate;
  data: Record<string, unknown>;
}

export function ProfileOverview({ template, data }: ProfileOverviewProps) {
  const locked = useMemo(() => lockTemplate(template), [template]);
  const defaults = useMemo(
    () => mergeTemplateDefaults(template, profileDataToFormValues(template, data)),
    [template, data]
  );

  return (
    <div aria-readonly="true">
      <DynamicForm template={locked} defaultValues={defaults} onSubmit={() => undefined} />
    </div>
  );
}
