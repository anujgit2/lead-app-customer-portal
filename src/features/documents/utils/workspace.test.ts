import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PortalDocument } from "../types";
import {
  buildWorkspaceTiles,
  countByTile,
  documentTypeOptions,
  fileKindOf,
  firstTileWithDocuments,
  sortDocuments,
  tileIdFor,
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

describe("buildWorkspaceTiles", () => {
  it("makes one tile per document type category, with the friendly label", () => {
    const tiles = buildWorkspaceTiles(
      [
        { category: "IDENTITY", categoryLabel: "Identity Proof" },
        { category: "INCOME", categoryLabel: "Income Proof" },
        { category: "IDENTITY", categoryLabel: "Identity Proof" },
      ],
      []
    );
    assert.deepEqual(tiles, [
      { id: "IDENTITY", label: "Identity Proof" },
      { id: "INCOME", label: "Income Proof" },
    ]);
  });

  it("adds a tile for a document category that has no matching type", () => {
    const tiles = buildWorkspaceTiles([], [doc({ id: "a", category: "CREDIT", categoryLabel: "Credit Assessment" })]);
    assert.deepEqual(tiles, [{ id: "CREDIT", label: "Credit Assessment" }]);
  });

  it("falls back to a readable label when no friendly name is sent", () => {
    const tiles = buildWorkspaceTiles([{ category: "LOAN_AGREEMENT" }], []);
    assert.deepEqual(tiles, [{ id: "LOAN_AGREEMENT", label: "Loan Agreement" }]);
  });
});

describe("tileIdFor", () => {
  it("uses the backend category code as the tile id", () => {
    assert.equal(tileIdFor(doc({ id: "a", category: "IDENTITY" })), "IDENTITY");
    assert.equal(tileIdFor(doc({ id: "a", category: "POST_DISBURSAL" })), "POST_DISBURSAL");
  });
});

describe("countByTile", () => {
  const tiles = [
    { id: "IDENTITY", label: "Identity Proof" },
    { id: "FINANCIAL", label: "Bank & Financials" },
    { id: "OTHER", label: "Other" },
  ];

  it("returns a zero count for every tile when empty", () => {
    const counts = countByTile([], tiles);
    assert.deepEqual(counts, { IDENTITY: 0, FINANCIAL: 0, OTHER: 0 });
  });

  it("counts documents per tile", () => {
    const counts = countByTile(
      [
        doc({ id: "a", category: "IDENTITY" }),
        doc({ id: "b", category: "FINANCIAL" }),
        doc({ id: "c", category: "FINANCIAL" }),
        doc({ id: "d", category: "OTHER" }),
      ],
      tiles
    );
    assert.deepEqual(counts, { IDENTITY: 1, FINANCIAL: 2, OTHER: 1 });
  });
});

describe("firstTileWithDocuments", () => {
  const tiles = [
    { id: "IDENTITY", label: "Identity Proof" },
    { id: "INCOME", label: "Income Proof" },
  ];

  it("picks the first tile in order that has documents", () => {
    assert.equal(firstTileWithDocuments([doc({ id: "a", category: "INCOME" })], tiles), "INCOME");
  });

  it("falls back to the first tile when there are no documents", () => {
    assert.equal(firstTileWithDocuments([], tiles), "IDENTITY");
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
