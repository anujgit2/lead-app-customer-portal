import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES } from "./constants";

export interface SubmissionFingerprint {
  name: string;
  size: number;
  lastModified: number;
  typeId: string;
  label: string;
  asNewDocument: boolean;
  documentId: string;
}

export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sameSubmission(left: SubmissionFingerprint, right: SubmissionFingerprint): boolean {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified &&
    left.typeId === right.typeId &&
    left.label === right.label &&
    left.asNewDocument === right.asNewDocument &&
    left.documentId === right.documentId
  );
}

export function validateUploadFile(file: { name: string; size: number }): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = (ALLOWED_EXTENSIONS as readonly string[]).includes(extension);
  if (!file.name.includes(".") || !allowed) return "This file type isn't supported";
  if (file.size > MAX_UPLOAD_BYTES) return "File is too large (max 25 MB)";
  if (file.size <= 0) return "Choose a file to upload";
  return null;
}

export function messageForUploadStatus(status?: number): string {
  if (status === 413) return "File is too large (max 25 MB)";
  if (status === 415) return "This file type isn't supported";
  return "Upload failed. Please try again.";
}

export class UploadRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadRejected";
  }
}
