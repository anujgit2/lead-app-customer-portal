import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { FilePayload, SharedLookup } from "../types";
import {
  fileNameFromContentDisposition,
  unavailableReasonFromCode,
} from "../utils/format";
import { normalizeSharedLookup, normalizeUnlock } from "./normalize";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Public client for /api/shared/**.
 * It has no auth interceptor and never reads the owner's access token.
 */
export class SharedRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly retryAfterMinutes?: number;

  constructor(status?: number, code?: string, retryAfterMinutes?: number) {
    super("Shared request failed");
    this.name = "SharedRequestError";
    this.status = status;
    this.code = code;
    this.retryAfterMinutes = retryAfterMinutes;
  }
}

const sharedClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
});

function unwrap(body: unknown): unknown {
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return (body as { data: unknown }).data ?? body;
  }
  return body;
}

function errorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  if (typeof record.code === "string") return record.code;
  if (typeof record.status === "string" && record.status !== "error") return record.status;
  const error = record.error;
  if (error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return undefined;
}

function retryAfterMinutes(data: unknown, header: unknown): number | undefined {
  const record = data && typeof data === "object" ? (unwrap(data) as Record<string, unknown>) : undefined;
  const bodyValue = record?.retryAfter ?? record?.retry_after;
  const fromBody = typeof bodyValue === "number" ? bodyValue : typeof bodyValue === "string" ? Number(bodyValue) : NaN;
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  const seconds = typeof header === "string" || typeof header === "number" ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds > 0) return Math.max(1, Math.ceil(seconds / 60));
  return undefined;
}

function asError(error: unknown): SharedRequestError {
  if (error instanceof SharedRequestError) return error;
  if (axios.isAxiosError(error)) {
    return new SharedRequestError(
      error.response?.status,
      errorCode(error.response?.data),
      retryAfterMinutes(error.response?.data, error.response?.headers?.["retry-after"])
    );
  }
  return new SharedRequestError();
}

async function send<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await sharedClient.request(config);
    return unwrap(response.data) as T;
  } catch (error) {
    throw asError(error);
  }
}

export async function lookupSharedDocument(token: string): Promise<SharedLookup> {
  try {
    const data = await send({
      url: `/api/shared/${encodeURIComponent(token)}`,
      method: "GET",
    });
    return normalizeSharedLookup(data);
  } catch (error) {
    if (error instanceof SharedRequestError && error.status === 404) {
      return { available: false, reason: "invalid" };
    }
    if (error instanceof SharedRequestError && error.status === 410) {
      return { available: false, reason: unavailableReasonFromCode(error.code) };
    }
    throw error instanceof SharedRequestError ? error : new SharedRequestError();
  }
}

export async function unlockSharedDocument(token: string, password: string): Promise<{ grant?: string }> {
  const data = await send({
    url: `/api/shared/${encodeURIComponent(token)}/unlock`,
    method: "POST",
    data: { password },
    headers: { "Content-Type": "application/json" },
  });
  return normalizeUnlock(data, token);
}

async function readSharedFile(response: AxiosResponse<Blob>, fallbackName: string): Promise<FilePayload> {
  const blob = response.data;
  const contentType = String(response.headers["content-type"] ?? blob.type ?? "");
  if (contentType.includes("json")) throw new SharedRequestError(response.status);
  const header = response.headers["content-disposition"];
  return {
    blob,
    contentType,
    fileName: fileNameFromContentDisposition(typeof header === "string" ? header : undefined) || fallbackName,
  };
}

async function fetchSharedBlob(path: string, grant?: string, fallbackName = "document"): Promise<FilePayload> {
  try {
    const response = await sharedClient.get<Blob>(path, {
      responseType: "blob",
      timeout: 120_000,
      headers: grant ? { "X-Share-Grant": grant } : undefined,
    });
    return await readSharedFile(response, fallbackName);
  } catch (error) {
    if (error instanceof SharedRequestError) throw error;
    if (axios.isAxiosError(error)) {
      throw new SharedRequestError(error.response?.status, errorCode(error.response?.data));
    }
    throw new SharedRequestError();
  }
}

export function fetchSharedView(token: string, grant?: string): Promise<FilePayload> {
  return fetchSharedBlob(`/api/shared/${encodeURIComponent(token)}/view`, grant);
}

export function fetchSharedDownload(token: string, grant?: string): Promise<FilePayload> {
  return fetchSharedBlob(`/api/shared/${encodeURIComponent(token)}/download`, grant);
}

export interface SharedBundleMeta {
  status: "valid" | "expired" | "revoked";
  documentCount: number;
  senderName?: string;
  expiresAt?: string;
}

export interface SharedBundleDocument {
  id: string;
  name: string;
  typeName: string;
  tag?: string;
}

export interface SharedVerifyResult {
  otpRequired: boolean;
  maskedEmail: string;
}

