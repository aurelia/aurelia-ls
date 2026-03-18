import { describe, expect, it } from "vitest";
import {
  applyRetreatCascade,
  GraphEdgeStore,
  GraphNodeStore,
  type ClaimNodeBase,
  type CompletenessKey,
  type CompletenessEdge,
  type ContextAdmissionEdge,
  type ResourceKey,
  type ReachabilityScopeEdge,
  type SupportEdge,
} from "../../out/graph/index.js";
import {
  serializeBoundaryKey,
  serializeConsultedContext,
  serializeConsultedWorld,
  serializeOccurrenceAnchor,
} from "../../out/shared/index.js";

function createResourceKey(
  kind: ResourceKey["resourceKind"] = "custom-element",
  canonicalName = "app",
): ResourceKey {
  return {
    keyKind: "resource",
    resourceKind: kind,
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

describe("semantic-authority graph retreat cascade", () => {
  it("marks direct and transitive dependents stale through support edges", () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();

    const source = createNode(
      createResourceKey("custom-element", "app"),
      "resource-identity",
      "claim.identity.custom-element",
    );
    const dependent = createNode(
      createResourceKey("custom-attribute", "if"),
      "resource-identity",
      "claim.identity.custom-attribute",
    );
    const transitive = createNode(
      {
        keyKind: "bindable",
        ownerResourceKey: dependent.key as ResourceKey,
        propertyName: "value",
      },
      "bindable-identity",
      "claim.interface.bindable",
    );

    nodeStore.set(source);
    nodeStore.set(dependent);
    nodeStore.set(transitive);

    const supportEdge: SupportEdge = {
      edgeClass: "support",
      sourceNodeKey: source.key,
      targetNodeKey: dependent.key,
      mechanismId: "declaration-surface",
      revisionToken: 0,
    };
    const transitiveSupport: SupportEdge = {
      edgeClass: "support",
      sourceNodeKey: dependent.key,
      targetNodeKey: transitive.key,
      mechanismId: "support-bundle",
      revisionToken: 0,
    };

    edgeStore.add(supportEdge);
    edgeStore.add(transitiveSupport);

    const result = applyRetreatCascade([source.key], {
      edgeStore,
      nodeStore,
    });

    expect(result.staleNodes.map((node) => node.key)).toEqual([
      dependent.key,
      transitive.key,
    ]);
    expect(nodeStore.get(dependent.key)?.validityState).toBe("stale");
    expect(nodeStore.get(transitive.key)?.validityState).toBe("stale");
    expect(nodeStore.get(source.key)?.validityState).toBe("valid");
  });

  it("reopens negative dependents through completeness edges", () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();

    const witnessKey: CompletenessKey = {
      keyKind: "completeness",
      boundaryKey: serializeBoundaryKey({
        completenessFamily: "resource-scope",
        consultedContext: serializeConsultedContext({
          scopeChainRef: "root/app",
          boundaryIdentifier: "root",
        }),
        resourceFamily: "custom-element",
      }),
      completenessFamily: "resource-scope",
    };
    const witness = createNode(
      witnessKey,
      "completeness-witness",
      "witness.completeness.resource-scope",
    );
    const finding = createNode(
      createResourceKey("custom-element", "app"),
      "correctness-finding",
      "correctness.1.resource-scope-absence",
    );

    nodeStore.set(witness);
    nodeStore.set(finding);

    const completenessEdge: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey: witness.key,
      targetNodeKey: finding.key,
      mechanismId: "resource-scope-completeness",
      revisionToken: 0,
    };

    edgeStore.add(completenessEdge);

    applyRetreatCascade([witness.key], {
      edgeStore,
      nodeStore,
    });

    expect(nodeStore.get(finding.key)?.validityState).toBe("stale");
  });

  it("supports context-admission and reachability-scope propagation paths", () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();

    const admission = createNode(
      {
        keyKind: "admission",
        consultedWorld: serializeConsultedWorld({
          worldIdentifier: "root/app",
          boundaryIdentifier: "root/app",
        }),
        subjectKey: createResourceKey("custom-element", "app"),
      },
      "admission",
      "claim.availability.resource-admission",
    );
    const reachability = createNode(
      {
        keyKind: "reachability",
        consultedContext: serializeConsultedContext({
          scopeChainRef: "root/app",
          boundaryIdentifier: "root",
        }),
        subjectKey: createResourceKey("custom-element", "app"),
      },
      "reachability",
      "claim.reachability.resource-scope",
    );
    const classification = createNode(
      {
        keyKind: "occurrence",
        consultedContext: serializeConsultedContext({
          scopeChainRef: "root/app",
          boundaryIdentifier: "root",
        }),
        occurrenceAnchor: serializeOccurrenceAnchor({
          documentUri: "file:///src/app.html",
          position: { line: 1, character: 1 },
        }),
        family: "tag-name",
      },
      "position-classification",
      "claim.position.resource-gated-classification",
    );

    nodeStore.set(admission);
    nodeStore.set(reachability);
    nodeStore.set(classification);

    const contextEdge: ContextAdmissionEdge = {
      edgeClass: "context-admission",
      sourceNodeKey: admission.key,
      targetNodeKey: reachability.key,
      mechanismId: "resource-admission",
      revisionToken: 0,
    };
    const reachabilityEdge: ReachabilityScopeEdge = {
      edgeClass: "reachability-scope",
      sourceNodeKey: reachability.key,
      targetNodeKey: classification.key,
      mechanismId: "resource-scope",
      revisionToken: 0,
    };

    edgeStore.add(contextEdge);
    edgeStore.add(reachabilityEdge);

    applyRetreatCascade([admission.key], {
      edgeStore,
      nodeStore,
    });

    expect(nodeStore.get(reachability.key)?.validityState).toBe("stale");
    expect(nodeStore.get(classification.key)?.validityState).toBe("stale");
  });

  it("does not issue new revision tokens when stale-marking nodes", () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();

    const source = createNode(
      createResourceKey("custom-element", "app"),
      "resource-identity",
      "claim.identity.custom-element",
    );
    const dependent = createNode(
      createResourceKey("custom-attribute", "if"),
      "resource-identity",
      "claim.identity.custom-attribute",
    );

    nodeStore.set(source);
    nodeStore.set(dependent);
    const originalRevision = dependent.revisionToken;

    const supportEdge: SupportEdge = {
      edgeClass: "support",
      sourceNodeKey: source.key,
      targetNodeKey: dependent.key,
      mechanismId: "declaration-surface",
      revisionToken: 0,
    };

    edgeStore.add(supportEdge);
    applyRetreatCascade([source.key], {
      edgeStore,
      nodeStore,
    });

    expect(nodeStore.get(dependent.key)?.revisionToken).toBe(originalRevision);
    expect(nodeStore.get(dependent.key)?.validityState).toBe("stale");
  });

  it("enforces the five-level cascade depth boundary", () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();

    const nodes = Array.from({ length: 7 }, (_, index) =>
      createNode(
        createResourceKey("custom-element", `app-${index}`),
        "resource-identity",
        "claim.identity.custom-element",
      ),
    );

    for (const node of nodes) {
      nodeStore.set(node);
    }

    for (let index = 0; index < nodes.length - 1; index += 1) {
      edgeStore.add({
        edgeClass: "support",
        sourceNodeKey: nodes[index].key,
        targetNodeKey: nodes[index + 1].key,
        mechanismId: `support-${index}`,
        revisionToken: 0,
      });
    }

    expect(() =>
      applyRetreatCascade([nodes[0].key], {
        edgeStore,
        nodeStore,
      }),
    ).toThrow(/supported depth of 5/u);
  });
});
