"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
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
  const storedItems = toItems(Array.isArray(value) ? value.filter(isStoredFileReference) : []);
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

      // Store new items FIRST, then handle uploads
      // This ensures items are in state before uploads complete
      setTransientItems((prev) => [...prev, ...newItems]);

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
            
            // Update state
            setTransientItems((prev) => {
              const found = prev.find((entry) => entry.id === item.id);
              
              if (!found) {
                return prev;
              }
              
              const nextItems = prev.map((entry) => entry.id === item.id
                ? { ...entry, status: "success" as const, storageFile: storedFile }
                : entry
              );
              
              return nextItems;
            });
            
            // Publish only ONCE per upload (prevent double-call from React StrictMode)
            // Use a unique key combining item ID + file ID to track what's been published
            const publishKey = `${item.id}-${storageFile.id}`;
            if (!publishedItemsRef.current.has(publishKey)) {
              publishedItemsRef.current.add(publishKey);
              
              queueMicrotask(() => {
                const current = transientItemsRef.current;
                if (current) {
                  publish(current);
                }
              });
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
    <div className="space-y-3">
      {remaining > 0 && (
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-xl border border-dashed px-5 py-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]",
            isDragActive
              ? "border-blue-500 bg-blue-50/60"
              : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/80",
            error && "border-destructive",
            remaining <= 0 && "cursor-not-allowed opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-4 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            {isDragActive ? (
              <p className="text-sm font-medium text-primary">Drop files here</p>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-slate-800">
                  Drag & drop or{" "}
                  <span className="text-primary underline">browse</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatAcceptLabel(acceptList)} · Max {sizeLimitMb}MB
                  {maxFiles > 1 && ` · Up to ${maxFiles} files`}
                  {minFiles > 0 && ` · At least ${minFiles} required`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {rejectMessage && (
        <p className="text-xs text-destructive">{rejectMessage}</p>
      )}

      {fileItems.length > 0 && (
        <div className="space-y-2">
          {fileItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-card p-3 shadow-sm"
            >
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.fileName}
                  className="h-10 w-10 flex-shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.sizeBytes)}
                  {item.status === "uploading" && " · Uploading…"}
                </p>
                {item.error && <p className="text-xs text-destructive">{item.error}</p>}
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {item.status === "success" && item.storageFile && (
                  <FileDownloadButton
                    fileId={item.storageFile.id}
                    fileName={item.storageFile.fileName}
                  />
                )}
                {item.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(item)}
                  className="flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200 ease-out hover:bg-muted active:scale-[0.98]"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
