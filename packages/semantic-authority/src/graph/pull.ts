import {
  dispatchRegisteredEvaluator,
  type GraphCommittedNodeChange,
  type GraphDispatchOptions,
  type GraphEvaluatorRegistry,
} from "./dispatch.js";
import { compareGreenValueFields } from "./cutoff.js";
import { GraphEdgeStore } from "./edge-store.js";
import type { NodeKey } from "./keys.js";
import { GraphNodeStore } from "./node-store.js";
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
  readonly edgeStore: GraphEdgeStore;
  readonly evaluatorRegistry: GraphEvaluatorRegistry;
  readonly nodeStore: GraphNodeStore;
}

export class GraphPullEngine implements GraphNodeEvaluationRequester {
  readonly #activePulls = new Map<string, Promise<GraphPullResult>>();
  readonly #dispatchOptions: GraphDispatchOptions;
  readonly #edgeStore: GraphEdgeStore;
  readonly #evaluatorRegistry: GraphEvaluatorRegistry;
  readonly #nodeStore: GraphNodeStore;

  public constructor(options: GraphPullOptions) {
    this.#edgeStore = options.edgeStore;
    this.#evaluatorRegistry = options.evaluatorRegistry;
    this.#nodeStore = options.nodeStore;
    this.#dispatchOptions = {
      edgeStore: options.edgeStore,
      nodeStore: options.nodeStore,
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
    const liveNode = this.#nodeStore.get(nodeKey);
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
      const currentNode = this.#nodeStore.get(change.current.key);
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
            edgeStore: this.#edgeStore,
            nodeStore: this.#nodeStore,
          });

    return {
      cutoffAppliedNodeKeys,
      node: this.#nodeStore.get(nodeKey),
      propagatedChanges,
      status: "pulled",
    };
  }
}
