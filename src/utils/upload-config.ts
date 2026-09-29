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
