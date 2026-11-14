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

/** `versionNo` null is the latest published program version; a number pins that snapshot's version. */
export function profileFormQueryKey(id: string, versionNo: number | null) {
  return ["profile-form", id, versionNo ?? "latest"] as const;
}
