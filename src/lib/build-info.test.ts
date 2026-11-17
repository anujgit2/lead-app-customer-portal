import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBuildLabel } from "@/lib/build-info";

describe("formatBuildLabel", () => {
  it("shows the first 7 chars of a full 40-char SHA", () => {
    assert.equal(
      formatBuildLabel("0123456789abcdef0123456789abcdef01234567"),
      "Build 0123456"
    );
  });

  it("trims surrounding whitespace before taking the short SHA", () => {
    assert.equal(formatBuildLabel("  abcdef1234567890  "), "Build abcdef1");
  });

  it("returns Build unknown for an empty string", () => {
    assert.equal(formatBuildLabel(""), "Build unknown");
  });

  it("returns Build unknown for a whitespace-only string", () => {
    assert.equal(formatBuildLabel("   "), "Build unknown");
  });

  it("returns Build unknown when the value is missing", () => {
    assert.equal(formatBuildLabel(undefined), "Build unknown");
    assert.equal(formatBuildLabel(null), "Build unknown");
    assert.equal(formatBuildLabel(), "Build unknown");
  });
});
