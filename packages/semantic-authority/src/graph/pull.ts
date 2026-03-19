import {
  dispatchRegisteredEvaluator,
  type GraphDispatchOptions,
  type GraphEvaluatorRegistry,
} from "./dispatch.js";
import { compareGreenValueFields } from "./cutoff.js";
import { ClaimGraph } from "./graph.js";
import type { NodeKey } from "./keys.js";
import type { GraphNodeEvaluationRequester } from "./protocol.js";
import { applyRetreatCascade, type RetreatCascadeResult } from "./retreat.js";
import type { ClaimNodeBase } from "./types.js";

export interface GraphPullResult {
  readonly cutoffAppliedNodeKeys: readonly NodeKey[];
  readonly node: ClaimNodeBase | undefined;
  readonly propagatedChanges: RetreatCascadeResult | null;
  readonly status: "error" | "missing" | "pulled" | "up-to-date";
}

export interface GraphPullOptions {
  readonly evaluatorRegistry: GraphEvaluatorRegistry;
  readonly graph: ClaimGraph;
}

export class GraphPullEngine implements GraphNodeEvaluationRequester {
  readonly #activePulls = new Map<string, Promise<GraphPullResult>>();
  readonly #dispatchOptions: GraphDispatchOptions;
  readonly #evaluatorRegistry: GraphEvaluatorRegistry;
  readonly #graph: ClaimGraph;

  public constructor(options: GraphPullOptions) {
    this.#graph = options.graph;
    this.#evaluatorRegistry = options.evaluatorRegistry;
    this.#dispatchOptions = {
      graph: options.graph,
      nodeEvaluationRequester: this,
    };
  }

  public async pullNode(nodeKey: NodeKey): Promise<GraphPullResult> {
    const keyId = JSON.stringify(nodeKey);
    const active = this.#activePulls.get(keyId);
    if (active != null) {
      return active;
    }

    const pull = this.#performPull(nodeKey);
    this.#activePulls.set(keyId, pull);

    try {
      return await pull;
    } finally {
      this.#activePulls.delete(keyId);
    }
  }

  public requestNodeEvaluation(nodeKey: NodeKey): Promise<void> {
    return this.pullNode(nodeKey).then(() => undefined);
  }

  async #performPull(nodeKey: NodeKey): Promise<GraphPullResult> {
    const liveNode = this.#graph.getNode(nodeKey);
    if (liveNode == null) {
      return {
        cutoffAppliedNodeKeys: [],
        node: undefined,
        propagatedChanges: null,
        status: "missing",
      };
    }

    if (liveNode.validityState === "valid") {
      return {
        cutoffAppliedNodeKeys: [],
        node: liveNode,
        propagatedChanges: null,
        status: "up-to-date",
      };
    }

    const dispatchResult = await dispatchRegisteredEvaluator(
      nodeKey,
      this.#evaluatorRegistry,
      this.#dispatchOptions,
    );

    if (dispatchResult.status === "error") {
      return {
        cutoffAppliedNodeKeys: [],
        node: dispatchResult.node,
        propagatedChanges: null,
        status: "error",
      };
    }

    const cutoffAppliedNodeKeys: NodeKey[] = [];
    const changedNodeKeys: NodeKey[] = [];

    for (const change of dispatchResult.committedNodeChanges) {
      const currentNode = this.#graph.getNode(change.current.key);
      if (currentNode == null) {
        continue;
      }

      currentNode.validityState = "valid";

      if (change.previous != null && compareGreenValueFields(change.previous, currentNode)) {
        currentNode.revisionToken = change.previous.revisionToken;
        cutoffAppliedNodeKeys.push(change.current.key);
        continue;
      }

      changedNodeKeys.push(change.current.key);
    }

    const propagatedChanges =
      changedNodeKeys.length === 0
        ? null
        : applyRetreatCascade(changedNodeKeys, {
            edgeStore: this.#graph.edgeStore,
            nodeStore: this.#graph.nodeStore,
          });

    return {
      cutoffAppliedNodeKeys,
      node: this.#graph.getNode(nodeKey),
      propagatedChanges,
      status: "pulled",
    };
  }
}