export interface SharedOtpResult {
  accessToken: string;
  expiresIn?: number;
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function recordOf(value: unknown): Record<string, unknown> {
  const data = unwrap(value);
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function field(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = textValue(record[key]);
    if (value) return value;
  }
  return "";
}

export async function fetchSharedBundleMeta(token: string): Promise<SharedBundleMeta> {
  const data = await send<unknown>({
    url: `/api/shared/${encodeURIComponent(token)}/meta`,
    method: "GET",
  });
  const record = recordOf(data);
  const status = field(record, ["status"]).toLowerCase();
  const count = Number(record.documentCount ?? record.count ?? 0);
  return {
    status: status === "valid" ? "valid" : status === "revoked" ? "revoked" : "expired",
    documentCount: Number.isFinite(count) ? count : 0,
    senderName: field(record, ["senderName", "sharedBy", "ownerName"]) || undefined,
    expiresAt: field(record, ["expiresAt", "expiry"]) || undefined,
  };
}

export async function verifySharedEmail(token: string, email: string): Promise<SharedVerifyResult> {
  const data = await send<unknown>({
    url: `/api/shared/${encodeURIComponent(token)}/verify`,
    method: "POST",
    data: { email },
    headers: { "Content-Type": "application/json" },
  });
  const record = recordOf(data);
  return {
    otpRequired: record.otpRequired !== false,
    maskedEmail: field(record, ["maskedEmail", "emailMasked"]) || email,
  };
}

export async function verifySharedOtp(token: string, email: string, code: string): Promise<SharedOtpResult> {
  const data = await send<unknown>({
    url: `/api/shared/${encodeURIComponent(token)}/otp/verify`,
    method: "POST",
    data: { email, code },
    headers: { "Content-Type": "application/json" },
  });
  const record = recordOf(data);
  const accessToken = field(record, ["accessToken", "token"]);
  if (!accessToken) throw new SharedRequestError(401);
  const expiresIn = Number(record.expiresIn);
  return { accessToken, expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined };
}

function bundleDocuments(data: unknown): SharedBundleDocument[] {
  const unwrapped = unwrap(data);
  const list = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray((unwrapped as { documents?: unknown })?.documents)
      ? ((unwrapped as { documents: unknown[] }).documents)
      : Array.isArray((unwrapped as { items?: unknown })?.items)
        ? ((unwrapped as { items: unknown[] }).items)
        : [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = field(record, ["id", "documentId"]);
    const name = field(record, ["name", "fileName", "documentName", "title"]);
    if (!id || !name) return [];
    const tag = field(record, ["tag", "label"]);
    return [
      {
        id,
        name,
        typeName: field(record, ["typeName", "type", "documentType"]) || name,
        tag: tag || undefined,
      },
    ];
  });
}

export async function fetchSharedBundleDocuments(
  token: string,
  accessToken: string
): Promise<SharedBundleDocument[]> {
  const data = await send<unknown>({
    url: `/api/shared/${encodeURIComponent(token)}/documents`,
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return bundleDocuments(data);
}

async function fileFromAuthorizedResponse(
  response: AxiosResponse<Blob>,
  fallbackName: string
): Promise<FilePayload> {
  if (response.status === 401) throw new SharedRequestError(401);
  if (response.status >= 400) throw new SharedRequestError(response.status);
  const contentType = String(response.headers["content-type"] ?? response.data.type ?? "");
  if (contentType.includes("json")) {
    const parsed = JSON.parse(await response.data.text()) as unknown;
    const record = recordOf(parsed);
    const signedUrl = field(record, ["url", "downloadUrl", "href"]);
    if (!signedUrl) throw new SharedRequestError(response.status);
    const downloaded = await fetch(signedUrl);
    if (!downloaded.ok) throw new SharedRequestError(downloaded.status);
    const blob = await downloaded.blob();
    return {
      blob,
      contentType: blob.type,
      fileName: field(record, ["fileName", "filename"]) || fallbackName,
    };
  }
  return readSharedFile(response, fallbackName);
}

async function authorizedFile(path: string, accessToken: string, fallbackName: string): Promise<FilePayload> {
  try {
    const response = await sharedClient.get<Blob>(path, {
      responseType: "blob",
      timeout: 120_000,
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: () => true,
    });
    return await fileFromAuthorizedResponse(response, fallbackName);
  } catch (error) {
    throw asError(error);
  }
}

export function downloadSharedBundleDocument(
  token: string,
  documentId: string,
  accessToken: string,
  fallbackName: string
): Promise<FilePayload> {
  return authorizedFile(
    `/api/shared/${encodeURIComponent(token)}/documents/${encodeURIComponent(documentId)}/download`,
    accessToken,
    fallbackName
  );
}

export function downloadAllSharedDocuments(token: string, accessToken: string): Promise<FilePayload> {
  return authorizedFile(`/api/shared/${encodeURIComponent(token)}/documents/download`, accessToken, "documents.zip");
}

export async function requestNewSharedLink(token: string): Promise<void> {
  await send({
    url: `/api/shared/${encodeURIComponent(token)}/request-new`,
    method: "POST",
  });
}
