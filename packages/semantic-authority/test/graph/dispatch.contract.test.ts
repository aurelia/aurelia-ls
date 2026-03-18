import { describe, expect, it } from "vitest";
import {
  dispatchRegisteredEvaluator,
  GraphEdgeStore,
  type GraphEntityKey,
  GraphEvaluatorRegistry,
  GraphNodeStore,
  type ClaimNodeBase,
  type GraphEvaluatorRegistration,
  type SupportEdge,
} from "../../out/graph/index.js";

function createResourceNode(
  familyTag = "claim.identity.custom-element",
  canonicalName = "app",
): ClaimNodeBase {
  return {
    key: {
      keyKind: "resource",
      resourceKind: "custom-element",
      canonicalName,
      ownerKey: null,
    },
    nodeKind: "resource-identity",
    familyTag,
    claimState: "holds",
    validityState: "stale",
    revisionToken: 0,
    retentionTier: "warm",
  };
}

function createRegistration(
  overrides: Partial<GraphEvaluatorRegistration> = {},
): GraphEvaluatorRegistration {
  return {
    evaluatorId: "resource-observation",
    familyTags: ["claim.identity.custom-element"],
    dependencyEdgeClasses: ["support"],
    primaryOutputNodeKinds: ["resource-identity"],
    callback: () => undefined,
    ...overrides,
  };
}

describe("semantic-authority graph evaluator dispatch", () => {
  it("registers evaluators by family tag and rejects duplicate family ownership", () => {
    const registry = new GraphEvaluatorRegistry();
    registry.register(createRegistration());

    expect(registry.hasFamilyTag("claim.identity.custom-element")).toBe(true);
    expect(registry.getByFamilyTag("claim.identity.custom-element")?.evaluatorId).toBe(
      "resource-observation",
    );

    expect(() =>
      registry.register(
        createRegistration({
          evaluatorId: "duplicate-resource-observation",
        }),
      ),
    ).toThrow(/already registered to another evaluator/u);
  });

  it("dispatches a registered evaluator and commits buffered node and edge mutations", async () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();
    const registry = new GraphEvaluatorRegistry();
    const targetNode = createResourceNode();
    const dependentNode = createResourceNode("claim.identity.custom-attribute", "if");
    const supportEdge: SupportEdge = {
      edgeClass: "support",
      sourceNodeKey: targetNode.key,
      targetNodeKey: dependentNode.key,
      mechanismId: "declaration-surface",
      revisionToken: 0,
    };

    nodeStore.set(targetNode);

    registry.register(
      createRegistration({
        callback: ({ mutation, targetNode: currentTargetNode }) => {
          mutation.upsertNode({
            ...currentTargetNode,
            claimState: "fails",
            validityState: "valid",
          });
          mutation.upsertNode({
            ...dependentNode,
            validityState: "valid",
          });
          mutation.addEdge(supportEdge);
        },
      }),
    );

    const result = await dispatchRegisteredEvaluator(targetNode.key, registry, {
      edgeStore,
      nodeStore,
    });

    expect(result.status).toBe("ok");
    expect(nodeStore.get(targetNode.key)?.claimState).toBe("fails");
    expect(nodeStore.get(dependentNode.key)?.validityState).toBe("valid");
    expect(edgeStore.getOutgoing(targetNode.key, "support")).toHaveLength(1);
  });

  it("marks the target node as error and drops buffered mutations when the callback throws", async () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();
    const registry = new GraphEvaluatorRegistry();
    const targetNode = createResourceNode();
    const dependentNode = createResourceNode("claim.identity.custom-attribute", "if");

    nodeStore.set(targetNode);

    registry.register(
      createRegistration({
        callback: ({ mutation }) => {
          mutation.upsertNode(dependentNode);
          throw new Error("callback failed");
        },
      }),
    );

    const result = await dispatchRegisteredEvaluator(targetNode.key, registry, {
      edgeStore,
      nodeStore,
    });

    expect(result.status).toBe("error");
    expect(nodeStore.get(targetNode.key)?.claimState).toBe("error");
    expect(nodeStore.get(targetNode.key)?.validityState).toBe("valid");
    expect(nodeStore.get(dependentNode.key)).toBeUndefined();
  });

  it("can delete matching open boundaries through the mutation handle", async () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();
    const registry = new GraphEvaluatorRegistry();
    const targetNode = createResourceNode();
    const openBoundaryNode: ClaimNodeBase = {
      key: {
        keyKind: "open-boundary",
        targetFamilyId: "claim.identity.custom-element",
        subjectKey: targetNode.key as GraphEntityKey,
        blockedDependency: "resource-scope",
      },
      nodeKind: "open-boundary",
      familyTag: "witness.boundary.open-boundary",
      claimState: "unevaluated",
      validityState: "valid",
      revisionToken: 0,
      retentionTier: "warm",
    };

    nodeStore.set(targetNode);
    nodeStore.set(openBoundaryNode);

    registry.register(
      createRegistration({
        callback: ({ mutation }) => {
          const deleted = mutation.deleteOpenBoundariesFor(
            "claim.identity.custom-element",
            targetNode.key as GraphEntityKey,
          );
          expect(deleted).toBe(1);
        },
      }),
    );

    const result = await dispatchRegisteredEvaluator(targetNode.key, registry, {
      edgeStore,
      nodeStore,
    });

    expect(result.status).toBe("ok");
    expect(nodeStore.get(openBoundaryNode.key)).toBeUndefined();
  });

  it("forwards demand-driven evaluation requests through the injected requester without implementing scheduling", async () => {
    const nodeStore = new GraphNodeStore();
    const edgeStore = new GraphEdgeStore();
    const registry = new GraphEvaluatorRegistry();
    const targetNode = createResourceNode();
    const requested: ClaimNodeBase["key"][] = [];

    nodeStore.set(targetNode);
    registry.register(
      createRegistration({
        callback: ({ mutation }) => {
          mutation.requestNodeEvaluation(targetNode.key);
        },
      }),
    );

    await dispatchRegisteredEvaluator(targetNode.key, registry, {
      edgeStore,
      nodeEvaluationRequester: {
        requestNodeEvaluation(nodeKey) {
          requested.push(nodeKey);
        },
      },
      nodeStore,
    });

    expect(requested).toEqual([targetNode.key]);
  });
});
