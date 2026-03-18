import type { EdgeClass } from "../shared/edges.js";
import { serializeGraphNodeKey, type NodeKey } from "./keys.js";
import { GraphRevisionClock } from "./revision-clock.js";
import {
  serializeGraphEdgeIdentity,
  type GraphEdgeIdentity,
  type GraphEdgeUnion,
} from "./edges.js";

export class GraphEdgeStore<TEdge extends GraphEdgeUnion = GraphEdgeUnion> {
  readonly #edges = new Map<string, TEdge>();
  readonly #incoming = new Map<string, Set<string>>();
  readonly #outgoing = new Map<string, Set<string>>();
  readonly #revisionClock: GraphRevisionClock;

  public constructor(revisionClock: GraphRevisionClock = new GraphRevisionClock()) {
    this.#revisionClock = revisionClock;
  }

  public get size(): number {
    return this.#edges.size;
  }

  public get currentRevisionToken(): number {
    return this.#revisionClock.currentRevisionToken;
  }

  public add(edge: TEdge): TEdge {
    const edgeId = serializeGraphEdgeIdentity(edge);
    const sourceId = serializeGraphNodeKey(edge.sourceNodeKey);
    const targetId = serializeGraphNodeKey(edge.targetNodeKey);

    edge.revisionToken = this.#revisionClock.issue();

    if (!this.#edges.has(edgeId)) {
      this.#addAdjacency(this.#outgoing, sourceId, edgeId);
      this.#addAdjacency(this.#incoming, targetId, edgeId);
    }

    this.#edges.set(edgeId, edge);
    return edge;
  }

  public clear(): void {
    this.#edges.clear();
    this.#incoming.clear();
    this.#outgoing.clear();
  }

  public delete(identity: GraphEdgeIdentity): boolean {
    const edgeId = serializeGraphEdgeIdentity(identity);
    const edge = this.#edges.get(edgeId);
    if (edge == null) {
      return false;
    }

    this.#edges.delete(edgeId);
    this.#removeAdjacency(this.#outgoing, serializeGraphNodeKey(edge.sourceNodeKey), edgeId);
    this.#removeAdjacency(this.#incoming, serializeGraphNodeKey(edge.targetNodeKey), edgeId);
    return true;
  }

  public getIncoming(targetNodeKey: NodeKey, edgeClass?: EdgeClass): readonly TEdge[] {
    return this.#collect(this.#incoming.get(serializeGraphNodeKey(targetNodeKey)), edgeClass);
  }

  public getOutgoing(sourceNodeKey: NodeKey, edgeClass?: EdgeClass): readonly TEdge[] {
    return this.#collect(this.#outgoing.get(serializeGraphNodeKey(sourceNodeKey)), edgeClass);
  }

  public has(identity: GraphEdgeIdentity): boolean {
    return this.#edges.has(serializeGraphEdgeIdentity(identity));
  }

  public values(): IterableIterator<TEdge> {
    return this.#edges.values();
  }

  #addAdjacency(index: Map<string, Set<string>>, nodeId: string, edgeId: string): void {
    let bucket = index.get(nodeId);
    if (bucket == null) {
      bucket = new Set<string>();
      index.set(nodeId, bucket);
    }

    bucket.add(edgeId);
  }

  #collect(edgeIds: Set<string> | undefined, edgeClass?: EdgeClass): readonly TEdge[] {
    if (edgeIds == null || edgeIds.size === 0) {
      return [];
    }

    const edges: TEdge[] = [];
    for (const edgeId of edgeIds) {
      const edge = this.#edges.get(edgeId);
      if (edge == null) {
        continue;
      }

      if (edgeClass != null && edge.edgeClass !== edgeClass) {
        continue;
      }

      edges.push(edge);
    }

    return edges;
  }

  #removeAdjacency(index: Map<string, Set<string>>, nodeId: string, edgeId: string): void {
    const bucket = index.get(nodeId);
    if (bucket == null) {
      return;
    }

    bucket.delete(edgeId);
    if (bucket.size === 0) {
      index.delete(nodeId);
    }
  }
}
