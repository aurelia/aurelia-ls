import { describe, expect, it } from "vitest";
import { compareGreenValueFields, type ClaimNodeBase } from "../../out/graph/index.js";

function createNode(overrides: Partial<ClaimNodeBase> = {}): ClaimNodeBase {
  return {
    key: {
      keyKind: "resource",
      resourceKind: "custom-element",
      canonicalName: "app",
      ownerKey: null,
    },
    nodeKind: "resource-identity",
    familyTag: "claim.identity.custom-element",
    claimState: "holds",
    validityState: "valid",
    revisionToken: 1,
    retentionTier: "warm",
    ...overrides,
  };
}

describe("semantic-authority graph green-value cutoff", () => {
  it("ignores infrastructure fields when comparing nodes", () => {
    const previous = createNode();
    const current = createNode({
      revisionToken: 4,
      retentionTier: "hot",
      validityState: "stale",
    });

    expect(compareGreenValueFields(previous, current)).toBe(true);
  });

  it("ignores provenance fields while preserving green-value equality", () => {
    const previous = createNode({
      decisionLevelProvenance: null,
      valueLevelProvenance: null,
    } as Partial<ClaimNodeBase>);
    const current = createNode({
      decisionLevelProvenance: { source: "debug" },
      valueLevelProvenance: { explanation: "trace" },
    } as Partial<ClaimNodeBase>);

    expect(compareGreenValueFields(previous, current)).toBe(true);
  });

  it("detects changes to green-value fields", () => {
    const previous = createNode();
    const current = createNode({
      claimState: "fails",
    });

    expect(compareGreenValueFields(previous, current)).toBe(false);
  });
});
