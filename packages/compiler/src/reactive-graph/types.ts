/**
 * Claim Graph — Unified Reactive Graph Types
 *
 * One graph for all domains (project analysis, template analysis, surfaces).
 * Ordering emergent from dependency edges. Algorithms are evaluation callbacks.
 *
 * The graph is opaque to node content. Green/red values are `unknown` at the
 * graph level — type safety is enforced at the callback boundary.
 * Cutoff comparison is pointer equality (===) on green values after interning.
 */

// =============================================================================
// Identity
// =============================================================================

/** Branded string for graph node identity. Format: `${kind}::${key}`. */
export type NodeId = string & { readonly __brand: 'NodeId' };

/**
 * Open enumeration. The graph is opaque to node kinds.
 * Domain-specific kinds are defined by callers (e.g., 'file', 'evaluation',
 * 'conclusion', 'template-ir', 'template-bind').
 */
export type NodeKind = string;

/**
 * Two edge kinds — structural commitment from L1 change-propagation.
 *
 * Data: "my value depends on your value."
 *   Failed dependency → gap (I can't compute my value).
 *
 * Completeness: "my safety depends on your exhaustiveness."
 *   Failed dependency → confidence demotion (I computed a value
 *   but can't guarantee exhaustive negative assertion).
 *
 * Both propagate staleness identically. Both trigger pull ordering.
 * The difference: what the evaluation callback does on failure.
 */
export type EdgeKind = 'data' | 'completeness';

export type Freshness = 'fresh' | 'stale' | 'unevaluated';

// =============================================================================
// Evaluation Callbacks
// =============================================================================

/**
 * Per-node-kind evaluation callback. Registered once per kind.
 * The callback IS the algorithm that was previously a "pipeline stage."
 *
 * The callback:
 *   1. Uses ctx.pull() to read dependencies (creates edges)
 *   2. Computes a result
 *   3. Returns green (for cutoff) + red (for consumers)
 *
 * The graph handles: freshness, staleness propagation, cutoff,
 * cycle detection, forward refs, fixed-point iteration.
 */
export interface EvaluateCallback {
  (nodeId: NodeId, ctx: EvaluationContext): EvaluationResult;
}

export interface EvaluationResult {
  readonly green: unknown;
  readonly red: unknown;
}

/**
 * What a callback can do during execution.
 */
export interface EvaluationContext {
  /**
   * Read a dependency's current value. This:
   *   1. Records edge: current node → dependency, with edgeKind
   *   2. Ensures dependency is fresh (recursive pull)
   *   3. Returns the dependency's red value
   *
   * On cycle (dependency already on evaluation stack):
   *   Returns PullResult with isCycle=true and a forward ref.
   *   The callback should use forwardRef.previousRed as provisional
   *   value. The graph will re-evaluate after the cycle completes.
   *
   * Default edgeKind is 'data'. Specify 'completeness' explicitly
   * when the dependency is about exhaustiveness, not value.
   */
  pull(dependency: NodeId, edgeKind?: EdgeKind): PullResult;

  /** Look up an existing node. Returns undefined if not found. */
  findNode(kind: NodeKind, key: string): NodeId | undefined;

  /**
   * Create a node during evaluation (dynamic graph construction).
   * Used when evaluation discovers new entities — e.g., interpreter
   * finds an import to a file not yet in the graph.
   */
  createNode(kind: NodeKind, key: string): NodeId;
}

// =============================================================================
// Pull Result
// =============================================================================

export interface PullResult {
  /** The red value (what consumers receive). */
  readonly value: unknown;
  /** The green value (for cutoff decisions by caller). */
  readonly green: unknown;
  /** True when the dependency is currently being evaluated (cycle). */
  readonly isCycle: boolean;
  /** Non-null when isCycle is true. Previous iteration's values. */
  readonly forwardRef: ForwardRef | null;
}

/**
 * Stable identity for a value whose computation is in progress.
 * When pull() detects a cycle, it returns a ForwardRef with the
 * previous iteration's values (or undefined on first encounter).
 */
export interface ForwardRef {
  readonly nodeId: NodeId;
  readonly previousGreen: unknown | undefined;
  readonly previousRed: unknown | undefined;
}

// =============================================================================
// The Graph
// =============================================================================

export interface ClaimGraphOptions {
  /** Max iterations for cycle convergence before stopping. */
  convergenceBudget: number;
}

export interface ClaimGraph {
  // --- Mutation ---

  /** Create a node. Returns existing id if kind+key already exists. */
  createNode(kind: NodeKind, key: string): NodeId;

  /** Find an existing node. Returns undefined if not found. */
  findNode(kind: NodeKind, key: string): NodeId | undefined;

  /** Add an edge (usually automatic via pull(); explicit for bootstrapping). */
  addEdge(from: NodeId, to: NodeId, edgeKind: EdgeKind): void;

  /**
   * Mark a node stale. Propagates eagerly through all forward edges.
   * Cycle-safe: already-stale nodes are skipped.
   */
  markStale(nodeId: NodeId): void;

  /**
   * Demand-driven evaluation with cutoff.
   *   Fresh → return cached red.
   *   Stale/unevaluated → ensure dependencies fresh (recursive),
   *     invoke callback, compare new green === old green.
   *     Same → mark fresh, return cached (cutoff fires).
   *     Different → update, mark fresh, dependents stay stale.
   */
  pull(nodeId: NodeId): PullResult;

  /**
   * Fixed-point iteration for cycle convergence.
   * Re-evaluates participants until green values stabilize
   * or budget exhausts. Exposed for testing; normally triggered
   * automatically by pull() on cycle detection.
   */
  converge(participants: NodeId[], budget: number): ConvergenceResult;

  // --- Registration ---

  /**
   * Register evaluation callback per node kind.
   * Input kinds have no callback — their values are set via setInputValue.
   */
  registerCallback(kind: NodeKind, callback: EvaluateCallback): void;

  /**
   * Set an input node's value. Compares green === old green.
   * If different: marks dependents stale (staleness propagation begins).
   * If same: no propagation (edit was in a comment, etc.).
   */
  setInputValue(nodeId: NodeId, green: unknown, red: unknown): void;

  // --- Observation ---

  getNode(nodeId: NodeId): GraphNodeState | undefined;
  getEdgesFrom(nodeId: NodeId): ReadonlyArray<GraphEdge>;
  getEdgesTo(nodeId: NodeId): ReadonlyArray<GraphEdge>;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly staleCount: number;

  // --- Lifecycle ---

  onStale(handler: StalenessHandler): void;
}

// =============================================================================
// Observation Types
// =============================================================================

export interface GraphNodeState {
  readonly id: NodeId;
  readonly kind: NodeKind;
  readonly key: string;
  readonly freshness: Freshness;
  readonly green: unknown | undefined;
  readonly red: unknown | undefined;
}

export interface GraphEdge {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly edgeKind: EdgeKind;
}

export interface ConvergenceResult {
  readonly converged: boolean;
  readonly iterations: number;
  readonly participants: ReadonlyArray<NodeId>;
}

// =============================================================================
// Staleness Handler
// =============================================================================

/**
 * When nodes become stale, the workspace decides WHEN to pull.
 * The graph decides WHAT to re-evaluate.
 */
export interface StalenessHandler {
  onNodesStale(nodes: ReadonlyArray<{
    id: NodeId;
    kind: NodeKind;
    key: string;
  }>): void;
}
