import { describe, expect, it } from "vitest";
import {
  ClaimGraph,
  dispatchRegisteredEvaluator,
  type GraphEntityKey,
  GraphEvaluatorRegistry,
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
    const graph = new ClaimGraph();
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

    graph.upsertNode(targetNode);

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
      graph,
    });

    expect(result.status).toBe("ok");
    expect(graph.getNode(targetNode.key)?.claimState).toBe("fails");
    expect(graph.getNode(dependentNode.key)?.validityState).toBe("valid");
    expect(graph.getOutgoingEdges(targetNode.key, "support")).toHaveLength(1);
  });

  it("marks the target node as error and drops buffered mutations when the callback throws", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const targetNode = createResourceNode();
    const dependentNode = createResourceNode("claim.identity.custom-attribute", "if");

    graph.upsertNode(targetNode);

    registry.register(
      createRegistration({
        callback: ({ mutation }) => {
          mutation.upsertNode(dependentNode);
          throw new Error("callback failed");
        },
      }),
    );

    const result = await dispatchRegisteredEvaluator(targetNode.key, registry, {
      graph,
    });

    expect(result.status).toBe("error");
    expect(graph.getNode(targetNode.key)?.claimState).toBe("error");
    expect(graph.getNode(targetNode.key)?.validityState).toBe("valid");
    expect(graph.getNode(dependentNode.key)).toBeUndefined();
  });

  it("can delete matching open boundaries through the mutation handle", async () => {
    const graph = new ClaimGraph();
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

    graph.upsertNode(targetNode);
    graph.upsertNode(openBoundaryNode);

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
      graph,
    });

    expect(result.status).toBe("ok");
    expect(graph.getNode(openBoundaryNode.key)).toBeUndefined();
  });

  it("forwards demand-driven evaluation requests through the injected requester without implementing scheduling", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const targetNode = createResourceNode();
    const requested: ClaimNodeBase["key"][] = [];

    graph.upsertNode(targetNode);
    registry.register(
      createRegistration({
        callback: ({ mutation }) => {
          mutation.requestNodeEvaluation(targetNode.key);
        },
      }),
    );

    await dispatchRegisteredEvaluator(targetNode.key, registry, {
      graph,
      nodeEvaluationRequester: {
        requestNodeEvaluation(nodeKey) {
          requested.push(nodeKey);
        },
      },
    });

    expect(requested).toEqual([targetNode.key]);
  });
});
