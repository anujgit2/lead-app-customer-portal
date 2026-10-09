import type {
  PortalDocument,
  ShareActivity,
  ShareStatus,
  UnavailableReason,
} from "../types";
import { CATEGORY_FILTERS } from "./constants";
import { toE164 } from "./phone";

const CATEGORY_ALIASES: Record<string, string> = {
  all: "ALL",
  financials: "FINANCIALS",
  financial: "FINANCIALS",
  "legal & corporate": "LEGAL",
  "legal and corporate": "LEGAL",
  legal: "LEGAL",
  corporate: "LEGAL",
  taxation: "TAXATION",
  tax: "TAXATION",
  identity: "IDENTITY",
  kyc: "IDENTITY",
};

export function categoryKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return (
    CATEGORY_ALIASES[normalized] ??
    normalized
      .toUpperCase()
      .replace(/&/g, "AND")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

export function categoryLabel(id: string, fallback?: string): string {
  return CATEGORY_FILTERS.find((item) => item.id === id)?.label ?? fallback ?? id;
}

export function categoryFiltersFor(values: string[]): { id: string; label: string }[] {
  const base = CATEGORY_FILTERS.map((item) => ({ id: item.id, label: item.label }));
  const known = new Set<string>(base.map((item) => item.id));
  const extras = new Map<string, string>();
  for (const value of values) {
    const key = categoryKey(value);
    if (!key || key === "ALL" || known.has(key) || extras.has(key)) continue;
    extras.set(key, value.trim());
  }
  return [...base, ...[...extras.entries()].map(([id, label]) => ({ id, label }))];
}

export function filterDocuments(
  documents: PortalDocument[],
  filters: { category?: string; q?: string }
): PortalDocument[] {
  const query = filters.q?.trim().toLowerCase() ?? "";
  return documents.filter((document) => {
    if (filters.category && categoryKey(document.category) !== filters.category) return false;
    if (!query) return true;
    return `${document.typeName} ${document.label}`.toLowerCase().includes(query);
  });
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return trimmed;
  if (local.length === 1) return `${local}****@${domain}`;
  return `${local[0]}****${local[local.length - 1]}@${domain}`;
}

export function maskPhone(phone: string): string {
  const compact = phone.trim();
  if (!compact || compact.includes("*")) return compact;
  const e164 = toE164(compact);
  if (!e164) return compact;
  if (e164.startsWith("+91") && e164.length === 13) {
    const national = e164.slice(3);
    return `+91 ${national.slice(0, 2)}***${national.slice(-5)}`;
  }
  const countryLength = Math.max(2, e164.length - 7);
  const country = e164.slice(0, countryLength);
  const rest = e164.slice(countryLength);
  if (rest.length < 4) return e164;
  return `${country}***${rest.slice(-4)}`;
}

export function maskContact(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("*")) return trimmed;
  if (trimmed.includes("@")) return maskEmail(trimmed);
  return maskPhone(trimmed);
}

