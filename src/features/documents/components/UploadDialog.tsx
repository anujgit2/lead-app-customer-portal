"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Info, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfiles } from "@/features/profiles/api/queries";
import { profileTypeLabel, showIdentifier } from "@/features/profiles/utils/display";
import { cn, formatFileSize } from "@/lib/utils";
import { toDropzoneAccept } from "@/utils/upload-config";
import type { CustomerProfileSummary, DocumentProfileRelation } from "@/types";
import { useDocumentTypes, useVersionPreview } from "../api/queries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { uploadFailureMessage, useUpload } from "../hooks/useUpload";
import type { UploadSubmission } from "../types";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from "../utils/constants";
import { categoryFiltersFor, categoryKey, categoryLabel } from "../utils/format";
import { validateUploadFile } from "../utils/upload";

export interface LockedUpload {
  documentId: string;
  typeId: string;
  typeName: string;
  label: string;
  category: string;
}

export interface PresetProfileUpload {
  profileId: string;
  displayName: string;
  relation: DocumentProfileRelation;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked?: LockedUpload;
  presetProfile?: PresetProfileUpload;
}

const controlClass = "h-[38px] text-sm";

function friendlyFileError(problem: string): string {
  if (problem.startsWith("File is too large")) {
    return "This file is larger than 25 MB. Choose a smaller file.";
  }
  if (problem.startsWith("This file type")) {
    return "This file type isn’t supported. Use PDF, an image or a spreadsheet.";
  }
  return problem;
}

function fileMeta(file: File): string {
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toUpperCase() : "";
  return [formatFileSize(file.size), extension].filter(Boolean).join(" · ");
}

function profileOptionLabel(profile: Pick<CustomerProfileSummary, "displayName" | "type" | "identifiers">): string {
  const name = profile.displayName || "Untitled profile";
  return `${name} · ${profileTypeLabel(profile.type)} · PAN ${showIdentifier(profile.identifiers.pan)}`;
}

