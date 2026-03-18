import type { EdgeClass } from "../shared/edges.js";
import type { MechanismId, RevisionToken } from "../shared/types.js";
import { serializeGraphNodeKey, type NodeKey } from "./keys.js";

export interface GraphEdgeBase {
  readonly edgeClass: EdgeClass;
  readonly sourceNodeKey: NodeKey;
  readonly targetNodeKey: NodeKey;
  readonly mechanismId: MechanismId;
  revisionToken: RevisionToken;
}

export interface SupportEdge extends GraphEdgeBase {
  readonly edgeClass: "support";
}

export interface CompletenessEdge extends GraphEdgeBase {
  readonly edgeClass: "completeness";
}

export interface ContextAdmissionEdge extends GraphEdgeBase {
  readonly edgeClass: "context-admission";
}

export interface ReachabilityScopeEdge extends GraphEdgeBase {
  readonly edgeClass: "reachability-scope";
}

export interface BridgeMappingEdge extends GraphEdgeBase {
  readonly edgeClass: "bridge-mapping";
}

export type GraphEdgeUnion =
  | SupportEdge
  | CompletenessEdge
  | ContextAdmissionEdge
  | ReachabilityScopeEdge
  | BridgeMappingEdge;

export type GraphEdgeIdentity = Pick<
  GraphEdgeBase,
  "edgeClass" | "sourceNodeKey" | "targetNodeKey" | "mechanismId"
>;

export function serializeGraphEdgeIdentity(edge: GraphEdgeIdentity): string {
  return [
    edge.edgeClass,
    serializeGraphNodeKey(edge.sourceNodeKey),
    serializeGraphNodeKey(edge.targetNodeKey),
    edge.mechanismId,
  ].join(":");
}
