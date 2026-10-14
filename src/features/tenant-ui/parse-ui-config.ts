import { DEFAULT_TENANT_UI } from "@/features/tenant-ui/default-ui-config";
import type {
  TenantUiConfig,
  UiFieldKey,
  UiFieldType,
  UiFormConfig,
  UiFormField,
  UiFormId,
  UiFormLink,
  UiTheme,
  UiThemeColors,
} from "@/features/tenant-ui/types";

const FIELD_TYPE: Record<UiFieldKey, UiFieldType> = {
  identifier: "text",
  fullName: "text",
  email: "email",
  phone: "tel",
  password: "password",
  newPassword: "password",
  confirmPassword: "password",
  otp: "otp",
  rememberMe: "checkbox",
  acceptTerms: "checkbox",
};

const FORM_FIELDS: Record<UiFormId, UiFieldKey[]> = {
  signin: ["identifier", "password", "rememberMe"],
  signup: ["fullName", "email", "phone", "password", "acceptTerms"],
  otp: ["otp"],
  forgotPassword: ["email"],
  resetPassword: ["otp", "newPassword", "confirmPassword"],
};

const MINIMUM_FIELDS: Record<UiFormId, UiFieldKey[]> = {
  signin: ["identifier", "password"],
  signup: ["fullName", "email", "phone", "password", "acceptTerms"],
  otp: ["otp"],
  forgotPassword: ["email"],
  resetPassword: ["otp", "newPassword", "confirmPassword"],
};

const LINK_KEYS = new Set<UiFormLink["key"]>(["signin", "signup", "forgotPassword"]);
const RADII = new Set(["0px", "4px", "8px", "12px"]);
const HEX = /^#[0-9A-Fa-f]{6}$/;
const HTTPS_URL = /^https:\/\/[^\s]+$/;
const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,60}$/;
const BUILTIN_FONTS = new Set(["Inter", "system-ui"]);

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

const LOGO_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.(svg|png|jpe?g|webp)$/i;

function httpsUrl(value: unknown): string | undefined {
  const url = text(value, 500);
  if (!url || !HTTPS_URL.test(url) || /["'()\\]/.test(url)) return undefined;
  return url;
}

function logoSource(value: unknown): string | undefined {
  const remote = httpsUrl(value);
  if (remote) return remote;
  const name = text(value, 100);
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..") || !LOGO_FILE.test(name)) {
    return undefined;
  }
  return `/ui/${name}`;
}

function parseField(raw: unknown, formId: UiFormId, defaults: UiFormField[]): UiFormField | null {
  const item = record(raw);
  if (!item || typeof item.key !== "string") return null;
  const key = item.key as UiFieldKey;
  if (!FORM_FIELDS[formId].includes(key)) return null;
  const canonical = FIELD_TYPE[key];
  if (item.type !== undefined && item.type !== canonical) return null;
  const fallback = defaults.find((field) => field.key === key);
  const label = text(item.label, 120) ?? fallback?.label;
  if (!label) return null;
  const width = item.width === "half" ? "half" : "full";
  return {
    key,
    type: canonical,
    label,
    placeholder: text(item.placeholder, 160) ?? fallback?.placeholder,
    width,
    required: typeof item.required === "boolean" ? item.required : (fallback?.required ?? canonical !== "checkbox"),
  };
}

function parseFields(raw: unknown, formId: UiFormId, defaults: UiFormConfig): UiFormField[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults.fields;
  const seen = new Set<string>();
  const parsed: UiFormField[] = [];
  for (const item of raw) {
    const field = parseField(item, formId, defaults.fields);
    if (!field || seen.has(field.key)) continue;
    seen.add(field.key);
    parsed.push(field);
  }
  for (const key of MINIMUM_FIELDS[formId]) {
    if (seen.has(key)) continue;
    const fallback = defaults.fields.find((field) => field.key === key);
    if (fallback) parsed.push(fallback);
  }
  return parsed.length > 0 ? parsed : defaults.fields;
}

function parseLinks(raw: unknown, defaults: UiFormLink[]): UiFormLink[] {
  if (!Array.isArray(raw)) return defaults;
  const links: UiFormLink[] = [];
  for (const item of raw) {
    const link = record(item);
    if (!link || typeof link.key !== "string" || !LINK_KEYS.has(link.key as UiFormLink["key"])) continue;
    const label = text(link.label, 80);
    if (!label) continue;
    links.push({ key: link.key as UiFormLink["key"], label, prefix: text(link.prefix, 80) });
    if (links.length === 4) break;
  }
  return links;
}

function parseForm(formId: UiFormId, raw: unknown): UiFormConfig {
  const defaults = DEFAULT_TENANT_UI.forms[formId];
  const item = record(raw);
  if (!item) return defaults;
  const cooldown = item.resendCooldownSeconds;
  return {
    title: text(item.title, 120) ?? defaults.title,
    subtitle: text(item.subtitle, 300) ?? defaults.subtitle,
    submitLabel: text(item.submitLabel, 80) ?? defaults.submitLabel,
    submittingLabel: text(item.submittingLabel, 80) ?? defaults.submittingLabel,
    resendLabel: text(item.resendLabel, 80) ?? defaults.resendLabel,
    resendCooldownSeconds:
      typeof cooldown === "number" && Number.isInteger(cooldown) && cooldown >= 0 && cooldown <= 300
        ? cooldown
        : defaults.resendCooldownSeconds,
    successTitle: text(item.successTitle, 120) ?? defaults.successTitle,
    successSubtitle: text(item.successSubtitle, 300) ?? defaults.successSubtitle,
    fields: parseFields(item.fields, formId, defaults),
    links: parseLinks(item.links, defaults.links),
  };
}

function parseColors(raw: unknown): UiThemeColors {
  const item = record(raw);
  if (!item) return {};
  const colors: UiThemeColors = {};
  const keys: (keyof UiThemeColors)[] = [
    "primary",
    "primaryForeground",
    "background",
    "foreground",
    "card",
    "muted",
    "border",
    "danger",
  ];
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && HEX.test(value)) colors[key] = value.toUpperCase();
  }
  return colors;
}

