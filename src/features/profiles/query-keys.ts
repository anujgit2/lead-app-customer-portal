import type { CustomerProfileListFilters } from "@/types";

export function profilesQueryKey(filters: CustomerProfileListFilters) {
  return ["profiles", filters] as const;
}

export function profileQueryKey(id: string) {
  return ["profile", id] as const;
}

export function profileVersionsQueryKey(id: string) {
  return ["profile", id, "versions"] as const;
}

export function profileVersionQueryKey(id: string, versionNo: number) {
  return ["profile", id, versionNo] as const;
}

export function profileDiffQueryKey(id: string, fromVersion: number, toVersion: number) {
  return ["profile", id, "diff", fromVersion, toVersion] as const;
}

export function programFormTemplateQueryKey(programId: string) {
  return ["form-template", "program", programId] as const;
}

export function formTemplateQueryKey(code: string, versionNumber?: number) {
  if (versionNumber === undefined) return ["form-template", code] as const;
  return ["form-template", code, versionNumber] as const;
}
