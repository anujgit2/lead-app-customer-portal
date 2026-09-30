/**
 * Lightweight input mask engine shared by `DynamicField` and the dev Form
 * Playground's sample-data generator. `pattern` uses `A` for a letter slot
 * and `0` for a digit slot; every other character is a literal that gets
 * auto-inserted (e.g. "AAAAA-0000-A" → "ABCDE-1234-F").
 */
import type { MaskConfig } from "@/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Parses authored `{ pattern, separator?, transform? }` JSON into a `MaskConfig`, or undefined if invalid. */
export function parseMaskConfig(raw: unknown): MaskConfig | undefined {
  if (!isPlainObject(raw)) return undefined;
  if (typeof raw.pattern !== "string" || raw.pattern.length === 0) return undefined;

  const transform =
    raw.transform === "uppercase" ||
    raw.transform === "lowercase" ||
    raw.transform === "numeric"
      ? raw.transform
      : undefined;

  return {
    pattern: raw.pattern,
    separator: typeof raw.separator === "string" ? raw.separator : undefined,
    transform,
  };
}

/** Reformats raw user input to match a mask pattern, applying an optional case transform first. */
export function applyMask(rawValue: string, pattern: string, transform?: MaskConfig["transform"]): string {
  const transformed =
    transform === "uppercase"
      ? rawValue.toUpperCase()
      : transform === "lowercase"
        ? rawValue.toLowerCase()
        : transform === "numeric"
          ? rawValue.replace(/[^0-9]/g, "")
          : rawValue;
  const chars = transformed.replace(/[^A-Za-z0-9]/g, "").split("");

  let result = "";
  let ci = 0;
  for (let i = 0; i < pattern.length && ci < chars.length; i++) {
    const slot = pattern[i];
    if (slot === "A") {
      while (ci < chars.length && !/[A-Za-z]/.test(chars[ci])) ci++;
      if (ci >= chars.length) break;
      result += chars[ci];
      ci++;
    } else if (slot === "0") {
      while (ci < chars.length && !/[0-9]/.test(chars[ci])) ci++;
      if (ci >= chars.length) break;
      result += chars[ci];
      ci++;
    } else {
      result += slot;
    }
  }
  return result;
}

/**
 * Strips mask literal characters (separators like `-`, `/`, `(`, `)`, spaces…), returning
 * the raw alphanumeric characters the user actually typed. Mirrors the char-extraction step
 * inside `applyMask` — use this to validate a masked field's *content* (e.g. `validation.pattern`)
 * against the unformatted value instead of the separator-injected display string.
 */
export function unmask(value: unknown): string {
  return String(value ?? "").replace(/[^A-Za-z0-9]/g, "");
}

/** Generates a value that fully satisfies a mask pattern — used by the sample-data generator. */
export function fillMaskPattern(pattern: string): string {
  let result = "";
  for (const slot of pattern) {
    if (slot === "A") {
      result += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    } else if (slot === "0") {
      result += String(Math.floor(Math.random() * 10));
    } else {
      result += slot;
    }
  }
  return result;
}
