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
  "minSelected",
  "maxSelected",
  "message",
  "minMessage",
  "maxMessage",
  "minSelectedMessage",
  "maxSelectedMessage",
] as const;

const NUMERIC_VALIDATION_KEYS = new Set([
  "maxLength",
  "minLength",
  "min",
  "max",
  "minExclusive",
  "maxExclusive",
  "minSelected",
  "maxSelected",
]);

const DEFINITION_SKIP_KEYS = new Set([
  "ui",
  "rules",
  "validation",
  "mask",
  "display",
  "options",
  "optionsRef",
  "component",
  "componentRef",
  "path",
  "defaultValue",
  "sections",
  "fields",
]);

/** Scalar values from a field definition, keyed by their property name (`maxSelected`, `min`, …). */
export function collectDefinitionTokens(
  source: unknown,
  resolveRef?: (ref: string) => number | undefined
): Record<string, string | number> {
  const vars: Record<string, string | number> = {};
  const visit = (node: unknown) => {
    if (!isPlainObject(node)) return;
    for (const [key, raw] of Object.entries(node)) {
      if (DEFINITION_SKIP_KEYS.has(key) || key.startsWith("$")) continue;
      if (isPlainObject(raw) && typeof raw.$ref === "string") {
        const resolved = resolveRef?.(raw.$ref);
        if (typeof resolved === "number" && Number.isFinite(resolved) && !(key in vars)) {
          vars[key] = resolved;
        }
        continue;
      }
      if (typeof raw === "number" && Number.isFinite(raw)) {
        if (!(key in vars)) vars[key] = raw;
        continue;
      }
      if (typeof raw === "string" && raw.length > 0) {
        if (!(key in vars)) vars[key] = raw;
        continue;
      }
      if (typeof raw === "boolean") {
        if (!(key in vars)) vars[key] = raw ? "true" : "false";
        continue;
      }
      if (isPlainObject(raw)) visit(raw);
    }
  };
  visit(source);
  return vars;
}

/** Replaces `{maxSelected}` style tokens. Unknown tokens are left as written. */
export function interpolateTokens(
  template: string | null | undefined,
  vars: Record<string, string | number | undefined>
): string | undefined {
  // Program JSON uses null for empty copy (`tooltip`, `helperText`, `placeholder`).
  if (typeof template !== "string") return undefined;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null || value === "" ? match : String(value);
  });
}

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
  const copyVars = collectDefinitionTokens(raw);

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

  for (const key of ["min", "max", "minLength", "maxLength", "minSelected", "maxSelected"] as const) {
    if (typeof merged[key] === "number") copyVars[key] = merged[key];
  }

  if (merged.message === undefined && typeof uiErrors.required === "string") {
    merged.message = interpolateTokens(uiErrors.required, copyVars);
  }
  if (merged.minMessage === undefined && typeof uiErrors.min === "string") {
    merged.minMessage = interpolateTokens(uiErrors.min, copyVars);
  }
  if (merged.maxMessage === undefined && typeof uiErrors.max === "string") {
    merged.maxMessage = interpolateTokens(uiErrors.max, copyVars);
  }
  if (merged.minSelectedMessage === undefined && typeof uiErrors.minSelected === "string") {
    merged.minSelectedMessage = interpolateTokens(uiErrors.minSelected, copyVars);
  }
  if (merged.maxSelectedMessage === undefined && typeof uiErrors.maxSelected === "string") {
    merged.maxSelectedMessage = interpolateTokens(uiErrors.maxSelected, copyVars);
  }
  if (merged.patternMessage === undefined && typeof uiErrors.pattern === "string") {
    merged.patternMessage = interpolateTokens(uiErrors.pattern, copyVars);
  }

  if (Array.isArray(raw.validation)) {
    for (const rule of raw.validation) {
      if (!isPlainObject(rule) || typeof rule.regex !== "string" || rule.regex.length === 0) continue;
      if (merged.pattern === undefined) merged.pattern = rule.regex;
      if (merged.patternMessage === undefined) {
        const code = typeof rule.code === "string" ? rule.code : "pattern";
        const patternError = uiErrors[code] ?? uiErrors.pattern;
        if (typeof patternError === "string") {
          merged.patternMessage = interpolateTokens(patternError, copyVars);
        }
      }
    }
  }

  if (
    merged.patternMessage === undefined &&
    typeof merged.pattern === "string" &&
    typeof uiErrors.pattern === "string"
  ) {
    merged.patternMessage = interpolateTokens(uiErrors.pattern, copyVars);
  }

  return Object.keys(merged).length > 0 ? (merged as FieldValidation) : undefined;
}

export function parseInputFormat(raw: unknown): InputFormatConfig | undefined {
  if (!isPlainObject(raw)) return undefined;
  const format: InputFormatConfig = {};
  if (typeof raw.trim === "boolean") format.trim = raw.trim;
  if (typeof raw.uppercase === "boolean") format.uppercase = raw.uppercase;
  if (typeof raw.lowercase === "boolean") format.lowercase = raw.lowercase;
  if (raw.transform === "numeric") format.numeric = true;
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
  if (format.numeric) next = next.replace(/\D/g, "");

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