export function formatDisplayDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDisplayDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.round(Math.max(0, now - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDisplayDate(value);
}

export function formatShareCounts(
  input: { viewCount: number; downloadCount: number; lastOpenedAt?: string },
  now = Date.now()
): string {
  const views = `${input.viewCount} ${input.viewCount === 1 ? "view" : "views"}`;
  const downloads = `${input.downloadCount} ${input.downloadCount === 1 ? "download" : "downloads"}`;
  const parts = [views, downloads];
  if (input.lastOpenedAt) {
    const relative = formatRelativeTime(input.lastOpenedAt, now);
    if (relative) parts.push(`last opened ${relative}`);
  }
  return parts.join(" · ");
}

export function formatVersionLabel(version: number, latest = false, style: "list" | "detail" = "list"): string {
  if (!latest) return `v${version}`;
  return style === "detail" ? `v${version} (Latest)` : `v${version} Latest`;
}

export function deriveShareStatus(
  input: { status?: string; expiresAt?: string; revokedAt?: string | null },
  now = Date.now()
): ShareStatus {
  const raw = (input.status ?? "").toUpperCase();
  if (raw === "REVOKED" || input.revokedAt) return "REVOKED";
  if (raw === "EXPIRED") return "EXPIRED";
  if (input.expiresAt) {
    const time = new Date(input.expiresAt).getTime();
    if (!Number.isNaN(time) && time <= now) return "EXPIRED";
  }
  return "ACTIVE";
}

export function sortShares<T extends { status: ShareStatus; createdAt: string }>(shares: T[]): T[] {
  return [...shares].sort((left, right) => {
    const rank = (status: ShareStatus) => (status === "ACTIVE" ? 0 : 1);
    const byStatus = rank(left.status) - rank(right.status);
    if (byStatus !== 0) return byStatus;
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

function channelLabel(channel?: string): string {
  switch ((channel ?? "").toUpperCase()) {
    case "EMAIL":
      return "email";
    case "SMS":
    case "PHONE":
    case "TEXT":
      return "text message";
    case "WHATSAPP":
      return "WhatsApp";
    default:
      return channel ? channel.toLowerCase() : "message";
  }
}

function friendlyReason(reason: string): string {
  const key = reason.trim().toUpperCase().replace(/\s+/g, "_");
  const known: Record<string, string> = {
    WRONG_PASSWORD: "incorrect password",
    INVALID_PASSWORD: "incorrect password",
    EXPIRED: "link expired",
    REVOKED: "access revoked",
    LOCKED: "too many attempts",
  };
  if (known[key]) return known[key];
  if (/^[A-Z0-9_]+$/.test(key)) return key.toLowerCase().replace(/_/g, " ");
  return reason.trim();
}

export function activityEventLabel(event: Pick<ShareActivity, "eventType" | "channel" | "reason">): string {
  switch (event.eventType) {
    case "SHARED":
      return "Link created";
    case "LINK_SENT":
      return `Link sent by ${channelLabel(event.channel)}`;
    case "VIEWED":
      return "Viewed";
    case "DOWNLOADED":
      return "Downloaded";
    case "REVOKED":
      return "Access revoked";
    case "ACCESS_DENIED":
      return event.reason
        ? `Blocked access attempt (${friendlyReason(event.reason)})`
        : "Blocked access attempt";
    default:
      return "Activity";
  }
}

export function previewKind(contentType: string, fileName: string): "pdf" | "image" | null {
  const type = contentType.toLowerCase();
  const name = fileName.toLowerCase();
  if (
    type.includes("html") ||
    type.includes("svg") ||
    name.endsWith(".html") ||
    name.endsWith(".htm") ||
    name.endsWith(".svg")
  ) {
    return null;
  }
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(name)) return "image";
  return null;
}

export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim() ?? "";
  if (!base || base === "." || base === "..") return "document";
  return base.slice(0, 180);
}

export function fileNameFromContentDisposition(header?: string | null): string | undefined {
  if (!header) return undefined;
  const encoded = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    const raw = encoded[1].trim().replace(/^"|"$/g, "");
    try {
      return safeFileName(decodeURIComponent(raw));
    } catch {
      return safeFileName(raw);
    }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted?.[1]) return safeFileName(quoted[1]);
  const plain = /filename\s*=\s*([^;]+)/i.exec(header);
  if (plain?.[1]) return safeFileName(plain[1].trim().replace(/^"|"$/g, ""));
  return undefined;
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function unavailableReasonFromCode(code?: string): UnavailableReason {
  const upper = (code ?? "").toUpperCase();
  if (upper.includes("EXPIRE")) return "expired";
  if (upper.includes("REVOKE")) return "revoked";
  return "invalid";
}

export function unavailableCopy(reason: UnavailableReason): { title: string; message: string } {
  if (reason === "expired") {
    return {
      title: "This link has expired",
      message: "Ask the person who shared it to send a new link.",
    };
  }
  if (reason === "revoked") {
    return {
      title: "This link is no longer available",
      message: "The person who shared it has turned off access.",
    };
  }
  return {
    title: "This link is no longer available",
    message: "It may have been turned off, or the address may be incorrect.",
  };
}

/** Lossy key so the share secret is not stored in the query cache. */
export function shareCacheKey(token: string): string {
  let hash = 5381;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash << 5) + hash + token.charCodeAt(index);
    hash |= 0;
  }
  return `share:${(hash >>> 0).toString(16)}:${token.length}`;
}

export function shareSuccessMessage(
  result: { sentTo?: string; linkOnly?: boolean },
  entered: { email?: string; phone?: string }
): string {
  if (result.sentTo) return `Sent to ${result.sentTo}`;
  if (result.linkOnly) return "Link ready to copy";
  if (entered.email && entered.phone) return `Sent to ${entered.email} and ${entered.phone}`;
  if (entered.email) return `Sent to ${entered.email}`;
  if (entered.phone) return `Sent to ${entered.phone}`;
  return "Link ready to copy";
}

export function shareBatchMessage(
  count: number,
  failedNames: string[],
  result: { sentTo?: string; linkOnly?: boolean },
  entered: { email?: string; phone?: string }
): string {
  if (count === 1 && failedNames.length === 0) return shareSuccessMessage(result, entered);
  const destination =
    result.sentTo ||
    (entered.email && entered.phone
      ? `${entered.email} and ${entered.phone}`
      : entered.email || entered.phone || "");
  const lead = destination
    ? `Sent ${count} documents to ${destination}`
    : `${count} links ready to copy`;
  if (failedNames.length === 0) return lead;
  return `${lead}. Couldn't share ${failedNames.join(", ")}.`;
}

export function isLockout(status?: number, code?: string): boolean {
  if (status === 429 || status === 423) return true;
  const upper = (code ?? "").toUpperCase();
  return upper.includes("LOCK") || upper.includes("TOO_MANY");
}
