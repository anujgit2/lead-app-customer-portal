"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";
import { toDropzoneAccept } from "@/utils/upload-config";
import { useDocumentTypes, useVersionPreview } from "../api/queries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { uploadFailureMessage, useUpload } from "../hooks/useUpload";
import type { UploadSubmission } from "../types";
import { ACCEPT_ATTRIBUTE, DOCUMENT_DIALOG_CLASS, MAX_UPLOAD_BYTES } from "../utils/constants";
import { categoryKey } from "../utils/format";
import { validateUploadFile } from "../utils/upload";
import { DocumentTypeFields } from "./DocumentTypeFields";

export interface LockedUpload {
  documentId: string;
  typeId: string;
  typeName: string;
  label: string;
  category: string;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked?: LockedUpload;
}

export function UploadDialog({ open, onOpenChange, locked }: UploadDialogProps) {
  if (!open) return null;
  return <UploadDialogForm onOpenChange={onOpenChange} locked={locked} />;
}

function UploadDialogForm({ onOpenChange, locked }: Omit<UploadDialogProps, "open">) {
  const upload = useUpload();
  const types = useDocumentTypes(!locked);
  const [category, setCategory] = useState(locked ? categoryKey(locked.category) : "");
  const [typeId, setTypeId] = useState(locked?.typeId ?? "");
  const [label, setLabel] = useState(locked?.label ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [asNew, setAsNew] = useState(false);

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

  const dropzone = useDropzone({
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_UPLOAD_BYTES,
    accept: toDropzoneAccept(ACCEPT_ATTRIBUTE),
    disabled: upload.isPending,
    onDrop: (accepted) => {
      const next = accepted[0];
      if (!next) return;
      const problem = validateUploadFile(next);
      setFileError(problem);
      setFile(problem ? null : next);
      markChanged();
    },
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      setFile(null);
      setFileError(
        code === "file-too-large" ? "File is too large (max 25 MB)" : "This file type isn't supported"
      );
      markChanged();
    },
  });

  const canSubmit =
    !!file &&
    !!typeId &&
    (!requiresLabel || label.trim().length > 0) &&
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
    };
  };

  const versionHint = asNew
    ? "This will be saved as a new document."
    : preview.data
      ? `This will be saved as v${preview.data.nextVersion}.`
      : preview.isFetching
        ? "Checking the next version…"
        : null;

  return (
    <Dialog open onOpenChange={(next) => !upload.isPending && onOpenChange(next)}>
      <DialogContent
        className={DOCUMENT_DIALOG_CLASS}
        onEscapeKeyDown={(event) => {
          if (upload.isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (upload.isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">
            {locked ? "Upload new version" : "Upload document"}
          </DialogTitle>
          <DialogDescription className="text-sm font-normal text-slate-500">
            PDF, images and spreadsheets up to 25 MB.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            const submission = buildSubmission();
            if (!submission || !canSubmit) return;
            submit(submission);
          }}
        >
          <DocumentTypeFields
            types={types.data ?? []}
            isLoading={types.isLoading}
            isError={types.isError}
            onRetry={() => void types.refetch()}
            category={category}
            typeId={typeId}
            label={label}
            locked={!!locked}
            lockedTypeName={locked?.typeName}
            lockedCategory={locked?.category}
            disabled={upload.isPending}
            onCategoryChange={(next) => {
              setCategory(next);
              const current = types.data?.find((type) => type.id === typeId);
              if (current && categoryKey(current.category) !== next) setTypeId("");
              markChanged();
            }}
            onTypeChange={(next) => {
              setTypeId(next);
              markChanged();
            }}
            onLabelChange={(next) => {
              setLabel(next);
              markChanged();
            }}
          />

          <div
            {...dropzone.getRootProps()}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 active:scale-[0.98]",
              dropzone.isDragActive && "border-blue-500 bg-blue-50",
              fileError && "border-destructive",
              upload.isPending && "pointer-events-none opacity-60"
            )}
          >
            <input {...dropzone.getInputProps({ "aria-label": "Choose a file" })} />
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Drop a file or <span className="text-primary">browse</span>
              </p>
              <p className="text-sm font-normal text-slate-500">One file, up to 25 MB</p>
            </div>
          </div>

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                disabled={upload.isPending}
                onClick={() => {
                  setFile(null);
                  markChanged();
                }}
                className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {fileError ? (
            <p className="text-sm text-destructive" role="alert">
              {fileError}
            </p>
          ) : null}

          {versionHint ? (
            <p className="text-sm text-slate-600" role="status">
              {versionHint}
            </p>
          ) : null}

          {!locked && preview.data && preview.data.nextVersion > 1 ? (
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
              <Checkbox
                checked={asNew}
                disabled={upload.isPending}
                onCheckedChange={(checked) => {
                  setAsNew(checked === true);
                  markChanged();
                }}
              />
              Upload as a new document
            </label>
          ) : null}

          {upload.isPending ? (
            <div
              className="space-y-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={upload.progress}
              aria-label="Upload progress"
            >
              <Progress value={upload.progress} />
              <p className="text-sm text-slate-500">{upload.progress}%</p>
            </div>
          ) : null}

          {upload.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive" role="alert">
                {uploadFailureMessage(upload.error)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => {
                  const submission = buildSubmission();
                  if (submission) submit(submission);
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={!canSubmit} loading={upload.isPending}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
