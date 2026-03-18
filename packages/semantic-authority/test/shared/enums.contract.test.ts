import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_FAMILIES,
  OCCURRENCE_VIOLATION_FAMILIES,
  WITNESS_FAMILIES,
} from "../../out/shared/index.js";

describe("semantic-authority shared contract enums", () => {
  it("keeps completeness families narrower than witness families", () => {
    expect(COMPLETENESS_FAMILIES).toEqual([
      "grammar-shape",
      "resource-admission",
      "vocabulary-admission",
      "resource-scope",
      "template-scope",
      "type-closure",
    ]);
    expect(WITNESS_FAMILIES).toEqual(expect.arrayContaining([...COMPLETENESS_FAMILIES]));
    expect(WITNESS_FAMILIES).toEqual(
      expect.arrayContaining(["open-boundary", "declaration-surface", "support-bundle"]),
    );
  });

  it("separates occurrence-only violations from relation kinds", () => {
    expect(OCCURRENCE_VIOLATION_FAMILIES).toEqual([
      "syntax-invalid",
      "template-structure",
      "composition",
      "structural-invalid",
    ]);
  });
});
