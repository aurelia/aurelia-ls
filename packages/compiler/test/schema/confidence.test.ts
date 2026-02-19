import { describe, expect, test } from "vitest";

import type { CatalogGap } from "../../src/schema/types.js";
import { deriveResourceConfidence, isConservativeGap } from "../../src/schema/confidence.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gap(kind: string, name = "test-element"): CatalogGap {
  return {
    kind,
    message: `Gap: ${kind}`,
    resourceKind: "custom-element",
    resourceName: name,
  };
}

// ---------------------------------------------------------------------------
// isConservativeGap
// ---------------------------------------------------------------------------

describe("isConservativeGap", () => {
  test("classifies structural failures as conservative", () => {
    const conservativeKinds = [
      "package-not-found",
      "invalid-package-json",
      "missing-package-field",
      "entry-point-not-found",
      "no-entry-points",
      "complex-exports",
      "workspace-no-source-dir",
      "workspace-entry-not-found",
      "unresolved-import",
      "circular-import",
      "external-package",
      "unsupported-format",
      "no-source",
      "minified-code",
      "parse-error",
      "analysis-failed",
    ];
    for (const kind of conservativeKinds) {
      expect(isConservativeGap(kind), `${kind} should be conservative`).toBe(true);
    }
  });

  test("classifies analytical limits as non-conservative", () => {
    const nonConservativeKinds = [
      "dynamic-value",
      "function-return",
      "computed-property",
      "spread-unknown",
      "conditional-registration",
      "loop-variable",
      "unsupported-pattern",
      "invalid-resource-name",
      "legacy-decorators",
      "cache-corrupt",
    ];
    for (const kind of nonConservativeKinds) {
      expect(isConservativeGap(kind), `${kind} should be non-conservative`).toBe(false);
    }
  });

  test("returns false for unknown gap kinds", () => {
    expect(isConservativeGap("totally-unknown")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deriveResourceConfidence
// ---------------------------------------------------------------------------

describe("deriveResourceConfidence", () => {
  // Pattern Y: zero gaps → high or exact confidence
  describe("Pattern Y: zero gaps", () => {
    test("builtin origin → exact", () => {
      const result = deriveResourceConfidence([], "builtin");
      expect(result.level).toBe("exact");
      expect(result.reason).toContain("builtin");
    });

    test("config origin → exact", () => {
      const result = deriveResourceConfidence([], "config");
      expect(result.level).toBe("exact");
      expect(result.reason).toContain("configuration");
    });

    test("source origin → high", () => {
      const result = deriveResourceConfidence([], "source");
      expect(result.level).toBe("high");
      expect(result.reason).toContain("no gaps");
    });

    test("unspecified origin → high", () => {
      const result = deriveResourceConfidence([]);
      expect(result.level).toBe("high");
    });
  });

  // Pattern Z: non-conservative gaps → partial
  describe("Pattern Z: non-conservative gaps", () => {
    test("single dynamic-value gap → partial", () => {
      const result = deriveResourceConfidence([gap("dynamic-value")]);
      expect(result.level).toBe("partial");
      expect(result.reason).toContain("1 gap");
      expect(result.reason).toContain("dynamic-value");
    });

    test("multiple non-conservative gaps → partial with count", () => {
      const gaps = [gap("dynamic-value"), gap("function-return"), gap("computed-property")];
      const result = deriveResourceConfidence(gaps);
      expect(result.level).toBe("partial");
      expect(result.reason).toContain("3 gaps");
    });

    test("level is partial, not low, for non-conservative gaps", () => {
      const result = deriveResourceConfidence([gap("spread-unknown")]);
      expect(result.level).toBe("partial");
      expect(result.level).not.toBe("low");
    });
  });

  // Pattern AA: conservative gaps → low
  describe("Pattern AA: conservative gaps", () => {
    test("parse-error → low", () => {
      const result = deriveResourceConfidence([gap("parse-error")]);
      expect(result.level).toBe("low");
      expect(result.reason).toContain("structural");
    });

    test("package-not-found → low", () => {
      const result = deriveResourceConfidence([gap("package-not-found")]);
      expect(result.level).toBe("low");
    });

    test("mixed conservative and non-conservative → low (conservative dominates)", () => {
      const gaps = [gap("dynamic-value"), gap("parse-error")];
      const result = deriveResourceConfidence(gaps);
      expect(result.level).toBe("low");
      expect(result.reason).toContain("structural");
    });
  });

  // Pattern AB: determinism
  describe("Pattern AB: determinism", () => {
    test("same gaps produce identical result", () => {
      const gaps = [gap("dynamic-value"), gap("function-return")];
      const result1 = deriveResourceConfidence(gaps, "source");
      const result2 = deriveResourceConfidence(gaps, "source");
      expect(result1).toEqual(result2);
    });

    test("gap order does not affect level", () => {
      const gaps1 = [gap("dynamic-value"), gap("parse-error")];
      const gaps2 = [gap("parse-error"), gap("dynamic-value")];
      const result1 = deriveResourceConfidence(gaps1);
      const result2 = deriveResourceConfidence(gaps2);
      expect(result1.level).toBe(result2.level);
    });
  });

  // Pattern AD: testable in isolation from the pipeline
  describe("Pattern AD: isolation from pipeline", () => {
    test("accepts constructed CatalogGap[] without resource attribution", () => {
      const constructedGaps: CatalogGap[] = [
        { kind: "dynamic-value", message: "test gap" },
      ];
      const result = deriveResourceConfidence(constructedGaps);
      expect(result.level).toBe("partial");
      expect(result.reason).toContain("dynamic-value");
    });

    test("works without provenance origin — defaults to high for clean resources", () => {
      const result = deriveResourceConfidence([]);
      expect(result.level).toBe("high");
    });
  });

  // Pattern AC: two resources can have different confidence
  describe("Pattern AC: per-resource granularity", () => {
    test("different gap sets produce different levels", () => {
      const gappedResult = deriveResourceConfidence([gap("dynamic-value")], "source");
      const cleanResult = deriveResourceConfidence([], "source");
      expect(gappedResult.level).toBe("partial");
      expect(cleanResult.level).toBe("high");
      expect(gappedResult.level).not.toBe(cleanResult.level);
    });
  });
});
