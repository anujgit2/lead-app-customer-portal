"use client";

import React from "react";
import { useFormContext, Controller, get } from "react-hook-form";
import type { FormField } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadField } from "./FileUploadField";
import { CurrencyInput } from "./CurrencyInput";
import { MultiSelectField } from "./MultiSelectField";
import { Info, Percent } from "lucide-react";
import { useFormDebug } from "./form-debug-context";
import { useFieldRules } from "./use-field-rules";
import { cn } from "@/lib/utils";
import { applyMask } from "@/utils/mask";
import { applyInputFormat } from "@/utils/field-config";
import { isKnownFieldType } from "@/utils/field-types";
import { getAddressSubfields } from "@/utils/address-field";

// ─── Pattern → human-readable example map ────────────────────────────────────
// Exported for reuse by the dev Form Playground's sample-data generator.
export const PATTERN_EXAMPLES: Record<string, string> = {
  "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$": "22AAAAA0000A1Z5",
  "^[A-Z]{5}[0-9]{4}[A-Z]{1}$": "ABCDE0000A",
  "^[A-Z]{4}0[A-Z0-9]{6}$": "SBIN0001234",
  "^[1-9][0-9]{5}$": "400001",
  "^[2-9]{1}[0-9]{11}$": "2XXXXXXXXXXX (12 digits)",
};

interface DynamicFieldProps {
  field: FormField;
  namePrefix?: string;
}

function FieldError({ message }: { message?: string }) {
  return (
    <p
      className={cn(
        "absolute inset-x-0 top-full z-10 mt-0.5 h-4 truncate text-xs leading-4 text-destructive",
        !message && "invisible"
      )}
      title={message}
    >
      {message}
    </p>
  );
}

function FieldHint({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{text}</p>;
}

/** Developer-only info block shown beneath a field when Debug mode (dev Form Playground) is on. */
function FieldDebugInfo({
  field,
  fieldName,
  visible,
  required,
}: {
  field: FormField;
  fieldName: string;
  visible: boolean;
  required: boolean;
}) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex gap-1.5">
      <span className="text-violet-400">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
  return (
    <div className="mt-1.5 space-y-0.5 rounded-md border border-dashed border-violet-300 bg-violet-50 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-violet-700">
      {row("Field", fieldName)}
      {field.path && row("Path", field.path)}
      {row("Type", field.type)}
      {row("Required", String(required))}
      {field.mask && row("Mask", field.mask.pattern)}
      {field.validation?.pattern && row("Validation", field.validation.pattern)}
      {row("Visible", String(visible))}
    </div>
  );
}

