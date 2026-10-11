import type { LinkedDocumentProfile } from "@/types";
import { toPublicShareLink } from "../shared-recipient/links";
import type {
  ActivityPage,
  CreateShareResult,
  DigiLockerConnection,
  DigiLockerDocument,
  DocumentDetail,
  DocumentSource,
  DocumentType,
  DocumentVersion,
  PortalDocument,
  ShareActivity,
  ShareEventType,
  ShareSummary,
  SharedLookup,
  VersionPreview,
} from "../types";
import { deriveShareStatus, maskContact, sortShares } from "../utils/format";

const SHARE_EVENTS = new Set<ShareEventType>([
  "SHARED",
  "LINK_SENT",
  "VIEWED",
  "DOWNLOADED",
  "REVOKED",
  "ACCESS_DENIED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(obj[key]);
    if (value) return value;
  }
  return "";
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function pickBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

export function asList(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  return [];
}

export function normalizeSource(value: string): DocumentSource {
  if (value.toUpperCase().replace(/[\s-]+/g, "_").includes("DIGI")) return "DIGILOCKER";
  return "UPLOADED";
}

function fileNameFromRecord(raw: Record<string, unknown>, typeName: string): string | undefined {
  const direct = pick(raw, ["fileName", "filename", "originalFileName", "originalFilename", "originalName"]);
  if (direct) return direct;

  const fromObject = (value: unknown): string => {
    if (!isRecord(value)) return "";
    return pick(value, ["fileName", "filename", "originalFileName", "originalFilename", "originalName"]);
  };

  for (const key of ["file", "latestFile", "currentFile"]) {
    const name = fromObject(raw[key]);
    if (name) return name;
  }

  const fromLatest = fromObject(raw.latestVersion ?? raw.currentVersion);
  if (fromLatest) return fromLatest;

  const versions = Array.isArray(raw.versions) ? raw.versions : Array.isArray(raw.history) ? raw.history : [];
  let bestName = "";
  let bestVersion = -1;
  for (const item of versions) {
    const name = fromObject(item);
    if (!name || !isRecord(item)) continue;
    const version = pickNumber(item, ["version", "versionNo", "versionNumber", "number"]) ?? 0;
    const latest = pickBoolean(item, ["latest", "isLatest"]) === true;
    const rank = latest ? Number.MAX_SAFE_INTEGER : version;
    if (rank >= bestVersion) {
      bestName = name;
      bestVersion = rank;
    }
  }
  if (bestName) return bestName;

  const named = pick(raw, ["name"]);
  if (named && named !== typeName) return named;
  return undefined;
}

function typeInfo(raw: Record<string, unknown>): { typeId: string; typeName: string; category: string } {
  const nested = raw.type ?? raw.documentType;
  if (isRecord(nested)) {
    return {
      typeId: pick(nested, ["id", "code"]) || pick(raw, ["typeId", "documentTypeId"]),
      typeName: pick(nested, ["name", "label"]) || pick(raw, ["typeName", "typeLabel"]),
      category: pick(nested, ["category", "categoryName"]) || pick(raw, ["category", "categoryName", "categoryCode"]),
    };
  }
  return {
    typeId: pick(raw, ["typeId", "documentTypeId"]),
    typeName:
      pick(raw, ["typeName", "typeLabel", "documentTypeName"]) ||
      (typeof raw.type === "string" ? text(raw.type) : "") ||
      pick(raw, ["name"]),
    category: pick(raw, ["category", "categoryName", "categoryCode"]),
  };
}

export function normalizeDocument(raw: unknown): PortalDocument | null {
  if (!isRecord(raw)) return null;
  const id = pick(raw, ["id", "documentId"]);
  if (!id) return null;
  const info = typeInfo(raw);
  const sourceText = pick(raw, ["source", "origin"]);
  return {
    id,
    typeId: info.typeId,
    typeName: info.typeName || "Document",
    label: pick(raw, ["label", "displayLabel"]),
    category: info.category || "Other",
    latestVersion: pickNumber(raw, ["latestVersion", "currentVersion", "version"]) ?? 1,
    source: sourceText ? normalizeSource(sourceText) : "UPLOADED",
    updatedAt: pick(raw, ["updatedAt", "modifiedAt", "createdAt"]),
    fileName: fileNameFromRecord(raw, info.typeName),
    contentType: pick(raw, ["contentType", "mimeType"]) || undefined,
    sizeBytes: pickNumber(raw, ["sizeBytes", "size"]),
    linked: normalizeLinkedProfiles(raw.profiles ?? raw.linked),
  };
}

function normalizeLinkedProfiles(value: unknown): LinkedDocumentProfile[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const linked: LinkedDocumentProfile[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const profileId = text(item.profileId);
    const type = item.type === "INDIVIDUAL" || item.type === "BUSINESS" ? item.type : null;
    const relation = item.relation === "RELATED_TO" || item.relation === "FOR" ? item.relation : null;
    if (!profileId || !type || !relation) continue;
    linked.push({
      profileId,
      displayName: text(item.displayName),
      type,
      relation,
    });
  }
  return linked;
}

export function normalizeDocumentList(data: unknown): PortalDocument[] {
  return asList(data, ["items", "documents", "content", "results"])
    .map((item) => normalizeDocument(item))
    .filter((item): item is PortalDocument => item !== null);
}

export function normalizeDocumentType(raw: unknown): DocumentType | null {
  if (!isRecord(raw)) return null;
  const id = pick(raw, ["id", "code", "typeId"]);
  const name = pick(raw, ["name", "label", "typeName"]);
  if (!id || !name) return null;
  return {
    id,
    name,
    category: pick(raw, ["category", "categoryName", "categoryCode"]) || "Other",
    requiresLabel: pickBoolean(raw, ["requiresLabel", "labelRequired"]) ?? false,
    labelHint: pick(raw, ["labelHint", "labelPlaceholder", "labelExample", "example"]) || undefined,
  };
}

export function normalizeDocumentTypes(data: unknown): DocumentType[] {
  return asList(data, ["items", "types", "content", "results"])
    .map((item) => normalizeDocumentType(item))
    .filter((item): item is DocumentType => item !== null);
}

function normalizeVersion(raw: unknown): DocumentVersion | null {
  if (!isRecord(raw)) return null;
  const version = pickNumber(raw, ["version", "versionNo", "versionNumber", "number"]);
  if (version === undefined) return null;
  const sourceText = pick(raw, ["source", "origin"]);
  const actor = pick(raw, ["createdBy", "actorName", "fetchedBy", "uploadedBy"]);
  return {
    version,
    createdAt: pick(raw, ["createdAt", "uploadedAt", "fetchedAt", "updatedAt"]),
    createdBy: displayActor(actor),
    source: sourceText ? normalizeSource(sourceText) : "UPLOADED",
    sizeBytes: pickNumber(raw, ["sizeBytes", "size", "fileSize"]) ?? 0,
    fileName: pick(raw, ["fileName", "filename"]) || "document",
    contentType: pick(raw, ["contentType", "mimeType", "mime"]),
    latest: pickBoolean(raw, ["latest", "isLatest"]) ?? false,
  };
}

function displayActor(value: string): string | undefined {
  if (!value) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return undefined;
  }
  return value;
}

