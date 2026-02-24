// Dependency Graph — L2 convergence infrastructure for invalidation
//
// This module implements the DependencyGraph (input→output tracking) and
// DepRecorder (read-edge recording during pipeline execution) from the
// L2 architecture target.
//
// The graph tracks which outputs depend on which inputs. When an input changes,
// getAffected() walks the reverse edges to identify all stale outputs.
//
// Architectural commitment:
// - The graph is part of SemanticModel (created during model building).
// - Template compilations add edges via DepRecorder.
// - The graph enables targeted invalidation (convergence route step 3).
// - Until step 3 is active, the graph coexists with fingerprint-based invalidation.

import type { NormalizedPath } from "../model/index.js";
import type { ResourceKey, ResourceScopeId } from "./types.js";

// ============================================================================
// Node Classification
// ============================================================================

/**
 * What a dependency node represents in the system.
 *
 * Each kind maps to a distinct invalidation category:
 * - file: source file content (change → reanalyze)
 * - config: project/TS/convention configuration (change → global or scoped rebuild)
 * - convergence-entry: a converged resource (stale when source files change)
 * - scope: a scope in the resource graph (stale when registrations change)
 * - vocabulary: the frozen vocabulary registry (stale when commands/patterns change)
 * - template-compilation: a compiled template (stale when dependencies change)
 * - type-state: TypeScript type information for a file (stale when types change)
 * - observation: a source-level observation (gap/diagnostic from analysis)
 * - manifest: an external package manifest (stale when npm package changes)
 * - infrastructure: an infrastructure concern (build tooling, config loading failures)
 */
export type DepNodeKind =
  | 'file'
  | 'config'
  | 'convergence-entry'
  | 'scope'
  | 'vocabulary'
  | 'template-compilation'
  | 'type-state'
  | 'observation'
  | 'manifest'
  | 'infrastructure';

// ============================================================================
// Node Identity
// ============================================================================

/** Branded string for dependency node identity. */
export type DepNodeId = string & { readonly __brand: 'DepNodeId' };

/** A node in the dependency graph. */
export interface DepNode {
  readonly id: DepNodeId;
  readonly kind: DepNodeKind;
  /** Human-readable key (file path, resource key string, scope id, etc.) */
  readonly key: string;
}

// ============================================================================
// Dependency Graph
// ============================================================================

/**
 * TMS-shaped dependency graph: tracks input→output for invalidation.
 *
 * Every output in the system is a node traceable to its inputs.
 * When an input changes, all dependent outputs are identified for re-examination.
 */
export interface DependencyGraph {
  /** All registered nodes. */
  readonly nodes: ReadonlyMap<DepNodeId, DepNode>;

  /** Forward edges: output depends on input. */
  readonly dependsOn: ReadonlyMap<DepNodeId, ReadonlySet<DepNodeId>>;

  /** Reverse edges: input is depended on by outputs. */
  readonly dependedOnBy: ReadonlyMap<DepNodeId, ReadonlySet<DepNodeId>>;

  /** Create or retrieve a node. Returns the same id for same kind+key. */
  addNode(kind: DepNodeKind, key: string): DepNodeId;

  /** Find an existing node (null if not registered). */
  findNode(kind: DepNodeKind, key: string): DepNodeId | null;

  /** Record that `output` depends on `input`. */
  addDependency(output: DepNodeId, input: DepNodeId): void;

  /**
   * Get all transitively affected outputs when `changed` nodes are invalidated.
   * Walks `dependedOnBy` transitively. Returns in topological order (roots first).
   */
  getAffected(changed: DepNodeId[]): DepNodeId[];

  /** Remove a node and all its edges (file deleted, resource removed, etc.) */
  removeNode(id: DepNodeId): void;

  /** Number of registered nodes. */
  readonly size: number;

  /** Number of dependency edges. */
  readonly edgeCount: number;
}

// ============================================================================
// Dependency Recorder
// ============================================================================

/**
 * Records read edges during pipeline execution.
 *
 * Each pipeline stage receives a recorder and registers what it read.
 * The recorder adds edges from the output node (set at creation) to input nodes.
 */
export interface DepRecorder {
  /** "I (the current output) read this file" */
  readFile(file: NormalizedPath): void;
  /** "I read this resource from the convergence model" */
  readResource(kind: string, name: string): void;
  /** "I read this scope from the resource graph" */
  readScope(scopeId: ResourceScopeId): void;
  /** "I read type information for this file" */
  readTypeState(file: NormalizedPath): void;
  /** "I read configuration" */
  readConfig(configKey: string): void;
  /** "I read vocabulary" */
  readVocabulary(): void;
}

// ============================================================================
// Factory: DependencyGraph
// ============================================================================

/**
 * Create a new empty dependency graph.
 */
