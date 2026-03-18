import type { EdgeClass } from "../shared/edges.js";
import type { FamilyTag } from "../shared/types.js";
import type { GraphEdgeIdentity, GraphEdgeUnion } from "./edges.js";
import type { GraphEntityKey, NodeKey } from "./keys.js";
import type { ClaimNodeBase, NodeKindTag } from "./types.js";

export interface GraphNodeEvaluationRequester {
  requestNodeEvaluation(nodeKey: NodeKey): void | Promise<void>;
}

export interface GraphMutationHandle {
  addEdge(edge: GraphEdgeUnion): void;
  deleteEdge(identity: GraphEdgeIdentity): void;
  deleteNode(nodeKey: NodeKey): void;
  deleteOpenBoundariesFor(targetFamilyId: FamilyTag, subjectKey: GraphEntityKey): number;
  getNode(nodeKey: NodeKey): ClaimNodeBase | undefined;
  getNodeByKind<K extends NodeKindTag>(
    nodeKind: K,
    nodeKey: NodeKey,
  ): Extract<ClaimNodeBase, { readonly nodeKind: K }> | undefined;
  requestNodeEvaluation(nodeKey: NodeKey): void | Promise<void>;
  upsertNode(node: ClaimNodeBase): void;
}

export interface GraphEvaluatorDispatchContext {
  readonly mutation: GraphMutationHandle;
  readonly targetNode: ClaimNodeBase;
}

export type GraphEvaluatorCallback = (
  context: GraphEvaluatorDispatchContext,
) => void | Promise<void>;

export interface GraphEvaluatorRegistration {
  readonly callback: GraphEvaluatorCallback;
  readonly dependencyEdgeClasses: readonly EdgeClass[];
  readonly evaluatorId: string;
  readonly familyTags: readonly FamilyTag[];
  readonly primaryOutputNodeKinds: readonly NodeKindTag[];
  readonly secondaryOutputNodeKinds?: readonly NodeKindTag[];
}
