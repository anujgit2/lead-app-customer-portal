"use client";

import React, { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FormTemplate } from "@/types";
import { buildTemplateSchema, mergeTemplateDefaults } from "@/utils/schema-builder";
import { SyncFormToWizardProvider } from "@/components/forms/application-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DynamicSection } from "@/components/forms/DynamicSection";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronDown, ChevronUp, FileWarning } from "lucide-react";

export interface WizardStepHandle {
  validate: () => Promise<boolean>;
}

interface WizardStepProps {
  template: FormTemplate;
  defaultValues?: unknown;
  onValidChange?: (valid: boolean) => void;
  onDataChange?: (data: unknown) => void;
  /** Optional — surfaces the live RHF error tree (e.g. for a dev inspector). Unused in production. */
  onErrorsChange?: (errors: FieldErrors) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

function SchemaBuildError({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <FileWarning className="h-4 w-4" />
      <AlertTitle>Could not build form validation</AlertTitle>
      <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
    </Alert>
  );
}

function buildSchemaSafe(template: FormTemplate): { schema: z.ZodTypeAny; error: string | null } {
  try {
    return { schema: buildTemplateSchema(template), error: null };
  } catch (err) {
    return {
      schema: z.object({}),
      error: err instanceof Error ? err.message : "Failed to build validation schema",
    };
  }
}

function RepeatableInstance({
  template,
  index,
  defaultValues,
  canRemove,
  onRemove,
  onChange,
  onValidateRef,
  onErrors,
}: {
  template: FormTemplate;
  index: number;
  defaultValues?: unknown;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (index: number, data: unknown) => void;
  onValidateRef?: (index: number, validate: () => Promise<boolean>) => void;
  onErrors?: (index: number, errors: FieldErrors) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { schema, error: schemaError } = React.useMemo(() => buildSchemaSafe(template), [template]);
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: mergeTemplateDefaults(template, defaultValues),
    mode: "onBlur",
    shouldUnregister: true,
  });

  React.useEffect(() => {
    const sub = methods.watch((data) => {
      onChange(index, data);
      onErrors?.(index, methods.formState.errors);
    });
    return () => sub.unsubscribe();
  }, [methods, index, onChange, onErrors]);

  React.useEffect(() => {
    onValidateRef?.(index, () => methods.trigger());
  }, [methods, index, onValidateRef]);

  const syncForm = React.useCallback(() => {
    onChange(index, methods.getValues());
  }, [index, onChange, methods]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <p className="font-medium text-sm">
          {template.title} #{index + 1}
        </p>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 pb-5">
          <Separator className="mb-5" />
          {schemaError ? (
            <SchemaBuildError error={schemaError} />
          ) : (
            <SyncFormToWizardProvider onSync={syncForm}>
              <FormProvider {...methods}>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  {template.sections.map((section) => (
                    <DynamicSection key={section.code} section={section} />
                  ))}
                </form>
              </FormProvider>
            </SyncFormToWizardProvider>
          )}
        </div>
      )}
    </div>
  );
}

