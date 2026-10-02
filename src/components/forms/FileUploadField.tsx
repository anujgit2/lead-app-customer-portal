"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { FileDownloadButton } from "@/components/forms/FileDownloadButton";
import {
  clampUploadMaxMb,
  formatAcceptLabel,
  restrictUploadAccept,
  toDropzoneAccept,
} from "@/utils/upload-config";
import { fileStorageService, isStoredFileReference } from "@/services/file-storage.service";
import { useApplicationId, usePersistDocumentStep, useSyncFormToWizard } from "@/components/forms/application-context";
import { parseApiError } from "@/lib/api-error";
import { toast } from "sonner";
import type { StoredFileReference } from "@/types";

interface FileItem {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: "pending" | "uploading" | "success" | "error";
  preview?: string;
  storageFile?: StoredFileReference;
  error?: string;
}

interface FileUploadFieldProps {
  value?: unknown;
  onChange?: (files: StoredFileReference[]) => void;
  documentType?: string;
  accept?: string;
  maxFiles?: number;
  minFiles?: number;
  maxSizeMB?: number;
  error?: boolean;
}

export function FileUploadField({
  value,
  onChange,
  documentType,
  accept,
  maxFiles = 1,
  minFiles = 0,
  maxSizeMB,
  error,
}: FileUploadFieldProps) {
  const sizeLimitMb = clampUploadMaxMb(maxSizeMB);
  const acceptList = restrictUploadAccept(accept);
  const storedItems = toItems(
    (Array.isArray(value) ? value : []).flatMap((item) => {
      const file = asStoredFile(item);
      return file ? [file] : [];
    })
  );
  const storedKey = storedItems.map((item) => item.id).join("\0");
  const [transientItems, setTransientItems] = useState<FileItem[]>([]);
  const [syncedKey, setSyncedKey] = useState(storedKey);
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);
  const uploadsRef = useRef(new Map<string, AbortController>());
  const transientItemsRef = useRef(transientItems);
  const publishedItemsRef = useRef<Set<string>>(new Set());
  const applicationId = useApplicationId();
  const syncFormToWizard = useSyncFormToWizard();
  const persistDocumentStep = usePersistDocumentStep();
  const onChangeRef = useRef(onChange);
  const storedItemsRef = useRef(storedItems);

  if (syncedKey !== storedKey) {
    setSyncedKey(storedKey);
    setTransientItems((current) =>
      current.filter((item) => item.status === "uploading" || item.status === "error")
    );
  }

  useEffect(() => {
    onChangeRef.current = onChange;
    storedItemsRef.current = storedItems;
    transientItemsRef.current = transientItems;
  }, [onChange, storedItems, transientItems]);

  useEffect(() => {
    const uploads = uploadsRef.current;
    return () => {
      uploads.forEach((controller) => controller.abort());
    };
  }, []);

  const fileItems = [
    ...storedItems,
    ...transientItems.filter(
      (item) => !item.storageFile || !storedItems.some((stored) => stored.id === item.storageFile?.id)
    ),
  ];

  const notifyWizard = useCallback(() => {
    syncFormToWizard?.();
    // Delay persist to ensure form data has been synced to the wizard
    queueMicrotask(() => {
      persistDocumentStep?.();
    });
  }, [syncFormToWizard, persistDocumentStep]);

  const publish = useCallback((transient: FileItem[]) => {
    const stored = storedItemsRef.current;
    const extras = transient.filter(
      (item) => item.storageFile && !stored.some((storedItem) => storedItem.id === item.storageFile?.id)
    );
    onChangeRef.current?.(
      [...stored, ...extras].flatMap((item) => (item.storageFile ? [item.storageFile] : []))
    );
    notifyWizard();
  }, [notifyWizard]);

  const remaining = Math.max(maxFiles - fileItems.length, 0);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return;
      setRejectMessage(null);
      const newItems: FileItem[] = accepted.slice(0, remaining).map((f) => ({
        id: crypto.randomUUID(),
        fileName: f.name,
        contentType: f.type,
        sizeBytes: f.size,
        status: "uploading" as const,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }));

      const nextTransient = [...transientItemsRef.current, ...newItems];
      transientItemsRef.current = nextTransient;
      setTransientItems(nextTransient);

      accepted.slice(0, remaining).forEach((file, index) => {
        const item = newItems[index];
        const controller = new AbortController();
        uploadsRef.current.set(item.id, controller);
        void fileStorageService
          .upload(file, { applicationId: applicationId ?? "", signal: controller.signal })
          .then((storageFile) => {
            if (!storageFile) {
              return;
            }
            const storedFile = { ...storageFile, type: documentType ?? "" };
            const prev = transientItemsRef.current;
            const nextItems = prev.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: "success" as const, storageFile: storedFile }
                : entry
            );
            transientItemsRef.current = nextItems;
            setTransientItems(nextItems);

            const publishKey = `${item.id}-${storageFile.id}`;
            if (!publishedItemsRef.current.has(publishKey)) {
              publishedItemsRef.current.add(publishKey);
              publish(nextItems);
            }
          })
          .catch((uploadError: unknown) => {
            if (isAbortError(uploadError)) return;
            setTransientItems((prev) => prev.map((entry) => entry.id === item.id
              ? { ...entry, status: "error" as const, error: errorMessage(uploadError) }
              : entry
            ));
          })
          .finally(() => {
            uploadsRef.current.delete(item.id);
          });
      });
    },
    [applicationId, documentType, publish, remaining]
  );

  const removeFile = (item: FileItem) => {
    uploadsRef.current.get(item.id)?.abort();
    uploadsRef.current.delete(item.id);
    if (item.preview) URL.revokeObjectURL(item.preview);
    if (item.storageFile) {
      void fileStorageService.delete(item.storageFile.id).catch((deleteError: unknown) => {
        toast.error(parseApiError(deleteError).message);
      });
    }
    const nextTransient = transientItems.filter(
      (entry) => entry.id !== item.id && entry.storageFile?.id !== item.storageFile?.id
    );
    setTransientItems(nextTransient);
    const nextStored = storedItems.filter((entry) => entry.id !== item.id);
    onChangeRef.current?.(
      [...nextStored, ...nextTransient].flatMap((entry) => (entry.storageFile ? [entry.storageFile] : []))
    );
    notifyWizard();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      if (code === "file-too-large") {
        setRejectMessage(`Each file must be under ${sizeLimitMb}MB`);
      } else if (code === "file-invalid-type") {
        setRejectMessage(`Allowed types: ${formatAcceptLabel(acceptList)}`);
      } else if (code === "too-many-files") {
        setRejectMessage(`You can upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}`);
      } else {
        setRejectMessage(rejections[0]?.errors[0]?.message ?? "File could not be uploaded");
      }
    },
    accept: toDropzoneAccept(acceptList),
    maxSize: sizeLimitMb * 1024 * 1024,
    maxFiles: remaining,
    disabled: remaining <= 0,
  });

  return (
    <div className="space-y-2">
      {remaining > 0 && (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] border-dashed px-3.5 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-slate-200 hover:border-primary hover:bg-primary/5",
            error && "border-destructive"
          )}
        >
          <input {...getInputProps()} />
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-primary/10 text-primary">
            <Upload className="h-4 w-4" />
          </div>
          {isDragActive ? (
            <p className="text-sm font-medium text-primary">Drop files here</p>
          ) : (
            <div className="min-w-0">
              <p className="text-sm text-slate-800">
                Drop files or <span className="font-medium text-primary">browse</span>
              </p>
              <p className="truncate text-xs text-slate-500">
                {formatAcceptLabel(acceptList)} · up to {sizeLimitMb} MB
                {maxFiles > 1 ? ` · up to ${maxFiles} files` : ""}
                {minFiles > 0 ? ` · at least ${minFiles} required` : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {rejectMessage && (
        <p className="text-[13px] text-destructive" role="alert">
          {rejectMessage}
        </p>
      )}

      {fileItems.length > 0 && (
        <ul className="space-y-2">
          {fileItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-[10px] border border-slate-100 bg-white px-3 py-2.5"
            >
              {item.status === "success" ? (
                <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-emerald-600" />
              ) : item.status === "error" ? (
                <AlertCircle className="h-[18px] w-[18px] shrink-0 text-destructive" />
              ) : item.preview ? (
                <img
                  src={item.preview}
                  alt=""
                  className="h-[18px] w-[18px] shrink-0 rounded object-cover"
                />
              ) : (
                <FileText className="h-[18px] w-[18px] shrink-0 text-slate-400" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.fileName}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(item.sizeBytes)}
                  {item.status === "uploading" && " · Uploading…"}
                </p>
                {item.error && <p className="text-xs text-destructive">{item.error}</p>}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {item.status === "success" && item.storageFile && (
                  <FileDownloadButton
                    fileId={item.storageFile.id}
                    fileName={item.storageFile.fileName}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(item)}
                  aria-label={`Remove ${item.fileName}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-slate-400 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98]"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isPlainFileObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStoredFile(value: unknown): StoredFileReference | null {
  if (isStoredFileReference(value)) return value;
  if (!isPlainFileObject(value)) return null;
  if (typeof value.id !== "string" || typeof value.fileName !== "string") return null;
  const meta = isPlainFileObject(value.meta) ? value.meta : {};
  return {
    id: value.id,
    fileName: value.fileName,
    contentType: typeof value.contentType === "string" ? value.contentType : "application/octet-stream",
    status: "AVAILABLE",
    uploadedAt: typeof value.uploadedAt === "string" ? value.uploadedAt : new Date().toISOString(),
    type: typeof value.type === "string" ? value.type : "",
    meta: {
      folderId: meta.folderId === null || typeof meta.folderId === "string" ? meta.folderId : null,
      sizeBytes: typeof meta.sizeBytes === "number" ? meta.sizeBytes : 0,
      checksum: typeof meta.checksum === "string" ? meta.checksum : "",
      ownerId: typeof meta.ownerId === "string" ? meta.ownerId : "",
    },
  };
}

function toItems(files: StoredFileReference[]): FileItem[] {
  return files.map((storageFile) => ({
    id: storageFile.id,
    fileName: storageFile.fileName,
    contentType: storageFile.contentType,
    sizeBytes: storageFile.meta.sizeBytes,
    status: "success",
    storageFile,
  }));
}

function errorMessage(error: unknown): string {
  return parseApiError(error).message || "File could not be uploaded";
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
