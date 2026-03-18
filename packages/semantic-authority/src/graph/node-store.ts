import { serializeGraphNodeKey, type NodeKey } from "./keys.js";
import { GraphRevisionClock } from "./revision-clock.js";
import type { ClaimNodeBase, NodeKindTag } from "./types.js";

export class GraphNodeStore<TNode extends ClaimNodeBase = ClaimNodeBase> {
  readonly #nodes = new Map<string, TNode>();
  readonly #revisionClock: GraphRevisionClock;

  public constructor(revisionClock: GraphRevisionClock = new GraphRevisionClock()) {
    this.#revisionClock = revisionClock;
  }

  public get size(): number {
    return this.#nodes.size;
  }

  public get currentRevisionToken(): number {
    return this.#revisionClock.currentRevisionToken;
  }

  public clear(): void {
    this.#nodes.clear();
  }

  public delete(key: NodeKey): boolean {
    return this.#nodes.delete(serializeGraphNodeKey(key));
  }

  public get(key: NodeKey): TNode | undefined {
    return this.#nodes.get(serializeGraphNodeKey(key));
  }

  public getByNodeKind<K extends NodeKindTag>(
    nodeKind: K,
    key: NodeKey,
  ): Extract<TNode, { readonly nodeKind: K }> | undefined {
    const node = this.get(key);
    if (node == null || node.nodeKind !== nodeKind) {
      return undefined;
    }

    return node as Extract<TNode, { readonly nodeKind: K }>;
  }

  public has(key: NodeKey): boolean {
    return this.#nodes.has(serializeGraphNodeKey(key));
  }

  public set(node: TNode): TNode {
    node.revisionToken = this.#revisionClock.issue();
    this.#nodes.set(serializeGraphNodeKey(node.key), node);
    return node;
  }

  public values(): IterableIterator<TNode> {
    return this.#nodes.values();
  }
}
