export const CATEGORY_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "FINANCIALS", label: "Financials" },
  { id: "LEGAL", label: "Legal & Corporate" },
  { id: "TAXATION", label: "Taxation" },
  { id: "IDENTITY", label: "Identity" },
] as const;

export const EXPIRY_PRESETS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
] as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
] as const;

export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

export const DOCUMENT_DIALOG_CLASS =
  "max-h-[min(90vh,840px)] w-[calc(100%-1.5rem)] max-w-lg gap-6 overflow-y-auto border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:w-full sm:p-8";