export function DynamicField({ field, namePrefix }: DynamicFieldProps) {
  const fieldName = namePrefix ? `${namePrefix}.${field.name}` : field.name;
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext();
  const debug = useFormDebug();

  const { visible, conditionallyRequired } = useFieldRules(field, namePrefix);

  const errorNode = get(errors, fieldName) as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const error =
    (typeof errorNode?.message === "string" && errorNode.message) ||
    (typeof errorNode?.root?.message === "string" && errorNode.root.message) ||
    undefined;
  const v = field.validation;
  const isRequired = !!v?.required || conditionallyRequired;

  // Derive placeholder: use authored value first, fall back to pattern example
  const derivedPlaceholder =
    field.placeholder ??
    (v?.pattern && PATTERN_EXAMPLES[v.pattern] ? PATTERN_EXAMPLES[v.pattern] : undefined);

  if (field.type === "hidden") {
    return (
      <>
        <input type="hidden" {...register(fieldName)} />
        {debug && (
          <div className="rounded-md border border-dashed border-violet-300 bg-violet-50 px-2.5 py-1.5 font-mono text-[11px] text-violet-600">
            Hidden field: {fieldName}
          </div>
        )}
      </>
    );
  }

  if (!visible) {
    // Hidden fields never render to DOM (release space), but debug can note them to console/inspector
    if (debug) {
      console.debug(`Field hidden: ${fieldName} (visibleWhen not met)`);
    }
    return null;
  }

  const labelEl = (
    <div className="flex h-6 min-w-0 items-center gap-1.5 pl-1">
      <Label
        htmlFor={fieldName}
        className="flex min-w-0 items-center text-sm font-medium text-slate-600"
      >
        <span className="truncate">{field.label}</span>
        {isRequired && (
          <span className="ml-1 shrink-0 text-destructive">*</span>
        )}
      </Label>
      {field.info && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Information about ${field.label}`}
              className="shrink-0 rounded-full text-slate-400 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs text-xs leading-relaxed"
          >
            {field.info}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  let content: React.ReactNode;

  if (field.type === "textarea" || field.type === "json") {
    content = (
      <>
        {labelEl}
        <Textarea
          id={fieldName}
          className={
            field.type === "json"
              ? "rounded-sm font-mono text-xs"
              : "rounded-sm"
          }
          placeholder={field.placeholder ?? (field.type === "json" ? '{ "key": "value" }' : undefined)}
          disabled={field.disabled}
          readOnly={field.readonly}
          error={!!error}
          rows={4}
          maxLength={v?.maxLength}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "checkbox") {
    content = (
      <>
        {labelEl}
        <div className="flex h-10 items-center">
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
        </div>
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "radio") {
    content = (
      <>
        {labelEl}
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <RadioGroup
              value={(f.value as string) ?? ""}
              onValueChange={f.onChange}
              disabled={field.disabled}
              className="flex flex-wrap gap-4 pt-1.5"
            >
              {field.options?.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`${fieldName}-${opt.value}`}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <RadioGroupItem value={opt.value} id={`${fieldName}-${opt.value}`} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          )}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "select") {
    content = (
      <>
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
              <SelectTrigger
                id={fieldName}
                error={!!error}
                className="rounded-sm"
              >
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
      </>
    );
  } else if (field.type === "multiselect") {
    content = (
      <>
        {labelEl}
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <MultiSelectField
              id={fieldName}
              options={field.options ?? []}
              value={f.value}
              onChange={f.onChange}
              onBlur={f.onBlur}
              placeholder={field.placeholder ?? `Select ${field.label}`}
              disabled={field.disabled}
              readOnly={field.readonly}
              error={!!error}
            />
          )}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "file" || field.type === "document") {
    const uploadedValue = watch(fieldName);
    const uploadedCount = Array.isArray(uploadedValue)
      ? uploadedValue.filter((item) => item != null && item !== "").length
      : 0;
    content = (
      <div className="rounded-xl border border-slate-100 bg-white p-[18px] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-semibold tracking-tight text-slate-900">
                {field.label}
              </p>
              {field.info && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Information about ${field.label}`}
                      className="shrink-0 rounded-full text-slate-400 transition-all duration-200 ease-out hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                    {field.info}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {field.helpText && (
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{field.helpText}</p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              uploadedCount > 0
                ? "bg-emerald-50 text-emerald-700"
                : isRequired
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-50 text-slate-500"
            )}
          >
            {uploadedCount > 0
              ? `${uploadedCount} uploaded`
              : isRequired
                ? "Required"
                : "Optional"}
          </span>
        </div>
        <div className="mt-3.5">
          <Controller
            name={fieldName}
            control={control}
            render={({ field: f }) => (
              <FileUploadField
                value={f.value}
                onChange={f.onChange}
                documentType={field.documentType ?? field.name}
                accept={field.accept}
                maxFiles={field.maxFiles}
                minFiles={field.minFiles}
                maxSizeMB={field.maxSize}
                error={!!error}
              />
            )}
          />
        </div>
        <FieldError message={error} />
      </div>
    );
  } else if (field.type === "datetime" || field.type === "date") {
    const dateValue = watch(fieldName);
    const isEmpty = dateValue == null || dateValue === "";
    content = (
      <>
        {labelEl}
        <Input
          id={fieldName}
          type="date"
          className={cn(
            "rounded-sm",
            isEmpty &&
              "text-muted-foreground [&::-webkit-datetime-edit]:text-muted-foreground [&::-webkit-datetime-edit-text]:text-muted-foreground [&::-webkit-datetime-edit-month-field]:text-muted-foreground [&::-webkit-datetime-edit-day-field]:text-muted-foreground [&::-webkit-datetime-edit-year-field]:text-muted-foreground"
          )}
          error={!!error}
          disabled={field.disabled}
          readOnly={field.readonly}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "currency") {
    content = (
      <>
        {labelEl}
        <Controller
          name={fieldName}
          control={control}
          render={({ field: f }) => (
            <CurrencyInput
              field={field}
              id={fieldName}
              value={f.value}
              onChange={f.onChange}
              onBlur={f.onBlur}
              inputRef={f.ref}
              error={!!error}
              disabled={field.disabled}
              readOnly={field.readonly}
              placeholder={field.placeholder}
            />
          )}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "percentage") {
    content = (
      <>
        {labelEl}
        <Input
          id={fieldName}
          type="number"
          className="rounded-sm"
          placeholder={field.placeholder}
          error={!!error}
          disabled={field.disabled}
          readOnly={field.readonly}
          min={typeof v?.min === "number" ? v.min : undefined}
          max={typeof v?.max === "number" ? v.max : undefined}
          step={v?.integer ? 1 : 0.01}
          endAdornment={<Percent className="h-3.5 w-3.5 text-muted-foreground" />}
          {...register(fieldName)}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  } else if (field.type === "address") {
    const subfields = getAddressSubfields({
      disabled: field.disabled,
      readonly: field.readonly,
    });
    content = (
      <>
        {labelEl}
        <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 sm:grid-cols-2">
          {subfields.map((sub) => (
            <div key={sub.name}>
              <DynamicField field={sub} namePrefix={fieldName} />
            </div>
          ))}
        </div>
        <FieldHint text={field.helpText} />
      </>
    );
  } else if (!isKnownFieldType(field.type)) {
    content = (
      <>
        {labelEl}
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Unsupported field type: <span className="font-mono">{field.type}</span>
        </div>
        <FieldHint text={field.helpText} />
      </>
    );
  } else {
    const inputType =
      field.type === "email" ? "email" :
      field.type === "tel" ? "tel" :
      field.type === "number" ? "number" :
      "text";

    const registration = register(fieldName);
    const mask = field.mask?.pattern ? field.mask : undefined;
    const inputFormat = field.inputFormat;
    const isTextual = inputType === "text" || inputType === "tel" || inputType === "email";

    const handleChange =
      isTextual && (mask || inputFormat)
        ? (e: React.ChangeEvent<HTMLInputElement>) => {
            let next = e.target.value;
            // Length limits on masked fields apply to the raw characters, not the
            // separator-formatted display string — skip maxLength slicing here and
            // let `applyMask` cap input at the pattern length instead.
            if (inputFormat) next = applyInputFormat(next, inputFormat, mask ? { ...v, maxLength: undefined } : v);
            if (mask) next = applyMask(next, mask.pattern, mask.transform);
            e.target.value = next;
            registration.onChange(e);
          }
        : undefined;

    const handleBlur =
      isTextual && inputFormat?.trim
        ? (e: React.FocusEvent<HTMLInputElement>) => {
            const trimmed = e.target.value.trim();
            if (trimmed !== e.target.value) {
              e.target.value = trimmed;
              registration.onChange(e);
            }
            registration.onBlur(e);
          }
        : undefined;

    content = (
      <>
        {labelEl}
        <Input
          id={fieldName}
          type={inputType}
          className="rounded-sm"
          placeholder={derivedPlaceholder}
          error={!!error}
          disabled={field.disabled}
          readOnly={field.readonly}
          autoComplete={field.type === "email" ? "email" : undefined}
          maxLength={mask ? mask.pattern.length : v?.maxLength}
          min={inputType === "number" && typeof v?.min === "number" ? v.min : undefined}
          max={inputType === "number" && typeof v?.max === "number" ? v.max : undefined}
          step={inputType === "number" && v?.integer ? 1 : undefined}
          startAdornment={
            field.prefix ? <span className="text-xs font-medium">{field.prefix}</span> : undefined
          }
          endAdornment={
            field.suffix ? (
              <span className="text-xs font-medium text-muted-foreground">{field.suffix}</span>
            ) : undefined
          }
          {...registration}
          {...(handleChange ? { onChange: handleChange } : {})}
          {...(handleBlur ? { onBlur: handleBlur } : {})}
        />
        <FieldHint text={field.helpText} />
        <FieldError message={error} />
      </>
    );
  }

  return (
    <div className="relative space-y-1.5">
      {content}
      {debug && (
        <FieldDebugInfo field={field} fieldName={fieldName} visible={visible} required={isRequired} />
      )}
    </div>
  );
}
