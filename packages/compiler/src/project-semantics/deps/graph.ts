/**
 * Project Analysis Dependency Graph — Implementation
 *
 * Three node layers: input → evaluation → field-claim.
 * Push side propagates staleness eagerly through edges.
 * Pull side re-evaluates lazily with value-sensitive cutoff.
 *
 * The graph does not own evaluation logic — it receives a UnitEvaluator
 * callback that the interpreter provides.
 */

import type { NormalizedPath } from '../../model/identity.js';
import type { GreenValue } from '../../value/green.js';
import type { Sourced } from '../../value/sourced.js';

import {
  type ProjectDepNodeId,
  type ProjectDepNodeKind,
  type ProjectDepGraph,
  type EvaluationTracer,
  type EvaluationHandle,
  type FieldClaimRegistrar,
  type ProjectInvalidationEngine,
  type ProjectEvaluationEngine,
  type UnitEvaluator,
  fileNodeId,
  typeStateNodeId,
  configNodeId,
  manifestNodeId,
  evaluationNodeId,
  fieldClaimNodeId,
} from './types.js';

// =============================================================================
// Internal Node Data
// =============================================================================

interface NodeEntry {
  readonly kind: ProjectDepNodeKind;
  readonly key: string;
  stale: boolean;
  /** For field-claim nodes: the interned green value (cutoff token). */
  green?: GreenValue;
  /** For field-claim nodes: the red (provenance) value. */
  red?: Sourced<unknown>;
  /** For field-claim nodes: which evaluation produced this claim. */
  sourceEvaluation?: ProjectDepNodeId;
}

// =============================================================================
// Graph Implementation
// =============================================================================

