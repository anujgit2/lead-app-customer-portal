import type { CustomerProfileType } from "@/types";

export const PROFILE_TEMPLATE_CODE: Record<CustomerProfileType, string> = {
  INDIVIDUAL: "customer-individual",
  BUSINESS: "customer-business",
};

export const PROFILE_PAGE_SIZE = 5;

export function templateCodeForType(type: CustomerProfileType): string {
  return PROFILE_TEMPLATE_CODE[type];
}

export function profileTypeFromQuery(value: string | null): CustomerProfileType | null {
  if (value === "individual") return "INDIVIDUAL";
  if (value === "business") return "BUSINESS";
  return null;
}
