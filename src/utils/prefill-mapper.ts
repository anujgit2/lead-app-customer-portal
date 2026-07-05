import type { FormData, InvitationPreFilledData } from "@/types";

export function mapPreFilledToFormData(
  preFilled?: InvitationPreFilledData | Record<string, unknown>
): FormData {
  if (!preFilled) return {} as FormData;

  const data = preFilled as Record<string, unknown>;
  const result: FormData = {};

  const businessDetails: Record<string, unknown> = {};
  const businessFields = [
    "companyName",
    "companyType",
    "businessPan",
    "gstin",
    "annualRevenue",
  ] as const;

  for (const key of businessFields) {
    if (data[key] !== undefined && data[key] !== null) {
      businessDetails[key] = data[key];
    }
  }

  if (Object.keys(businessDetails).length > 0) {
    result.business_profile = {
      business_details: businessDetails,
    };
  }

  const loanTerms: Record<string, unknown> = {};
  if (data.loanAmount !== undefined) loanTerms.loanAmount = data.loanAmount;
  if (data.loanPurpose !== undefined) loanTerms.loanPurpose = data.loanPurpose;

  if (Object.keys(loanTerms).length > 0) {
    result.loan_request = { loan_terms: loanTerms };
  }

  if (data.primaryOwnerName && typeof data.primaryOwnerName === "string") {
    const parts = data.primaryOwnerName.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");
    result.owner_profile = [
      {
        owner_details: { firstName, lastName, primaryOwner: true },
      },
    ];
  }

  return result;
}

export function mergeFormData(base: FormData, overlay: FormData): FormData {
  const merged = { ...base } as Record<string, unknown>;

  for (const [templateCode, templateData] of Object.entries(overlay)) {
    const existing = merged[templateCode];
    if (!existing) {
      merged[templateCode] = templateData;
      continue;
    }

    if (Array.isArray(templateData)) {
      merged[templateCode] = templateData;
      continue;
    }

    if (
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing) &&
      typeof templateData === "object" &&
      templateData !== null &&
      !Array.isArray(templateData)
    ) {
      merged[templateCode] = {
        ...(existing as Record<string, unknown>),
        ...(templateData as Record<string, unknown>),
      };
    } else {
      merged[templateCode] = templateData;
    }
  }

  return merged as FormData;
}

export function normalizeApplicationFormData(
  formData: Record<string, unknown> | undefined,
  product?: { templates: { code: string }[] }
): FormData {
  if (!formData || Object.keys(formData).length === 0) return {} as FormData;

  const hasNestedTemplate = product?.templates.some((t) => t.code in formData);
  if (hasNestedTemplate) return formData as FormData;

  return mergeFormData({} as FormData, mapPreFilledToFormData(formData));
}
