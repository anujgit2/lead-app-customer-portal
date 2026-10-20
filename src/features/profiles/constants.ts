import type { CustomerProfileType } from "@/types";
import type { Program } from "@/services/program.service";

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

export function profileTypeForProgram(program: Program): CustomerProfileType {
  return program.programType?.toUpperCase().includes("BUSINESS") ? "BUSINESS" : "INDIVIDUAL";
}

export function newProfileHref(program: Program, returnTo?: string | null): string {
  const params = new URLSearchParams({
    type: profileTypeForProgram(program).toLowerCase(),
    programId: program.id,
  });
  if (returnTo) params.set("returnTo", returnTo);
  return `/profiles/new?${params.toString()}`;
}
