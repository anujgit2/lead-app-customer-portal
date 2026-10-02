import type { FormField } from "@/types";

const TRUTHY = new Set(["yes", "true", "y", "1"]);
const FALSY = new Set(["no", "false", "n", "0"]);

export function toWireBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUTHY.has(normalized)) return true;
    if (FALSY.has(normalized)) return false;
  }
  return undefined;
}

/** YES/NO (or option values) → boolean for the backend payload. */
export function applyWireTransformOutbound(field: FormField, value: unknown): unknown {
  if (field.wireTransform !== "boolean") return value;
  return toWireBoolean(value);
}

/**
 * Boolean from the API → the form value the control expects.
 * Selects/radios map back to a matching option (`YES` / `NO`); checkboxes stay boolean.
 */
export function applyWireTransformInbound(field: FormField, value: unknown): unknown {
  if (field.wireTransform !== "boolean") return value;
  const bool = toWireBoolean(value);
  if (bool === undefined) return value;
  if (field.type === "checkbox") return bool;

  const match = field.options?.find((option) => toWireBoolean(option.value) === bool);
  if (match) return match.value;
  return bool ? "YES" : "NO";
}
