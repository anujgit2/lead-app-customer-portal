/** Lookups into saved form data, which is keyed by form and nested by field. */

/** The applicant's company name from the saved form data, searching nested values. */
export function findCompanyName(value: unknown, depth = 0): string | null {
  if (depth > 4 || !value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCompanyName(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.companyName === "string" && record.companyName.trim()) return record.companyName.trim();
  for (const inner of Object.values(record)) {
    const found = findCompanyName(inner, depth + 1);
    if (found) return found;
  }
  return null;
}

/** The first non-empty value stored under `key` anywhere in the saved form data. */
export function findField(value: unknown, key: string, depth = 0): unknown {
  if (depth > 4 || !value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findField(item, key, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const direct = record[key];
  // Return a leaf value only. An object under the key is a wrapper, so keep searching inside it.
  const isLeaf = Array.isArray(direct) || (direct !== null && typeof direct !== "object");
  if (isLeaf && direct !== undefined && direct !== "") return direct;
  for (const inner of Object.values(record)) {
    const found = findField(inner, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** "BUSINESS_LOAN" → "Business loan". Empty when there is no program type. */
export function programTypeLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const words = code.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
