"use client";

import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { FormTemplate } from "@/types";
import { buildTemplateSchema } from "@/utils/schema-builder";
import { createFieldLevelResolver } from "@/utils/form-resolver";
import { DynamicSection } from "./DynamicSection";
import { FormChromeProvider, type FormChrome } from "./form-chrome";
import { PanSearchScopeProvider, PanVerificationProvider } from "@/features/loan-application/pan-search-context";

interface DynamicFormProps {
  template: FormTemplate;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onInvalid?: () => void;
  formRef?: React.Ref<HTMLFormElement | null>;
  chrome?: FormChrome;
}

export function DynamicForm({
  template,
  defaultValues,
  onSubmit,
  onInvalid,
  formRef,
  chrome = "default",
}: DynamicFormProps) {
  const schema = buildTemplateSchema(template);
  const resolver = createFieldLevelResolver(schema);

  const methods = useForm({
    resolver,
    defaultValues: defaultValues ?? {},
    mode: "onBlur",
    shouldUnregister: true,
  });

  return (
    <FormChromeProvider value={chrome}>
      <PanVerificationProvider>
        <PanSearchScopeProvider scopeId={template.code}>
          <FormProvider {...methods}>
            <form
              ref={formRef}
              onSubmit={methods.handleSubmit(onSubmit, () => onInvalid?.())}
              className={chrome === "profile" ? "profile-fields flex flex-col gap-4" : "space-y-6"}
              noValidate
            >
              {template.sections.map((section) => (
                <DynamicSection key={section.code} section={section} />
              ))}
            </form>
          </FormProvider>
        </PanSearchScopeProvider>
      </PanVerificationProvider>
    </FormChromeProvider>
  );
}
