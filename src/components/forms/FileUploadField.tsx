"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { formatAcceptLabel, toDropzoneAccept } from "@/utils/upload-config";

interface FileItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  preview?: string;
}

interface FileUploadFieldProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  minFiles?: number;
  maxSizeMB?: number;
  error?: boolean;
}

export function FileUploadField({
  value,
  onChange,
  accept,
  maxFiles = 1,
  minFiles = 0,
  maxSizeMB = 5,
  error,
}: FileUploadFieldProps) {
  const safeValue = Array.isArray(value) ? value : [];
  const [fileItems, setFileItems] = useState<FileItem[]>(
    safeValue.map((f) => ({ file: f, progress: 100, status: "success" as const }))
  );
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);

  const simulateUpload = (item: FileItem) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFileItems((prev) =>
          prev.map((f) =>
            f.file.name === item.file.name
              ? { ...f, progress: 100, status: "success" }
              : f
          )
        );
      } else {
        setFileItems((prev) =>
          prev.map((f) =>
            f.file.name === item.file.name
              ? { ...f, progress, status: "uploading" }
              : f
          )
        );
      }
    }, 200);
  };

  const remaining = Math.max(maxFiles - fileItems.length, 0);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return;
      setRejectMessage(null);
      const newItems: FileItem[] = accepted.map((f) => ({
        file: f,
        progress: 0,
        status: "uploading" as const,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }));

      setFileItems((prev) => {
        const combined = [...prev, ...newItems].slice(0, maxFiles);
        onChange?.(combined.map((item) => item.file));
        return combined;
      });

      newItems.forEach((item) => simulateUpload(item));
    },
    [maxFiles, onChange]
  );

  const removeFile = (index: number) => {
    setFileItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onChange?.(updated.map((item) => item.file));
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      if (code === "file-too-large") {
        setRejectMessage(`Each file must be under ${maxSizeMB}MB`);
      } else if (code === "file-invalid-type") {
        setRejectMessage(`Allowed types: ${formatAcceptLabel(accept)}`);
      } else if (code === "too-many-files") {
        setRejectMessage(`You can upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}`);
      } else {
        setRejectMessage(rejections[0]?.errors[0]?.message ?? "File could not be uploaded");
      }
    },
    accept: toDropzoneAccept(accept),
    maxSize: maxSizeMB * 1024 * 1024,
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
                  {formatAcceptLabel(accept)} · Max {maxSizeMB}MB
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
          {fileItems.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-card p-3 shadow-sm"
            >
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="h-10 w-10 flex-shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </p>
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="mt-1 h-1" />
                )}
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {item.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
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
