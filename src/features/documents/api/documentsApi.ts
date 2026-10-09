import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { parseApiError } from "@/lib/api-error";
import apiClient from "@/lib/axios";
import type {
  ActivityPage,
  CreateShareBody,
  CreateShareResult,
  DigiLockerConnection,
  DigiLockerDocument,
  DocumentDetail,
  DocumentFilters,
  DocumentType,
  FilePayload,
  ImportDocumentInput,
  PortalDocument,
  PreviewVersionInput,
  VersionPreview,
} from "../types";
import { fileNameFromContentDisposition } from "../utils/format";
import {
  normalizeActivityPage,
  normalizeCreateShareResult,
  normalizeDigiLockerConnection,
  normalizeDigiLockerDocuments,
  normalizeDocumentDetail,
  normalizeDocumentList,
  normalizeDocumentTypes,
  normalizeVersionPreview,
  normalizeShares,
} from "./normalize";
import type { ShareSummary } from "../types";

function contentDisposition(response: AxiosResponse): string | undefined {
  const header = response.headers["content-disposition"];
  return typeof header === "string" ? header : undefined;
}

async function readFile(response: AxiosResponse<Blob>, fallbackName: string): Promise<FilePayload> {
  const blob = response.data;
  const contentType = String(response.headers["content-type"] ?? blob.type ?? "");
  if (contentType.includes("json")) {
    throw new Error("Download failed. Please try again.");
  }
  return {
    blob,
    contentType,
    fileName: fileNameFromContentDisposition(contentDisposition(response)) || fallbackName,
  };
}

export async function listDocuments(params: DocumentFilters = {}): Promise<PortalDocument[]> {
  const response = await apiClient.get("/api/documents", {
    params: {
      ...(params.category ? { category: params.category } : {}),
      ...(params.q ? { q: params.q } : {}),
    },
  });
  return normalizeDocumentList(response.data);
}

export async function getDocument(id: string): Promise<DocumentDetail | null> {
  const response = await apiClient.get(`/api/documents/${encodeURIComponent(id)}`);
  return normalizeDocumentDetail(response.data);
}

export async function getTypes(): Promise<DocumentType[]> {
  const response = await apiClient.get("/api/document-types");
  return normalizeDocumentTypes(response.data);
}

export async function previewVersion(body: PreviewVersionInput): Promise<VersionPreview | null> {
  const response = await apiClient.post("/api/documents/preview", {
    typeId: body.typeId,
    ...(body.label ? { label: body.label } : {}),
    ...(body.documentId ? { documentId: body.documentId } : {}),
  });
  return normalizeVersionPreview(response.data);
}

export async function uploadDocument(
  formData: FormData,
  idemKey: string,
  onProgress: (percent: number) => void
): Promise<PortalDocument | null> {
  const response = await apiClient.post("/api/documents", formData, {
    headers: { "Idempotency-Key": idemKey },
    timeout: 120_000,
    transformRequest: [
      (data: FormData, headers) => {
        if (headers && typeof headers.delete === "function") {
          headers.delete("Content-Type");
        }
        return data;
      },
    ],
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
    },
  });
  return normalizeDocumentList([response.data])[0] ?? null;
}

export async function downloadDocumentFile(
  documentId: string,
  version: number,
  fallbackName = "document"
): Promise<FilePayload> {
  const response = await apiClient.get(
    `/api/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(String(version))}/download`,
    { responseType: "blob", timeout: 120_000 }
  );
  return readFile(response, fallbackName);
}

export async function createShare(id: string, body: CreateShareBody): Promise<CreateShareResult> {
  const payload: CreateShareBody = {
    recipientName: body.recipientName,
    expiresInDays: body.expiresInDays,
    allowDownload: body.allowDownload,
    ...(body.email ? { email: body.email } : {}),
    ...(body.phone ? { phone: body.phone } : {}),
    ...(body.password ? { password: body.password } : {}),
  };
  const response = await apiClient.post(`/api/documents/${encodeURIComponent(id)}/shares`, payload);
  return normalizeCreateShareResult(response.data);
}

export async function listShares(id: string): Promise<ShareSummary[]> {
  const response = await apiClient.get(`/api/documents/${encodeURIComponent(id)}/shares`);
  return normalizeShares(response.data);
}

export async function getActivity(
  id: string,
  shareId: string,
  cursor?: string
): Promise<ActivityPage> {
  const response = await apiClient.get(
    `/api/documents/${encodeURIComponent(id)}/shares/${encodeURIComponent(shareId)}/activity`,
    { params: cursor ? { cursor } : {} }
  );
  return normalizeActivityPage(response.data);
}

export async function revokeShare(id: string, shareId: string): Promise<void> {
  await apiClient.delete(
    `/api/documents/${encodeURIComponent(id)}/shares/${encodeURIComponent(shareId)}`
  );
}

export async function getDigiLockerConnection(returnUrl: string): Promise<DigiLockerConnection> {
  try {
    const response = await apiClient.get("/api/integrations/digilocker/connection", {
      params: { returnUrl },
    });
    return normalizeDigiLockerConnection(response.data);
  } catch (error) {
    if (parseApiError(error).status === 404) return { connected: false };
    throw error;
  }
}

export async function getDigiLockerAuthorizationUrl(returnUrl: string): Promise<string> {
  const config: AxiosRequestConfig = {
    params: { returnUrl },
  };
  const response = await apiClient.get("/api/integrations/digilocker/connect", config);
  const connection = normalizeDigiLockerConnection(response.data);
  return connection.authorizationUrl ?? "";
}

export async function listDigiLockerDocuments(): Promise<DigiLockerDocument[]> {
  const response = await apiClient.get("/api/integrations/digilocker/documents");
  return normalizeDigiLockerDocuments(response.data);
}

export async function importDocument(input: ImportDocumentInput, idemKey: string): Promise<void> {
  await apiClient.post(
    "/api/documents/import",
    {
      source: "DIGILOCKER",
      sourceDocumentId: input.sourceDocumentId,
      typeId: input.typeId,
      ...(input.label ? { label: input.label } : {}),
    },
    { headers: { "Idempotency-Key": idemKey } }
  );
}
