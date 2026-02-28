/**
 * Claim Graph — Unified Reactive Graph Implementation
 *
 * Generalizes ProjectDepGraph (project-semantics/deps/graph.ts) to all
 * domains. Same proven patterns: bidirectional edges, eager staleness
 * propagation, pull-based lazy evaluation, value-sensitive cutoff via
 * pointer equality on interned green values.
 *
 * New: edge kinds (data/completeness), per-node-kind evaluation callbacks,
 * forward references for cycle resolution, fixed-point convergence.
 */

import type {
  NodeId,
  NodeKind,
  EdgeKind,
  Freshness,
  EvaluateCallback,
  EvaluationContext,
  EvaluationResult,
  PullResult,
  ForwardRef,
  ClaimGraph,
  ClaimGraphOptions,
  GraphNodeState,
  GraphEdge,
  ConvergenceResult,
  StalenessHandler,
} from './types.js';

// =============================================================================
// Internal Node Data
// =============================================================================

interface NodeEntry {
  readonly kind: NodeKind;
  readonly key: string;
  freshness: Freshness;
  green: unknown | undefined;
  red: unknown | undefined;
}

// =============================================================================
// Graph Implementation
// =============================================================================

export function createClaimGraph(options: ClaimGraphOptions): ClaimGraph {
  const nodes = new Map<NodeId, NodeEntry>();
  const forwardEdges = new Map<NodeId, Map<NodeId, EdgeKind>>();
  const backwardEdges = new Map<NodeId, Map<NodeId, EdgeKind>>();
  const callbacks = new Map<NodeKind, EvaluateCallback>();
  const keyToId = new Map<string, NodeId>();
  const evaluationStack: NodeId[] = [];
  let staleHandler: StalenessHandler | null = null;
  let totalEdges = 0;

  // ── Node management ──────────────────────────────────────────────────

  function nodeKey(kind: NodeKind, key: string): string {
    return `${kind}::${key}`;
  }

  function createNode(kind: NodeKind, key: string): NodeId {
    const nk = nodeKey(kind, key);
    const existing = keyToId.get(nk);
    if (existing !== undefined) return existing;

    const id = nk as NodeId;
    keyToId.set(nk, id);
    nodes.set(id, { kind, key, freshness: 'unevaluated', green: undefined, red: undefined });
    return id;
  }

  function findNode(kind: NodeKind, key: string): NodeId | undefined {
    return keyToId.get(nodeKey(kind, key));
  }

  // ── Edge management ──────────────────────────────────────────────────

  function addEdge(from: NodeId, to: NodeId, edgeKind: EdgeKind): void {
    let fwd = forwardEdges.get(from);
    if (!fwd) { fwd = new Map(); forwardEdges.set(from, fwd); }

    const existingKind = fwd.get(to);
    if (existingKind !== undefined) {
      // Edge exists. If same kind, skip. If different kind, upgrade to 'data'
      // (data subsumes completeness for staleness propagation).
      if (existingKind !== edgeKind && existingKind !== 'data') {
        fwd.set(to, 'data');
        backwardEdges.get(to)?.set(from, 'data');
      }
      return;
    }

    fwd.set(to, edgeKind);
    let bwd = backwardEdges.get(to);
    if (!bwd) { bwd = new Map(); backwardEdges.set(to, bwd); }
    bwd.set(from, edgeKind);
    totalEdges++;
  }

  /**
   * Clear dependency edges of a node (edges where nodeId is the dependent).
   * Called before re-evaluation so ctx.pull() can recapture current deps.
   */
  function clearDependencyEdges(nodeId: NodeId): void {
    const bwd = backwardEdges.get(nodeId);
    if (!bwd) return;
    for (const [dep] of bwd) {
      const fwd = forwardEdges.get(dep);
      if (fwd) {
        fwd.delete(nodeId);
        if (fwd.size === 0) forwardEdges.delete(dep);
      }
      totalEdges--;
    }
    bwd.clear();
  }

  // ── Staleness propagation ────────────────────────────────────────────

  function propagateStale(nodeId: NodeId, collector: Array<{ id: NodeId; kind: NodeKind; key: string }> | null): void {
    const entry = nodes.get(nodeId);
    if (!entry || entry.freshness === 'stale') return;
    entry.freshness = 'stale';
    if (collector) collector.push({ id: nodeId, kind: entry.kind, key: entry.key });

    const dependents = forwardEdges.get(nodeId);
    if (dependents) {
      for (const [dep] of dependents) {
        propagateStale(dep, collector);
      }
    }
  }

  function markStale(nodeId: NodeId): void {
    const collector: Array<{ id: NodeId; kind: NodeKind; key: string }> = [];
    propagateStale(nodeId, collector);
    if (collector.length > 0 && staleHandler) {
      staleHandler.onNodesStale(collector);
    }
  }

  // ── Input values ─────────────────────────────────────────────────────

  function setInputValue(nodeId: NodeId, green: unknown, red: unknown): void {
    const entry = nodes.get(nodeId);
    if (!entry) return;

    const oldGreen = entry.green;
    entry.green = green;
    entry.red = red;
    entry.freshness = 'fresh';

    // Cutoff at input level: only propagate if green changed
    if (oldGreen !== green) {
      const dependents = forwardEdges.get(nodeId);
      if (dependents) {
        const collector: Array<{ id: NodeId; kind: NodeKind; key: string }> = [];
        for (const [dep] of dependents) {
          propagateStale(dep, collector);
        }
        if (collector.length > 0 && staleHandler) {
          staleHandler.onNodesStale(collector);
        }
      }
    }
  }

  // ── Pull — the core algorithm ────────────────────────────────────────

  function pull(nodeId: NodeId): PullResult {
    const entry = nodes.get(nodeId);
    if (!entry) {
      return { value: undefined, green: undefined, isCycle: false, forwardRef: null };
    }

    // Fresh → return cached
    if (entry.freshness === 'fresh') {
      return { value: entry.red, green: entry.green, isCycle: false, forwardRef: null };
    }

    // Cycle detection: node already on the evaluation stack
    if (evaluationStack.includes(nodeId)) {
      const ref: ForwardRef = {
        nodeId,
        previousGreen: entry.green,
        previousRed: entry.red,
      };
      return { value: entry.red, green: entry.green, isCycle: true, forwardRef: ref };
    }

    // No callback registered for this kind → treat as input (mark fresh, return cached)
    const callback = callbacks.get(entry.kind);
    if (!callback) {
      entry.freshness = 'fresh';
      return { value: entry.red, green: entry.green, isCycle: false, forwardRef: null };
    }

    // Clear outgoing edges before re-evaluation — dependencies are
    // recaptured by ctx.pull() calls during callback execution.
    clearDependencyEdges(nodeId);

    // Push onto evaluation stack
    evaluationStack.push(nodeId);
    let hasCycleParticipants = false;

    const ctx: EvaluationContext = {
      pull(dependency: NodeId, edgeKind: EdgeKind = 'data'): PullResult {
        addEdge(dependency, nodeId, edgeKind);
        const result = pull(dependency);
        if (result.isCycle) hasCycleParticipants = true;
        return result;
      },
      findNode(kind: NodeKind, key: string): NodeId | undefined {
        return keyToId.get(nodeKey(kind, key));
      },
      createNode(kind: NodeKind, key: string): NodeId {
        return createNode(kind, key);
      },
    };

    const result = callback(nodeId, ctx);
    evaluationStack.pop();

    // Cutoff: compare green values
    const oldGreen = entry.green;
    entry.green = result.green;
    entry.red = result.red;
    entry.freshness = 'fresh';

    // If this evaluation encountered cycles, trigger automatic convergence.
    // Only the outermost evaluator in the cycle runs convergence — inner
    // evaluations just flag hasCycleParticipants.
    if (hasCycleParticipants && evaluationStack.length === 0) {
      // Collect all cycle participants: this node + nodes that returned isCycle
      const participants = collectCycleParticipants(nodeId);
      if (participants.length > 1) {
        converge(participants, options.convergenceBudget);
      }
    }

    return { value: entry.red, green: entry.green, isCycle: false, forwardRef: null };
  }

  // ── Cycle participant collection ───────────────────────────────────

  /**
   * Walk backward edges from a node to find all nodes involved in cycles.
   * A cycle participant is any node that was on the evaluation stack when
   * a cycle was detected (its pull returned isCycle=true).
   */
  function collectCycleParticipants(rootId: NodeId): NodeId[] {
    // Simple approach: collect all nodes reachable via mutual backward edges
    // that also have forward edges back (bidirectional relationship = cycle).
    const participants = new Set<NodeId>();
    participants.add(rootId);

    const bwd = backwardEdges.get(rootId);
    if (bwd) {
      for (const [dep] of bwd) {
        const depFwd = forwardEdges.get(dep);
        // If dep has a forward edge back to root (or transitively), it's in the cycle
        if (depFwd?.has(rootId)) {
          participants.add(dep);
        }
      }
    }

    return Array.from(participants);
  }

  // ── Convergence — fixed-point iteration ──────────────────────────────

  function converge(participants: NodeId[], budget: number): ConvergenceResult {
    for (let iteration = 1; iteration <= budget; iteration++) {
      // Capture ALL old greens BEFORE any re-evaluation
      const oldGreens = new Map<NodeId, unknown>();
      for (const nodeId of participants) {
        const entry = nodes.get(nodeId);
        if (entry) oldGreens.set(nodeId, entry.green);
      }

      // Mark all participants stale (without notifying handler — this is internal)
      for (const nodeId of participants) {
        const entry = nodes.get(nodeId);
        if (entry) entry.freshness = 'stale';
      }

      // Re-evaluate all participants
      for (const nodeId of participants) {
        pull(nodeId);
      }

      // Check for green changes against pre-iteration values
      let anyChanged = false;
      for (const nodeId of participants) {
        const entry = nodes.get(nodeId);
        if (entry && entry.green !== oldGreens.get(nodeId)) {
          anyChanged = true;
        }
      }

      if (!anyChanged) {
        return { converged: true, iterations: iteration, participants };
      }
    }

    return { converged: false, iterations: budget, participants };
  }

  // ── Observation ──────────────────────────────────────────────────────

  function getNode(nodeId: NodeId): GraphNodeState | undefined {
    const entry = nodes.get(nodeId);
    if (!entry) return undefined;
    return {
      id: nodeId,
      kind: entry.kind,
      key: entry.key,
      freshness: entry.freshness,
      green: entry.green,
      red: entry.red,
    };
  }

  function getEdgesFrom(nodeId: NodeId): ReadonlyArray<GraphEdge> {
    const fwd = forwardEdges.get(nodeId);
    if (!fwd) return [];
    const result: GraphEdge[] = [];
    for (const [to, edgeKind] of fwd) {
      result.push({ from: nodeId, to, edgeKind });
    }
    return result;
  }

  function getEdgesTo(nodeId: NodeId): ReadonlyArray<GraphEdge> {
    const bwd = backwardEdges.get(nodeId);
    if (!bwd) return [];
    const result: GraphEdge[] = [];
    for (const [from, edgeKind] of bwd) {
      result.push({ from, to: nodeId, edgeKind });
    }
    return result;
  }

  // ── Graph aggregate ──────────────────────────────────────────────────

  return {
    createNode,
    findNode,
    addEdge,
    markStale,
    pull,
    converge,

    registerCallback(kind: NodeKind, callback: EvaluateCallback): void {
      callbacks.set(kind, callback);
    },

    setInputValue,

    onStale(handler: StalenessHandler): void {
      staleHandler = handler;
    },

    getNode,
    getEdgesFrom,
    getEdgesTo,

    get nodeCount() { return nodes.size; },
    get edgeCount() { return totalEdges; },
    get staleCount() {
      let count = 0;
      for (const entry of nodes.values()) {
        if (entry.freshness === 'stale') count++;
      }
      return count;
    },
  };
}
