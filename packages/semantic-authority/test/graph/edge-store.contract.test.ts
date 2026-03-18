import { describe, expect, it } from "vitest";
import {
  GraphEdgeStore,
  GraphNodeStore,
  GraphRevisionClock,
  type BridgeMappingEdge,
  type ClaimNodeBase,
  type CompletenessKey,
  type CompletenessEdge,
  type ContextAdmissionEdge,
  type ResourceKey,
  type SupportEdge,
} from "../../out/graph/index.js";
import {
  serializeBoundaryKey,
  serializeConsultedContext,
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

function createSupportEdge(
  overrides: Partial<SupportEdge> = {},
): SupportEdge {
  return {
    edgeClass: "support",
    sourceNodeKey: createResourceKey("custom-element", "app"),
    targetNodeKey: createResourceKey("custom-attribute", "if"),
    mechanismId: "declaration-surface",
    revisionToken: 0,
    ...overrides,
  };
}

describe("semantic-authority graph edge store", () => {
  it("stores edges for outgoing and incoming traversal", () => {
    const store = new GraphEdgeStore();
    const edge = createSupportEdge();

    store.add(edge);

    expect(store.has(edge)).toBe(true);
    expect(store.getOutgoing(edge.sourceNodeKey)).toEqual([edge]);
    expect(store.getIncoming(edge.targetNodeKey)).toEqual([edge]);
    expect(store.size).toBe(1);
  });

  it("filters traversal by edge class", () => {
    const store = new GraphEdgeStore();
    const sourceNodeKey = createResourceKey("custom-element", "app");
    const targetNodeKey = createResourceKey("custom-attribute", "if");

    const supportEdge = createSupportEdge({
      sourceNodeKey,
      targetNodeKey,
    });
    const completenessEdge: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey,
      targetNodeKey,
      mechanismId: "resource-scope-completeness",
      revisionToken: 0,
    };

    store.add(supportEdge);
    store.add(completenessEdge);

    expect(store.getOutgoing(sourceNodeKey, "support")).toEqual([supportEdge]);
    expect(store.getOutgoing(sourceNodeKey, "completeness")).toEqual([completenessEdge]);
    expect(store.getIncoming(targetNodeKey, "support")).toEqual([supportEdge]);
  });

  it("stamps monotonic revision tokens and can share the graph clock with node storage", () => {
    const clock = new GraphRevisionClock();
    const nodeStore = new GraphNodeStore(clock);
    const edgeStore = new GraphEdgeStore(clock);
    const node: ClaimNodeBase = {
      key: createResourceKey("custom-element", "app"),
      nodeKind: "resource-identity",
      familyTag: "claim.identity.custom-element",
      claimState: "holds",
      validityState: "valid",
      revisionToken: 0,
      retentionTier: "warm",
    };

    nodeStore.set(node);
    const edge = createSupportEdge({
      sourceNodeKey: node.key,
    });
    edgeStore.add(edge);

    expect(node.revisionToken).toBe(1);
    expect(edge.revisionToken).toBe(2);
    expect(clock.currentRevisionToken).toBe(2);
  });

  it("deletes edges by full identity including mechanismId", () => {
    const store = new GraphEdgeStore();
    const edge = createSupportEdge();

    store.add(edge);

    expect(store.delete(edge)).toBe(true);
    expect(store.delete(edge)).toBe(false);
    expect(store.getOutgoing(edge.sourceNodeKey)).toEqual([]);
  });

  it("supports completeness-style incoming traversal across multiple edge classes", () => {
    const store = new GraphEdgeStore();
    const targetNodeKey: CompletenessKey = {
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

    const supportEdge: SupportEdge = createSupportEdge({
      sourceNodeKey: createResourceKey("custom-element", "app"),
      targetNodeKey,
      mechanismId: "support-bundle",
    });
    const contextAdmissionEdge: ContextAdmissionEdge = {
      edgeClass: "context-admission",
      sourceNodeKey: createResourceKey("custom-element", "app"),
      targetNodeKey,
      mechanismId: "resource-admission-completeness",
      revisionToken: 0,
    };
    const bridgeEdge: BridgeMappingEdge = {
      edgeClass: "bridge-mapping",
      sourceNodeKey: createResourceKey("custom-element", "app"),
      targetNodeKey,
      mechanismId: "template-bridge",
      revisionToken: 0,
    };

    store.add(supportEdge);
    store.add(contextAdmissionEdge);
    store.add(bridgeEdge);

    expect(store.getIncoming(targetNodeKey)).toEqual([
      supportEdge,
      contextAdmissionEdge,
      bridgeEdge,
    ]);
    expect(store.getIncoming(targetNodeKey, "context-admission")).toEqual([contextAdmissionEdge]);
  });
});
