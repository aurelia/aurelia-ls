import { describe, expect, test } from "vitest";
import { decideRenameMappedProvenance } from "../../src/provenance-gate-policy.js";

describe("provenance gate policy", () => {
  test("accepts mapped provenance when position is covered", () => {
    const decision = decideRenameMappedProvenance({
      mappingPresent: true,
      positionMapped: true,
    });
    expect(decision.hasMappedProvenance).toBe(true);
    expect(decision.evidenceLevel).toBe("position");
    expect(decision.reason).toBe("position-mapped");
  });

  test("rejects mapped provenance when mapping exists but position has no coverage", () => {
    const decision = decideRenameMappedProvenance({
      mappingPresent: true,
      positionMapped: false,
    });
    expect(decision.hasMappedProvenance).toBe(false);
    expect(decision.evidenceLevel).toBe("position");
    expect(decision.reason).toBe("position-unmapped");
  });

  test("rejects mapped provenance when no mapping exists", () => {
    const decision = decideRenameMappedProvenance({
      mappingPresent: false,
      positionMapped: false,
    });
    expect(decision.hasMappedProvenance).toBe(false);
    expect(decision.evidenceLevel).toBe("artifact");
    expect(decision.reason).toBe("mapping-missing");
  });
});
