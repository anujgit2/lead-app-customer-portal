"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FieldOption, FormData, FormSection, FormTemplate, StoredFileReference } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, formatFileSize } from "@/lib/utils";
import { StoredFileList } from "@/components/forms/StoredFileList";
import {
  fileStorageService,
  isStoredFileReference,
  triggerDownload,
} from "@/services/file-storage.service";
import { FilePreview } from "@/features/documents/components/FilePreview";
import { useObjectUrl } from "@/features/documents/hooks/useObjectUrl";
import { previewKind } from "@/features/documents/utils/format";
import {
  collectReviewItems,
  countTemplateFields,
  countUploadedFiles,
  documentGroupsForTemplate,
  humanizeValue,
  instanceProfile,
  isDocumentTemplate,
  isEmptyReviewValue,
  sectionRows,
  templateInstances,
  type DocGroup,
  type MissingDoc,
  type ProvidedDoc,
  type ReviewItem,
} from "./review-helpers";

/** `review` is the wizard's last step; `view` is the read-only summary of a saved application. */
export type SummaryMode = "review" | "view";

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

function NotProvided({ children = "Not provided" }: { children?: React.ReactNode }) {
  return <span className="text-sm font-normal italic text-muted-foreground">{children}</span>;
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
    return <NotProvided />;
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
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    if (selected.length === 0) {
      return <NotProvided />;
    }
    return (
      <span className="flex flex-wrap gap-1.5">
        {selected.map((item) => (
          <Badge key={item} variant="secondary" dot={false} size="sm">
            {options?.find((opt) => opt.value === item)?.label ?? humanizeValue(item)}
          </Badge>
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
    return <NotProvided>{value.length} file(s)</NotProvided>;
  }
  return <span>{String(value)}</span>;
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
    <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-4 min-[420px]:grid-cols-2 min-[700px]:grid-cols-3 min-[900px]:grid-cols-4">
      {visible.map((item) => (
        <div key={item.key}>
          <dt className="text-[13px] font-medium text-muted-foreground">{item.label}</dt>
          <dd className="m-0 mt-0.5 break-words text-sm font-normal text-foreground">
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
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
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
  instance,
  formData,
  hideEmpty,
}: {
  section: FormSection;
  instance: Record<string, unknown>;
  formData: FormData;
  hideEmpty?: boolean;
}) {
  const rows = sectionRows(instance[section.code]);

  return (
    <>
      {rows.map((row, index) => {
        const { items, documents } = collectReviewItems(section.fields, row, instance, formData);
        const visibleItems = hideEmpty
          ? items.filter((item) => !isEmptyReviewValue(item.value))
          : items;
        if (visibleItems.length === 0 && documents.length === 0) return null;

        return (
          <div
            key={index}
            className="mt-4 border-t border-border pt-3.5 first:mt-0 first:border-t-0 first:pt-3.5"
          >
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
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

function CardHeaderRow({
  mode,
  stepIndex,
  title,
  headingId,
  filled,
  total,
  onEdit,
}: {
  mode: SummaryMode;
  stepIndex: number;
  title: string;
  headingId?: string;
  filled: number;
  total: number;
  onEdit?: () => void;
}) {
  const reviewing = mode === "review";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {reviewing && (
          <Badge variant="brand" dot={false} size="sm" className="shrink-0">
            Step {stepIndex + 1}
          </Badge>
        )}
        <h2 id={headingId} className="min-w-0 truncate text-base font-semibold leading-6 tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {reviewing && (
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {filled} of {total}
          </span>
          {onEdit && (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil />
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentDownloadButton({ file }: { file: StoredFileReference }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={`Download ${file.fileName}`}
      title="Download"
      loading={pending}
      className="text-muted-foreground hover:bg-primary-soft hover:text-primary"
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
      {pending ? null : <Download />}
    </Button>
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Preview ${doc.label}`}
        title="Preview"
        className="text-muted-foreground hover:bg-primary-soft hover:text-primary"
        onClick={() => onPreview(doc)}
      >
        <Eye />
      </Button>
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
  mode,
  onPreview,
}: {
  group: DocGroup;
  mode: SummaryMode;
  onPreview: (doc: ProvidedDoc) => void;
}) {
  const reviewing = mode === "review";
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold leading-[18px] text-foreground">{group.title}</h3>
        {reviewing && (
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            {group.filledSlots} of {group.slotCount}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2.5 min-[640px]:grid-cols-2">
        {group.provided.map((doc) => (
          <DocumentRow key={doc.key} doc={doc} onPreview={onPreview} />
        ))}
        {reviewing && group.missing.map((doc) => <MissingDocumentRow key={doc.key} doc={doc} />)}
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
    if (file.data) {
      triggerDownload(file.data.blob, file.data.fileName);
      onClose();
      return;
    }
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
          <Button type="button" variant="outline" onClick={download} loading={downloading}>
            <Download />
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
  formData,
  mode,
  hideEmpty,
  stepIndex,
  onEdit,
}: {
  template: FormTemplate;
  templateData: unknown;
  formData: FormData;
  mode: SummaryMode;
  hideEmpty?: boolean;
  stepIndex: number;
  onEdit?: () => void;
}) {
  const { filled, total } = countTemplateFields(template, templateData, formData);
  const instances = templateInstances(template, templateData);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <CardHeaderRow
        mode={mode}
        stepIndex={stepIndex}
        title={template.title}
        filled={filled}
        total={total}
        onEdit={onEdit}
      />
      <div className="border-t border-border px-4 pb-4 sm:px-5">
        {instances.map((instance, index) => {
          const profile = template.repeatable ? instanceProfile(template, instance) : null;
          return (
            <div key={index}>
              {profile && (
                <div className="flex items-center gap-3 pb-1.5 pt-4">
                  <Avatar>
                    <AvatarFallback>{profile.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-foreground">{profile.name}</p>
                    <p className="text-[13px] font-normal text-muted-foreground">
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
                  instance={instance}
                  formData={formData}
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
  mode,
  stepIndex,
  onEdit,
}: {
  template: FormTemplate;
  templateData: unknown;
  formData: FormData;
  mode: SummaryMode;
  stepIndex: number;
  onEdit?: () => void;
}) {
  const reviewing = mode === "review";
  const allGroups = documentGroupsForTemplate(template, templateData, formData);
  const groups = reviewing ? allGroups : allGroups.filter((group) => group.provided.length > 0);
  const [preview, setPreview] = useState<ProvidedDoc | null>(null);
  const filled = groups.reduce((count, group) => count + group.filledSlots, 0);
  const total = groups.reduce((count, group) => count + group.slotCount, 0);
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  const headingId = `review-${template.code}`;

  if (groups.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby={headingId}>
      <CardHeaderRow
        mode={mode}
        stepIndex={stepIndex}
        title={template.title}
        headingId={headingId}
        filled={filled}
        total={total}
        onEdit={onEdit}
      />
      {reviewing ? (
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
      ) : (
        <div className="border-t border-border" />
      )}
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <DocumentGroupBlock key={group.id} group={group} mode={mode} onPreview={setPreview} />
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
  mode?: SummaryMode;
}

export function ApplicationFormSummary({
  templates,
  formData,
  onEditStep,
  hideEmpty,
  mode = "view",
}: ApplicationFormSummaryProps) {
  return (
    <div className="flex flex-col gap-5">
      {templates.map((template, stepIndex) => {
        const templateData = formData[template.code];
        const onEdit = onEditStep ? () => onEditStep(stepIndex) : undefined;
        if (isDocumentTemplate(template)) {
          return (
            <DocumentReviewCard
              key={template.code}
              template={template}
              templateData={templateData}
              formData={formData}
              mode={mode}
              stepIndex={stepIndex}
              onEdit={onEdit}
            />
          );
        }
        return (
          <FormReviewCard
            key={template.code}
            template={template}
            templateData={templateData}
            formData={formData}
            mode={mode}
            hideEmpty={hideEmpty}
            stepIndex={stepIndex}
            onEdit={onEdit}
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
        <h2 className="text-2xl font-semibold leading-8 tracking-tight text-foreground">
          Review your application
        </h2>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
          Check your documents, then submit.
        </p>
      </div>

      <ApplicationFormSummary
        templates={templates}
        formData={formData}
        onEditStep={onEditStep}
        mode="review"
      />

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
            className="max-sm:flex-1"
          >
            <ArrowLeft />
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
