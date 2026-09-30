import { getApiAuthHeaders, getApiBaseUrl } from "@/lib/axios";
import {
  handleSessionExpired,
  isSessionExpiredRedirectSuppressed,
} from "@/lib/session";
import type { StoredFileReference } from "@/types";
import { API_UPLOAD_MAX_MB, isAllowedUploadType } from "@/utils/upload-config";

export interface FileShare {
  token: string;
}

interface FileMetadata {
  id: string;
  folderId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

interface UploadOptions {
  applicationId: string;
  signal?: AbortSignal;
}

const MAX_BYTES = API_UPLOAD_MAX_MB * 1024 * 1024;

export function isStoredFileReference(value: unknown): value is StoredFileReference {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<StoredFileReference>;
  const meta = file.meta;
  return (
    file.status === "AVAILABLE" &&
    typeof file.id === "string" &&
    typeof file.type === "string" &&
    file.type.length > 0 &&
    typeof file.fileName === "string" &&
    typeof file.contentType === "string" &&
    typeof file.uploadedAt === "string" &&
    !!meta &&
    typeof meta === "object" &&
    (meta.folderId === null || typeof meta.folderId === "string") &&
    typeof meta.sizeBytes === "number" &&
    typeof meta.checksum === "string" &&
    typeof meta.ownerId === "string"
  );
}

export const fileStorageService = {
  async upload(file: File, options?: UploadOptions): Promise<Omit<StoredFileReference, "type">> {
    if (file.size > MAX_BYTES) {
      throw new Error(`Each file must be under ${API_UPLOAD_MAX_MB}MB`);
    }
    if (!isAllowedUploadType(file)) {
      throw new Error("Allowed types: PDF, JPEG, PNG, and DOCX");
    }

    if (!options?.applicationId) {
      throw new Error("An application is required before uploading files");
    }

    const formData = new FormData();
    formData.append("file", file);

    const path = `/api/files?${new URLSearchParams({ applicationId: options.applicationId }).toString()}`;

    const response = await apiFetch(path, {
      method: "POST",
      body: formData,
      signal: options?.signal,
    });
    const metadata = readMetadata(await response.json());

    return {
      id: metadata.id,
      fileName: metadata.fileName || file.name,
      contentType: metadata.contentType || file.type,
      status: "AVAILABLE",
      uploadedAt: metadata.createdAt,
      meta: {
        folderId: metadata.folderId,
        sizeBytes: metadata.sizeBytes || file.size,
        checksum: metadata.checksum,
        ownerId: metadata.ownerId,
      },
    };
  },

  async download(fileId: string, fallbackFileName: string): Promise<void> {
    const response = await apiFetch(`/api/files/${encodeURIComponent(fileId)}/content`, {
      method: "GET",
    });
    await saveBlobResponse(response, fallbackFileName);
  },

  async createShare(
    fileId: string,
    options?: { ttlSeconds?: number; access?: "VIEW" }
  ): Promise<FileShare> {
    const response = await apiFetch(`/api/files/${encodeURIComponent(fileId)}/shares`, {
      method: "POST",
      json: {
        ttlSeconds: options?.ttlSeconds ?? 86400,
        access: options?.access ?? "VIEW",
      },
    });
    return { token: readShareToken(await response.json()) };
  },

  async downloadShared(token: string, fallbackFileName = "download"): Promise<void> {
    const response = await apiFetch(
      `/api/files/shared/${encodeURIComponent(token)}/content`,
      { method: "GET", auth: false }
    );
    await saveBlobResponse(response, fallbackFileName);
  },

  async delete(fileId: string): Promise<void> {
    await apiFetch(`/api/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  },
};

async function apiFetch(
  path: string,
  options: {
    method: "GET" | "POST" | "DELETE";
    auth?: boolean;
    json?: unknown;
    body?: FormData;
    signal?: AbortSignal;
  }
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.auth !== false) Object.assign(headers, getApiAuthHeaders());

  let body: BodyInit | undefined;
  if (options.body) {
    body = options.body;
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method,
    headers,
    body,
    signal: options.signal,
    redirect: "manual",
    credentials: "omit",
  });

  assertStayedOnApi(response);

  if (options.auth !== false && response.status === 401) {
    redirectIfSessionExpired();
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response;
}

function assertStayedOnApi(response: Response): void {
  if (
    response.type === "opaqueredirect" ||
    response.type === "opaque" ||
    response.status === 0
  ) {
    throw new Error("The file service redirected away from the API");
  }

  if (!response.url) return;
  let host = "";
  try {
    host = new URL(response.url).hostname.toLowerCase();
  } catch {
    return;
  }
  if (isObjectStorageHost(host)) {
    throw new Error("Refusing to transfer file bytes outside the API");
  }
}

function isObjectStorageHost(host: string): boolean {
  return (
    host === "amazonaws.com" ||
    host.endsWith(".amazonaws.com") ||
    host === "cloudfront.net" ||
    host.endsWith(".cloudfront.net")
  );
}

function redirectIfSessionExpired(): void {
  if (typeof window === "undefined" || isSessionExpiredRedirectSuppressed()) return;
  const path = window.location.pathname;
  const isAuthPage =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/session-expired") ||
    path.startsWith("/apply");
  if (!isAuthPage) {
    handleSessionExpired(path);
    window.location.href = "/auth/session-expired";
  }
}

function unwrapData(body: unknown): unknown {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    "data" in body
  ) {
    return (body as { data: unknown }).data ?? body;
  }
  return body;
}

function readMetadata(body: unknown): FileMetadata {
  const data = unwrapData(body);
  if (!data || typeof data !== "object") {
    throw new Error("Upload did not return file metadata");
  }
  const meta = data as Partial<FileMetadata>;
  if (typeof meta.id !== "string" || meta.id.length === 0) {
    throw new Error("Upload did not return a file id");
  }
  if (meta.status !== "AVAILABLE") {
    throw new Error("The uploaded file is not available");
  }
  return {
    id: meta.id,
    folderId: meta.folderId === null || typeof meta.folderId === "string" ? (meta.folderId ?? null) : null,
    fileName: typeof meta.fileName === "string" ? meta.fileName : "",
    contentType: typeof meta.contentType === "string" ? meta.contentType : "",
    sizeBytes: typeof meta.sizeBytes === "number" ? meta.sizeBytes : 0,
    checksum: typeof meta.checksum === "string" ? meta.checksum : "",
    status: meta.status,
    ownerId: typeof meta.ownerId === "string" ? meta.ownerId : "",
    createdAt: typeof meta.createdAt === "string" ? meta.createdAt : new Date().toISOString(),
  };
}

function readShareToken(body: unknown): string {
  const data = unwrapData(body);
  if (data && typeof data === "object" && typeof (data as { token?: unknown }).token === "string") {
    const token = (data as { token: string }).token;
    if (token) return token;
  }
  throw new Error("The share link did not include a token");
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = unwrapData(await response.json()) as {
      message?: string;
      error?: { message?: string; details?: string[] };
    } | null;
    if (data && typeof data === "object") {
      if (data.error?.message) return data.error.message;
      if (data.message) return data.message;
      if (Array.isArray(data.error?.details) && data.error.details.length > 0) {
        return data.error.details.join("\n");
      }
    }
  } catch {
    // Response body was not JSON.
  }
  return `Request failed (${response.status || "network"})`;
}

async function saveBlobResponse(response: Response, fallbackFileName: string): Promise<void> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    throw new Error(await readErrorMessage(response));
  }

  const blob = await response.blob();
  const filename = safeDownloadName(
    filenameFromContentDisposition(response.headers.get("content-disposition")),
    fallbackFileName
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function filenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const encoded = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    const raw = encoded[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename\s*=\s*([^;]+)/i.exec(header);
  return plain?.[1]?.trim().replace(/^"|"$/g, "") || undefined;
}

function safeDownloadName(name: string | undefined, fallback: string): string {
  const base = (name ?? "").split(/[/\\]/).pop()?.trim() ?? "";
  return base || fallback || "download";
}
