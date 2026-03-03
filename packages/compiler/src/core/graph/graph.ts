/**
 * Project Analysis Dependency Graph — Implementation
 *
 * Four node layers: input → evaluation → observation → conclusion.
 * Push side propagates staleness eagerly through edges.
 * Pull side re-evaluates and re-converges lazily with value-sensitive cutoff.
 *
 * The graph delegates evaluation and convergence to callbacks provided
 * at construction. It owns the graph topology, staleness propagation,
 * and cutoff comparison — not the domain logic.
 */

import type { NormalizedPath } from '../../model/identity.js';
import type { GreenValue } from '../../value/green.js';
import type { Sourced } from '../../value/sourced.js';
import { InternPool } from '../../value/intern.js';

import {
  type ProjectDepNodeId,
  type ProjectDepNodeKind,
  type ProjectDepGraph,
  type EvaluationTracer,
  type EvaluationHandle,
  type ObservationRegistrar,
  type ObservationEntry,
  type EvidenceSource,
  type ProjectInvalidationEngine,
  type ProjectEvaluationEngine,
  type UnitEvaluator,
  type ConvergenceFunction,
  type GraphEventListener,
  fileNodeId,
  typeStateNodeId,
  configNodeId,
  manifestNodeId,
  evaluationNodeId,
  observationNodeId,
  conclusionNodeId,
  CONVERGENCE_CONFIG_NODE,
} from './types.js';

// =============================================================================
// Internal Node Data
// =============================================================================

interface NodeEntry {
  readonly kind: ProjectDepNodeKind;
  readonly key: string;
  stale: boolean;
  /** For observation nodes: the interned green value (cutoff token). */
  green?: GreenValue;
  /** For observation nodes: the red (provenance) value. */
  red?: Sourced<unknown>;
  /** For observation nodes: evidence source. */
  evidenceSource?: EvidenceSource;
  /** For observation nodes: which evaluation produced this. */
  sourceEvaluation?: ProjectDepNodeId;
  /** For conclusion nodes: the converged green value (cutoff token). */
  concludedGreen?: GreenValue;
  /** For conclusion nodes: the converged red value. */
  concludedRed?: Sourced<unknown>;
}

// =============================================================================
// Graph Implementation
// =============================================================================

