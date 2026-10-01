type Raw = Record<string, unknown>;

function isPlainObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** MIME + extension pairs used by react-dropzone `accept`. */
const EXTENSION_MIME: Record<string, { mime: string; ext: string }> = {
  pdf: { mime: "application/pdf", ext: ".pdf" },
  jpg: { mime: "image/jpeg", ext: ".jpg" },
  jpeg: { mime: "image/jpeg", ext: ".jpeg" },
  png: { mime: "image/png", ext: ".png" },
  gif: { mime: "image/gif", ext: ".gif" },
  webp: { mime: "image/webp", ext: ".webp" },
  doc: { mime: "application/msword", ext: ".doc" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
  },
  xls: { mime: "application/vnd.ms-excel", ext: ".xls" },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  csv: { mime: "text/csv", ext: ".csv" },
  txt: { mime: "text/plain", ext: ".txt" },
};

export interface ParsedUploadConfig {
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  minFiles?: number;
}

function normalizeExt(value: string): string {
  return value.trim().replace(/^\./, "").toLowerCase();
}

/** Hard limits enforced by POST /api/files. Templates may be stricter. */
export const API_UPLOAD_MAX_MB = 50;

const API_UPLOAD_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx"] as const;

const API_UPLOAD_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

export function clampUploadMaxMb(maxSizeMb?: number): number {
  if (typeof maxSizeMb !== "number" || !Number.isFinite(maxSizeMb) || maxSizeMb <= 0) {
    return API_UPLOAD_MAX_MB;
  }
  return Math.min(maxSizeMb, API_UPLOAD_MAX_MB);
}

export function restrictUploadAccept(accept?: string): string {
  const requested = (accept ?? "")
    .split(",")
    .map(normalizeExt)
    .filter((ext): ext is (typeof API_UPLOAD_EXTENSIONS)[number] =>
      (API_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)
    );
  const extensions = requested.length > 0 ? requested : [...API_UPLOAD_EXTENSIONS];
  return extensionsToAccept(extensions);
}

export function isAllowedUploadType(file: { name: string; type: string }): boolean {
  const ext = normalizeExt(file.name.split(".").pop() ?? "");
  if (!(API_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) return false;
  if (!file.type) return true;
  return API_UPLOAD_MIMES.has(file.type);
}

export function isAllowedUploadFile(file: { name: string; type: string; size: number }): boolean {
  return file.size <= API_UPLOAD_MAX_MB * 1024 * 1024 && isAllowedUploadType(file);
}

export function extensionsToAccept(extensions: string[]): string {
  return extensions
    .map((ext) => `.${normalizeExt(ext)}`)
    .filter((ext, index, all) => all.indexOf(ext) === index)
    .join(",");
}

export function parseUploadConfig(raw: unknown): ParsedUploadConfig {
  if (!isPlainObject(raw)) return {};
  const extensions = Array.isArray(raw.allowedExtensions)
    ? raw.allowedExtensions.filter((item): item is string => typeof item === "string")
    : [];
  return {
    accept: extensions.length > 0 ? extensionsToAccept(extensions) : undefined,
    maxFiles: typeof raw.maxFiles === "number" ? raw.maxFiles : undefined,
    maxSize: typeof raw.maxFileSizeMB === "number" ? raw.maxFileSizeMB : undefined,
    minFiles: typeof raw.minFiles === "number" ? raw.minFiles : undefined,
  };
}

export function toDropzoneAccept(accept?: string): Record<string, string[]> | undefined {
  if (!accept) return undefined;
  const grouped = new Map<string, string[]>();
  for (const token of accept.split(",")) {
    const ext = normalizeExt(token);
    if (!ext) continue;
    const mapped = EXTENSION_MIME[ext];
    if (!mapped) continue;
    const list = grouped.get(mapped.mime) ?? [];
    if (!list.includes(mapped.ext)) list.push(mapped.ext);
    grouped.set(mapped.mime, list);
  }
  if (grouped.size === 0) return undefined;
  return Object.fromEntries(grouped);
}

export function formatAcceptLabel(accept?: string): string {
  if (!accept) return "All files";
  return accept
    .split(",")
    .map((token) => normalizeExt(token).toUpperCase())
    .filter(Boolean)
    .join(", ");
}

export function isDocumentSlot(value: unknown): value is Raw {
  return isPlainObject(value) && typeof value.documentType === "string";
}

/**
 * Parse document configuration from new format, with variable interpolation.
 * Supports {coverageMonths}, {maxFileSizeMB}, etc. in description/hint text.
 */
export function parseDocumentConfigNew(
  doc: Record<string, unknown>,
  coverageMonths?: Record<string, number>
): ParsedUploadConfig {
  if (!isPlainObject(doc)) return {};

  const upload = doc.upload as Record<string, unknown> | undefined;
  if (!upload || typeof upload !== "object") return {};

  const extensions = Array.isArray(upload.allowedExtensions)
    ? upload.allowedExtensions.filter((item: unknown): item is string => typeof item === "string")
    : [];

  // Interpolate variables in description
  const ui = doc.ui as Record<string, unknown> | undefined;
  let description = (ui?.description as string) || "";
  if (coverageMonths) {
    for (const [key, value] of Object.entries(coverageMonths)) {
      description = description.replace(`{${key}}`, String(value));
    }
  }
  // Also interpolate maxFileSizeMB if present
  if (upload.maxFileSizeMB) {
    description = description.replace(`{maxFileSizeMB}`, String(upload.maxFileSizeMB));
  }

  return {
    accept: extensions.length > 0 ? extensionsToAccept(extensions) : undefined,
    maxFiles: typeof upload.maxFiles === "number" ? upload.maxFiles : undefined,
    maxSize: typeof upload.maxFileSizeMB === "number" ? upload.maxFileSizeMB : undefined,
    minFiles: typeof upload.minFiles === "number" ? upload.minFiles : undefined,
  };
}
