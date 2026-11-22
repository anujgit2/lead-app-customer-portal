import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PortalDocument } from "../types";
import { RECENT_LIMIT, sourceLabel, sourceTone, summarizeDocuments } from "./dashboard";

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

describe("summarizeDocuments", () => {
  it("returns zeros for an empty list", () => {
    const summary = summarizeDocuments([]);
    assert.equal(summary.total, 0);
    assert.equal(summary.categoryCount, 0);
    assert.equal(summary.linkedCount, 0);
    assert.deepEqual(summary.recent, []);
    assert.deepEqual(summary.categories.map((tile) => tile.id), ["FINANCIALS", "LEGAL", "TAXATION", "IDENTITY"]);
    assert.ok(summary.categories.every((tile) => tile.count === 0 && tile.latestUpdatedAt === null));
  });

  it("counts totals, sources and profile links", () => {
    const summary = summarizeDocuments([
      doc({ id: "a", source: "UPLOADED", linked: [{ profileId: "p1", relation: "FOR", displayName: "Acme" }] as PortalDocument["linked"] }),
      doc({ id: "b", source: "DIGILOCKER" }),
      doc({ id: "c", source: "UPLOADED" }),
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.uploadedCount, 2);
    assert.equal(summary.digiLockerCount, 1);
    assert.equal(summary.linkedCount, 1);
  });

  it("groups counts by category and keeps the latest update per category", () => {
    const summary = summarizeDocuments([
      doc({ id: "a", category: "Financials", updatedAt: "2026-10-01T00:00:00Z" }),
      doc({ id: "b", category: "FINANCIALS", updatedAt: "2026-11-05T00:00:00Z" }),
      doc({ id: "c", category: "Legal & Corporate", updatedAt: "2026-09-01T00:00:00Z" }),
    ]);
    const financials = summary.categories.find((tile) => tile.id === "FINANCIALS");
    const legal = summary.categories.find((tile) => tile.id === "LEGAL");
    assert.equal(financials?.count, 2);
    assert.equal(financials?.latestUpdatedAt, "2026-11-05T00:00:00Z");
    assert.equal(legal?.count, 1);
    assert.equal(summary.categoryCount, 2);
  });

  it("adds a tile for an unknown category found in the data", () => {
    const summary = summarizeDocuments([doc({ id: "a", category: "Property" })]);
    const tile = summary.categories.find((item) => item.id === "PROPERTY");
    assert.equal(tile?.label, "Property");
    assert.equal(tile?.count, 1);
  });

  it("returns the most recently updated documents first, capped at the recent limit", () => {
    const documents = Array.from({ length: RECENT_LIMIT + 3 }, (_, index) =>
      doc({ id: `d${index}`, updatedAt: `2026-11-${String(index + 1).padStart(2, "0")}T00:00:00Z` })
    );
    const summary = summarizeDocuments(documents);
    assert.equal(summary.recent.length, RECENT_LIMIT);
    assert.equal(summary.recent[0].id, `d${RECENT_LIMIT + 2}`);
  });
});

describe("source helpers", () => {
  it("maps each source to one label and tone", () => {
    assert.equal(sourceLabel("UPLOADED"), "Uploaded");
    assert.equal(sourceLabel("DIGILOCKER"), "DigiLocker");
    assert.equal(sourceTone("UPLOADED"), "neu");
    assert.equal(sourceTone("DIGILOCKER"), "info");
  });
});
