"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FieldOption, FormData, FormField, FormSection, FormTemplate, StoredFileReference } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { parseApiError } from "@/lib/api-error";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import { getAddressSubfields, isPlainObject } from "@/utils/address-field";
import { isFieldVisible } from "@/utils/rule-engine";
import { StoredFileList } from "@/components/forms/StoredFileList";
import { fileStorageService, isStoredFileReference } from "@/services/file-storage.service";
import { isDocumentTemplate } from "@/components/forms/DocumentUploadProgress";
import { FilePreview } from "@/features/documents/components/FilePreview";
import { useObjectUrl } from "@/features/documents/hooks/useObjectUrl";
import { previewKind } from "@/features/documents/utils/format";

interface ReviewScreenProps {
  templates: FormTemplate[];
  formData: FormData;
  onEditStep: (stepIndex: number) => void;
  onBack: () => void;
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

function StepPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-primary-soft px-[9px] text-xs font-semibold text-primary-soft-foreground">
      {children}
    </span>
  );
}

function EditStepButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="gap-2">
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );
}

interface ProvidedDoc {
  key: string;
  label: string;
  file: StoredFileReference;
}

interface MissingDoc {
  key: string;
  label: string;
}

interface DocGroup {
  id: string;
  title: string;
  provided: ProvidedDoc[];
  missing: MissingDoc[];
  slotCount: number;
  filledSlots: number;
}

function filesForField(value: unknown): StoredFileReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredFileReference);
}

function documentGroupsForTemplate(
  template: FormTemplate,
  templateData: unknown,
  formData: FormData
): DocGroup[] {
  const instance = isPlainObject(templateData) ? templateData : {};
  const groups: DocGroup[] = [];

  for (const section of template.sections) {
    const sectionData = instance[section.code];
    const rows = Array.isArray(sectionData)
      ? sectionData.filter(isPlainObject)
      : [isPlainObject(sectionData) ? sectionData : {}];

    rows.forEach((row, rowIndex) => {
      const provided: ProvidedDoc[] = [];
      const missing: MissingDoc[] = [];
      let slotCount = 0;
      let filledSlots = 0;

      for (const field of section.fields) {
        if (!isDocumentReviewField(field.type)) continue;
        if (!isFieldVisible(field, row, instance, formData)) continue;
        slotCount += 1;
        const files = filesForField(row[field.name]);
        if (files.length === 0) {
          missing.push({
            key: `${section.code}-${field.name}-missing`,
            label: field.label,
          });
          continue;
        }
        filledSlots += 1;
        files.forEach((file, fileIndex) => {
          provided.push({
            key: `${section.code}-${field.name}-${file.id}-${fileIndex}`,
            label: field.label,
            file,
          });
        });
      }

      if (slotCount === 0) return;
      groups.push({
        id: rows.length > 1 ? `${section.code}-${rowIndex}` : section.code,
        title: rows.length > 1 ? `${section.title} #${rowIndex + 1}` : section.title,
        provided,
        missing,
        slotCount,
        filledSlots,
      });
    });
  }

  return groups;
}

function countUploadedFiles(templates: FormTemplate[], formData: FormData): number {
  return templates
    .filter(isDocumentTemplate)
    .reduce((total, template) => {
      const groups = documentGroupsForTemplate(template, formData[template.code], formData);
      return total + groups.reduce((count, group) => count + group.provided.length, 0);
    }, 0);
}

