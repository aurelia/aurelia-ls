/**
 * Project Analysis Dependency Model — Types
 *
 * Four node layers: input → evaluation → observation → conclusion.
 * Push side marks staleness eagerly. Pull side re-evaluates and
 * re-converges lazily with value-sensitive cutoff at conclusions.
 *
 * Observations are evidence records — multiple per (resourceKey, fieldPath)
 * from different evidence sources. Conclusions are the converged answer —
 * one per (resourceKey, fieldPath), produced by the convergence callback.
 */

import type { NormalizedPath } from '../../model/identity.js';
import type { GreenValue } from '../../value/green.js';
import type { Sourced } from '../../value/sourced.js';

// =============================================================================
// Node Identity
// =============================================================================

export type ProjectDepNodeId = string & { readonly __brand: 'ProjectDepNodeId' };

export type ProjectDepNodeKind =
  | 'file'
  | 'type-state'
  | 'config'
  | 'manifest'
  | 'evaluation'
  | 'observation'
  | 'conclusion';

// =============================================================================
// Evidence Source
// =============================================================================

/**
 * Five-tier evidence ranking for convergence.
 * Higher tiers have more authority when observations compete.
 */
export type EvidenceTier =
  | 'builtin'
  | 'config'
  | 'manifest'
  | 'analysis-explicit'
  | 'analysis-convention';

/**
 * How an observation was produced.
 *
 * `tier` is the ranking axis — convergence reads only this.
 * `form` is provenance metadata — diagnostics and refactoring read this.
 * form is an open string: 'decorator', 'static-$au', 'define-call',
 * 'convention', 'local-template', 'field-decorator', etc.
 */
export interface EvidenceSource {
  readonly tier: EvidenceTier;
  readonly form?: string;
}

// =============================================================================
// Node ID Constructors
// =============================================================================

export function fileNodeId(file: NormalizedPath): ProjectDepNodeId {
  return `file:${file}` as ProjectDepNodeId;
}

export function typeStateNodeId(file: NormalizedPath): ProjectDepNodeId {
  return `type-state:${file}` as ProjectDepNodeId;
}

export function configNodeId(configKey: string): ProjectDepNodeId {
  return `config:${configKey}` as ProjectDepNodeId;
}

export function manifestNodeId(packageName: string): ProjectDepNodeId {
  return `manifest:${packageName}` as ProjectDepNodeId;
}

export function evaluationNodeId(file: NormalizedPath, unitKey: string): ProjectDepNodeId {
  return `eval:${file}#${unitKey}` as ProjectDepNodeId;
}

export function observationNodeId(
  resourceKey: string,
  fieldPath: string,
  sourceId: string,
): ProjectDepNodeId {
  return `obs:${resourceKey}:${fieldPath}:${sourceId}` as ProjectDepNodeId;
}

export function conclusionNodeId(resourceKey: string, fieldPath: string): ProjectDepNodeId {
  return `conclusion:${resourceKey}:${fieldPath}` as ProjectDepNodeId;
}

/** Well-known config node for convergence parameters. */
export const CONVERGENCE_CONFIG_NODE = configNodeId('convergence-ranking');

// =============================================================================
// EvaluationTracer — what the interpreter reports as it runs
// =============================================================================

export interface EvaluationHandle {
  readonly isCycle: boolean;
  readonly nodeId: ProjectDepNodeId;
}

export interface EvaluationTracer {
  pushContext(file: NormalizedPath, unitKey: string): EvaluationHandle;
  popContext(handle: EvaluationHandle): void;
  readFile(file: NormalizedPath): void;
  readTypeState(file: NormalizedPath): void;
  readConfig(configKey: string): void;
  readManifest(packageName: string): void;
  readEvaluation(file: NormalizedPath, unitKey: string): void;
}

// =============================================================================
// ObservationRegistrar — registers per-field observations
// =============================================================================

export interface ObservationRegistrar {
  registerObservation<T>(
    resourceKey: string,
    fieldPath: string,
    source: EvidenceSource,
    green: GreenValue,
    red: Sourced<T>,
    evaluationNode: ProjectDepNodeId,
  ): ProjectDepNodeId;
}

// =============================================================================
// Convergence
// =============================================================================

/** A single observation's data, passed to the convergence function. */
export interface ObservationEntry {
  readonly green: GreenValue;
  readonly red: Sourced<unknown>;
  readonly source: EvidenceSource;
}

/**
 * Convergence function: merges an observation set into a single conclusion.
 * The graph calls this when pulling a stale conclusion node.
 */
export type ConvergenceFunction = (
  resourceKey: string,
  fieldPath: string,
  observations: readonly ObservationEntry[],
) => { green: GreenValue; red: Sourced<unknown> };

// =============================================================================
// ProjectInvalidationEngine — push side (eager marking)
// =============================================================================

export interface ProjectInvalidationEngine {
  markFileStale(file: NormalizedPath): void;
  markTypeStateStale(file: NormalizedPath): void;
  markConfigStale(configKey: string): void;
  markAllTypeStateStale(): void;
  isStale(nodeId: ProjectDepNodeId): boolean;
  staleConclusions(): ProjectDepNodeId[];
}

// =============================================================================
// ProjectEvaluationEngine — pull side (lazy re-evaluation + convergence)
// =============================================================================

export type UnitEvaluator = (file: NormalizedPath, unitKey: string) => void;

export interface ProjectEvaluationEngine {
  /** Pull the converged conclusion for a field. Re-evaluates and re-converges if stale. */
  pull<T>(conclusionId: ProjectDepNodeId): Sourced<T> | undefined;
}

// =============================================================================
// ProjectDepGraph — the aggregate
// =============================================================================

export interface ProjectDepGraph {
  readonly tracer: EvaluationTracer;
  readonly observations: ObservationRegistrar;
  readonly invalidation: ProjectInvalidationEngine;
  readonly evaluation: ProjectEvaluationEngine;

  removeFile(file: NormalizedPath): void;

  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly staleCount: number;
}
