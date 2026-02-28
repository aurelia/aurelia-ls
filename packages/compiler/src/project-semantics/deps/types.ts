/**
 * Project Analysis Dependency Model — Types
 *
 * Implements L2: project-analysis-deps.ts.
 * Three node kinds: input, evaluation, field-claim.
 * Push side marks staleness eagerly. Pull side re-evaluates lazily
 * with value-sensitive cutoff at field claims.
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
  | 'field-claim';

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

export function fieldClaimNodeId(resourceKey: string, fieldPath: string): ProjectDepNodeId {
  return `claim:${resourceKey}:${fieldPath}` as ProjectDepNodeId;
}

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
// FieldClaimRegistrar — registers per-field claims with green/red values
// =============================================================================

export interface FieldClaimRegistrar {
  registerClaim<T>(
    resourceKey: string,
    fieldPath: string,
    green: GreenValue,
    red: Sourced<T>,
    evaluationNode: ProjectDepNodeId,
  ): ProjectDepNodeId;
}

// =============================================================================
// ProjectInvalidationEngine — push side (eager marking)
// =============================================================================

export interface ProjectInvalidationEngine {
  markFileStale(file: NormalizedPath): void;
  markTypeStateStale(file: NormalizedPath): void;
  markConfigStale(configKey: string): void;
  markAllTypeStateStale(): void;
  isStale(nodeId: ProjectDepNodeId): boolean;
  staleFieldClaims(): ProjectDepNodeId[];
}

// =============================================================================
// ProjectEvaluationEngine — pull side (lazy re-evaluation)
// =============================================================================

/**
 * Callback that re-evaluates a unit. The evaluator runs the interpreter,
 * which calls tracer methods and registrar methods to update the graph.
 */
export type UnitEvaluator = (file: NormalizedPath, unitKey: string) => void;

export interface ProjectEvaluationEngine {
  pull<T>(claimId: ProjectDepNodeId): Sourced<T> | undefined;
}

// =============================================================================
// ProjectDepGraph — the aggregate
// =============================================================================

export interface ProjectDepGraph {
  readonly tracer: EvaluationTracer;
  readonly claims: FieldClaimRegistrar;
  readonly invalidation: ProjectInvalidationEngine;
  readonly evaluation: ProjectEvaluationEngine;

  removeFile(file: NormalizedPath): void;

  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly staleCount: number;
}
