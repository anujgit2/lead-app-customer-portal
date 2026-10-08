import type { FormField, FormSection, PanSearchQuery } from "@/types";

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type PanSearchVariant = "company" | "owner";

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isPanSearchField(field: FormField): boolean {
  return field.name === "businessPan" || field.name === "pan";
}

export function findPanSearchField(section: FormSection): FormField | undefined {
  return section.fields.find(isPanSearchField);
}

export function getPanSearchVariant(fieldName: string): PanSearchVariant {
  return fieldName === "businessPan" ? "company" : "owner";
}

export function joinPersonName(
  firstName?: unknown,
  middleName?: unknown,
  lastName?: unknown
): string {
  return [firstName, middleName, lastName]
    .map(asString)
    .filter(Boolean)
    .join(" ");
}

/** Normalize a stored date into `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInputValue(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return "";
}

/** Convert a date-picker value to the PAN API format `dd/MM/yyyy`. */
export function toPanApiDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return trimmed;
}

export function formatPanDisplayDate(value: string): string {
  const apiDate = toPanApiDate(value);
  return apiDate || value;
}

export function getPanSearchPrefill(
  values: Record<string, unknown>,
  variant: PanSearchVariant
): PanSearchQuery {
  if (variant === "company") {
    const section = asObject(values.business_details) ?? values;
    return {
      pan: asString(section.businessPan).toUpperCase(),
      nameAsPerPan: asString(section.companyName),
      dateOfBirth: toDateInputValue(asString(section.incorporationDate)),
    };
  }

  const section = asObject(values.owner_details) ?? values;
  return {
    pan: asString(section.pan).toUpperCase(),
    nameAsPerPan: joinPersonName(section.firstName, section.middleName, section.lastName),
    dateOfBirth: toDateInputValue(asString(section.dateOfBirth)),
  };
}

export function normalizePan(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}
