"use client";

import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { FormTemplate } from "@/types";
import { buildTemplateSchema } from "@/utils/schema-builder";
import { createFieldLevelResolver } from "@/utils/form-resolver";
import { DynamicSection } from "./DynamicSection";

interface DynamicFormProps {
  template: FormTemplate;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

export function DynamicForm({
  template,
  defaultValues,
  onSubmit,
  formRef,
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
    <FormProvider {...methods}>
      <form
        ref={formRef}
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {template.sections.map((section) => (
          <DynamicSection key={section.code} section={section} />
        ))}
      </form>
    </FormProvider>
  );
}
