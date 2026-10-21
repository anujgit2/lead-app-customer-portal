/**
 * Schema-driven consent checks. Pure: no React, no clock, no request data.
 * The client may submit `accepted`, `version`, `locale`, and `textHash` only.
 * Timestamp, IP, and user agent are server-owned and are stripped before a
 * value is submitted.
 */
import type {
  ConsentClientValue,
  ConsentFormValue,
  FormField,
  LocalizedCopy,
} from "@/types";
import { isFieldRequired, isFieldVisible } from "@/utils/rule-engine";

export const CONSENT_CONTINUE_ERROR = "Accept all required consents to continue.";
export const CONSENT_FIELD_REQUIRED_ERROR = "This consent is required to proceed";

export interface ConsentCheckRow {
  key: string;
  version: string;
  visible: boolean;
  required: boolean;
  value: unknown;
  requiredMessage?: string;
  disabled?: boolean;
  /** Already recorded by the server. Withdrawal goes through a separate flow, not this form. */
  locked?: boolean;
}

export interface ConsentContinueResult {
  ok: boolean;
  summary: string | null;
  fieldErrors: Array<{ key: string; message: string }>;
  /** First unticked required consent, in schema order. Focus this control. */
  focusKey: string | null;
  accepted: number;
  total: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** English fallback: exact locale, then language, then `en`, then `en-IN`, then the first entry. */
export function resolveLocalizedCopy(copy: LocalizedCopy | undefined, locale = "en"): string {
  if (!copy) return "";
  if (typeof copy === "string") return copy;
  if (typeof copy[locale] === "string" && copy[locale].length > 0) return copy[locale];
  const language = locale.split("-")[0];
  if (language && typeof copy[language] === "string" && copy[language].length > 0) {
    return copy[language];
  }
  if (typeof copy.en === "string" && copy.en.length > 0) return copy.en;
  if (typeof copy["en-IN"] === "string" && copy["en-IN"].length > 0) return copy["en-IN"];
  const first = Object.values(copy).find((value) => typeof value === "string" && value.length > 0);
  return first ?? "";
}

/** Keeps a string or a locale map. Anything else is dropped. */
export function localizedParts(value: unknown): { text?: string; copy?: LocalizedCopy } {
  if (typeof value === "string" && value.length > 0) {
    return { text: value, copy: value };
  }
  if (!isPlainObject(value)) return {};
  const copy: Record<string, string> = {};
  for (const [locale, text] of Object.entries(value)) {
    if (typeof text === "string" && text.length > 0) copy[locale] = text;
  }
  if (Object.keys(copy).length === 0) return {};
  return { text: resolveLocalizedCopy(copy, "en"), copy };
}

export function activeLocale(): string {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return "en";
}

/** SHA-256 hex of the exact wording shown to the user. */
export async function hashConsentText(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Accepted only when `accepted` is true and `version` equals the schema version.
 * An older acceptance does not satisfy a newer schema version.
 */
export function isConsentAccepted(value: unknown, version: string | undefined): boolean {
  if (!version || !isPlainObject(value)) return false;
  return value.accepted === true && value.version === version;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A current-version acceptance that carries a server timestamp, so it is already on record. */
export function isConsentRecorded(value: unknown, version: string | undefined): boolean {
  return isConsentAccepted(value, version) && !!nonEmptyString((value as Record<string, unknown>).timestamp);
}

/** The wording the row shows for `locale`. This exact string is what gets hashed. */
export function consentWording(field: FormField, locale: string): string {
  return resolveLocalizedCopy(field.consent?.text, locale) || field.description || "";
}

/** Value written when the user ticks a consent. `textHash` is added once hashing finishes. */
export function acceptedConsentValue(version: string, locale: string): ConsentFormValue {
  return { accepted: true, version, locale };
}

function withEvidence<T extends ConsentClientValue>(target: T, record: Record<string, unknown>): T {
  const locale = nonEmptyString(record.locale);
  const textHash = nonEmptyString(record.textHash);
  if (locale) target.locale = locale;
  if (textHash) target.textHash = textHash;
  return target;
}

/** Form value after the server returns a record. Drops IP and user agent. */
export function consentValueForForm(
  value: unknown,
  version: string | undefined
): ConsentFormValue | undefined {
  if (!isConsentAccepted(value, version)) return undefined;
  const record = value as Record<string, unknown>;
  const stored = withEvidence<ConsentFormValue>({ accepted: true, version: version as string }, record);
  const timestamp = nonEmptyString(record.timestamp);
  if (timestamp) stored.timestamp = timestamp;
  return stored;
}

/**
 * Payload the client may submit. Timestamp, IP, and user agent are removed
 * even when the form value still holds a server timestamp.
 */
export function toClientConsentValue(
  value: unknown,
  version: string | undefined
): ConsentClientValue | undefined {
  if (!isConsentAccepted(value, version)) return undefined;
  return withEvidence<ConsentClientValue>(
    { accepted: true, version: version as string },
    value as Record<string, unknown>
  );
}

export function consentFieldPath(key: string, namePrefix?: string): string {
  return namePrefix ? `${namePrefix}.${key}` : key;
}

export function visibleConsentRows(rows: ConsentCheckRow[]): ConsentCheckRow[] {
  return rows.filter((row) => row.visible);
}

export function evaluateConsentContinue(rows: ConsentCheckRow[]): ConsentContinueResult {
  const visible = visibleConsentRows(rows);
  const missing = visible.filter((row) => row.required && !isConsentAccepted(row.value, row.version));
  const accepted = visible.filter((row) => isConsentAccepted(row.value, row.version)).length;
  return {
    ok: missing.length === 0,
    summary: missing.length === 0 ? null : CONSENT_CONTINUE_ERROR,
    fieldErrors: missing.map((row) => ({
      key: row.key,
      message: row.requiredMessage || CONSENT_FIELD_REQUIRED_ERROR,
    })),
    focusKey: missing[0]?.key ?? null,
    accepted,
    total: visible.length,
  };
}

/** True when any visible consent goes from unticked to ticked. That clears the list error. */
export function consentSummaryShouldClear(previous: ConsentCheckRow[], next: ConsentCheckRow[]): boolean {
  return next.some((row) => {
    if (!row.visible) return false;
    const before = previous.find((item) => item.key === row.key);
    const wasAccepted = before ? isConsentAccepted(before.value, before.version) : false;
    return !wasAccepted && isConsentAccepted(row.value, row.version);
  });
}

/**
 * Rows the bulk button may change: visible, required, editable, and not yet recorded.
 * Optional consents are never bulk-ticked, so each one stays a separate choice.
 */
export function bulkConsentRows(rows: ConsentCheckRow[]): ConsentCheckRow[] {
  return rows.filter((row) => row.visible && row.required && !row.disabled && !row.locked);
}

export function allRequiredConsentsAccepted(rows: ConsentCheckRow[]): boolean {
  const actionable = bulkConsentRows(rows);
  return actionable.length > 0 && actionable.every((row) => isConsentAccepted(row.value, row.version));
}

/** Accept ticks each bulk row. Clear removes those entries. Every other row stays untouched. */
export function consentValuesAfterAction(
  rows: ConsentCheckRow[],
  current: Record<string, unknown>,
  action: "accept" | "clear",
  locale = "en"
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };
  for (const row of bulkConsentRows(rows)) {
    if (action === "accept") {
      next[row.key] = acceptedConsentValue(row.version, locale);
    } else {
      delete next[row.key];
    }
  }
  return next;
}

/** Visible, current-version acceptances only, in the client payload shape. */
export function consentsForClient(rows: ConsentCheckRow[]): Record<string, ConsentClientValue> {
  const payload: Record<string, ConsentClientValue> = {};
  for (const row of rows) {
    if (!row.visible) continue;
    const value = toClientConsentValue(row.value, row.version);
    if (value) payload[row.key] = value;
  }
  return payload;
}

export function consentRowsFromSection(
  fields: FormField[],
  scope: Record<string, unknown> | null | undefined,
  ...extraScopes: Array<Record<string, unknown> | null | undefined>
): ConsentCheckRow[] {
  return fields
    .filter((field) => field.type === "consent")
    .map((field) => {
      const version = field.consent?.version ?? "";
      const value = scope?.[field.name];
      return {
        key: field.name,
        version,
        visible: isFieldVisible(field, scope, ...extraScopes),
        required: isFieldRequired(field, scope, ...extraScopes),
        value,
        requiredMessage: field.validation?.message,
        disabled: !!(field.disabled || field.readonly) || version.length === 0,
        locked: isConsentRecorded(value, version),
      };
    });
}

/** Hidden consents are not part of the saved section. */
export function shouldPersistConsent(
  field: FormField,
  scope: Record<string, unknown> | null | undefined,
  ...extraScopes: Array<Record<string, unknown> | null | undefined>
): boolean {
  if (field.type !== "consent") return true;
  return isFieldVisible(field, scope, ...extraScopes);
}