export function createProjectDepGraph(evaluator: UnitEvaluator): ProjectDepGraph {
  const nodes = new Map<ProjectDepNodeId, NodeEntry>();
  const forwardEdges = new Map<ProjectDepNodeId, Set<ProjectDepNodeId>>();
  const backwardEdges = new Map<ProjectDepNodeId, Set<ProjectDepNodeId>>();
  const evaluationStack: ProjectDepNodeId[] = [];
  let totalEdges = 0;

  // ── Node management ──────────────────────────────────────────────────

  function ensureNode(id: ProjectDepNodeId, kind: ProjectDepNodeKind, key: string): NodeEntry {
    let entry = nodes.get(id);
    if (!entry) {
      entry = { kind, key, stale: false };
      nodes.set(id, entry);
    }
    return entry;
  }

  function addEdge(from: ProjectDepNodeId, to: ProjectDepNodeId): void {
    let fwd = forwardEdges.get(from);
    if (!fwd) { fwd = new Set(); forwardEdges.set(from, fwd); }
    if (!fwd.has(to)) {
      fwd.add(to);
      let bwd = backwardEdges.get(to);
      if (!bwd) { bwd = new Set(); backwardEdges.set(to, bwd); }
      bwd.add(from);
      totalEdges++;
    }
  }

  function currentEvaluation(): ProjectDepNodeId | undefined {
    return evaluationStack[evaluationStack.length - 1];
  }

  // ── EvaluationTracer ─────────────────────────────────────────────────

  const tracer: EvaluationTracer = {
    pushContext(file: NormalizedPath, unitKey: string): EvaluationHandle {
      const nodeId = evaluationNodeId(file, unitKey);

      // Cycle detection: if already on the stack, don't push
      if (evaluationStack.includes(nodeId)) {
        // Record cycle edge from current context to the re-entered one
        const current = currentEvaluation();
        if (current) addEdge(nodeId, current);
        return { isCycle: true, nodeId };
      }

      ensureNode(nodeId, 'evaluation', `${file}#${unitKey}`);

      // If there's a parent context, record cross-evaluation edge
      const parent = currentEvaluation();
      if (parent) addEdge(nodeId, parent);

      evaluationStack.push(nodeId);
      return { isCycle: false, nodeId };
    },

    popContext(handle: EvaluationHandle): void {
      if (handle.isCycle) return; // cycle handles were never pushed
      const top = evaluationStack.pop();
      if (top !== handle.nodeId) {
        throw new Error(`EvaluationTracer: popped ${top} but expected ${handle.nodeId}`);
      }
    },

    readFile(file: NormalizedPath): void {
      const current = currentEvaluation();
      if (!current) return;
      const inputId = fileNodeId(file);
      ensureNode(inputId, 'file', file);
      addEdge(inputId, current);
    },

    readTypeState(file: NormalizedPath): void {
      const current = currentEvaluation();
      if (!current) return;
      const inputId = typeStateNodeId(file);
      ensureNode(inputId, 'type-state', file);
      addEdge(inputId, current);
    },

    readConfig(configKey: string): void {
      const current = currentEvaluation();
      if (!current) return;
      const inputId = configNodeId(configKey);
      ensureNode(inputId, 'config', configKey);
      addEdge(inputId, current);
    },

    readManifest(packageName: string): void {
      const current = currentEvaluation();
      if (!current) return;
      const inputId = manifestNodeId(packageName);
      ensureNode(inputId, 'manifest', packageName);
      addEdge(inputId, current);
    },

    readEvaluation(file: NormalizedPath, unitKey: string): void {
      const current = currentEvaluation();
      if (!current) return;
      const depId = evaluationNodeId(file, unitKey);
      ensureNode(depId, 'evaluation', `${file}#${unitKey}`);
      addEdge(depId, current);
    },
  };

  // ── FieldClaimRegistrar ──────────────────────────────────────────────

  const claims: FieldClaimRegistrar = {
    registerClaim<T>(
      resourceKey: string,
      fieldPath: string,
      green: GreenValue,
      red: Sourced<T>,
      evalNode: ProjectDepNodeId,
    ): ProjectDepNodeId {
      const claimId = fieldClaimNodeId(resourceKey, fieldPath);
      const entry = ensureNode(claimId, 'field-claim', `${resourceKey}:${fieldPath}`);
      entry.green = green;
      entry.red = red;
      entry.sourceEvaluation = evalNode;
      addEdge(evalNode, claimId);
      return claimId;
    },
  };

  // ── ProjectInvalidationEngine ────────────────────────────────────────

  function propagateStale(nodeId: ProjectDepNodeId): void {
    const entry = nodes.get(nodeId);
    if (!entry || entry.stale) return;
    entry.stale = true;
    const dependents = forwardEdges.get(nodeId);
    if (dependents) {
      for (const dep of dependents) propagateStale(dep);
    }
  }

  const invalidation: ProjectInvalidationEngine = {
    markFileStale(file: NormalizedPath): void {
      propagateStale(fileNodeId(file));
    },

    markTypeStateStale(file: NormalizedPath): void {
      propagateStale(typeStateNodeId(file));
    },

    markConfigStale(configKey: string): void {
      propagateStale(configNodeId(configKey));
    },

    markAllTypeStateStale(): void {
      for (const [id, entry] of nodes) {
        if (entry.kind === 'type-state') propagateStale(id);
      }
    },

    isStale(nodeId: ProjectDepNodeId): boolean {
      return nodes.get(nodeId)?.stale ?? false;
    },

    staleFieldClaims(): ProjectDepNodeId[] {
      const result: ProjectDepNodeId[] = [];
      for (const [id, entry] of nodes) {
        if (entry.kind === 'field-claim' && entry.stale) result.push(id);
      }
      return result;
    },
  };

  // ── ProjectEvaluationEngine ──────────────────────────────────────────

  function parseEvaluationKey(nodeId: ProjectDepNodeId): { file: NormalizedPath; unitKey: string } | null {
    // eval:file#unitKey
    if (!nodeId.startsWith('eval:')) return null;
    const rest = nodeId.slice(5);
    const hashIdx = rest.indexOf('#');
    if (hashIdx === -1) return null;
    return {
      file: rest.slice(0, hashIdx) as NormalizedPath,
      unitKey: rest.slice(hashIdx + 1),
    };
  }

  const evaluation: ProjectEvaluationEngine = {
    pull<T>(claimId: ProjectDepNodeId): Sourced<T> | undefined {
      const entry = nodes.get(claimId);
      if (!entry || entry.kind !== 'field-claim') return undefined;

      if (!entry.stale) {
        return entry.red as Sourced<T> | undefined;
      }

      // Stale: re-evaluate the source evaluation node
      if (entry.sourceEvaluation) {
        const evalEntry = nodes.get(entry.sourceEvaluation);
        if (evalEntry?.stale) {
          const parsed = parseEvaluationKey(entry.sourceEvaluation);
          if (parsed) {
            const oldGreen = entry.green;

            // Clear edges from this evaluation (they'll be re-recorded)
            clearOutgoingEdges(entry.sourceEvaluation);

            // Re-evaluate (the evaluator calls tracer + registrar)
            evaluator(parsed.file, parsed.unitKey);

            // Mark evaluation node fresh
            evalEntry.stale = false;

            // Value-sensitive cutoff: if green hasn't changed, stop propagation
            if (oldGreen && entry.green === oldGreen) {
              entry.stale = false;
              // Don't propagate — dependents stay as they are
            }
          }
        }
      }

      entry.stale = false;
      return entry.red as Sourced<T> | undefined;
    },
  };

  // ── File removal ─────────────────────────────────────────────────────

  function clearOutgoingEdges(nodeId: ProjectDepNodeId): void {
    const fwd = forwardEdges.get(nodeId);
    if (fwd) {
      for (const dep of fwd) {
        backwardEdges.get(dep)?.delete(nodeId);
        totalEdges--;
      }
      fwd.clear();
    }
  }

  function removeNode(nodeId: ProjectDepNodeId): void {
    // Remove forward edges from this node
    clearOutgoingEdges(nodeId);
    forwardEdges.delete(nodeId);

    // Remove backward edges to this node
    const bwd = backwardEdges.get(nodeId);
    if (bwd) {
      for (const dep of bwd) {
        const depFwd = forwardEdges.get(dep);
        if (depFwd?.delete(nodeId)) totalEdges--;
      }
      backwardEdges.delete(nodeId);
    }

    nodes.delete(nodeId);
  }

  function removeFile(file: NormalizedPath): void {
    // Remove input nodes for this file
    removeNode(fileNodeId(file));
    removeNode(typeStateNodeId(file));

    // Remove evaluation nodes and their field claims
    const toRemove: ProjectDepNodeId[] = [];
    for (const [id, entry] of nodes) {
      if (entry.kind === 'evaluation' && entry.key.startsWith(`${file}#`)) {
        toRemove.push(id);
      }
      if (entry.kind === 'field-claim' && entry.sourceEvaluation) {
        const srcEntry = nodes.get(entry.sourceEvaluation);
        if (srcEntry && srcEntry.key.startsWith(`${file}#`)) {
          toRemove.push(id);
        }
      }
    }
    for (const id of toRemove) removeNode(id);
  }

  // ── Graph aggregate ──────────────────────────────────────────────────

  return {
    tracer,
    claims,
    invalidation,
    evaluation,
    removeFile,

    get nodeCount() { return nodes.size; },
    get edgeCount() { return totalEdges; },
    get staleCount() {
      let count = 0;
      for (const entry of nodes.values()) {
        if (entry.stale) count++;
      }
      return count;
    },
  };
}