export function createProjectDepGraph(
  evaluator: UnitEvaluator,
  converge: ConvergenceFunction,
  listener?: GraphEventListener,
): ProjectDepGraph {
  const nodes = new Map<ProjectDepNodeId, NodeEntry>();
  const forwardEdges = new Map<ProjectDepNodeId, Set<ProjectDepNodeId>>();
  const backwardEdges = new Map<ProjectDepNodeId, Set<ProjectDepNodeId>>();
  const evaluationStack: ProjectDepNodeId[] = [];
  let totalEdges = 0;

  // Intern pool for green values (L1 value-representation §S2).
  // All green values stored in the graph go through this pool.
  // Structurally identical values become the same object.
  // Cutoff comparison is then pointer equality, O(1).
  const internPool = new InternPool();

  // Create the convergence config node at construction
  ensureNode(CONVERGENCE_CONFIG_NODE, 'config', 'convergence-ranking');

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

      if (evaluationStack.includes(nodeId)) {
        const current = currentEvaluation();
        if (current) addEdge(nodeId, current);
        return { isCycle: true, nodeId };
      }

      ensureNode(nodeId, 'evaluation', `${file}#${unitKey}`);

      const parent = currentEvaluation();
      if (parent) addEdge(nodeId, parent);

      evaluationStack.push(nodeId);
      return { isCycle: false, nodeId };
    },

    popContext(handle: EvaluationHandle): void {
      if (handle.isCycle) return;
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

  // ── ObservationRegistrar ─────────────────────────────────────────────

  const observations: ObservationRegistrar = {
    registerObservation<T>(
      resourceKey: string,
      fieldPath: string,
      source: EvidenceSource,
      green: GreenValue,
      red: Sourced<T>,
      evalNode: ProjectDepNodeId,
    ): ProjectDepNodeId {
      // Observation keyed by field + producing evaluation
      const obsId = observationNodeId(resourceKey, fieldPath, evalNode);
      const entry = ensureNode(obsId, 'observation', `${resourceKey}:${fieldPath}`);
      entry.green = internPool.intern(green);
      entry.red = red;
      entry.evidenceSource = source;
      entry.sourceEvaluation = evalNode;

      // Edge: evaluation → observation
      addEdge(evalNode, obsId);

      // Ensure conclusion node exists and wire observation → conclusion
      const concId = conclusionNodeId(resourceKey, fieldPath);
      const concEntry = ensureNode(concId, 'conclusion', `${resourceKey}:${fieldPath}`);
      addEdge(obsId, concId);

      // Mark conclusion stale so the next pull triggers convergence
      concEntry.stale = true;

      // Wire convergence config → conclusion (static dependency)
      addEdge(CONVERGENCE_CONFIG_NODE, concId);

      return obsId;
    },
  };

  // ── ProjectInvalidationEngine ────────────────────────────────────────

  /** Current source of staleness propagation (for event attribution). */
  let stalenessSource: ProjectDepNodeId | null = null;

  function propagateStale(nodeId: ProjectDepNodeId): void {
    const entry = nodes.get(nodeId);
    if (!entry || entry.stale) return;
    entry.stale = true;
    if (listener) {
      listener.onEvent({ type: 'staleness-propagated', nodeId, sourceNodeId: stalenessSource });
    }
    const dependents = forwardEdges.get(nodeId);
    if (dependents) {
      for (const dep of dependents) propagateStale(dep);
    }
  }

  const invalidation: ProjectInvalidationEngine = {
    markFileStale(file: NormalizedPath): void {
      const id = fileNodeId(file);
      stalenessSource = id;
      propagateStale(id);
      stalenessSource = null;
    },

    markTypeStateStale(file: NormalizedPath): void {
      const id = typeStateNodeId(file);
      stalenessSource = id;
      propagateStale(id);
      stalenessSource = null;
    },

    markConfigStale(configKey: string): void {
      const id = configNodeId(configKey);
      stalenessSource = id;
      propagateStale(id);
      stalenessSource = null;
    },

    markAllTypeStateStale(): void {
      for (const [id, entry] of nodes) {
        if (entry.kind === 'type-state') {
          stalenessSource = id;
          propagateStale(id);
        }
      }
      stalenessSource = null;
    },

    isStale(nodeId: ProjectDepNodeId): boolean {
      return nodes.get(nodeId)?.stale ?? false;
    },

    staleConclusions(): ProjectDepNodeId[] {
      const result: ProjectDepNodeId[] = [];
      for (const [id, entry] of nodes) {
        if (entry.kind === 'conclusion' && entry.stale) result.push(id);
      }
      return result;
    },
  };

  // ── ProjectEvaluationEngine ──────────────────────────────────────────

  function parseEvaluationKey(nodeId: ProjectDepNodeId): { file: NormalizedPath; unitKey: string } | null {
    if (!nodeId.startsWith('eval:')) return null;
    const rest = nodeId.slice(5);
    const hashIdx = rest.indexOf('#');
    if (hashIdx === -1) return null;
    return {
      file: rest.slice(0, hashIdx) as NormalizedPath,
      unitKey: rest.slice(hashIdx + 1),
    };
  }

  function ensureObservationsFresh(concId: ProjectDepNodeId): void {
    const obsNodes = backwardEdges.get(concId);
    if (!obsNodes) return;

    for (const obsId of obsNodes) {
      const obsEntry = nodes.get(obsId);
      if (!obsEntry || obsEntry.kind !== 'observation' || !obsEntry.stale) continue;

      // This observation is stale — re-evaluate its source
      if (obsEntry.sourceEvaluation) {
        const evalEntry = nodes.get(obsEntry.sourceEvaluation);
        if (evalEntry?.stale) {
          const parsed = parseEvaluationKey(obsEntry.sourceEvaluation);
          if (parsed) {
            // Collect old observations from this eval before clearing
            const oldObsFromEval = new Set<ProjectDepNodeId>();
            const fwd = forwardEdges.get(obsEntry.sourceEvaluation);
            if (fwd) {
              for (const depId of fwd) {
                if (nodes.get(depId)?.kind === 'observation') {
                  oldObsFromEval.add(depId);
                }
              }
            }

            clearOutgoingEdges(obsEntry.sourceEvaluation);
            if (listener) {
              listener.onEvent({ type: 'evaluation-invoked', nodeId: obsEntry.sourceEvaluation, file: parsed.file, unitKey: parsed.unitKey });
            }
            evaluator(parsed.file, parsed.unitKey);
            evalEntry.stale = false;

            // Clean up orphaned observations: old observations from this
            // eval that were NOT re-registered during re-evaluation.
            // This handles resource identity changes (e.g., CE renamed
            // from 'widget' to 'gadget' — old observations under
            // 'custom-element:widget' are now orphaned).
            const newFwd = forwardEdges.get(obsEntry.sourceEvaluation);
            const currentObs = new Set<ProjectDepNodeId>();
            if (newFwd) {
              for (const depId of newFwd) {
                if (nodes.get(depId)?.kind === 'observation') {
                  currentObs.add(depId);
                }
              }
            }
            for (const oldObsId of oldObsFromEval) {
              if (!currentObs.has(oldObsId)) {
                // Mark downstream conclusions stale before removing
                // the observation, so they re-converge and find the
                // observation gone.
                const obsFwd = forwardEdges.get(oldObsId);
                if (obsFwd) {
                  for (const depId of obsFwd) {
                    const depEntry = nodes.get(depId);
                    if (depEntry?.kind === 'conclusion') {
                      depEntry.stale = true;
                    }
                  }
                }
                removeNode(oldObsId);
              }
            }
          }
        }
      }
      // The observation may have been removed by orphan cleanup
      if (!nodes.has(obsId)) continue;
      if (listener) {
        listener.onEvent({ type: 'observation-refreshed', observationId: obsId, sourceEvaluation: obsEntry.sourceEvaluation ?? ('' as ProjectDepNodeId) });
      }
      obsEntry.stale = false;
    }
  }

  function collectObservations(concId: ProjectDepNodeId): ObservationEntry[] {
    const result: ObservationEntry[] = [];
    const obsNodes = backwardEdges.get(concId);
    if (!obsNodes) return result;

    for (const obsId of obsNodes) {
      const obsEntry = nodes.get(obsId);
      if (!obsEntry || obsEntry.kind !== 'observation') continue;
      if (obsEntry.green && obsEntry.red && obsEntry.evidenceSource) {
        result.push({
          green: obsEntry.green,
          red: obsEntry.red,
          source: obsEntry.evidenceSource,
        });
      }
    }
    return result;
  }

  function parseConclusionKey(nodeId: ProjectDepNodeId): { resourceKey: string; fieldPath: string } | null {
    if (!nodeId.startsWith('conclusion:')) return null;
    const rest = nodeId.slice(11); // strip "conclusion:"
    const delimIdx = rest.indexOf('::');
    if (delimIdx === -1) return null;
    return {
      resourceKey: rest.slice(0, delimIdx),
      fieldPath: rest.slice(delimIdx + 2),
    };
  }

  const evaluation: ProjectEvaluationEngine = {
    pull<T>(concId: ProjectDepNodeId): Sourced<T> | undefined {
      const entry = nodes.get(concId);
      if (!entry || entry.kind !== 'conclusion') return undefined;

      if (!entry.stale) {
        return entry.concludedRed as Sourced<T> | undefined;
      }

      // Ensure all upstream observations are fresh
      ensureObservationsFresh(concId);

      // Re-converge
      const obs = collectObservations(concId);
      if (obs.length === 0) {
        entry.stale = false;
        return undefined;
      }

      const parsed = parseConclusionKey(concId);
      if (!parsed) {
        entry.stale = false;
        return undefined;
      }

      const oldGreen = entry.concludedGreen;
      const result = converge(parsed.resourceKey, parsed.fieldPath, obs);
      const internedGreen = internPool.intern(result.green);

      if (listener) {
        listener.onEvent({ type: 'convergence-ran', conclusionId: concId, resourceKey: parsed.resourceKey, fieldPath: parsed.fieldPath, observationCount: obs.length });
      }

      entry.concludedGreen = internedGreen;
      entry.concludedRed = result.red;

      // Value-sensitive cutoff at conclusion level (S2: pointer equality
      // on interned values — O(1) regardless of value complexity)
      if (oldGreen && internedGreen === oldGreen) {
        // Same conclusion — don't propagate staleness to downstream
        entry.stale = false;
        if (listener) {
          listener.onEvent({ type: 'cutoff-fired', conclusionId: concId, resourceKey: parsed.resourceKey, fieldPath: parsed.fieldPath });
        }
      } else {
        entry.stale = false;
        // Different conclusion — downstream remains stale
        if (listener) {
          listener.onEvent({ type: 'conclusion-changed', conclusionId: concId, resourceKey: parsed.resourceKey, fieldPath: parsed.fieldPath });
        }
      }

      return entry.concludedRed as Sourced<T> | undefined;
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
    clearOutgoingEdges(nodeId);
    forwardEdges.delete(nodeId);

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
    removeNode(fileNodeId(file));
    removeNode(typeStateNodeId(file));

    // Collect evaluation + observation nodes for this file
    const toRemove: ProjectDepNodeId[] = [];
    for (const [id, entry] of nodes) {
      if (entry.kind === 'evaluation' && entry.key.startsWith(`${file}#`)) {
        toRemove.push(id);
      }
      if (entry.kind === 'observation' && entry.sourceEvaluation) {
        const srcEntry = nodes.get(entry.sourceEvaluation);
        if (srcEntry && srcEntry.key.startsWith(`${file}#`)) {
          toRemove.push(id);
        }
      }
    }
    for (const id of toRemove) removeNode(id);

    // Clean up empty conclusion nodes (no remaining observations)
    const emptyConclusions: ProjectDepNodeId[] = [];
    for (const [id, entry] of nodes) {
      if (entry.kind !== 'conclusion') continue;
      const obs = backwardEdges.get(id);
      // Only convergence-config remains as a backward edge
      const hasObservations = obs && [...obs].some(
        obsId => nodes.get(obsId)?.kind === 'observation'
      );
      if (!hasObservations) emptyConclusions.push(id);
    }
    for (const id of emptyConclusions) removeNode(id);
  }

  // ── Graph aggregate ──────────────────────────────────────────────────

  return {
    tracer,
    observations,
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

    nodesByKind(kind) {
      const result: ProjectDepNodeId[] = [];
      for (const [id, entry] of nodes) {
        if (entry.kind === kind) result.push(id);
      }
      return result;
    },

    nodesByPrefix(prefix: string) {
      const result: ProjectDepNodeId[] = [];
      for (const id of nodes.keys()) {
        if (id.startsWith(prefix)) result.push(id);
      }
      return result;
    },

    hasNode(id) {
      return nodes.has(id);
    },

    observationSource(id) {
      const entry = nodes.get(id);
      return entry?.evidenceSource;
    },
  };
}