function finalizeVersions(versions: DocumentVersion[]): DocumentVersion[] {
  if (versions.length === 0) return versions;
  const max = Math.max(...versions.map((version) => version.version));
  const flagged = versions.some((version) => version.latest);
  return versions
    .map((version) => ({
      ...version,
      latest: flagged ? version.latest : version.version === max,
    }))
    .sort((left, right) => right.version - left.version);
}

export function normalizeDocumentDetail(raw: unknown): DocumentDetail | null {
  const base = normalizeDocument(raw);
  if (!base || !isRecord(raw)) return null;
  const list = Array.isArray(raw.versions)
    ? raw.versions
    : Array.isArray(raw.history)
      ? raw.history
      : [];
  let versions = finalizeVersions(
    list.map((item) => normalizeVersion(item)).filter((item): item is DocumentVersion => item !== null)
  );
  if (versions.length === 0) {
    versions = [
      {
        version: base.latestVersion || 1,
        createdAt: base.updatedAt,
        source: base.source,
        sizeBytes: base.sizeBytes ?? 0,
        fileName: base.fileName || "document",
        contentType: base.contentType || "",
        latest: true,
      },
    ];
  }
  const latest = versions.find((version) => version.latest) ?? versions[0];
  const sourceText = pick(raw, ["source", "origin"]);
  return {
    ...base,
    latestVersion: latest?.version ?? base.latestVersion,
    fileName: base.fileName || latest?.fileName,
    contentType: base.contentType || latest?.contentType,
    sizeBytes: base.sizeBytes ?? latest?.sizeBytes,
    source: sourceText ? normalizeSource(sourceText) : (latest?.source ?? base.source),
    versions,
  };
}

