import type { FieldType } from "@/types";

/**
 * The single source of truth for which `field.type` values the renderer
 * (`DynamicField`) knows how to draw. Used both by the renderer itself (to
 * show "Unsupported field type" instead of silently falling back to text)
 * and by the dev Form Playground's schema validator (to warn about unknown
 * types before rendering).
 */
export const KNOWN_FIELD_TYPES: ReadonlySet<FieldType | string> = new Set<FieldType>([
  "text",
  "textarea",
  "number",
  "currency",
  "percentage",
  "email",
  "tel",
  "checkbox",
  "select",
  "multiselect",
  "radio",
  "datetime",
  "date",
  "json",
  "file",
  "document",
  "hidden",
  "address",
]);

export function isKnownFieldType(type: string): boolean {
  return KNOWN_FIELD_TYPES.has(type);
}
