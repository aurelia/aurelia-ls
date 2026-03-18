import type { NodeKey } from "./keys.js";
import type { ClaimNodeBase } from "./types.js";
import { GraphEdgeStore } from "./edge-store.js";
import { GraphNodeStore } from "./node-store.js";

export interface RetreatCascadeResult<TNode extends ClaimNodeBase = ClaimNodeBase> {
  readonly staleNodes: readonly TNode[];
  readonly maxDepth: number;
}

export interface RetreatCascadeOptions {
  readonly edgeStore: GraphEdgeStore;
  readonly nodeStore: GraphNodeStore;
  readonly maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_EDGE_CLASSES = [
  "support",
  "completeness",
  "context-admission",
  "reachability-scope",
] as const;

export function applyRetreatCascade(
  changedNodeKeys: readonly NodeKey[],
  options: RetreatCascadeOptions,
): RetreatCascadeResult {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const visited = new Set<string>();
  const staleNodes: ClaimNodeBase[] = [];

  for (const key of changedNodeKeys) {
    cascadeFromNode(key, 0, maxDepth, options.edgeStore, options.nodeStore, visited, staleNodes);
  }

  return {
    staleNodes,
    maxDepth,
  };
}

function cascadeFromNode(
  key: NodeKey,
  depth: number,
  maxDepth: number,
  edgeStore: GraphEdgeStore,
  nodeStore: GraphNodeStore,
  visited: Set<string>,
  staleNodes: ClaimNodeBase[],
): void {
  if (depth >= maxDepth) {
    throw new Error(
      `Retreat cascade exceeded the supported depth of ${maxDepth}.`,
    );
  }

  for (const edgeClass of DEFAULT_EDGE_CLASSES) {
    const outgoing = edgeStore.getOutgoing(key, edgeClass);
    for (const edge of outgoing) {
      const targetNode = nodeStore.markStale(edge.targetNodeKey);
      if (targetNode == null) {
        continue;
      }

      const targetKeyId = JSON.stringify(edge.targetNodeKey);
      if (visited.has(targetKeyId)) {
        continue;
      }

      visited.add(targetKeyId);
      staleNodes.push(targetNode);
      cascadeFromNode(
        edge.targetNodeKey,
        depth + 1,
        maxDepth,
        edgeStore,
        nodeStore,
        visited,
        staleNodes,
      );
    }
  }
}
