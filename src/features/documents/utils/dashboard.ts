import type { PortalDocument } from "../types";
import { categoryFiltersFor, categoryKey } from "./format";

export const RECENT_LIMIT = 8;

export interface CategoryTile {
  id: string;
  label: string;
  count: number;
  latestUpdatedAt: string | null;
}

export interface DocumentDashboardSummary {
  total: number;
  categoryCount: number;
  linkedCount: number;
  uploadedCount: number;
  digiLockerCount: number;
  categories: CategoryTile[];
  recent: PortalDocument[];
}

function updatedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Summarises the portal's document list for the dashboard. Uses only fields the list API already returns. */
export function summarizeDocuments(documents: PortalDocument[]): DocumentDashboardSummary {
  const categoryDefs = categoryFiltersFor(documents.map((document) => document.category)).filter(
    (item) => item.id !== "ALL"
  );

  const tiles = new Map<string, CategoryTile>(
    categoryDefs.map((item) => [item.id, { id: item.id, label: item.label, count: 0, latestUpdatedAt: null }])
  );

  let linkedCount = 0;
  let uploadedCount = 0;
  let digiLockerCount = 0;

  for (const document of documents) {
    if ((document.linked ?? []).length > 0) linkedCount += 1;
    if (document.source === "DIGILOCKER") digiLockerCount += 1;
    else uploadedCount += 1;

    const key = categoryKey(document.category);
    const tile = tiles.get(key);
    if (!tile) continue;
    tile.count += 1;
    if (!tile.latestUpdatedAt || updatedTime(document.updatedAt) > updatedTime(tile.latestUpdatedAt)) {
      tile.latestUpdatedAt = document.updatedAt;
    }
  }

  const categories = [...tiles.values()];
  const recent = [...documents]
    .sort((left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt))
    .slice(0, RECENT_LIMIT);

  return {
    total: documents.length,
    categoryCount: categories.filter((tile) => tile.count > 0).length,
    linkedCount,
    uploadedCount,
    digiLockerCount,
    categories,
    recent,
  };
}

export type SourceTone = "neu" | "info";

/** One helper for the source pill, so the page never maps tones inline. */
export function sourceTone(source: PortalDocument["source"]): SourceTone {
  return source === "DIGILOCKER" ? "info" : "neu";
}

export function sourceLabel(source: PortalDocument["source"]): string {
  return source === "DIGILOCKER" ? "DigiLocker" : "Uploaded";
}
