import { describe, expect, it } from "vitest";
import {
  GraphEdgeStore,
  type CompletenessEdge,
  type ContextAdmissionEdge,
  type ResourceKey,
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

function createCompletenessTarget() {
  return {
    keyKind: "completeness" as const,
    boundaryKey: serializeBoundaryKey({
      completenessFamily: "resource-scope",
      consultedContext: serializeConsultedContext({
        scopeChainRef: "root/app",
        boundaryIdentifier: "root",
      }),
      resourceFamily: "custom-element",
    }),
    completenessFamily: "resource-scope" as const,
  };
}

describe("semantic-authority graph reverse edge indexes", () => {
  it("provides class-filtered reverse lookup for completeness and context-admission edges", () => {
    const store = new GraphEdgeStore();
    const targetNodeKey = createCompletenessTarget();

    const completenessEdgeA: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey: createResourceKey("custom-element", "app-a"),
      targetNodeKey,
      mechanismId: "resource-scope-completeness",
      revisionToken: 0,
    };
    const completenessEdgeB: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey: createResourceKey("custom-element", "app-b"),
      targetNodeKey,
      mechanismId: "template-scope-completeness",
      revisionToken: 0,
    };
    const contextAdmissionEdge: ContextAdmissionEdge = {
      edgeClass: "context-admission",
      sourceNodeKey: createResourceKey("custom-attribute", "if"),
      targetNodeKey,
      mechanismId: "resource-admission-completeness",
      revisionToken: 0,
    };

    store.add(completenessEdgeA);
    store.add(completenessEdgeB);
    store.add(contextAdmissionEdge);

    expect(store.getIncomingByClass(targetNodeKey, "completeness")).toEqual([
      completenessEdgeA,
      completenessEdgeB,
    ]);
    expect(store.getIncomingByClass(targetNodeKey, "context-admission")).toEqual([
      contextAdmissionEdge,
    ]);
    expect(store.getIncoming(targetNodeKey, "completeness")).toEqual([
      completenessEdgeA,
      completenessEdgeB,
    ]);
  });

  it("keeps reverse edge buckets coherent when one class is deleted and another remains", () => {
    const store = new GraphEdgeStore();
    const targetNodeKey = createCompletenessTarget();

    const completenessEdge: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey: createResourceKey("custom-element", "app"),
      targetNodeKey,
      mechanismId: "resource-scope-completeness",
      revisionToken: 0,
    };
    const contextAdmissionEdge: ContextAdmissionEdge = {
      edgeClass: "context-admission",
      sourceNodeKey: createResourceKey("custom-attribute", "if"),
      targetNodeKey,
      mechanismId: "resource-admission-completeness",
      revisionToken: 0,
    };

    store.add(completenessEdge);
    store.add(contextAdmissionEdge);

    expect(store.delete(completenessEdge)).toBe(true);
    expect(store.getIncomingByClass(targetNodeKey, "completeness")).toEqual([]);
    expect(store.getIncomingByClass(targetNodeKey, "context-admission")).toEqual([
      contextAdmissionEdge,
    ]);

    expect(store.delete(contextAdmissionEdge)).toBe(true);
    expect(store.getIncomingByClass(targetNodeKey, "context-admission")).toEqual([]);
    expect(store.getIncoming(targetNodeKey)).toEqual([]);
  });

  it("clears reverse edge indexes together with the primary edge store", () => {
    const store = new GraphEdgeStore();
    const targetNodeKey = createCompletenessTarget();
    const completenessEdge: CompletenessEdge = {
      edgeClass: "completeness",
      sourceNodeKey: createResourceKey("custom-element", "app"),
      targetNodeKey,
      mechanismId: "resource-scope-completeness",
      revisionToken: 0,
    };

    store.add(completenessEdge);
    store.clear();

    expect(store.getIncomingByClass(targetNodeKey, "completeness")).toEqual([]);
    expect(store.getIncoming(targetNodeKey)).toEqual([]);
    expect(store.size).toBe(0);
  });
});
