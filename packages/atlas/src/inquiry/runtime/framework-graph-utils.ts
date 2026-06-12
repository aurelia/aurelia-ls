import type { SourceRange } from "../locus.js";

export interface FrameworkGraphNodeMergeRow {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly packageId?: string;
  readonly packageName?: string;
  readonly source?: SourceRange;
}

export interface FrameworkGraphEdgeRow {
  readonly id: string;
}

export class FrameworkGraphAccumulator<
  TNode extends FrameworkGraphNodeMergeRow,
  TEdge extends FrameworkGraphEdgeRow,
> {
  readonly #nodes = new Map<string, TNode>();
  readonly #edges = new Map<string, TEdge>();

  addNode(row: TNode): TNode {
    return addOrMergeFrameworkGraphNode(this.#nodes, row);
  }

  addEdge(row: TEdge): void {
    if (!this.#edges.has(row.id)) {
      this.#edges.set(row.id, row);
    }
  }

  getNode(id: string): TNode | undefined {
    return this.#nodes.get(id);
  }

  nodeRows(compare?: (left: TNode, right: TNode) => number): readonly TNode[] {
    const rows = [...this.#nodes.values()];
    return compare === undefined ? rows : rows.sort(compare);
  }

  edgeRows(compare?: (left: TEdge, right: TEdge) => number): readonly TEdge[] {
    const rows = [...this.#edges.values()];
    return compare === undefined ? rows : rows.sort(compare);
  }
}

export function addOrMergeFrameworkGraphNode<TRow extends FrameworkGraphNodeMergeRow>(
  nodes: Map<string, TRow>,
  row: TRow,
): TRow {
  const current = nodes.get(row.id);
  if (current !== undefined) {
    const merged = {
      ...current,
      packageId: current.packageId ?? row.packageId,
      packageName: current.packageName ?? row.packageName,
      source: current.source ?? row.source,
    };
    nodes.set(row.id, merged);
    return merged;
  }
  nodes.set(row.id, row);
  return row;
}

export function compareFrameworkGraphNodes(
  left: FrameworkGraphNodeMergeRow,
  right: FrameworkGraphNodeMergeRow,
): number {
  return (
    left.kind.localeCompare(right.kind) ||
    left.name.localeCompare(right.name) ||
    (left.packageId ?? "").localeCompare(right.packageId ?? "")
  );
}