export function createDependencyGraph(): DependencyGraph {
  const nodes = new Map<DepNodeId, DepNode>();
  const dependsOn = new Map<DepNodeId, Set<DepNodeId>>();
  const dependedOnBy = new Map<DepNodeId, Set<DepNodeId>>();

  // Stable id generation: kind + key → deterministic id
  const keyToId = new Map<string, DepNodeId>();
  let edgeCount = 0;

  function nodeKey(kind: DepNodeKind, key: string): string {
    return `${kind}::${key}`;
  }

  function addNode(kind: DepNodeKind, key: string): DepNodeId {
    const nk = nodeKey(kind, key);
    const existing = keyToId.get(nk);
    if (existing !== undefined) return existing;

    const id = nk as DepNodeId;
    keyToId.set(nk, id);
    nodes.set(id, { id, kind, key });
    return id;
  }

  function findNode(kind: DepNodeKind, key: string): DepNodeId | null {
    return keyToId.get(nodeKey(kind, key)) ?? null;
  }

  function addDependency(output: DepNodeId, input: DepNodeId): void {
    let fwd = dependsOn.get(output);
    if (!fwd) {
      fwd = new Set();
      dependsOn.set(output, fwd);
    }
    if (fwd.has(input)) return; // edge already exists
    fwd.add(input);

    let rev = dependedOnBy.get(input);
    if (!rev) {
      rev = new Set();
      dependedOnBy.set(input, rev);
    }
    rev.add(output);
    edgeCount++;
  }

  function getAffected(changed: DepNodeId[]): DepNodeId[] {
    // BFS walk of reverse edges (dependedOnBy) to collect all affected nodes.
    // Returns in BFS order (roots/direct dependents first).
    const visited = new Set<DepNodeId>();
    const result: DepNodeId[] = [];
    const queue: DepNodeId[] = [];

    for (const id of changed) {
      if (!visited.has(id)) {
        visited.add(id);
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const dependents = dependedOnBy.get(current);
      if (dependents) {
        for (const dep of dependents) {
          if (!visited.has(dep)) {
            visited.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    return result;
  }

  function removeNode(id: DepNodeId): void {
    const node = nodes.get(id);
    if (!node) return;

    // Remove forward edges (this node depends on...)
    const fwd = dependsOn.get(id);
    if (fwd) {
      for (const input of fwd) {
        const rev = dependedOnBy.get(input);
        if (rev) {
          rev.delete(id);
          if (rev.size === 0) dependedOnBy.delete(input);
          edgeCount--;
        }
      }
      dependsOn.delete(id);
    }

    // Remove reverse edges (...depends on this node)
    const rev = dependedOnBy.get(id);
    if (rev) {
      for (const output of rev) {
        const ofwd = dependsOn.get(output);
        if (ofwd) {
          ofwd.delete(id);
          if (ofwd.size === 0) dependsOn.delete(output);
          edgeCount--;
        }
      }
      dependedOnBy.delete(id);
    }

    nodes.delete(id);
    keyToId.delete(nodeKey(node.kind, node.key));
  }

  return {
    nodes,
    dependsOn,
    dependedOnBy,
    addNode,
    findNode,
    addDependency,
    getAffected,
    removeNode,
    get size() {
      return nodes.size;
    },
    get edgeCount() {
      return edgeCount;
    },
  };
}

// ============================================================================
// Factory: DepRecorder
// ============================================================================

/**
 * Create a dependency recorder that adds edges to a graph.
 *
 * @param graph - The dependency graph to record into
 * @param outputNode - The node representing the current computation's output
 */
export function createDepRecorder(
  graph: DependencyGraph,
  outputNode: DepNodeId,
): DepRecorder {
  return {
    readFile(file: NormalizedPath): void {
      graph.addDependency(outputNode, graph.addNode('file', file));
    },
    readResource(kind: string, name: string): void {
      graph.addDependency(outputNode, graph.addNode('convergence-entry', `${kind}:${name}`));
    },
    readScope(scopeId: ResourceScopeId): void {
      graph.addDependency(outputNode, graph.addNode('scope', scopeId));
    },
    readTypeState(file: NormalizedPath): void {
      graph.addDependency(outputNode, graph.addNode('type-state', file));
    },
    readConfig(configKey: string): void {
      graph.addDependency(outputNode, graph.addNode('config', configKey));
    },
    readVocabulary(): void {
      graph.addDependency(outputNode, graph.addNode('vocabulary', 'vocabulary'));
    },
  };
}

// ============================================================================
// No-op Recorder
// ============================================================================

/**
 * A no-op recorder for backward compatibility.
 *
 * Use this when dep recording is optional (e.g., pipeline stages that haven't
 * been wired for recording yet). Zero allocation cost.
 */
export const NOOP_DEP_RECORDER: DepRecorder = {
  readFile() {},
  readResource() {},
  readScope() {},
  readTypeState() {},
  readConfig() {},
  readVocabulary() {},
};

// ============================================================================
// Resource Key Helpers
// ============================================================================

/** Format a ResourceKey as a dependency graph key string. */
export function resourceKeyToDepKey(key: ResourceKey): string {
  return `${key.kind}:${key.name}`;
}