function Field({
  id,
  label,
  required,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[13px] leading-[18px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger-strong" role="alert">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function UploadDialog({ open, onOpenChange, locked, presetProfile }: UploadDialogProps) {
  if (!open) return null;
  return <UploadDialogForm onOpenChange={onOpenChange} locked={locked} presetProfile={presetProfile} />;
}

function UploadDialogForm({ onOpenChange, locked, presetProfile }: Omit<UploadDialogProps, "open">) {
  const upload = useUpload();
  const types = useDocumentTypes(!locked);
  const profileFilters = useMemo(() => ({ page: 0, size: 100, status: "ACTIVE" as const }), []);
  const profilesQuery = useProfiles(profileFilters);
  const [category, setCategory] = useState(locked ? categoryKey(locked.category) : "");
  const [typeId, setTypeId] = useState(locked?.typeId ?? "");
  const [label, setLabel] = useState(locked?.label ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [asNew, setAsNew] = useState(false);
  const [profile, setProfile] = useState<CustomerProfileSummary | null>(null);

  const markChanged = () => {
    upload.rotateKey();
    upload.reset();
  };

  const selectedType = types.data?.find((type) => type.id === typeId);
  const requiresLabel = locked ? false : !!selectedType?.requiresLabel;
  const debouncedLabel = useDebouncedValue(label.trim(), 400);
  const previewEnabled = !asNew && !!typeId && (!requiresLabel || debouncedLabel.length > 0);
  const preview = useVersionPreview(
    {
      typeId,
      label: debouncedLabel || undefined,
      documentId: locked?.documentId,
    },
    previewEnabled
  );

  const categories = categoryFiltersFor((types.data ?? []).map((type) => type.category)).filter(
    (item) => item.id !== "ALL"
  );
  const visibleTypes = (types.data ?? []).filter((type) => !category || categoryKey(type.category) === category);
  const profiles = profilesQuery.data?.content ?? [];
  const profileRequired = !locked;
  const profileReady = !!presetProfile || !!profile;

  const acceptFile = (next: File | undefined) => {
    if (!next) return;
    const problem = validateUploadFile(next);
    setFileError(problem ? friendlyFileError(problem) : null);
    setFile(problem ? null : next);
    markChanged();
  };

  const dropzone = useDropzone({
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_UPLOAD_BYTES,
    accept: toDropzoneAccept(ACCEPT_ATTRIBUTE),
    disabled: upload.isPending,
    onDrop: (accepted) => acceptFile(accepted[0]),
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      setFile(null);
      setFileError(
        code === "file-too-large"
          ? "This file is larger than 25 MB. Choose a smaller file."
          : "This file type isn’t supported. Use PDF, an image or a spreadsheet."
      );
      markChanged();
    },
  });

  const canSubmit =
    !!file &&
    !!typeId &&
    (!requiresLabel || label.trim().length > 0) &&
    (!profileRequired || profileReady) &&
    !upload.isPending;

  const submit = (submission: UploadSubmission) => {
    upload.mutate(submission, {
      onSuccess: () => {
        toast.success(locked ? "New version uploaded" : "Document uploaded");
        onOpenChange(false);
      },
    });
  };

  const buildSubmission = (): UploadSubmission | null => {
    if (!file || !typeId) return null;
    return {
      file,
      typeId,
      label: label.trim(),
      documentId: locked?.documentId,
      asNewDocument: asNew,
      ...(presetProfile
        ? { profileId: presetProfile.profileId, relation: presetProfile.relation }
        : profile
          ? { profileId: profile.id, relation: "RELATED_TO" as const }
          : {}),
    };
  };

  const versionHint = asNew
    ? "This will be saved as a new document."
    : preview.data
      ? `This will be saved as v${preview.data.nextVersion}.`
      : preview.isFetching
        ? "Checking the next version…"
        : null;

  const footerHint = upload.isPending
    ? "Uploading…"
    : !file
      ? "Add a file to continue."
      : !locked && types.isError
        ? "Document types couldn’t be loaded."
        : !locked && !category
          ? "Choose a category."
          : !locked && !typeId
            ? "Choose a document type."
            : !locked && requiresLabel && !label.trim()
              ? "Add a label."
              : profileRequired && !profileReady
                ? "Select a profile."
                : "Ready to upload.";

  const selectedProfileId = presetProfile?.profileId ?? profile?.id;
  const presetMissing =
    !!presetProfile && !profiles.some((item) => item.id === presetProfile.profileId);
  const lockedCategory = locked ? categoryKey(locked.category) : "";
  const typePlaceholder = !category
    ? "Select a category first"
    : visibleTypes.length
      ? "Choose a type"
      : "No types available";

  return (
    <Dialog open onOpenChange={(next) => !upload.isPending && onOpenChange(next)}>
      <DialogContent
        className="w-[min(620px,calc(100vw-32px))] max-h-[min(calc(100vh-32px),800px)] max-w-none gap-0 overflow-hidden p-0"
        onEscapeKeyDown={(event) => {
          if (upload.isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (upload.isPending) event.preventDefault();
        }}
      >
        <form
          className="flex min-h-0 max-h-[min(calc(100vh-32px),800px)] flex-col overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            const submission = buildSubmission();
            if (!submission || !canSubmit) return;
            submit(submission);
          }}
        >
          <DialogHeader className="flex-row items-start gap-3.5 pb-3 pl-4 pr-12 pt-[18px] sm:pb-3.5 sm:pl-6 sm:pr-14 sm:pt-[22px]">
            <span className="tone-brand grid h-10 w-10 shrink-0 place-items-center rounded-md">
              <Upload className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>{locked ? "Upload new version" : "Upload document"}</DialogTitle>
              <DialogDescription className="mt-0.5">
                PDF, images and spreadsheets up to 25 MB.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-[18px] pt-1 sm:gap-6 sm:px-6 sm:pb-[22px] sm:pt-1.5">
            <section className="flex flex-col gap-3.5">
              <input {...dropzone.getInputProps({ "aria-label": "Choose a file to upload" })} />
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <span className="tone-brand grid h-10 w-10 shrink-0 place-items-center rounded-md">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      {upload.isPending ? (
                        <span className="num shrink-0 text-xs text-muted-foreground">{upload.progress}%</span>
                      ) : null}
                    </div>
                    {upload.isPending ? (
                      <Progress value={upload.progress} className="h-1.5" aria-label="Uploading" />
                    ) : (
                      <p className="text-xs leading-4 text-muted-foreground">{fileMeta(file)}</p>
                    )}
                  </div>
                  {upload.isPending ? null : (
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={() => dropzone.open()}>
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Remove file"
                        onClick={() => {
                          setFile(null);
                          setFileError(null);
                          markChanged();
                        }}
                      >
                        <X />
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div
                  {...dropzone.getRootProps({
                    role: "button",
                    "aria-label": "Choose a file to upload",
                  })}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-3.5 rounded-lg border-[1.5px] border-dashed border-input bg-card px-4 py-5 text-left transition-[border-color,background-color] duration-150 hover:border-primary hover:bg-primary-soft/50 focus-within:border-primary focus-within:bg-primary-soft/50",
                    dropzone.isDragActive && "border-primary bg-primary-soft/50",
                    fileError && "border-danger bg-danger-soft"
                  )}
                >
                  <span className="tone-brand grid h-10 w-10 shrink-0 place-items-center rounded-md">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium leading-5">
                      Drop a file or <span className="underline">browse</span>
                    </span>
                    <span className="block text-[13px] leading-[18px] text-muted-foreground">
                      One file, up to 25 MB
                    </span>
                  </span>
                </div>
              )}
              {fileError ? <FieldError>{fileError}</FieldError> : null}
            </section>

            <section className="flex flex-col gap-3.5">
              {locked ? (
                <>
                  <Field id="document-category" label="Category" required>
                    <Select value={lockedCategory || locked.category} disabled>
                      <SelectTrigger id="document-category" className={controlClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={lockedCategory || locked.category}>
                          {categoryLabel(lockedCategory, locked.category)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2">
                    <Field id="document-type" label="Type" required>
                      <Select value={locked.typeId} disabled>
                        <SelectTrigger id="document-type" className={controlClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={locked.typeId}>{locked.typeName || "Document"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="document-label" label="Label" optional={!locked.label}>
                      <Input
                        id="document-label"
                        value={locked.label}
                        readOnly
                        disabled
                        className={controlClass}
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  {types.isLoading ? (
                    <p className="text-[13px] leading-[18px] text-muted-foreground">Loading document types…</p>
                  ) : null}
                  {types.isError ? (
                    <div className="flex flex-col items-start gap-2">
                      <FieldError>We couldn&apos;t load document types.</FieldError>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void types.refetch()}
                      >
                        Try again
                      </Button>
                    </div>
                  ) : null}
                  <Field id="document-category" label="Category" required>
                    <Select
                      value={category || undefined}
                      onValueChange={(next) => {
                        setCategory(next);
                        const current = types.data?.find((type) => type.id === typeId);
                        if (current && categoryKey(current.category) !== next) setTypeId("");
                        markChanged();
                      }}
                      disabled={upload.isPending || types.isLoading || categories.length === 0}
                    >
                      <SelectTrigger id="document-category" className={controlClass}>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2">
                    <Field
                      id="document-type"
                      label="Type"
                      required
                      hint={
                        category && visibleTypes.length === 0 && !types.isLoading
                          ? "No types in this category yet."
                          : undefined
                      }
                    >
                      <Select
                        value={typeId || undefined}
                        onValueChange={(next) => {
                          setTypeId(next);
                          markChanged();
                        }}
                        disabled={upload.isPending || !category || visibleTypes.length === 0}
                      >
                        <SelectTrigger id="document-type" className={controlClass}>
                          <SelectValue placeholder={typePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {visibleTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="document-label" label="Label" required={requiresLabel} optional={!requiresLabel}>
                      <Input
                        id="document-label"
                        value={label}
                        disabled={upload.isPending || !typeId}
                        placeholder={selectedType?.labelHint || "e.g. FY 2025-26"}
                        onChange={(event) => {
                          setLabel(event.target.value);
                          markChanged();
                        }}
                        className={controlClass}
                      />
                    </Field>
                  </div>
                </>
              )}

              {!locked && preview.data && preview.data.nextVersion > 1 ? (
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="upload-as-new"
                    className="mt-px"
                    checked={asNew}
                    disabled={upload.isPending}
                    onCheckedChange={(checked) => {
                      setAsNew(checked === true);
                      markChanged();
                    }}
                  />
                  <Label htmlFor="upload-as-new" className="font-normal">
                    Upload as a new document
                  </Label>
                </div>
              ) : null}
              {versionHint ? (
                <p className="text-[13px] leading-[18px] text-muted-foreground" role="status">
                  {versionHint}
                </p>
              ) : null}
            </section>

            <section className="flex flex-col gap-3.5">
              <Field
                id="upload-profile"
                label="Related to"
                required={profileRequired}
                hint={
                  profilesQuery.isError
                    ? undefined
                    : "Choose the person or business this document belongs to."
                }
              >
                <Select
                  value={selectedProfileId}
                  onValueChange={(next) => {
                    const match = profiles.find((item) => item.id === next) ?? null;
                    setProfile(match);
                    markChanged();
                  }}
                  disabled={upload.isPending || !!presetProfile || profilesQuery.isLoading || profilesQuery.isError}
                >
                  <SelectTrigger id="upload-profile" className={controlClass}>
                    <SelectValue
                      placeholder={profilesQuery.isLoading ? "Loading profiles…" : "Select a profile"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {presetMissing && presetProfile ? (
                      <SelectItem value={presetProfile.profileId}>
                        {presetProfile.displayName || "Untitled profile"}
                      </SelectItem>
                    ) : null}
                    {profiles.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {profileOptionLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {profilesQuery.isError ? (
                <FieldError>We couldn&apos;t load profiles.</FieldError>
              ) : null}
              {!profilesQuery.isLoading && !profilesQuery.isError && profiles.length === 0 && !presetProfile ? (
                <p className="text-[13px] leading-[18px] text-muted-foreground">No active profiles yet.</p>
              ) : null}
            </section>

            {upload.isError ? <FieldError>{uploadFailureMessage(upload.error)}</FieldError> : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t border-border bg-card px-4 py-3 sm:px-6 sm:py-3.5">
            <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-muted-foreground max-sm:basis-full">
              {footerHint}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="max-sm:flex-1"
              disabled={upload.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="max-sm:flex-1" disabled={!canSubmit}>
              <Upload />
              Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
