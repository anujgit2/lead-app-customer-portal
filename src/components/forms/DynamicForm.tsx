"use client";

import React from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
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

/**
 * Custom resolver that validates only the changed field(s) during blur,
 * but validates the entire form on submit.
 */
function createFieldLevelResolver(schema: any): Resolver {
  const zodResolverFn = zodResolver(schema);
  
  return async (values: any, context: any, options: any) => {
    // On submit (names is empty), validate entire form
    if (!options.names || options.names.length === 0) {
      return zodResolverFn(values, context, options);
    }

    // During blur, validate only the changed fields
    const result = await zodResolverFn(values, context, options);
    
    // Filter errors to only include the fields being validated
    const fieldNames = new Set(options.names);
    const filteredErrors: Record<string, any> = {};
    
    for (const [key, error] of Object.entries(result.errors ?? {})) {
      if (fieldNames.has(key)) {
        filteredErrors[key] = error;
      }
    }
    
    return {
      ...result,
      errors: filteredErrors,
    };
  };
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
