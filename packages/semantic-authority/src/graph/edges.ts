import type { EdgeClass } from "../shared/edges.js";
import type { NodeKey } from "./keys.js";

export interface GraphEdgeBase {
  readonly edgeClass: EdgeClass;
  readonly sourceKey: NodeKey;
  readonly targetKey: NodeKey;
}

export interface IndexedGraphEdge extends GraphEdgeBase {
  readonly edgeId: string;
}
