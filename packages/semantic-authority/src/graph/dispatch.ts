import type { FamilyTag } from "../shared/types.js";
import type { GraphEdgeStore } from "./edge-store.js";
import type { GraphEdgeIdentity, GraphEdgeUnion } from "./edges.js";
import { serializeGraphEntityKey, serializeGraphNodeKey, type GraphEntityKey, type NodeKey } from "./keys.js";
import type { GraphNodeStore } from "./node-store.js";
import type {
  GraphEvaluatorDispatchContext,
  GraphEvaluatorRegistration,
  GraphMutationHandle,
  GraphNodeEvaluationRequester,
} from "./protocol.js";
import type { ClaimNodeBase, NodeKindTag } from "./types.js";

export interface GraphDispatchOptions {
  readonly edgeStore: GraphEdgeStore;
  readonly nodeStore: GraphNodeStore;
  readonly nodeEvaluationRequester?: GraphNodeEvaluationRequester;
}

export type GraphDispatchResult =
  | {
      readonly node: ClaimNodeBase;
      readonly registration: GraphEvaluatorRegistration;
      readonly status: "ok";
    }
  | {
      readonly error: unknown;
      readonly node: ClaimNodeBase;
      readonly status: "error";
    };

export class GraphEvaluatorRegistry {
  readonly #registrationsByEvaluatorId = new Map<string, GraphEvaluatorRegistration>();
  readonly #registrationsByFamilyTag = new Map<FamilyTag, GraphEvaluatorRegistration>();

  public clear(): void {
    this.#registrationsByEvaluatorId.clear();
    this.#registrationsByFamilyTag.clear();
  }

  public getByEvaluatorId(evaluatorId: string): GraphEvaluatorRegistration | undefined {
    return this.#registrationsByEvaluatorId.get(evaluatorId);
  }

  public getByFamilyTag(familyTag: FamilyTag): GraphEvaluatorRegistration | undefined {
    return this.#registrationsByFamilyTag.get(familyTag);
  }

  public hasFamilyTag(familyTag: FamilyTag): boolean {
    return this.#registrationsByFamilyTag.has(familyTag);
  }

  public register(registration: GraphEvaluatorRegistration): void {
    if (this.#registrationsByEvaluatorId.has(registration.evaluatorId)) {
      throw new Error(`Evaluator '${registration.evaluatorId}' is already registered.`);
    }

    for (const familyTag of registration.familyTags) {
      if (this.#registrationsByFamilyTag.has(familyTag)) {
        throw new Error(`Family '${familyTag}' is already registered to another evaluator.`);
      }
    }

    this.#registrationsByEvaluatorId.set(registration.evaluatorId, registration);
    for (const familyTag of registration.familyTags) {
      this.#registrationsByFamilyTag.set(familyTag, registration);
    }
  }

  public values(): IterableIterator<GraphEvaluatorRegistration> {
    return this.#registrationsByEvaluatorId.values();
  }
}

export async function dispatchRegisteredEvaluator(
  targetNodeKey: NodeKey,
  registry: GraphEvaluatorRegistry,
  options: GraphDispatchOptions,
): Promise<GraphDispatchResult> {
  const liveNode = options.nodeStore.get(targetNodeKey);
  if (liveNode == null) {
    throw new Error("Cannot dispatch evaluator for a node that does not exist in the graph.");
  }

  const registration = registry.getByFamilyTag(liveNode.familyTag);
  if (registration == null) {
    const erroredNode = markNodeError(liveNode, options.nodeStore);
    return {
      error: new Error(`No evaluator is registered for family '${liveNode.familyTag}'.`),
      node: erroredNode,
      status: "error",
    };
  }

  const mutation = new BufferedGraphMutationHandle(
    options.nodeStore,
    options.edgeStore,
    options.nodeEvaluationRequester,
  );
  const targetNode = cloneGraphValue(liveNode);

  try {
    await registration.callback({
      mutation,
      targetNode,
    } satisfies GraphEvaluatorDispatchContext);
    mutation.commit();

    return {
      node: options.nodeStore.get(targetNodeKey) ?? liveNode,
      registration,
      status: "ok",
    };
  } catch (error) {
    const erroredNode = markNodeError(liveNode, options.nodeStore);
    return {
      error,
      node: erroredNode,
      status: "error",
    };
  }
}

class BufferedGraphMutationHandle implements GraphMutationHandle {
  readonly #edgeDeletes = new Map<string, GraphEdgeIdentity>();
  readonly #edgeStore: GraphEdgeStore;
  readonly #edgeUpserts = new Map<string, GraphEdgeUnion>();
  readonly #nodeDeletes = new Map<string, NodeKey>();
  readonly #nodeStore: GraphNodeStore;
  readonly #nodeUpserts = new Map<string, ClaimNodeBase>();
  readonly #nodeEvaluationRequester?: GraphNodeEvaluationRequester;

