import { formatDate } from "@/lib/utils";
import type { CustomerProfileStatus, CustomerProfileType } from "@/types";

export function profileTypeLabel(type: CustomerProfileType): string {
  return type === "BUSINESS" ? "Business" : "Individual";
}

export function profileStatusLabel(status: CustomerProfileStatus): string {
  return status === "ARCHIVED" ? "Archived" : "Active";
}

const ROLE_LABELS: Record<string, string> = {
  PROMOTER: "Promoter",
  DIRECTOR: "Director",
  PARTNER: "Partner",
  GUARANTOR: "Guarantor",
  AUTHORISED_SIGNATORY: "Authorised signatory",
};

export function profileRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function documentRelationLabel(relation: string): string {
  return relation === "FOR" ? "For" : "Related to";
}

export function showIdentifier(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

export function formatProfileWhen(value: string): string {
  if (!value) return "—";
  let formatted = value;
  try {
    formatted = formatDate(value, "datetime");
  } catch {
    formatted = value;
  }
  return formatted;
}

function profileDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatProfileDay(value: string): string {
  const date = profileDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatProfileTime(value: string): string {
  const date = profileDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
}

export function profileInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
  return letters.toUpperCase() || "?";
}
