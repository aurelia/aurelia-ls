import { describe, expect, it } from "vitest";
import {
  CompletenessWitnessStore,
  type CompletenessWitnessNode,
} from "../../out/graph/index.js";
import {
  serializeBoundaryKey,
  serializeConsultedContext,
  serializeConsultedWorld,
} from "../../out/shared/index.js";

function createBoundaryKey(
  completenessFamily: CompletenessWitnessNode["completenessFamily"],
  consultedContext = serializeConsultedContext({
    scopeChainRef: "root/app",
    boundaryIdentifier: "root",
  }),
) {
  const consultedWorld = serializeConsultedWorld({
    worldIdentifier: "root/app",
    boundaryIdentifier: "root/app",
  });

  switch (completenessFamily) {
    case "grammar-shape":
      return serializeBoundaryKey({
        completenessFamily,
        consultedContext,
        grammarShapeSurface: "html-element",
      });
    case "resource-admission":
      return serializeBoundaryKey({
        completenessFamily,
        consultedWorld,
        resourceFamily: "custom-element",
      });
    case "vocabulary-admission":
      return serializeBoundaryKey({
        completenessFamily,
        consultedWorld,
        vocabularyFamily: "binding-command",
      });
    case "resource-scope":
      return serializeBoundaryKey({
        completenessFamily,
        consultedContext,
        resourceFamily: "custom-attribute",
      });
    case "template-scope":
      return serializeBoundaryKey({
        completenessFamily,
        consultedContext,
        lookupDomain: "template-scope",
      });
    case "type-closure":
      return serializeBoundaryKey({
        completenessFamily,
        consultedContext,
        typeClosureSurface: "expression",
      });
  }
}

function createWitness(
  overrides: Partial<CompletenessWitnessNode> = {},
): CompletenessWitnessNode {
  const consultedContext = serializeConsultedContext({
    scopeChainRef: "root/app",
    boundaryIdentifier: "root",
  });
  const completenessFamily = overrides.completenessFamily ?? "grammar-shape";
  const boundaryKey = overrides.boundaryKey ?? createBoundaryKey(completenessFamily, consultedContext);

  return {
    key: {
      keyKind: "completeness",
      boundaryKey,
      completenessFamily,
    },
    nodeKind: "completeness-witness",
    familyTag: `witness.completeness.${completenessFamily}`,
    claimState: "unevaluated",
    validityState: "stale",
    revisionToken: 0,
    retentionTier: "warm",
    completenessFamily,
    boundaryKey,
    degradationTarget: null,
    witnessState: "unsatisfied",
    closability: "closable",
    valueLevelProvenance: null,
    decisionLevelProvenance: null,
    ...overrides,
  };
}

describe("semantic-authority graph completeness witness store", () => {
  it("stores and retrieves completeness witnesses by graph completeness key", () => {
    const store = new CompletenessWitnessStore();
    const witness = createWitness();

    expect(store.has(witness.key)).toBe(false);

    store.set(witness);

    expect(store.has(witness.key)).toBe(true);
    expect(store.get(witness.key)).toBe(witness);
    expect(Array.from(store.values())).toEqual([witness]);
    expect(store.size).toBe(1);
  });

  it("stamps monotonic revision tokens on every write", () => {
    const store = new CompletenessWitnessStore();
    const grammarWitness = createWitness();
    const typeClosureContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const typeClosureWitness = createWitness({
      key: {
        keyKind: "completeness",
        boundaryKey: serializeBoundaryKey({
          completenessFamily: "type-closure",
          consultedContext: typeClosureContext,
          typeClosureSurface: "expression",
        }),
        completenessFamily: "type-closure",
      },
      completenessFamily: "type-closure",
      boundaryKey: serializeBoundaryKey({
        completenessFamily: "type-closure",
        consultedContext: typeClosureContext,
        typeClosureSurface: "expression",
      }),
      witnessState: "unsatisfied",
      closability: "open-placeholder",
    });

    store.set(grammarWitness);
    store.set(typeClosureWitness);
    store.set(grammarWitness);

    expect(grammarWitness.revisionToken).toBe(3);
    expect(typeClosureWitness.revisionToken).toBe(2);
    expect(store.currentRevisionToken).toBe(3);
  });

  it("preserves graph-owned type-closure placeholder state without store special-casing", () => {
    const store = new CompletenessWitnessStore();
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const boundaryKey = serializeBoundaryKey({
      completenessFamily: "type-closure",
      consultedContext,
      typeClosureSurface: "expression",
    });
    const witness = createWitness({
      key: {
        keyKind: "completeness",
        boundaryKey,
        completenessFamily: "type-closure",
      },
      completenessFamily: "type-closure",
      boundaryKey,
      witnessState: "unsatisfied",
      closability: "open-placeholder",
    });

    store.set(witness);

    expect(store.get(witness.key)).toMatchObject({
      witnessState: "unsatisfied",
      closability: "open-placeholder",
      completenessFamily: "type-closure",
    });
  });

  it("rejects witnesses whose key metadata diverges from the stored node", () => {
    const store = new CompletenessWitnessStore();
    const witness = createWitness({
      completenessFamily: "resource-scope",
    });

    expect(() =>
      store.set({
        ...witness,
        key: {
          ...witness.key,
          completenessFamily: "grammar-shape",
        },
      }),
    ).toThrow(/completenessFamily/u);
  });

  it("deletes stored witnesses by graph completeness key", () => {
    const store = new CompletenessWitnessStore();
    const witness = createWitness();

    store.set(witness);

    expect(store.delete(witness.key)).toBe(true);
    expect(store.delete(witness.key)).toBe(false);
    expect(store.get(witness.key)).toBeUndefined();
    expect(store.size).toBe(0);
  });
});
