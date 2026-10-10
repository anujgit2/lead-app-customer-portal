import type { CustomerProfileDiffChange } from "@/types";

export interface DiffDisplayRow {
  path: string;
  before: string;
  after: string;
}

export function displayDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = "";
  }
  return serialized || "—";
}

export function mapDiffForDisplay(changes: CustomerProfileDiffChange[]): DiffDisplayRow[] {
  return changes.map((change) => ({
    path: change.path,
    before: displayDiffValue(change.before),
    after: displayDiffValue(change.after),
  }));
}
