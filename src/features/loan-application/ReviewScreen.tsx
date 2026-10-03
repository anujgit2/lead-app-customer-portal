"use client";

import React, { useState } from "react";
import type { FieldOption, FormData, FormField, FormSection, FormTemplate } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Edit2, SaveAll } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { getAddressSubfields, isPlainObject } from "@/utils/address-field";
import { StoredFileList } from "@/components/forms/StoredFileList";
import { isStoredFileReference } from "@/services/file-storage.service";
import { isDocumentTemplate } from "@/components/forms/DocumentUploadProgress";

interface ReviewScreenProps {
  templates: FormTemplate[];
  formData: FormData;
  onEditStep: (stepIndex: number) => void;
  onSubmit: () => void;
  onSaveClose?: () => void;
  isSubmitting?: boolean;
  isSaving?: boolean;
}

interface ReviewItem {
  key: string;
  label: string;
  value: unknown;
  type?: string;
  options?: FieldOption[];
}

function isDocumentReviewField(type?: string) {
  return type === "file" || type === "document";
}

function isEmptyReviewValue(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.values(value).every(isEmptyReviewValue);
  return false;
}

function humanizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function ReviewValue({
  value,
  type,
  options,
}: {
  value: unknown;
  type?: string;
  options?: FieldOption[];
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[14px] font-normal italic text-slate-500">Not provided</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }
  if (type === "currency") {
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num)) {
      return (
        <span>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(num)}
        </span>
      );
    }
  }
  if (type === "select" || type === "radio") {
    const raw = String(value);
    return <span>{options?.find((opt) => opt.value === raw)?.label ?? humanizeValue(raw)}</span>;
  }
  if (type === "multiselect") {
    const selected = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
    if (selected.length === 0) {
      return <span className="text-[14px] font-normal italic text-slate-500">Not provided</span>;
    }
    const labels = selected.map(
      (item) => options?.find((opt) => opt.value === item)?.label ?? humanizeValue(item)
    );
    return (
      <span className="flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
          >
            {label}
          </span>
        ))}
      </span>
    );
  }
  if ((type === "datetime" || type === "date") && typeof value === "string" && value) {
    let formatted = String(value);
    try {
      formatted = formatDate(value);
    } catch {
      /* keep raw value */
    }
    return <span>{formatted}</span>;
  }
  if (Array.isArray(value)) {
    const files = value.filter(isStoredFileReference);
    if (type === "file" || type === "document" || (files.length > 0 && files.length === value.length)) {
      return <StoredFileList files={files} />;
    }
    return <span className="text-[14px] font-normal italic text-slate-500">{value.length} file(s)</span>;
  }
  return <span>{String(value)}</span>;
}

function collectReviewItems(fields: FormField[], data: Record<string, unknown>) {
  const items: ReviewItem[] = [];
  const documents: ReviewItem[] = [];

  for (const field of fields) {
    if (field.type === "hidden") continue;
    const value = data[field.name];

    if (isDocumentReviewField(field.type)) {
      if (value === undefined) continue;
      documents.push({
        key: field.name,
        label: field.label,
        value,
        type: field.type,
        options: field.options,
      });
      continue;
    }

    if (field.type === "address") {
      const addr = isPlainObject(value) ? value : {};
      for (const sub of getAddressSubfields()) {
        items.push({
          key: `${field.name}.${sub.name}`,
          label: sub.label,
          value: addr[sub.name],
          type: sub.type,
          options: sub.options,
        });
      }
      continue;
    }

    items.push({
      key: field.name,
      label: field.label,
      value,
      type: field.type,
      options: field.options,
    });
  }

  return { items, documents };
}