function FileIconButton({
  label,
  title,
  pending,
  onClick,
  children,
}: {
  label: string;
  title: string;
  pending?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={pending}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-primary-soft hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

function DocumentDownloadButton({ file }: { file: StoredFileReference }) {
  const [pending, setPending] = useState(false);

  return (
    <FileIconButton
      label={`Download ${file.fileName}`}
      title="Download"
      pending={pending}
      onClick={() => {
        setPending(true);
        void fileStorageService
          .download(file.id, file.fileName)
          .catch((error: unknown) => {
            toast.error(parseApiError(error).message);
          })
          .finally(() => setPending(false));
      }}
    >
      <Download className="h-4 w-4" />
    </FileIconButton>
  );
}

function DocumentRow({
  doc,
  onPreview,
}: {
  doc: ProvidedDoc;
  onPreview: (doc: ProvidedDoc) => void;
}) {
  const size = formatFileSize(doc.file.meta.sizeBytes);
  const detail = `${doc.file.fileName} · ${size}`;

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-card py-2.5 pl-3 pr-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-foreground">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-semibold leading-[18px]" title={doc.label}>
          {doc.label}
        </b>
        <small className="block truncate text-xs leading-4 text-muted-foreground" title={detail}>
          {detail}
        </small>
      </div>
      <FileIconButton
        label={`Preview ${doc.label}`}
        title="Preview"
        onClick={() => onPreview(doc)}
      >
        <Eye className="h-4 w-4" />
      </FileIconButton>
      <DocumentDownloadButton file={doc.file} />
    </div>
  );
}

function MissingDocumentRow({ doc }: { doc: MissingDoc }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/50 py-2.5 pl-3 pr-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-semibold leading-[18px]" title={doc.label}>
          {doc.label}
        </b>
        <small className="block truncate text-xs leading-4 text-muted-foreground">Not uploaded</small>
      </div>
    </div>
  );
}

function DocumentGroupBlock({
  group,
  onPreview,
}: {
  group: DocGroup;
  onPreview: (doc: ProvidedDoc) => void;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-[650] leading-[18px]">{group.title}</h3>
        <span className="text-[12.5px] tabular-nums text-muted-foreground">
          {group.filledSlots} of {group.slotCount}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 min-[640px]:grid-cols-2">
        {group.provided.map((doc) => (
          <DocumentRow key={doc.key} doc={doc} onPreview={onPreview} />
        ))}
        {group.missing.map((doc) => (
          <MissingDocumentRow key={doc.key} doc={doc} />
        ))}
      </div>
    </div>
  );
}

