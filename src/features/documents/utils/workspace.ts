import type { PortalDocument } from "../types";
import { categoryKey } from "./format";

/**
 * Category tiles from the Document Workspace design. `categories` lists the backend category keys
 * (see categoryKey) that feed each tile. A tile with no backend category shows zero documents until
 * the backend provides one.
 */
export interface WorkspaceTile {
  id: string;
  label: string;
  categories: string[];
}

export const WORKSPACE_TILES: WorkspaceTile[] = [
  { id: "personal", label: "Personal & Identity", categories: ["IDENTITY"] },
  { id: "business", label: "Business & Ownership", categories: [] },
  { id: "financial", label: "Financial & Tax", categories: ["FINANCIALS", "TAXATION"] },
  { id: "loan", label: "Loan & Collateral", categories: [] },
  { id: "legal", label: "Legal & Compliance", categories: ["LEGAL"] },
  { id: "other", label: "Other", categories: ["OTHER"] },
];

/** Shown until the backend reports a review status for documents. */
export const STATUS_NOT_REPORTED = "Not reported";

export function tileIdFor(document: PortalDocument): string {
  const key = categoryKey(document.category);
  const tile = WORKSPACE_TILES.find((item) => item.categories.includes(key));
  return tile ? tile.id : "other";
}

export function countByTile(documents: PortalDocument[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(WORKSPACE_TILES.map((tile) => [tile.id, 0]));
  for (const document of documents) {
    counts[tileIdFor(document)] += 1;
  }
  return counts;
}

export function firstTileWithDocuments(documents: PortalDocument[]): string {
  const counts = countByTile(documents);
  return WORKSPACE_TILES.find((tile) => counts[tile.id] > 0)?.id ?? WORKSPACE_TILES[0].id;
}

export type FileKind = "pdf" | "image" | "sheet" | "word" | "file";

export function fileKindOf(fileName?: string): FileKind {
  const extension = fileName?.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return "image";
  if (["xls", "xlsx", "csv"].includes(extension)) return "sheet";
  if (["doc", "docx"].includes(extension)) return "word";
  return "file";
}

export type WorkspaceSort = "newest" | "oldest" | "name";

function updatedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function displayName(document: PortalDocument): string {
  return document.fileName?.trim() || document.typeName;
}

export function sortDocuments(documents: PortalDocument[], sort: WorkspaceSort): PortalDocument[] {
  const rows = [...documents];
  if (sort === "name") {
    return rows.sort((left, right) => displayName(left).localeCompare(displayName(right), undefined, { sensitivity: "base" }));
  }
  return rows.sort((left, right) => {
    const diff = updatedTime(right.updatedAt) - updatedTime(left.updatedAt);
    return sort === "newest" ? diff : -diff;
  });
}

export function documentTypeOptions(documents: PortalDocument[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const document of documents) {
    if (!seen.has(document.typeId)) seen.set(document.typeId, document.typeName);
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
