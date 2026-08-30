"use client";

import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import type { FormField, FieldValidation } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadField } from "./FileUploadField";
import { Percent } from "lucide-react";

// ─── Pattern → human-readable example map ────────────────────────────────────
const PATTERN_EXAMPLES: Record<string, string> = {
  "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$": "22AAAAA0000A1Z5",
  "^[A-Z]{5}[0-9]{4}[A-Z]{1}$": "ABCDE0000A",
  "^[A-Z]{4}0[A-Z0-9]{6}$": "SBIN0001234",
  "^[1-9][0-9]{5}$": "400001",
  "^[2-9]{1}[0-9]{11}$": "2XXXXXXXXXXX (12 digits)",
};


/**
 * Returns a format example string derived from validation metadata.
 * Only shows pattern/phone/email format templates — not constraints like
 * length or range (those are enforced silently via HTML attributes).
 */
function getFormatHint(validation: FieldValidation | undefined, type: string): string | null {
  if (!validation) return null;

  if (validation.pattern) {
    const example = PATTERN_EXAMPLES[validation.pattern];
    if (example) return example;
  }

  if (validation.phone) return "+91 XXXXX XXXXX";
  if (validation.email && type !== "email") return "name@domain.com";

  return null;
}

/**
 * Inline format badge shown after the field label. Keeps the hint close to
 * the label so users see it before they start typing.
 */
function FormatBadge({ hint }: { hint: string | null }) {
  if (!hint) return null;
  return (
    <span className="ml-2 font-mono text-[10px] font-normal tracking-wide text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 leading-none select-none">
      {hint}
    </span>
  );
}

interface DynamicFieldProps {
  field: FormField;
  namePrefix?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function FieldHint({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{text}</p>;
}

export function DynamicField({ field, namePrefix }: DynamicFieldProps) {
  const fieldName = namePrefix ? `${namePrefix}.${field.name}` : field.name;
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const getError = (): string | undefined => {
    const parts = fieldName.split(".");
    let cur: unknown = errors;
    for (const part of parts) {
      if (cur === null || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[part];
    }
    if (cur && typeof cur === "object" && "message" in cur) {
      return (cur as { message?: string }).message;
    }
    return undefined;
  };

  const error = getError();
  const v = field.validation;
  const isRequired = v?.required;
  const formatHint = getFormatHint(v, field.type);

  // Derive placeholder: use authored value first, fall back to pattern example
  const derivedPlaceholder =
    field.placeholder ??
    (v?.pattern && PATTERN_EXAMPLES[v.pattern] ? PATTERN_EXAMPLES[v.pattern] : undefined);

  const labelEl = (
    <div className="flex items-center flex-wrap gap-y-0.5">
      <Label htmlFor={fieldName} className="text-sm font-medium text-foreground">
        {field.label}
        {isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      <FormatBadge hint={formatHint} />
    </div>
  );

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Textarea
          id={fieldName}
          placeholder={field.placeholder}
          disabled={field.disabled}
          readOnly={field.readonly}
          error={!!error}
          rows={4}
          maxLength={v?.maxLength}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-start space-x-3 py-2">
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <Checkbox
              id={fieldName}
              checked={!!f.value}
              onCheckedChange={f.onChange}
              disabled={field.disabled}
            />
          )}
        />
        <div>
          <Label htmlFor={fieldName} className="text-sm font-medium cursor-pointer">
            {field.label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          <FieldHint text={field.helpText} />
          <FieldError message={error} />
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <Select
              value={f.value as string ?? ""}
              onValueChange={f.onChange}
              disabled={field.disabled}
            >
              <SelectTrigger id={fieldName} error={!!error}>
                <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <FileUploadField
              value={f.value as File[]}
              onChange={f.onChange}
              accept={field.accept}
              maxFiles={field.maxFiles}
              maxSizeMB={field.maxSize}
              error={!!error}
            />
          )}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === "datetime") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Input
          id={fieldName}
          type="date"
          error={!!error}
          disabled={field.disabled}
          readOnly={field.readonly}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === "currency") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Input
          id={fieldName}
          type="number"
          placeholder={field.placeholder}
          error={!!error}
          disabled={field.disabled}
          readOnly={field.readonly}
          min={v?.min}
          max={v?.max}
          step={v?.integer ? 1 : undefined}
          startAdornment={<span className="text-xs font-medium">₹</span>}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === "percentage") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Input
          id={fieldName}
          type="number"
          placeholder={field.placeholder}
          error={!!error}
          disabled={field.disabled}
          readOnly={field.readonly}
          min={v?.min}
          max={v?.max}
          step={v?.integer ? 1 : 0.01}
          endAdornment={<Percent className="h-3.5 w-3.5 text-muted-foreground" />}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </div>
    );
  }

  const inputType =
    field.type === "email" ? "email" :
    field.type === "tel" ? "tel" :
    field.type === "number" ? "number" :
    "text";

  return (
    <div className="space-y-1.5">
      {labelEl}
      <Input
        id={fieldName}
        type={inputType}
        placeholder={derivedPlaceholder}
        error={!!error}
        disabled={field.disabled}
        readOnly={field.readonly}
        autoComplete={field.type === "email" ? "email" : undefined}
        maxLength={v?.maxLength}
        min={inputType === "number" ? v?.min : undefined}
        max={inputType === "number" ? v?.max : undefined}
        step={inputType === "number" && v?.integer ? 1 : undefined}
        {...register(fieldName)}
      />
      <FieldHint text={field.helpText} />
      <FieldError message={error} />
    </div>
  );
}
