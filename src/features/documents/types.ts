import type { DocumentProfileRelation, LinkedDocumentProfile } from "@/types";

export type DocumentSource = "UPLOADED" | "DIGILOCKER";

export type ShareStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type ShareEventType =
  | "SHARED"
  | "LINK_SENT"
  | "VIEWED"
  | "DOWNLOADED"
  | "REVOKED"
  | "ACCESS_DENIED";

export interface DocumentFilters {
  category?: string;
  q?: string;
  profileId?: string;
  relation?: DocumentProfileRelation;
}

export interface PortalDocument {
  id: string;
  typeId: string;
  typeName: string;
  label: string;
  category: string;
  latestVersion: number;
  source: DocumentSource;
  updatedAt: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  linked?: LinkedDocumentProfile[];
}

export interface DocumentVersion {
  version: number;
  createdAt: string;
  createdBy?: string;
  source: DocumentSource;
  sizeBytes: number;
  fileName: string;
  contentType: string;
  latest: boolean;
}

export interface DocumentDetail extends PortalDocument {
  versions: DocumentVersion[];
}

export interface DocumentType {
  id: string;
  name: string;
  category: string;
  requiresLabel: boolean;
  labelHint?: string;
}

export interface VersionPreview {
  nextVersion: number;
  documentId?: string;
}

export interface PreviewVersionInput {
  typeId: string;
  label?: string;
  documentId?: string;
}

export interface UploadSubmission {
  file: File;
  typeId: string;
  label: string;
  documentId?: string;
  asNewDocument?: boolean;
  profileId?: string;
  relation?: DocumentProfileRelation;
}

export interface ShareSummary {
  id: string;
  recipientName: string;
  status: ShareStatus;
  email?: string;
  phone?: string;
  linkOnly: boolean;
  version?: number;
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  downloadCount: number;
  lastOpenedAt?: string;
  url?: string;
}

export interface ShareActivity {
  id: string;
  eventType: ShareEventType;
  occurredAt: string;
  channel?: string;
  contactMasked?: string;
  reason?: string;
}

export interface ActivityPage {
  items: ShareActivity[];
  nextCursor: string | null;
}

export interface CreateShareBody {
  recipientName: string;
  email?: string;
  phone?: string;
  expiresInDays: 1 | 7 | 30;
  allowDownload: boolean;
  password?: string;
}

export interface CreateShareResult {
  id?: string;
  url: string;
  token?: string;
  sentTo?: string;
  linkOnly: boolean;
}

export interface SharedDocumentMeta {
  documentName: string;
  sharedBy?: string;
  expiresAt?: string;
  requiresPassword: boolean;
  allowDownload: boolean;
  contentType?: string;
  fileName?: string;
}

export type UnavailableReason = "expired" | "revoked" | "invalid";

export type SharedLookup =
  | { available: true; meta: SharedDocumentMeta }
  | { available: false; reason: UnavailableReason };

export interface DigiLockerConnection {
  connected: boolean;
  authorizationUrl?: string;
}

export interface DigiLockerDocument {
  id: string;
  name: string;
  issuer?: string;
  issuedAt?: string;
}

export interface ImportDocumentInput {
  sourceDocumentId: string;
  typeId: string;
  label?: string;
}

export interface FilePayload {
  blob: Blob;
  contentType: string;
  fileName?: string;
}
