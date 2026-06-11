"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  maxSizeMB?: number;
  error?: boolean;
}

export function FileUploadField({
  value = [],
  onChange,
  accept,
  maxFiles = 1,
  maxSizeMB = 5,
  error,
}: FileUploadFieldProps) {
  const [fileItems, setFileItems] = useState<FileItem[]>(
    value.map((f) => ({ file: f, progress: 100, status: "success" as const }))
  );

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

  const onDrop = useCallback(
    (accepted: File[]) => {
      const newItems: FileItem[] = accepted.map((f) => ({
        file: f,
        progress: 0,
        status: "uploading" as const,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }));

      setFileItems((prev) => {
        const combined = [...prev, ...newItems].slice(0, maxFiles);
        return combined;
      });

      newItems.forEach((item) => simulateUpload(item));

      const allFiles = [...fileItems, ...newItems]
        .slice(0, maxFiles)
        .map((i) => i.file);
      onChange?.(allFiles);
    },
    [fileItems, maxFiles, onChange]
  );

  const removeFile = (index: number) => {
    setFileItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onChange?.(updated.map((i) => i.file));
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept
      ? Object.fromEntries(
          accept.split(",").map((ext) => {
            const mime = ext.trim() === ".pdf" ? "application/pdf" :
              ext.trim() === ".xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
              ext.trim() === ".csv" ? "text/csv" :
              "image/*";
            return [mime, []];
          })
        )
      : undefined,
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles: maxFiles - fileItems.length,
    disabled: fileItems.length >= maxFiles,
  });

  return (
    <div className="space-y-3">
      {fileItems.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            error && "border-destructive",
            fileItems.length >= maxFiles && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            {isDragActive ? (
              <p className="text-sm font-medium text-primary">Drop files here</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Drag & drop or{" "}
                  <span className="text-primary underline">browse</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {accept ?? "All files"} · Max {maxSizeMB}MB
                  {maxFiles > 1 && ` · Up to ${maxFiles} files`}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {fileItems.length > 0 && (
        <div className="space-y-2">
          {fileItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="h-10 w-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </p>
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="mt-1 h-1" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {item.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
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
