import { describe, expect, it } from "vitest";
import {
  ClaimGraph,
  type ClaimNodeBase,
  type CompletenessEdge,
  type ContextAdmissionEdge,
  type ResourceKey,
} from "../../out/graph/index.js";
import {
  serializeBoundaryKey,
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
  key: ClaimNodeBase["key"],
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

describe("semantic-authority claim graph entry surface", () => {
  it("keeps direct, scan, and reverse indexes coherent across public mutation calls", async () => {
    const graph = new ClaimGraph();
    const elementKey = createResourceKey("custom-element", "app");
    const commandKey = createResourceKey("binding-command", "trigger");
    const consultedWorld = serializeConsultedWorld({
      worldIdentifier: "root/app",
      boundaryIdentifier: "root/app",
    });
    const consultedContext = serializeConsultedContext({
      scopeChainRef: "root/app",
      boundaryIdentifier: "root",
    });
    const anchor = serializeOccurrenceAnchor({
      documentUri: "file:///app.html",
      position: { line: 0, character: 1 },
    });

    const fieldFact = createNode(
      {
        keyKind: "field-fact",
        resourceKey: elementKey,
        fieldPath: "name",
      },
      "field-fact",
      "claim.resource.custom-element-field",
    );
    const admission = createNode(
      {
        keyKind: "admission",
        consultedWorld,
        subjectKey: elementKey,
      },
      "admission",
      "claim.availability.resource-admission",
    );
    const position = createNode(
      {
        keyKind: "occurrence",
        consultedContext,
        occurrenceAnchor: anchor,
        family: "binding-command-segment",
      },
      "position-classification",
      "claim.position.vocabulary-gated-classification",
    );
    const openBoundary = createNode(
      {
        keyKind: "open-boundary",
        targetFamilyId: "claim.position.vocabulary-gated-classification",
        subjectKey: elementKey,
        blockedDependency: "vocabulary-admission-completeness",
      },
      "open-boundary",
      "witness.boundary.open-boundary",
    );
    const completenessTarget = {
      keyKind: "completeness" as const,
      boundaryKey: serializeBoundaryKey({
        completenessFamily: "resource-scope",
        consultedContext,
        resourceFamily: "custom-element",
      }),
      completenessFamily: "resource-scope" as const,
    };
    const completenessEdge: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey: admission.key,
      targetNodeKey: completenessTarget,
      mechanismId: "resource-scope-completeness",
      revisionToken: 0,
    };
    const contextAdmissionEdge: ContextAdmissionEdge = {
      edgeClass: "context-admission",
      sourceNodeKey: admission.key,
      targetNodeKey: openBoundary.key,
      mechanismId: "resource-admission-completeness",
      revisionToken: 0,
    };

    const result = await graph.runMutation((mutation) => {
      mutation.upsertNode(fieldFact);
      mutation.upsertNode(admission);
      mutation.upsertNode(position);
      mutation.upsertNode(openBoundary);
      mutation.addEdge(completenessEdge);
      mutation.addEdge(contextAdmissionEdge);
      return "committed";
    });

    expect(result.result).toBe("committed");
    expect(graph.getFieldFactsForResource(elementKey)).toEqual([
      expect.objectContaining({
        familyTag: fieldFact.familyTag,
        key: fieldFact.key,
        nodeKind: fieldFact.nodeKind,
      }),
    ]);
    expect(graph.getAdmissionsForSubject(elementKey)).toEqual([
      expect.objectContaining({
        familyTag: admission.familyTag,
        key: admission.key,
        nodeKind: admission.nodeKind,
      }),
    ]);
    expect(graph.getAdmissionsForWorldByKind(consultedWorld, "claim.availability.resource-admission")).toEqual([
      expect.objectContaining({
        familyTag: admission.familyTag,
        key: admission.key,
        nodeKind: admission.nodeKind,
      }),
    ]);
    expect(graph.getPositionClassificationsForOccurrence(consultedContext, anchor)).toEqual([
      expect.objectContaining({
        familyTag: position.familyTag,
        key: position.key,
        nodeKind: position.nodeKind,
      }),
    ]);
    expect(graph.getOpenBoundariesForTargetFamily("claim.position.vocabulary-gated-classification", elementKey)).toEqual([
      expect.objectContaining({
        familyTag: openBoundary.familyTag,
        key: openBoundary.key,
        nodeKind: openBoundary.nodeKind,
      }),
    ]);
    expect(graph.getIncomingEdges(completenessTarget, "completeness")).toEqual([
      expect.objectContaining({
        edgeClass: completenessEdge.edgeClass,
        sourceNodeKey: completenessEdge.sourceNodeKey,
        targetNodeKey: completenessEdge.targetNodeKey,
        mechanismId: completenessEdge.mechanismId,
      }),
    ]);
    expect(graph.getIncomingEdges(openBoundary.key, "context-admission")).toEqual([
      expect.objectContaining({
        edgeClass: contextAdmissionEdge.edgeClass,
        sourceNodeKey: contextAdmissionEdge.sourceNodeKey,
        targetNodeKey: contextAdmissionEdge.targetNodeKey,
        mechanismId: contextAdmissionEdge.mechanismId,
      }),
    ]);

    expect(graph.deleteNode(admission.key)).toBe(true);
    expect(graph.getAdmissionsForSubject(elementKey)).toEqual([]);
    expect(
      graph.getAdmissionsForWorldByKind(consultedWorld, "claim.availability.resource-admission"),
    ).toEqual([]);

    expect(graph.deleteNode(position.key)).toBe(true);
    expect(graph.getPositionClassificationsForOccurrence(consultedContext, anchor)).toEqual([]);

    expect(graph.deleteNode(fieldFact.key)).toBe(true);
    expect(graph.getFieldFactsForResource(elementKey)).toEqual([]);
  });

  it("supports public node deletion and open-boundary cleanup through the coordinated mutation surface", () => {
    const graph = new ClaimGraph();
    const elementKey = createResourceKey("custom-element", "app");
    const openBoundary = createNode(
      {
        keyKind: "open-boundary",
        targetFamilyId: "claim.identity.custom-element",
        subjectKey: elementKey,
        blockedDependency: "resource-scope-completeness",
      },
      "open-boundary",
      "witness.boundary.open-boundary",
    );

    graph.upsertNode(openBoundary);
    expect(graph.getOpenBoundariesForTargetFamily("claim.identity.custom-element", elementKey)).toEqual([
      openBoundary,
    ]);

    expect(graph.deleteOpenBoundariesFor("claim.identity.custom-element", elementKey)).toBe(1);
    expect(graph.getNode(openBoundary.key)).toBeUndefined();
    expect(graph.getOpenBoundariesForTargetFamily("claim.identity.custom-element", elementKey)).toEqual([]);
  });

  it("supports correctness context overrides and demand forwarding on the public graph surface", async () => {
    const requested: ClaimNodeBase["key"][] = [];
    const graph = new ClaimGraph({
      nodeEvaluationRequester: {
        requestNodeEvaluation(nodeKey) {
          requested.push(nodeKey);
        },
      },
    });
    const relationFinding = createNode(
      {
        keyKind: "relation",
        sourceKey: createResourceKey("custom-element", "a"),
        targetKey: createResourceKey("custom-element", "b"),
        relationKind: "duplicate-registration",
      },
      "correctness-finding",
      "correctness.3.duplicate-registration",
    );

    expect(() => graph.upsertNode(relationFinding)).toThrow(/Cannot derive consultedContext/u);

    graph.upsertNode(relationFinding, {
      correctnessContextOverride: "root/app/component-a::component-a",
    });
    expect(
      graph.scanCorrectnessFindingsByContextPrefix(
        "root/app/component-a::",
        "correctness.3.duplicate-registration",
      ),
    ).toEqual([relationFinding]);

    await graph.requestNodeEvaluation(relationFinding.key);
    expect(requested).toEqual([relationFinding.key]);
  });
});