function ReviewFilePreviewDialog({
  doc,
  onClose,
}: {
  doc: ProvidedDoc | null;
  onClose: () => void;
}) {
  const file = useQuery({
    queryKey: ["review-file-preview", doc?.file.id],
    queryFn: () => fileStorageService.fetchContent(doc!.file.id, doc!.file.fileName),
    enabled: !!doc,
    staleTime: Infinity,
    retry: false,
  });
  const url = useObjectUrl(doc ? file.data?.blob ?? null : null);
  const fileName = file.data?.fileName || doc?.file.fileName || "";
  const kind = doc ? previewKind(file.data?.contentType || doc.file.contentType, fileName) : null;
  const [downloading, setDownloading] = useState(false);

  const download = () => {
    if (!doc) return;
    setDownloading(true);
    void fileStorageService
      .download(doc.file.id, doc.file.fileName)
      .then(() => onClose())
      .catch((error: unknown) => {
        toast.error(parseApiError(error).message);
      })
      .finally(() => setDownloading(false));
  };

  return (
    <Dialog open={!!doc} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[min(560px,calc(100vw-32px))]">
        <div className="pr-9">
          <DialogTitle>{doc?.label}</DialogTitle>
          <DialogDescription className="mt-0.5">
            {doc ? `${doc.file.fileName} · ${formatFileSize(doc.file.meta.sizeBytes)}` : ""}
          </DialogDescription>
        </div>
        {file.isLoading ? (
          <div className="grid h-44 place-items-center rounded-lg bg-muted" aria-busy="true">
            <p className="sr-only">Preparing preview</p>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {file.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-danger-strong" role="alert">
              We couldn&apos;t open the preview.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void file.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
        {url && kind ? <FilePreview kind={kind} url={url} title={fileName} /> : null}
        {file.data && !kind ? (
          <div className="grid h-44 place-items-center rounded-lg border border-dashed border-input/70 bg-muted text-center text-muted-foreground">
            <div>
              <FileText className="mx-auto h-6 w-6" />
              <p className="mt-1.5 text-xs">Preview isn&apos;t available for this file</p>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={download} loading={downloading} className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormReviewCard({
  template,
  templateData,
  hideEmpty,
  stepIndex,
  onEdit,
}: {
  template: FormTemplate;
  templateData: unknown;
  hideEmpty?: boolean;
  stepIndex: number;
  onEdit?: () => void;
}) {
  const { filled, total } = countTemplateFields(template, templateData);
  const instances = template.repeatable
    ? Array.isArray(templateData)
      ? templateData.filter(isPlainObject)
      : []
    : [isPlainObject(templateData) ? templateData : {}];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <StepPill>Step {stepIndex + 1}</StepPill>
          <h2 className="min-w-0 truncate text-base font-[650] leading-6 tracking-[-0.01em]">
            {template.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {filled} of {total}
          </span>
          {onEdit && <EditStepButton onClick={onEdit} />}
        </div>
      </div>
      <div className="border-t border-border px-5 pb-4">
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
  formData,
  stepIndex,
  onEdit,
}: {
  template: FormTemplate;
  templateData: unknown;
  formData: FormData;
  stepIndex: number;
  onEdit?: () => void;
}) {
  const groups = documentGroupsForTemplate(template, templateData, formData);
  const [preview, setPreview] = useState<ProvidedDoc | null>(null);
  const filled = groups.reduce((count, group) => count + group.filledSlots, 0);
  const total = groups.reduce((count, group) => count + group.slotCount, 0);
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  const headingId = `review-${template.code}`;

  if (groups.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <StepPill>Step {stepIndex + 1}</StepPill>
          <h2 id={headingId} className="min-w-0 truncate text-base font-[650] leading-6 tracking-[-0.01em]">
            {template.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {filled} of {total}
          </span>
          {onEdit && <EditStepButton onClick={onEdit} />}
        </div>
      </div>
      <div
        className="h-[3px] bg-muted"
        role="progressbar"
        aria-label="Documents provided"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <DocumentGroupBlock key={group.id} group={group} onPreview={setPreview} />
        ))}
      </div>
      <ReviewFilePreviewDialog doc={preview} onClose={() => setPreview(null)} />
    </section>
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
    <div className="flex flex-col gap-5">
      {templates.map((template, stepIndex) => {
        const templateData = formData[template.code];
        if (isDocumentTemplate(template)) {
          return (
            <DocumentReviewCard
              key={template.code}
              template={template}
              templateData={templateData}
              formData={formData}
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
            stepIndex={stepIndex}
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
  onBack,
  onSubmit,
  onSaveClose,
  isSubmitting,
  isSaving,
}: ReviewScreenProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const uploaded = countUploadedFiles(templates, formData);
  const busy = Boolean(isSubmitting || isSaving);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-[650] leading-8 tracking-[-0.02em] text-foreground">
          Review your application
        </h2>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
          Check your documents, then submit.
        </p>
      </div>

      <ApplicationFormSummary templates={templates} formData={formData} onEditStep={onEditStep} />

      <div className="sticky bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-30 flex flex-wrap items-center gap-3 rounded-[14px] border border-border bg-card py-2.5 pl-4 pr-3 shadow-md">
        <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-2.5 text-[13px]">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            disabled={busy}
            aria-label="I confirm the information is accurate."
          />
          <span>I confirm the information is accurate.</span>
        </label>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={busy}
            className="gap-2 max-sm:flex-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {onSaveClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onSaveClose}
              loading={isSaving}
              disabled={busy}
              className="max-sm:flex-1"
            >
              Save &amp; Close
            </Button>
          )}
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!confirmed || busy}
            title={confirmed ? undefined : "Tick the confirmation to submit"}
            className="max-sm:flex-1"
          >
            Submit
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!isSubmitting) setConfirmOpen(open); }}>
        <DialogContent>
          <div className="flex items-start gap-3.5 pr-9">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-foreground">
              <Send className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Submit application?</DialogTitle>
              <DialogDescription className="mt-0.5">
                {uploaded} {uploaded === 1 ? "document" : "documents"} will be sent for review. You
                can&apos;t edit after submitting.
              </DialogDescription>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Keep editing
            </Button>
            <Button type="button" onClick={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
