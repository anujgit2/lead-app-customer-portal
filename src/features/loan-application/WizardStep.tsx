"use client";

import React, { useState, useCallback } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormTemplate } from "@/types";
import { buildTemplateSchema } from "@/utils/schema-builder";
import { DynamicSection } from "@/components/forms/DynamicSection";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface WizardStepProps {
  template: FormTemplate;
  defaultValues?: unknown;
  onValidChange?: (valid: boolean) => void;
  onDataChange?: (data: unknown) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
}

// A single repeatable instance rendered as its own form
function RepeatableInstance({
  template,
  index,
  defaultValues,
  canRemove,
  onRemove,
  onChange,
}: {
  template: FormTemplate;
  index: number;
  defaultValues?: unknown;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (index: number, data: unknown) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const schema = buildTemplateSchema(template);
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: (defaultValues as Record<string, unknown>) ?? {},
    mode: "onChange",
  });

  React.useEffect(() => {
    const sub = methods.watch((data) => onChange(index, data));
    return () => sub.unsubscribe();
  }, [methods, index, onChange]);

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
          <FormProvider {...methods}>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {template.sections.map((section) => (
                <DynamicSection key={section.code} section={section} />
              ))}
            </form>
          </FormProvider>
        </div>
      )}
    </div>
  );
}

function RepeatableTemplateInstances({
  template,
  defaultValues,
  onDataChange,
}: {
  template: FormTemplate;
  defaultValues?: unknown;
  onDataChange?: (data: unknown) => void;
}) {
  const initData = Array.isArray(defaultValues) && defaultValues.length > 0
    ? defaultValues as unknown[]
    : [{}];

  const [instances, setInstances] = useState<unknown[]>(initData);

  const handleChange = useCallback(
    (index: number, data: unknown) => {
      setInstances((prev) => {
        const updated = [...prev];
        updated[index] = data;
        onDataChange?.(updated);
        return updated;
      });
    },
    [onDataChange]
  );

  const addInstance = () => {
    setInstances((prev) => {
      const updated = [...prev, {}];
      onDataChange?.(updated);
      return updated;
    });
  };

  const removeInstance = (index: number) => {
    setInstances((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onDataChange?.(updated);
      return updated;
    });
  };

  const minInstances = template.minInstances ?? 1;
  const maxInstances = template.maxInstances;

  return (
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
  );
}

function SingleTemplateForm({
  template,
  defaultValues,
  onValidChange,
  onDataChange,
  formRef,
}: WizardStepProps) {
  const schema = buildTemplateSchema(template);
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: (defaultValues as Record<string, unknown>) ?? {},
    mode: "onChange",
  });

  React.useEffect(() => {
    const subscription = methods.watch((data) => {
      onDataChange?.(data);
      methods.trigger().then((valid) => onValidChange?.(valid));
    });
    return () => subscription.unsubscribe();
  }, [methods, onDataChange, onValidChange]);

  return (
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
  );
}

export function WizardStep(props: WizardStepProps) {
  if (props.template.repeatable) {
    return (
      <RepeatableTemplateInstances
        template={props.template}
        defaultValues={props.defaultValues}
        onDataChange={props.onDataChange}
      />
    );
  }
  return <SingleTemplateForm {...props} />;
}