export function normalizeVersionPreview(data: unknown): VersionPreview | null {
  if (!isRecord(data)) return null;
  const nextVersion = pickNumber(data, ["nextVersion", "willBeVersion", "version", "targetVersion"]);
  if (nextVersion === undefined || nextVersion < 1) return null;
  const documentId = pick(data, ["documentId", "existingDocumentId"]);
  return { nextVersion, documentId: documentId || undefined };
}

function shareLink(raw: Record<string, unknown>): string | undefined {
  const token = pick(raw, ["token", "shareToken"]);
  const rawUrl = pick(raw, ["url", "shareUrl", "link", "href"]);
  if (!token && !rawUrl) return undefined;
  const publicUrl = toPublicShareLink(rawUrl, token || undefined);
  return publicUrl || undefined;
}

export function normalizeShare(raw: unknown, now = Date.now()): ShareSummary | null {
  if (!isRecord(raw)) return null;
  const id = pick(raw, ["id", "shareId"]);
  if (!id) return null;
  const delivery = pick(raw, ["delivery", "deliveryMode"]).toUpperCase();
  const email = maskContact(pick(raw, ["emailMasked", "maskedEmail", "email"]));
  const phone = maskContact(pick(raw, ["phoneMasked", "maskedPhone", "phone"]));
  return {
    id,
    recipientName: pick(raw, ["recipientName", "name"]) || "Recipient",
    status: deriveShareStatus(
      {
        status: pick(raw, ["status"]),
        expiresAt: pick(raw, ["expiresAt", "expiry", "expires"]),
        revokedAt: pick(raw, ["revokedAt"]) || null,
      },
      now
    ),
    email,
    phone,
    linkOnly:
      pickBoolean(raw, ["linkOnly"]) === true || delivery === "LINK_ONLY" || delivery === "NONE",
    version: pickNumber(raw, ["version", "versionNumber"]),
    expiresAt: pick(raw, ["expiresAt", "expiry", "expires"]),
    createdAt: pick(raw, ["createdAt", "sharedAt"]),
    viewCount: pickNumber(raw, ["viewCount", "views"]) ?? 0,
    downloadCount: pickNumber(raw, ["downloadCount", "downloads"]) ?? 0,
    lastOpenedAt: pick(raw, ["lastOpenedAt", "lastViewedAt"]) || undefined,
    url: shareLink(raw),
  };
}

export function normalizeShares(data: unknown, now = Date.now()): ShareSummary[] {
  const shares = asList(data, ["items", "shares", "content", "results"])
    .map((item) => normalizeShare(item, now))
    .filter((item): item is ShareSummary => item !== null);
  return sortShares(shares);
}

export function normalizeActivity(raw: unknown, index: number): ShareActivity | null {
  if (!isRecord(raw)) return null;
  const eventType = pick(raw, ["eventType", "type", "event"]).toUpperCase();
  if (!SHARE_EVENTS.has(eventType as ShareEventType)) return null;
  const occurredAt = pick(raw, ["occurredAt", "createdAt", "timestamp", "at"]);
  return {
    id: pick(raw, ["id"]) || `${eventType}:${occurredAt}:${index}`,
    eventType: eventType as ShareEventType,
    occurredAt,
    channel: pick(raw, ["channel", "via"]) || undefined,
    contactMasked: maskContact(pick(raw, ["contactMasked", "maskedContact", "contact", "destination"])),
    reason: pick(raw, ["reason", "detail"]) || undefined,
  };
}

