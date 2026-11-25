import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryFiltersFor, categoryKey, categoryLabel } from "./format";

describe("categoryKey", () => {
  it("returns the backend code for codes and friendly names alike", () => {
    assert.equal(categoryKey("IDENTITY"), "IDENTITY");
    assert.equal(categoryKey("LOAN_AGREEMENT"), "LOAN_AGREEMENT");
    assert.equal(categoryKey("FINANCIAL"), "FINANCIAL");
  });
});

describe("categoryLabel", () => {
  it("prefers the friendly label from the backend", () => {
    assert.equal(categoryLabel("FINANCIAL", "Bank & Financials"), "Bank & Financials");
  });

  it("falls back to a readable form of the code", () => {
    assert.equal(categoryLabel("POST_DISBURSAL"), "Post Disbursal");
    assert.equal(categoryLabel("OTHER", ""), "Other");
  });
});

describe("categoryFiltersFor", () => {
  it("starts with All and lists each category once with its label", () => {
    assert.deepEqual(
      categoryFiltersFor([
        { category: "IDENTITY", categoryLabel: "Identity Proof" },
        { category: "IDENTITY", categoryLabel: "Identity Proof" },
        { category: "INCOME", categoryLabel: "Income Proof" },
      ]),
      [
        { id: "ALL", label: "All" },
        { id: "IDENTITY", label: "Identity Proof" },
        { id: "INCOME", label: "Income Proof" },
      ]
    );
  });
});