function ReviewFieldGrid({
  items,
  hideEmpty,
}: {
  items: ReviewItem[];
  hideEmpty?: boolean;
}) {
  const visible = hideEmpty ? items.filter((item) => !isEmptyReviewValue(item.value)) : items;
  if (visible.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 min-[700px]:grid-cols-3 min-[900px]:grid-cols-4 gap-x-6 gap-y-4 m-0">
      {visible.map((item) => (
        <div key={item.key}>
          <dt className="text-[13px] font-normal text-slate-500">{item.label}</dt>
          <dd
            className={cn(
              "mt-0.5 m-0 break-words text-[15px] font-medium text-slate-900",
              isEmptyReviewValue(item.value) && "font-normal"
            )}
          >
            <ReviewValue value={item.value} type={item.type} options={item.options} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DocumentFieldGrid({ documents }: { documents: ReviewItem[] }) {
  if (documents.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {documents.map((field) => (
        <div key={field.key}>
          <p className="mb-0.5 text-xs text-muted-foreground">{field.label}</p>
          <div className="text-sm font-medium">
            <ReviewValue value={field.value} type={field.type} options={field.options} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewGroup({
  section,
  data,
  hideEmpty,
}: {
  section: FormSection;
  data: unknown;
  hideEmpty?: boolean;
}) {
  const rows = Array.isArray(data)
    ? data.filter(isPlainObject)
    : isPlainObject(data)
      ? [data]
      : [{}];

  return (
    <>
      {rows.map((row, index) => {
        const { items, documents } = collectReviewItems(section.fields, row);
        const visibleItems = hideEmpty
          ? items.filter((item) => !isEmptyReviewValue(item.value))
          : items;
        if (visibleItems.length === 0 && documents.length === 0) return null;

        return (
          <div
            key={index}
            className="mt-4 border-t border-slate-100 pt-3.5 first:mt-0 first:border-t-0 first:pt-3.5"
          >
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              {section.title}
              {rows.length > 1 ? ` #${index + 1}` : ""}
            </h4>
            <div className="space-y-4">
              <ReviewFieldGrid items={items} hideEmpty={hideEmpty} />
              <DocumentFieldGrid documents={documents} />
            </div>
          </div>
        );
      })}
    </>
  );
}

function instanceProfile(template: FormTemplate, instance: Record<string, unknown>) {
  const merged: Record<string, unknown> = {};
  for (const section of template.sections) {
    const data = instance[section.code];
    if (isPlainObject(data)) Object.assign(merged, data);
  }
  const firstName = typeof merged.firstName === "string" ? merged.firstName.trim() : "";
  const lastName = typeof merged.lastName === "string" ? merged.lastName.trim() : "";
  const designation = typeof merged.designation === "string" ? merged.designation : "";
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return {
    name: name || `${template.title}`,
    initials: initials || template.title.charAt(0).toUpperCase(),
    designation: designation ? humanizeValue(designation) : "",
  };
}

function countTemplateFields(
  template: FormTemplate,
  templateData: unknown
): { filled: number; total: number } {
  let filled = 0;
  let total = 0;

  const tally = (fields: FormField[], data: Record<string, unknown>) => {
    const { items } = collectReviewItems(fields, data);
    total += items.length;
    filled += items.filter((item) => !isEmptyReviewValue(item.value)).length;
  };

  const instances = template.repeatable
    ? Array.isArray(templateData)
      ? templateData.filter(isPlainObject)
      : []
    : [isPlainObject(templateData) ? templateData : {}];

  if (instances.length === 0) {
    for (const section of template.sections) tally(section.fields, {});
    return { filled, total };
  }

  for (const instance of instances) {
    for (const section of template.sections) {
      const sectionData = instance[section.code];
      const rows = Array.isArray(sectionData)
        ? sectionData.filter(isPlainObject)
        : [isPlainObject(sectionData) ? sectionData : {}];
      for (const row of rows) tally(section.fields, row);
    }
  }

  return { filled, total };
}

function FormReviewCard({
  template,
  templateData,
  hideEmpty,
  onEdit,
}: {
  template: FormTemplate;
  templateData: unknown;
  hideEmpty?: boolean;
  onEdit?: () => void;
}) {
  const { filled, total } = countTemplateFields(template, templateData);
  const instances = template.repeatable
    ? Array.isArray(templateData)
      ? templateData.filter(isPlainObject)
      : []
    : [isPlainObject(templateData) ? templateData : {}];

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <h3 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-slate-900">
          {template.title}
        </h3>
        <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
          {filled} of {total} filled
        </span>
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1.5 border-slate-200 text-primary hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
      <div className="px-5 pb-4">
        {instances.map((instance, index) => {
          const profile = template.repeatable ? instanceProfile(template, instance) : null;
          return (
            <div key={index}>
              {profile && (
                <div className="flex items-center gap-3 pb-1.5 pt-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {profile.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-slate-900">{profile.name}</p>
                    <p className="text-[13px] font-normal text-slate-500">
                      {[profile.designation, `${template.title} #${index + 1}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              )}
              {template.sections.map((section) => (
                <ReviewGroup
                  key={section.code}
                  section={section}
                  data={instance[section.code]}
                  hideEmpty={hideEmpty}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DocumentReviewCard({
  template,
  templateData,
  stepIndex,
  onEdit,
}: {
  template: FormTemplate;
  templateData: unknown;
  stepIndex: number;
  onEdit?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Step {stepIndex + 1}
            </Badge>
            <CardTitle className="text-base">{template.title}</CardTitle>
          </div>
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="gap-1.5 text-primary hover:text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-5">
          {template.sections.map((section, sIdx) => {
            const sectionData = isPlainObject(templateData)
              ? templateData[section.code]
              : undefined;
            const { documents } = collectReviewItems(
              section.fields,
              isPlainObject(sectionData) ? sectionData : {}
            );
            if (documents.length === 0) return null;
            return (
              <div key={section.code}>
                {sIdx > 0 && <Separator className="mb-5" />}
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <DocumentFieldGrid documents={documents} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface ApplicationFormSummaryProps {
  templates: FormTemplate[];
  formData: FormData;
  onEditStep?: (stepIndex: number) => void;
  hideEmpty?: boolean;
}

export function ApplicationFormSummary({
  templates,
  formData,
  onEditStep,
  hideEmpty,
}: ApplicationFormSummaryProps) {
  return (
    <div className="space-y-4">
      {templates.map((template, stepIndex) => {
        const templateData = formData[template.code];
        if (isDocumentTemplate(template)) {
          return (
            <DocumentReviewCard
              key={template.code}
              template={template}
              templateData={templateData}
              stepIndex={stepIndex}
              onEdit={onEditStep ? () => onEditStep(stepIndex) : undefined}
            />
          );
        }
        return (
          <FormReviewCard
            key={template.code}
            template={template}
            templateData={templateData}
            hideEmpty={hideEmpty}
            onEdit={onEditStep ? () => onEditStep(stepIndex) : undefined}
          />
        );
      })}
    </div>
  );
}

export function ReviewScreen({
  templates,
  formData,
  onEditStep,
  onSubmit,
  onSaveClose,
  isSubmitting,
  isSaving,
}: ReviewScreenProps) {
  const [hideEmpty, setHideEmpty] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Review your application
          </h2>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Check everything below. Use Edit to change a section before you submit.
          </p>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-500">
          <Checkbox
            checked={hideEmpty}
            onCheckedChange={(checked) => setHideEmpty(checked === true)}
            className="border-slate-300"
          />
          Hide empty fields
        </label>
      </div>

      <ApplicationFormSummary
        templates={templates}
        formData={formData}
        onEditStep={onEditStep}
        hideEmpty={hideEmpty}
      />

      <p className="text-[13px] font-normal text-slate-500">
        By submitting, you confirm all information is accurate.
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onSaveClose && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onSaveClose}
            loading={isSaving}
            disabled={isSubmitting || isSaving}
            className="gap-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <SaveAll className="h-4 w-4" />
            Save &amp; Close
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || isSaving}
          className="min-w-[160px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out active:scale-[0.98]"
        >
          {isSubmitting ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </div>
  );
}