function parseTheme(raw: unknown): UiTheme {
  const item = record(raw);
  if (!item) return { colors: {} };
  const fontFamily = text(item.fontFamily, 61);
  const fontUrl = httpsUrl(item.fontUrl);
  const safeFamily = fontFamily && FONT_NAME.test(fontFamily) ? fontFamily : undefined;
  const family = safeFamily && (BUILTIN_FONTS.has(safeFamily) || fontUrl) ? safeFamily : undefined;
  const radius = item.borderRadius;
  return {
    logoUrl: logoSource(item.logoUrl),
    logoAlt: text(item.logoAlt, 80),
    fontFamily: family,
    fontUrl: family && !BUILTIN_FONTS.has(family) ? fontUrl : undefined,
    borderRadius:
      typeof radius === "string" && RADII.has(radius)
        ? (radius as NonNullable<UiTheme["borderRadius"]>)
        : undefined,
    colors: parseColors(item.colors),
  };
}

function unwrap(payload: unknown): Record<string, unknown> | null {
  const body = record(payload);
  if (!body) return null;
  return record(body.ui) ?? body;
}

export function parseTenantUi(payload: unknown): TenantUiConfig {
  const ui = unwrap(payload);
  if (!ui) return DEFAULT_TENANT_UI;
  const landingPage = text(ui.landingPage, 64)?.toLowerCase();
  const forms = record(ui.forms);
  return {
    landingPage: landingPage && /^[a-z0-9][a-z0-9-]{0,63}$/.test(landingPage) ? landingPage : "default",
    theme: parseTheme(ui.theme),
    forms: {
      signin: parseForm("signin", forms?.signin),
      signup: parseForm("signup", forms?.signup),
      otp: parseForm("otp", forms?.otp),
      forgotPassword: parseForm("forgotPassword", forms?.forgotPassword),
      resetPassword: parseForm("resetPassword", forms?.resetPassword),
    },
  };
}

export function groupFieldRows<T extends { width: "full" | "half"; key: string }>(fields: T[]): T[][] {
  const rows: T[][] = [];
  for (const field of fields) {
    const last = rows[rows.length - 1];
    if (field.width === "half" && last?.length === 1 && last[0].width === "half") last.push(field);
    else rows.push([field]);
  }
  return rows;
}
