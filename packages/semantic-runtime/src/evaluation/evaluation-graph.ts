import type { ModuleEnvironmentRecord } from './environment.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

export interface StaticEvaluationValueGraph {
  /** Import a value owned outside this graph without sharing later mutation. */
  adoptExternal<TValue extends EvaluationValue>(value: TValue): TValue;
  /** Retain a value produced by an evaluator already executing inside this graph. */
  retainProduced<TValue extends EvaluationValue>(value: TValue): TValue;
  /** Establish and validate ownership for one evaluator lexical environment. */
  retainEnvironment(environment: ModuleEnvironmentRecord): void;
  /** Reconcile foreign values inserted while an external runtime host could mutate an owned environment. */
  reconcileEnvironmentAfterExternal(environment: ModuleEnvironmentRecord): void;
}

/** One graph fork that can map its snapshots back to their immediate parent carriers. */
export interface StaticEvaluationForkLineage extends StaticEvaluationValueGraph {
  /** Immediate parent value for one forked snapshot; null for values produced inside the fork. */
  sourceValue(value: EvaluationValue): EvaluationValue | null;
  /** Immediate parent environment for one forked snapshot; null for environments produced inside the fork. */
  sourceEnvironment(environment: ModuleEnvironmentRecord): ModuleEnvironmentRecord | null;
}

const evaluationValueGraphOwners = new WeakMap<object, StaticEvaluationValueGraph>();

/** Return the mutable evaluation graph that owns one value, when one has been established. */
export function evaluationValueGraphOwner(value: EvaluationValue): StaticEvaluationValueGraph | null {
  if (!evaluationValueHasMutableGraph(value)) {
    return null;
  }
  return evaluationValueGraphOwners.get(value) ?? null;
}

/** Mark one mutable value carrier as part of an evaluation graph without changing its hot object shape. */
export function ownEvaluationValue(value: EvaluationValue, owner: StaticEvaluationValueGraph): void {
  if (!evaluationValueHasMutableGraph(value)) {
    return;
  }
  const current = evaluationValueGraphOwner(value);
  if (current != null && current !== owner) {
    throw new Error('Evaluation value already belongs to another mutable graph.');
  }
  evaluationValueGraphOwners.set(value, owner);
}

export function evaluationValueBelongsToGraph(
  value: EvaluationValue,
  owner: StaticEvaluationValueGraph,
): boolean {
  return evaluationValueGraphOwner(value) === owner;
}

export function evaluationValueHasMutableGraph(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Unknown:
      return value.retainedCandidate != null && evaluationValueHasMutableGraph(value.retainedCandidate);
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    default:
      return false;
  }
}