function RepeatableTemplateInstances({
  template,
  defaultValues,
  onDataChange,
  onErrorsChange,
  validateRef,
}: {
  template: FormTemplate;
  defaultValues?: unknown;
  onDataChange?: (data: unknown) => void;
  onErrorsChange?: (errors: FieldErrors) => void;
  validateRef?: React.RefObject<WizardStepHandle | null>;
}) {
  const initData =
    Array.isArray(defaultValues) && defaultValues.length > 0
      ? (defaultValues as unknown[])
      : [{}];

  const [instances, setInstances] = useState<unknown[]>(initData);
  const instancesRef = React.useRef(instances);
  const validatorsRef = React.useRef<Map<number, () => Promise<boolean>>>(new Map());
  const errorsRef = React.useRef<Map<number, FieldErrors>>(new Map());

  React.useEffect(() => {
    instancesRef.current = instances;
  }, [instances]);

  const handleValidateRef = useCallback(
    (index: number, validate: () => Promise<boolean>) => {
      validatorsRef.current.set(index, validate);
    },
    []
  );

  const handleInstanceErrors = useCallback(
    (index: number, errors: FieldErrors) => {
      errorsRef.current.set(index, errors);
      onErrorsChange?.(Array.from(errorsRef.current.values()) as unknown as FieldErrors);
    },
    [onErrorsChange]
  );

  useImperativeHandle(validateRef, () => ({
    validate: async () => {
      const validators = Array.from(validatorsRef.current.values());
      if (validators.length === 0) return true;
      const results = await Promise.all(validators.map((fn) => fn()));
      return results.every(Boolean);
    },
  }));

  const handleChange = useCallback(
    (index: number, data: unknown) => {
      const updated = [...instancesRef.current];
      updated[index] = data;
      instancesRef.current = updated;
      setInstances(updated);
      onDataChange?.(updated);
    },
    [onDataChange]
  );

  const addInstance = () => {
    const updated = [...instancesRef.current, {}];
    instancesRef.current = updated;
    setInstances(updated);
    onDataChange?.(updated);
  };

  const removeInstance = (index: number) => {
    validatorsRef.current.delete(index);
    const updated = instancesRef.current.filter((_, i) => i !== index);
    instancesRef.current = updated;
    setInstances(updated);
    onDataChange?.(updated);
  };

  const minInstances = template.minInstances ?? 1;
  const maxInstances = template.maxInstances;

  const syncAllInstances = React.useCallback(() => {
    onDataChange?.(instancesRef.current);
  }, [onDataChange]);

  return (
    <SyncFormToWizardProvider onSync={syncAllInstances}>
      <div className="space-y-4">
        {instances.map((inst, index) => (
          <RepeatableInstance
            key={index}
            template={template}
            index={index}
            defaultValues={inst}
            canRemove={instances.length > minInstances}
            onRemove={() => removeInstance(index)}
            onChange={handleChange}
            onValidateRef={handleValidateRef}
            onErrors={handleInstanceErrors}
          />
        ))}

        {(!maxInstances || instances.length < maxInstances) && (
          <Button
            type="button"
            variant="outline"
            onClick={addInstance}
            className="gap-2 w-full border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add Another {template.title}
          </Button>
        )}
      </div>
    </SyncFormToWizardProvider>
  );
}

const SingleTemplateForm = forwardRef<WizardStepHandle, WizardStepProps>(
  function SingleTemplateForm(
    { template, defaultValues, onValidChange, onDataChange, onErrorsChange, formRef },
    ref
  ) {
    const { schema, error: schemaError } = React.useMemo(() => buildSchemaSafe(template), [template]);
    const methods = useForm({
      resolver: zodResolver(schema),
      defaultValues: mergeTemplateDefaults(template, defaultValues),
      mode: "onBlur",
      shouldUnregister: true,
    });

    useImperativeHandle(ref, () => ({
      validate: () => methods.trigger(),
    }));

    const syncForm = React.useCallback(() => {
      onDataChange?.(methods.getValues());
    }, [onDataChange, methods]);

    React.useEffect(() => {
      const subscription = methods.watch((data) => {
        onDataChange?.(data);
        methods.trigger().then((valid) => {
          onValidChange?.(valid);
          onErrorsChange?.(methods.formState.errors);
        }).catch(() => {
          // Invalid authored regex/mask configs must not unhandled-reject and crash the playground.
        });
      });
      return () => subscription.unsubscribe();
    }, [methods, onDataChange, onValidChange, onErrorsChange]);

    if (schemaError) {
      return <SchemaBuildError error={schemaError} />;
    }

    return (
      <SyncFormToWizardProvider onSync={syncForm}>
        <FormProvider {...methods}>
          <form
            ref={formRef}
            className="space-y-6"
            noValidate
            onSubmit={(e) => e.preventDefault()}
          >
            {template.sections.map((section) => (
              <DynamicSection key={section.code} section={section} />
            ))}
          </form>
        </FormProvider>
      </SyncFormToWizardProvider>
    );
  }
);

export const WizardStep = forwardRef<WizardStepHandle, WizardStepProps>(
  function WizardStep(props, ref) {
    if (props.template.repeatable) {
      return (
        <RepeatableTemplateInstances
          template={props.template}
          defaultValues={props.defaultValues}
          onDataChange={props.onDataChange}
          onErrorsChange={props.onErrorsChange}
          validateRef={ref as React.RefObject<WizardStepHandle | null>}
        />
      );
    }
    return <SingleTemplateForm {...props} ref={ref} />;
  }
);
