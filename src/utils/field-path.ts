import type { FormField } from "@/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface PathToken {
  key: string;
  isArray: boolean;
}

function tokenizePath(path: string): PathToken[] {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const isArray = part.endsWith("[]");
      return { key: isArray ? part.slice(0, -2) : part, isArray };
    })
    .filter((token) => token.key.length > 0);
}

export interface FieldPathContext {
  propertyName?: string;
  payloadKey?: string;
  insideRepeatableSection?: boolean;
}

/**
 * Payload path for a field, relative to the object currently being built.
 * `path` is the template wire location (`businessFinancial.annualRevenue`);
 * `name`/`key` stays the form field id.
 */
export function fieldPayloadSegments(
  field: Pick<FormField, "name" | "path">,
  context: FieldPathContext = {}
): string[] {
  const source = field.path?.trim() || field.name;
  const tokens = tokenizePath(source);

  let start = 0;
  if (context.insideRepeatableSection) {
    const payloadKey = context.payloadKey;
    const idx = tokens.findIndex(
      (token) => token.isArray || (payloadKey != null && token.key === payloadKey)
    );
    if (idx >= 0) start = idx + 1;
  } else if (context.propertyName && tokens[0]?.key === context.propertyName) {
    start = 1;
  }

  const keys = tokens.slice(start).map((token) => token.key);
  return keys.length > 0 ? keys : [field.name];
}

export function setByPath(
  target: Record<string, unknown>,
  segments: string[],
  value: unknown
): void {
  if (segments.length === 0) return;
  if (segments.length === 1) {
    target[segments[0]] = value;
    return;
  }

  let cursor = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (!isPlainObject(cursor[key])) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
}

export function getByPath(source: unknown, segments: string[]): unknown {
  let cursor: unknown = source;
  for (const key of segments) {
    if (!isPlainObject(cursor) || !(key in cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

/** Deep-merge objects so two sections can share a nested payload object. */
export function assignDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      assignDeep(target[key] as Record<string, unknown>, value);
    } else {
      target[key] = value;
    }
  }
}