  public constructor(
    nodeStore: GraphNodeStore,
    edgeStore: GraphEdgeStore,
    nodeEvaluationRequester?: GraphNodeEvaluationRequester,
  ) {
    this.#nodeStore = nodeStore;
    this.#edgeStore = edgeStore;
    this.#nodeEvaluationRequester = nodeEvaluationRequester;
  }

  public addEdge(edge: GraphEdgeUnion): void {
    const edgeId = serializeEdgeIdentity(edge);
    this.#edgeDeletes.delete(edgeId);
    this.#edgeUpserts.set(edgeId, cloneGraphValue(edge));
  }

  public deleteEdge(identity: GraphEdgeIdentity): void {
    const edgeId = serializeEdgeIdentity(identity);
    this.#edgeUpserts.delete(edgeId);
    this.#edgeDeletes.set(edgeId, cloneGraphValue(identity));
  }

  public deleteNode(nodeKey: NodeKey): void {
    const nodeId = serializeGraphNodeKey(nodeKey);
    this.#nodeUpserts.delete(nodeId);
    this.#nodeDeletes.set(nodeId, cloneGraphValue(nodeKey));
  }

  public deleteOpenBoundariesFor(targetFamilyId: FamilyTag, subjectKey: GraphEntityKey): number {
    let deleted = 0;
    const subjectKeyId = serializeGraphEntityKey(subjectKey);

    for (const node of this.#collectVisibleNodes()) {
      if (node.key.keyKind !== "open-boundary") {
        continue;
      }

      if (node.key.targetFamilyId !== targetFamilyId) {
        continue;
      }

      if (serializeGraphEntityKey(node.key.subjectKey) !== subjectKeyId) {
        continue;
      }

      this.deleteNode(node.key);
      deleted += 1;
    }

    return deleted;
  }

  public getNode(nodeKey: NodeKey): ClaimNodeBase | undefined {
    const nodeId = serializeGraphNodeKey(nodeKey);
    if (this.#nodeDeletes.has(nodeId)) {
      return undefined;
    }

    const pending = this.#nodeUpserts.get(nodeId);
    if (pending != null) {
      return cloneGraphValue(pending);
    }

    const liveNode = this.#nodeStore.get(nodeKey);
    return liveNode == null ? undefined : cloneGraphValue(liveNode);
  }

  public getNodeByKind<K extends NodeKindTag>(
    nodeKind: K,
    nodeKey: NodeKey,
  ): Extract<ClaimNodeBase, { readonly nodeKind: K }> | undefined {
    const node = this.getNode(nodeKey);
    if (node == null || node.nodeKind !== nodeKind) {
      return undefined;
    }

    return node as Extract<ClaimNodeBase, { readonly nodeKind: K }>;
  }

  public requestNodeEvaluation(nodeKey: NodeKey): void | Promise<void> {
    return this.#nodeEvaluationRequester?.requestNodeEvaluation(nodeKey);
  }

  public upsertNode(node: ClaimNodeBase): void {
    const nodeId = serializeGraphNodeKey(node.key);
    this.#nodeDeletes.delete(nodeId);
    this.#nodeUpserts.set(nodeId, cloneGraphValue(node));
  }

  public commit(): void {
    for (const identity of this.#edgeDeletes.values()) {
      this.#edgeStore.delete(identity);
    }

    for (const nodeKey of this.#nodeDeletes.values()) {
      this.#nodeStore.delete(nodeKey);
    }

    for (const node of this.#nodeUpserts.values()) {
      this.#nodeStore.set(cloneGraphValue(node));
    }

    for (const edge of this.#edgeUpserts.values()) {
      this.#edgeStore.add(cloneGraphValue(edge));
    }
  }

  #collectVisibleNodes(): readonly ClaimNodeBase[] {
    const visible = new Map<string, ClaimNodeBase>();

    for (const node of this.#nodeStore.values()) {
      visible.set(serializeGraphNodeKey(node.key), node);
    }

    for (const [nodeId] of this.#nodeDeletes) {
      visible.delete(nodeId);
    }

    for (const [nodeId, node] of this.#nodeUpserts.entries()) {
      visible.set(nodeId, node);
    }

    return [...visible.values()];
  }
}

function cloneGraphValue<T>(value: T): T {
  return structuredClone(value);
}

function markNodeError(
  liveNode: ClaimNodeBase,
  nodeStore: GraphNodeStore,
): ClaimNodeBase {
  const erroredNode = cloneGraphValue(liveNode);
  erroredNode.claimState = "error";
  erroredNode.validityState = "valid";
  nodeStore.set(erroredNode);
  return erroredNode;
}

function serializeEdgeIdentity(identity: GraphEdgeIdentity): string {
  return [
    identity.edgeClass,
    serializeGraphNodeKey(identity.sourceNodeKey),
    serializeGraphNodeKey(identity.targetNodeKey),
    identity.mechanismId,
  ].join(":");
}
