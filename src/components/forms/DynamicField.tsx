"use client";

import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import type { FormField } from "@/types";
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
import { cn } from "@/lib/utils";
import { FileUploadField } from "./FileUploadField";
import { DollarSign, Percent } from "lucide-react";

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
  const isRequired = field.validation?.required;

  const labelEl = (
    <Label htmlFor={fieldName} className="text-sm font-medium text-foreground">
      {field.label}
      {isRequired && <span className="text-destructive ml-1">*</span>}
    </Label>
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
        placeholder={field.placeholder}
        error={!!error}
        disabled={field.disabled}
        readOnly={field.readonly}
        autoComplete={field.type === "email" ? "email" : undefined}
        {...register(fieldName)}
      />
      <FieldHint text={field.helpText} />
      <FieldError message={error} />
    </div>
  );
}
