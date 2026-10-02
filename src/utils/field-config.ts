import type { FieldValidation, InputFormatConfig } from "@/types";

type Raw = Record<string, unknown>;

function isPlainObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const VALIDATION_KEYS = [
  "required",
  "maxLength",
  "minLength",
  "pattern",
  "min",
  "max",
  "minExclusive",
  "maxExclusive",
  "integer",
  "email",
  "phone",
  "message",
  "minMessage",
  "maxMessage",
] as const;

const NUMERIC_VALIDATION_KEYS = new Set([
  "maxLength",
  "minLength",
  "min",
  "max",
  "minExclusive",
  "maxExclusive",
]);

function asValidationValue(key: string, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (NUMERIC_VALIDATION_KEYS.has(key)) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
  return value;
}

/**
 * Merges validation from nested `validation`, `constraints` (min/max length),
 * and top-level shorthands (`required`, `minLength`, `pattern`, …).
 */
export function mergeFieldValidation(raw: Raw): FieldValidation | undefined {
  const nested = isPlainObject(raw.validation) ? raw.validation : {};
  const constraints = isPlainObject(raw.constraints) ? raw.constraints : {};
  const ui = isPlainObject(raw.ui) ? raw.ui : {};
  const uiErrors = isPlainObject(ui.errors) ? ui.errors : {};
  const merged: Raw = { ...nested };

  for (const key of VALIDATION_KEYS) {
    if (merged[key] === undefined) {
      const fromConstraints = asValidationValue(key, constraints[key]);
      if (fromConstraints !== undefined) merged[key] = fromConstraints;
    }
    if (merged[key] === undefined) {
      const fromRaw = asValidationValue(key, raw[key]);
      if (fromRaw !== undefined) merged[key] = fromRaw;
    }
  }

  if (merged.message === undefined && typeof uiErrors.required === "string") {
    merged.message = uiErrors.required;
  }
  if (merged.minMessage === undefined && typeof uiErrors.min === "string") {
    const min = merged.min;
    merged.minMessage =
      typeof min === "number"
        ? uiErrors.min.replace(/\{min\}/g, String(min))
        : uiErrors.min;
  }
  if (merged.maxMessage === undefined && typeof uiErrors.max === "string") {
    const max = merged.max;
    merged.maxMessage =
      typeof max === "number"
        ? uiErrors.max.replace(/\{max\}/g, String(max))
        : uiErrors.max;
  }

  return Object.keys(merged).length > 0 ? (merged as FieldValidation) : undefined;
}

export function parseInputFormat(raw: unknown): InputFormatConfig | undefined {
  if (!isPlainObject(raw)) return undefined;
  const format: InputFormatConfig = {};
  if (typeof raw.trim === "boolean") format.trim = raw.trim;
  if (typeof raw.uppercase === "boolean") format.uppercase = raw.uppercase;
  if (typeof raw.lowercase === "boolean") format.lowercase = raw.lowercase;
  if (typeof raw.allowSpaces === "boolean") format.allowSpaces = raw.allowSpaces;
  if (typeof raw.allowSpecialCharacters === "boolean") {
    format.allowSpecialCharacters = raw.allowSpecialCharacters;
  }
  return Object.keys(format).length > 0 ? format : undefined;
}

function isDigitsOnlyPattern(pattern: string | undefined): boolean {
  if (!pattern) return false;
  return pattern === "^[0-9]+$" || /^\^\[0-9]/.test(pattern);
}

/** Live sanitizer for `input` rules (uppercase, strip spaces/specials). Does not trim — that happens on blur. */
export function applyInputFormat(
  raw: string,
  format: InputFormatConfig | undefined,
  validation?: FieldValidation
): string {
  if (!format) return raw;
  let next = raw;

  if (format.uppercase) next = next.toUpperCase();
  if (format.lowercase) next = next.toLowerCase();
  if (format.allowSpaces === false) next = next.replace(/\s+/g, "");

  if (format.allowSpecialCharacters === false) {
    next = isDigitsOnlyPattern(validation?.pattern)
      ? next.replace(/[^0-9]/g, "")
      : next.replace(/[^A-Za-z0-9]/g, "");
  }

  if (validation?.maxLength !== undefined) {
    const raw = next.replace(/[^A-Za-z0-9]/g, "");
    if (raw.length > validation.maxLength) {
      next = raw.slice(0, validation.maxLength);
    }
  }

  return next;
}
