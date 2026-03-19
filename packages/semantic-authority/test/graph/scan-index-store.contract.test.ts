import { describe, expect, it } from "vitest";
import {
  GraphNodeStore,
  GraphScanIndexStore,
  type ClaimNodeBase,
  type NodeKey,
  type ResourceKey,
} from "../../out/graph/index.js";
import {
  serializeConsultedContext,
  serializeOccurrenceAnchor,
  serializeConsultedWorld,
} from "../../out/shared/index.js";

function createResourceKey(
  resourceKind: ResourceKey["resourceKind"] = "custom-element",
  canonicalName = "app",
): ResourceKey {
  return {
    keyKind: "resource",
    resourceKind,
    canonicalName,
    ownerKey: null,
  };
}

function createNode(
  key: NodeKey,
  nodeKind: ClaimNodeBase["nodeKind"],
  familyTag: string,
): ClaimNodeBase {
  return {
    key,
    nodeKind,
    familyTag,
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
  };
}

describe("semantic-authority graph scan index store", () => {
  it("indexes position classifications and correctness findings by scoped scan keys", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphScanIndexStore(nodeStore);
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const alternateContext = serializeConsultedContext({
      scopeChainRef: "root/other",
      boundaryIdentifier: "root",
    });
    const anchorOne = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 0, character: 1 },
    });
    const anchorTwo = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 0, character: 2 },
    });
    const anchorThree = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 0, character: 3 },
    });
    const anchorFour = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 0, character: 4 },
    });
    const anchorFive = serializeOccurrenceAnchor({
      documentUri: "file:///other.html",
      position: { line: 1, character: 0 },
    });

    const positionOne = createNode(
      {
        keyKind: "occurrence",
        consultedContext,
        occurrenceAnchor: anchorOne,
        family: "attribute-name",
      },
      "position-classification",
      "claim.position.grammar-only-classification",
    );
    const positionTwo = createNode(
      {
        keyKind: "occurrence",
        consultedContext,
        occurrenceAnchor: anchorOne,
        family: "binding-command-segment",
      },
      "position-classification",
      "claim.position.vocabulary-gated-classification",
    );
    const correctnessOccurrence = createNode(
      {
        keyKind: "occurrence",
        consultedContext,
        occurrenceAnchor: anchorTwo,
        family: "template-controller-attribute",
      },
      "correctness-finding",
      "correctness.5.template-structure",
    );
    const correctnessLookup = createNode(
      {
        keyKind: "lookup",
        occurrenceKey: {
          keyKind: "occurrence",
          consultedContext,
          occurrenceAnchor: anchorThree,
          family: "tag-name",
        },
        lookupFamily: "resource-scope",
        lookupTarget: "custom-element:missing",
      },
      "correctness-finding",
      "correctness.1.resource-scope-absence",
    );
    const correctnessRelation = createNode(
      {
        keyKind: "relation",
        sourceKey: {
          keyKind: "occurrence",
          consultedContext,
          occurrenceAnchor: anchorFour,
          family: "binding-command-segment",
        },
        targetKey: createResourceKey("binding-command", "trigger"),
        relationKind: "binding-command-misuse",
      },
      "correctness-finding",
      "correctness.7.binding-command-misuse",
    );
    const differentContextFinding = createNode(
      {
        keyKind: "occurrence",
        consultedContext: alternateContext,
        occurrenceAnchor: anchorFive,
        family: "tag-name",
      },
      "correctness-finding",
      "correctness.5.template-structure",
    );

    for (const node of [
      positionOne,
      positionTwo,
      correctnessOccurrence,
      correctnessLookup,
      correctnessRelation,
      differentContextFinding,
    ]) {
      nodeStore.set(node);
      indexStore.upsert(node);
    }

    expect(indexStore.getPositionClassificationsForOccurrence(consultedContext, anchorOne)).toEqual([
      positionOne,
      positionTwo,
    ]);
    expect(indexStore.getCorrectnessFindingsForContext(consultedContext)).toEqual([
      correctnessOccurrence,
      correctnessLookup,
      correctnessRelation,
    ]);
    expect(
      indexStore.getCorrectnessFindingsForContext(
        consultedContext,
        "correctness.1.resource-scope-absence",
      ),
    ).toEqual([correctnessLookup]);
  });

  it("indexes admission, reachability, open-boundary, and witness scan families", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphScanIndexStore(nodeStore);
    const elementKey = createResourceKey("custom-element", "app");
    const consultedWorld = serializeConsultedWorld({
      worldIdentifier: "root/app",
      boundaryIdentifier: "root/app",
    });
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const templateAnchor = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 2, character: 0 },
    });

    const resourceAdmission = createNode(
      {
        keyKind: "admission",
        consultedWorld,
        subjectKey: elementKey,
      },
      "admission",
      "claim.availability.resource-admission",
    );
    const vocabularyAdmission = createNode(
      {
        keyKind: "admission",
        consultedWorld,
        subjectKey: {
          keyKind: "vocabulary-entry",
          vocabularyFamily: "binding-command",
          entryIdentity: "trigger",
        },
      },
      "admission",
      "claim.availability.vocabulary-admission",
    );
    const resourceReachability = createNode(
      {
        keyKind: "reachability",
        consultedContext,
        subjectKey: elementKey,
      },
      "reachability",
      "claim.reachability.resource-scope",
    );
    const templateReachability = createNode(
      {
        keyKind: "reachability",
        consultedContext,
        subjectKey: {
          occurrenceAnchor: templateAnchor,
          identifierOrReferentKey: "value",
        },
      },
      "reachability",
      "claim.reachability.template-scope",
    );
    const openBoundary = createNode(
      {
        keyKind: "open-boundary",
        targetFamilyId: "claim.position.resource-gated-classification",
        subjectKey: elementKey,
        blockedDependency: "resource-scope-completeness",
      },
      "open-boundary",
      "witness.boundary.open-boundary",
    );
    const declarationWitness = createNode(
      {
        keyKind: "declaration-witness",
        subjectKey: elementKey,
        declarationFormSet: "custom-element.decorator|convention",
      },
      "witness",
      "witness.declaration.declaration-surface",
    );
    const supportWitness = createNode(
      {
        keyKind: "support-bundle",
        targetFamilyId: "claim.resource.custom-element-field",
        subjectKey: elementKey,
      },
      "witness",
      "witness.support.support-bundle",
    );

    for (const node of [
      resourceAdmission,
      vocabularyAdmission,
      resourceReachability,
      templateReachability,
      openBoundary,
      declarationWitness,
      supportWitness,
    ]) {
      nodeStore.set(node);
      indexStore.upsert(node);
    }

    expect(
      indexStore.getAdmissionsForWorldByKind(
        consultedWorld,
        "claim.availability.resource-admission",
      ),
    ).toEqual([resourceAdmission]);
    expect(
      indexStore.getAdmissionsForWorldByKind(
        consultedWorld,
        "claim.availability.vocabulary-admission",
      ),
    ).toEqual([vocabularyAdmission]);
    expect(
      indexStore.getReachabilityForContextByKind(
        consultedContext,
        "claim.reachability.resource-scope",
      ),
    ).toEqual([resourceReachability]);
    expect(
      indexStore.getReachabilityForContextByKind(
        consultedContext,
        "claim.reachability.template-scope",
      ),
    ).toEqual([templateReachability]);
    expect(
      indexStore.getOpenBoundariesForTargetFamily(
        "claim.position.resource-gated-classification",
        elementKey,
      ),
    ).toEqual([openBoundary]);
    expect(
      indexStore.getWitnessesByKindForSubject(
        "witness.declaration.declaration-surface",
        elementKey,
      ),
    ).toEqual([declarationWitness]);
    expect(
      indexStore.getWitnessesByKindForSubject(
        "witness.support.support-bundle",
        elementKey,
      ),
    ).toEqual([supportWitness]);
  });

  it("keeps scan index buckets stable across repeated upserts, deletes, and clear", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphScanIndexStore(nodeStore);
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const anchor = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 7, character: 0 },
    });

    const correctnessNode = createNode(
      {
        keyKind: "occurrence",
        consultedContext,
        occurrenceAnchor: anchor,
        family: "attribute-name",
      },
      "correctness-finding",
      "correctness.5.template-structure",
    );

    nodeStore.set(correctnessNode);
    indexStore.upsert(correctnessNode);
    indexStore.upsert(correctnessNode);

    expect(indexStore.getCorrectnessFindingsForContext(consultedContext)).toEqual([correctnessNode]);

    expect(indexStore.delete(correctnessNode.key)).toBe(true);
    expect(indexStore.delete(correctnessNode.key)).toBe(false);
    expect(indexStore.getCorrectnessFindingsForContext(consultedContext)).toEqual([]);

    nodeStore.set(correctnessNode);
    indexStore.upsert(correctnessNode);
    indexStore.clear();

    expect(indexStore.getCorrectnessFindingsForContext(consultedContext)).toEqual([]);
  });

  it("supports correctness RelationKeys that need an explicit consultedContext override and broader prefix scans", () => {
    const nodeStore = new GraphNodeStore();
    const indexStore = new GraphScanIndexStore(nodeStore);
    const componentContext = serializeConsultedContext({
      scopeChainRef: "root/app/component-a",
      boundaryIdentifier: "component-a",
    });
    const siblingContext = serializeConsultedContext({
      scopeChainRef: "root/app/component-b",
      boundaryIdentifier: "component-b",
    });

    const duplicateRegistrationA = createNode(
      {
        keyKind: "relation",
        sourceKey: createResourceKey("custom-element", "app-a"),
        targetKey: createResourceKey("custom-element", "app-b"),
        relationKind: "duplicate-registration",
      },
      "correctness-finding",
      "correctness.3.duplicate-registration",
    );
    const duplicateRegistrationB = createNode(
      {
        keyKind: "relation",
        sourceKey: createResourceKey("custom-element", "app-c"),
        targetKey: createResourceKey("custom-element", "app-d"),
        relationKind: "duplicate-registration",
      },
      "correctness-finding",
      "correctness.3.duplicate-registration",
    );

    for (const node of [duplicateRegistrationA, duplicateRegistrationB]) {
      nodeStore.set(node);
    }

    expect(() => indexStore.upsert(duplicateRegistrationA)).toThrow(/Cannot derive consultedContext/u);

    indexStore.upsertWithContext(duplicateRegistrationA, {
      correctnessContextOverride: componentContext,
    });
    indexStore.upsertWithContext(duplicateRegistrationB, {
      correctnessContextOverride: siblingContext,
    });

    expect(
      indexStore.getCorrectnessFindingsForContext(
        componentContext,
        "correctness.3.duplicate-registration",
      ),
    ).toEqual([duplicateRegistrationA]);
    expect(
      indexStore.scanCorrectnessFindingsByContextPrefix(
        "root/app",
        "correctness.3.duplicate-registration",
      ),
    ).toEqual([duplicateRegistrationA, duplicateRegistrationB]);

    expect(
      indexStore.deleteWithContext(duplicateRegistrationA.key, {
        correctnessContextOverride: componentContext,
      }),
    ).toBe(true);
    expect(
      indexStore.getCorrectnessFindingsForContext(
        componentContext,
        "correctness.3.duplicate-registration",
      ),
    ).toEqual([]);
  });
});
