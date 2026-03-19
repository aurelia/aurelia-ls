import { describe, expect, it } from "vitest";
import {
  ClaimGraph,
  GraphEvaluatorRegistry,
  GraphPullEngine,
  type ClaimNodeBase,
  type GraphEvaluatorRegistration,
  type SupportEdge,
} from "../../out/graph/index.js";

function createNode(
  familyTag = "claim.identity.custom-element",
  canonicalName = "app",
  claimState: ClaimNodeBase["claimState"] = "holds",
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
    claimState,
    validityState: "stale",
    revisionToken: 0,
    retentionTier: "warm",
  };
}

function createRegistration(
  callback: GraphEvaluatorRegistration["callback"],
): GraphEvaluatorRegistration {
  return {
    callback,
    dependencyEdgeClasses: ["support"],
    evaluatorId: "resource-observation",
    familyTags: ["claim.identity.custom-element"],
    primaryOutputNodeKinds: ["resource-identity"],
  };
}

describe("semantic-authority graph pull engine", () => {
  it("returns up-to-date nodes without dispatching", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const node = createNode();
    node.validityState = "valid";
    graph.upsertNode(node);

    const pullEngine = new GraphPullEngine({
      evaluatorRegistry: registry,
      graph,
    });

    const result = await pullEngine.pullNode(node.key);

    expect(result.status).toBe("up-to-date");
    expect(result.node).toBe(node);
    expect(result.cutoffAppliedNodeKeys).toEqual([]);
  });

  it("restores the previous revision token when cutoff holds", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const node = createNode();

    graph.upsertNode(node);
    const priorRevision = node.revisionToken;

    registry.register(
      createRegistration(({ mutation, targetNode }) => {
        mutation.upsertNode({
          ...targetNode,
          validityState: "valid",
        });
      }),
    );

    const pullEngine = new GraphPullEngine({
      evaluatorRegistry: registry,
      graph,
    });

    const result = await pullEngine.pullNode(node.key);

    expect(result.status).toBe("pulled");
    expect(result.cutoffAppliedNodeKeys).toEqual([node.key]);
    expect(graph.getNode(node.key)?.revisionToken).toBe(priorRevision);
    expect(graph.getNode(node.key)?.validityState).toBe("valid");
    expect(result.propagatedChanges).toBeNull();
  });

  it("propagates staleness when green values change", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const node = createNode();
    const dependent = createNode("claim.identity.custom-attribute", "dependent");

    graph.upsertNode(node);
    graph.upsertNode(dependent);
    const supportEdge: SupportEdge = {
      edgeClass: "support",
      sourceNodeKey: node.key,
      targetNodeKey: dependent.key,
      mechanismId: "declaration-surface",
      revisionToken: 0,
    };
    graph.addEdge(supportEdge);

    registry.register(
      createRegistration(({ mutation, targetNode }) => {
        mutation.upsertNode({
          ...targetNode,
          claimState: "fails",
          validityState: "valid",
        });
      }),
    );

    const pullEngine = new GraphPullEngine({
      evaluatorRegistry: registry,
      graph,
    });

    const result = await pullEngine.pullNode(node.key);

    expect(result.status).toBe("pulled");
    expect(result.cutoffAppliedNodeKeys).toEqual([]);
    expect(result.propagatedChanges?.staleNodes.map((currentNode) => currentNode.key)).toEqual([
      dependent.key,
    ]);
    expect(graph.getNode(dependent.key)?.validityState).toBe("stale");
  });

  it("forwards demand-driven requests through the same pull engine", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const node = createNode();
    const dependent = createNode("claim.identity.custom-attribute", "dependent");

    graph.upsertNode(node);
    graph.upsertNode(dependent);

    registry.register(
      createRegistration(({ mutation, targetNode }) => {
        mutation.upsertNode({
          ...targetNode,
          validityState: "valid",
        });
        mutation.requestNodeEvaluation(dependent.key);
      }),
    );

    const pullEngine = new GraphPullEngine({
      evaluatorRegistry: registry,
      graph,
    });

    const dependentRegistration = createRegistration(({ mutation, targetNode }) => {
      mutation.upsertNode({
        ...targetNode,
        claimState: "fails",
        validityState: "valid",
      });
    });
    registry.register({
      ...dependentRegistration,
      evaluatorId: "dependent-resource-observation",
      familyTags: [dependent.familyTag],
    });

    await pullEngine.pullNode(node.key);

    expect(graph.getNode(node.key)?.validityState).toBe("valid");
    expect(graph.getNode(dependent.key)?.claimState).toBe("fails");
    expect(graph.getNode(dependent.key)?.validityState).toBe("valid");
  });

  it("surfaces error results without propagating stale state", async () => {
    const graph = new ClaimGraph();
    const registry = new GraphEvaluatorRegistry();
    const node = createNode();

    graph.upsertNode(node);
    registry.register(
      createRegistration(() => {
        throw new Error("callback failed");
      }),
    );

    const pullEngine = new GraphPullEngine({
      evaluatorRegistry: registry,
      graph,
    });

    const result = await pullEngine.pullNode(node.key);

    expect(result.status).toBe("error");
    expect(result.propagatedChanges).toBeNull();
    expect(graph.getNode(node.key)?.claimState).toBe("error");
    expect(graph.getNode(node.key)?.validityState).toBe("valid");
  });
});
