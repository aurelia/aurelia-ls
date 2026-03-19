import type { FamilyTag } from "../shared/types.js";
import { ClaimGraph } from "./graph.js";
import type { NodeKey } from "./keys.js";
import type {
  GraphCommittedNodeChange,
  GraphEvaluatorDispatchContext,
  GraphEvaluatorRegistration,
  GraphNodeEvaluationRequester,
} from "./protocol.js";
import type { ClaimNodeBase } from "./types.js";

export interface GraphDispatchOptions {
  readonly graph: ClaimGraph;
  readonly nodeEvaluationRequester?: GraphNodeEvaluationRequester;
}

export type GraphDispatchResult =
  | {
      readonly committedNodeChanges: readonly GraphCommittedNodeChange[];
      readonly deletedNodeKeys: readonly NodeKey[];
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
  const liveNode = options.graph.getNode(targetNodeKey);
  if (liveNode == null) {
    throw new Error("Cannot dispatch evaluator for a node that does not exist in the graph.");
  }

  const registration = registry.getByFamilyTag(liveNode.familyTag);
  if (registration == null) {
    const erroredNode = markNodeError(liveNode, options.graph);
    return {
      error: new Error(`No evaluator is registered for family '${liveNode.familyTag}'.`),
      node: erroredNode,
      status: "error",
    };
  }

  const mutation = options.graph.createMutationHandle(options.nodeEvaluationRequester);
  const targetNode = cloneGraphValue(liveNode);

  try {
    await registration.callback({
      mutation,
      targetNode,
    } satisfies GraphEvaluatorDispatchContext);
    const commitSummary = mutation.commit();

    return {
      committedNodeChanges: commitSummary.committedNodeChanges,
      deletedNodeKeys: commitSummary.deletedNodeKeys,
      node: options.graph.getNode(targetNodeKey) ?? liveNode,
      registration,
      status: "ok",
    };
  } catch (error) {
    const erroredNode = markNodeError(liveNode, options.graph);
    return {
      error,
      node: erroredNode,
      status: "error",
    };
  }
}

function cloneGraphValue<T>(value: T): T {
  return structuredClone(value);
}

function markNodeError(
  liveNode: ClaimNodeBase,
  graph: ClaimGraph,
): ClaimNodeBase {
  const erroredNode = cloneGraphValue(liveNode);
  erroredNode.claimState = "error";
  erroredNode.validityState = "valid";
  graph.upsertNode(erroredNode);
  return erroredNode;
}