export function normalizeActivityPage(data: unknown): ActivityPage {
  const items = asList(data, ["items", "events", "activity", "content", "results"])
    .map((item, index) => normalizeActivity(item, index))
    .filter((item): item is ShareActivity => item !== null);
  const record = isRecord(data) ? data : {};
  return { items, nextCursor: pick(record, ["nextCursor", "cursor", "next"]) || null };
}

export function normalizeCreateShareResult(data: unknown): CreateShareResult {
  const record = isRecord(data) ? data : {};
  const delivery = pick(record, ["delivery"]).toUpperCase();
  return {
    id: pick(record, ["id", "shareId"]) || undefined,
    url: pick(record, ["url", "shareUrl", "link", "href"]),
    token: pick(record, ["token", "shareToken"]) || undefined,
    sentTo: pick(record, ["sentTo", "deliveredTo"]) || undefined,
    linkOnly: pickBoolean(record, ["linkOnly"]) === true || delivery === "LINK_ONLY" || delivery === "NONE",
  };
}

export function normalizeSharedLookup(data: unknown): SharedLookup {
  const record = isRecord(data) ? data : {};
  const status = pick(record, ["status", "state"]).toUpperCase();
  if (status === "EXPIRED" || status.includes("EXPIRE")) return { available: false, reason: "expired" };
  if (status === "REVOKED" || status.includes("REVOKE")) return { available: false, reason: "revoked" };
  if (pickBoolean(record, ["available"]) === false) return { available: false, reason: "invalid" };
  return {
    available: true,
    meta: {
      documentName: pick(record, ["documentName", "name", "title", "fileName"]) || "Shared document",
      sharedBy: pick(record, ["sharedBy", "ownerName", "sharedByName"]) || undefined,
      expiresAt: pick(record, ["expiresAt", "expiry"]) || undefined,
      requiresPassword: pickBoolean(record, ["passwordRequired", "requiresPassword", "protected"]) ?? false,
      allowDownload: pickBoolean(record, ["allowDownload", "downloadAllowed"]) ?? false,
      contentType: pick(record, ["contentType", "mimeType"]) || undefined,
      fileName: pick(record, ["fileName", "filename"]) || undefined,
    },
  };
}

export function normalizeUnlock(data: unknown, shareToken: string): { grant?: string } {
  const record = isRecord(data) ? data : {};
  const grant = pick(record, ["grant", "accessToken", "shareAccessToken"]);
  if (!grant || grant === shareToken) return {};
  return { grant };
}

export function normalizeDigiLockerConnection(data: unknown): DigiLockerConnection {
  const record = isRecord(data) ? data : {};
  const status = pick(record, ["status"]).toUpperCase();
  return {
    connected: pickBoolean(record, ["connected"]) ?? (status === "CONNECTED" || status === "ACTIVE"),
    authorizationUrl: pick(record, ["authorizationUrl", "authUrl", "url"]) || undefined,
  };
}

export function normalizeDigiLockerDocuments(data: unknown): DigiLockerDocument[] {
  const documents: DigiLockerDocument[] = [];
  for (const item of asList(data, ["items", "documents", "content", "results"])) {
    if (!isRecord(item)) continue;
    const id = pick(item, ["id", "uri", "documentId"]);
    const name = pick(item, ["name", "title", "docName", "description"]);
    if (!id || !name) continue;
    const document: DigiLockerDocument = { id, name };
    const issuer = pick(item, ["issuer", "issuerName", "provider"]);
    const issuedAt = pick(item, ["issuedAt", "issuedOn", "date"]);
    if (issuer) document.issuer = issuer;
    if (issuedAt) document.issuedAt = issuedAt;
    documents.push(document);
  }
  return documents;
}
