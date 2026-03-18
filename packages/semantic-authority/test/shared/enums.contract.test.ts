import { describe, expect, it } from "vitest";
import {
  COMPLETENESS_FAMILIES,
  DEGRADATION_FORMS,
  GOVERNED_SLOT_COMPLETENESS_VALUES,
  OCCURRENCE_VIOLATION_FAMILIES,
  REFERENCE_KINDS,
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

  it("exposes reference kinds from the shared layer", () => {
    expect(REFERENCE_KINDS).toEqual([
      "resource",
      "bindable",
      "scope",
      "governed-linkage",
      "declaration",
    ]);
  });

  it("keeps facade degradation forms and governed-slot completeness on the reconciled runtime surface", () => {
    expect(DEGRADATION_FORMS).toHaveLength(10);
    expect(DEGRADATION_FORMS).toContain("evaluator-error");
    expect(DEGRADATION_FORMS).not.toContain("site-unknown");
    expect(GOVERNED_SLOT_COMPLETENESS_VALUES).toEqual([
      "satisfied",
      "unsatisfied",
      "open",
    ]);
  });
});
