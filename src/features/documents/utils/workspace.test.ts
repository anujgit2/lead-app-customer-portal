import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PortalDocument } from "../types";
import {
  countByTile,
  documentTypeOptions,
  fileKindOf,
  firstTileWithDocuments,
  sortDocuments,
  tileIdFor,
  WORKSPACE_TILES,
} from "./workspace";

function doc(overrides: Partial<PortalDocument> & { id: string }): PortalDocument {
  return {
    typeId: "t1",
    typeName: "PAN card",
    label: "",
    category: "IDENTITY",
    latestVersion: 1,
    source: "UPLOADED",
    updatedAt: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

describe("tileIdFor", () => {
  it("maps backend categories to design tiles", () => {
    assert.equal(tileIdFor(doc({ id: "a", category: "Identity" })), "personal");
    assert.equal(tileIdFor(doc({ id: "a", category: "Financials" })), "financial");
    assert.equal(tileIdFor(doc({ id: "a", category: "Taxation" })), "financial");
    assert.equal(tileIdFor(doc({ id: "a", category: "Legal & Corporate" })), "legal");
    assert.equal(tileIdFor(doc({ id: "a", category: "OTHER" })), "other");
  });

  it("sends unknown categories to Other", () => {
    assert.equal(tileIdFor(doc({ id: "a", category: "Property" })), "other");
  });
});

describe("countByTile", () => {
  it("returns a zero count for every tile when empty", () => {
    const counts = countByTile([]);
    assert.deepEqual(Object.keys(counts), WORKSPACE_TILES.map((tile) => tile.id));
    assert.ok(Object.values(counts).every((count) => count === 0));
  });

  it("counts documents per tile", () => {
    const counts = countByTile([
      doc({ id: "a", category: "Identity" }),
      doc({ id: "b", category: "Financials" }),
      doc({ id: "c", category: "Taxation" }),
      doc({ id: "d", category: "OTHER" }),
    ]);
    assert.equal(counts.personal, 1);
    assert.equal(counts.financial, 2);
    assert.equal(counts.other, 1);
    assert.equal(counts.business, 0);
    assert.equal(counts.loan, 0);
  });
});

describe("firstTileWithDocuments", () => {
  it("picks the first tile in design order that has documents", () => {
    assert.equal(firstTileWithDocuments([doc({ id: "a", category: "Taxation" })]), "financial");
  });

  it("falls back to the first tile when there are no documents", () => {
    assert.equal(firstTileWithDocuments([]), "personal");
  });
});

describe("fileKindOf", () => {
  it("classifies by extension, case-insensitively", () => {
    assert.equal(fileKindOf("PAN_Card.PDF"), "pdf");
    assert.equal(fileKindOf("passport.jpg"), "image");
    assert.equal(fileKindOf("sheet.xlsx"), "sheet");
    assert.equal(fileKindOf("letter.docx"), "word");
    assert.equal(fileKindOf("notes.txt"), "file");
    assert.equal(fileKindOf(undefined), "file");
  });
});

describe("sortDocuments", () => {
  const docs = [
    doc({ id: "a", fileName: "b.pdf", updatedAt: "2026-10-01T00:00:00Z" }),
    doc({ id: "b", fileName: "a.pdf", updatedAt: "2026-11-01T00:00:00Z" }),
  ];

  it("sorts newest first by default order", () => {
    assert.deepEqual(sortDocuments(docs, "newest").map((item) => item.id), ["b", "a"]);
    assert.deepEqual(sortDocuments(docs, "oldest").map((item) => item.id), ["a", "b"]);
  });

  it("sorts by name", () => {
    assert.deepEqual(sortDocuments(docs, "name").map((item) => item.id), ["b", "a"]);
  });
});

describe("documentTypeOptions", () => {
  it("lists each document type once, sorted by name", () => {
    const options = documentTypeOptions([
      doc({ id: "a", typeId: "t2", typeName: "Passport" }),
      doc({ id: "b", typeId: "t1", typeName: "PAN card" }),
      doc({ id: "c", typeId: "t1", typeName: "PAN card" }),
    ]);
    assert.deepEqual(options, [
      { id: "t1", name: "PAN card" },
      { id: "t2", name: "Passport" },
    ]);
  });
});
