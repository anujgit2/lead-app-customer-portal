import type { PortalDocument } from "../types";
import { categoryKey, categoryLabel } from "./format";

/** One tile per backend category. */
export interface WorkspaceTile {
  id: string;
  label: string;
}

/** Tiles come from the document types, with any category seen only on documents added at the end. */
export function buildWorkspaceTiles(
  types: { category: string; categoryLabel?: string }[],
  documents: PortalDocument[]
): WorkspaceTile[] {
  const tiles = new Map<string, string>();
  const add = (category: string, label?: string) => {
    const id = categoryKey(category);
    if (id && !tiles.has(id)) tiles.set(id, categoryLabel(category, label));
  };
  for (const type of types) add(type.category, type.categoryLabel);
  for (const document of documents) add(document.category, document.categoryLabel);
  return [...tiles].map(([id, label]) => ({ id, label }));
}

/** Shown until the backend reports a review status for documents. */
export const STATUS_NOT_REPORTED = "Not reported";

export function tileIdFor(document: PortalDocument): string {
  return categoryKey(document.category);
}

export function countByTile(documents: PortalDocument[], tiles: WorkspaceTile[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(tiles.map((tile) => [tile.id, 0]));
  for (const document of documents) {
    const id = tileIdFor(document);
    if (id in counts) counts[id] += 1;
  }
  return counts;
}

export function firstTileWithDocuments(documents: PortalDocument[], tiles: WorkspaceTile[]): string {
  const counts = countByTile(documents, tiles);
  return tiles.find((tile) => counts[tile.id] > 0)?.id ?? tiles[0]?.id ?? "";
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
