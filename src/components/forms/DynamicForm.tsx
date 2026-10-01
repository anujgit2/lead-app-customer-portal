"use client";

import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormTemplate } from "@/types";
import { buildTemplateSchema } from "@/utils/schema-builder";
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

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
    mode: "onBlur",
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
