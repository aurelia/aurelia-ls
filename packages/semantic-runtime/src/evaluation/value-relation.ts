import {
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationValue,
} from './values.js';

/** Result of an evaluator relation without turning incomplete denotation into a false comparison. */
export const enum EvaluationValueRelationKind {
  /** Both carriers are proven to denote the same value or runtime identity under the selected relation. */
  Match = 'match',
  /** Both carriers are closed enough to prove that they denote different values or runtime identities. */
  Miss = 'miss',
  /** At least one carrier lacks enough denotational or identity evidence to decide safely. */
  Open = 'open',
}

/** Root runtime identities retained across graph-isolated evaluator snapshots without changing hot value shapes. */
const evaluationValueLineageRoots = new WeakMap<object, object>();
const evaluationValuesWithIndeterminateIdentity = new WeakSet<object>();

/** Preserve runtime identity when a session forks one identity-bearing evaluator value into another snapshot. */
export function bindEvaluationValueLineage(source: EvaluationValue, target: EvaluationValue): void {
  if (!evaluationValueHasRuntimeIdentity(source) || !evaluationValueHasRuntimeIdentity(target)) {
    return;
  }
  if (source.kind !== target.kind) {
    throw new Error(`Cannot preserve evaluator identity across ${source.kind} and ${target.kind} carriers.`);
  }
  if (source === target) {
    return;
  }
  const sourceRoot = evaluationValueLineageRoot(source);
  const targetRoot = evaluationValueLineageRoots.get(target);
  if (targetRoot != null && targetRoot !== sourceRoot) {
    throw new Error('Evaluator value already belongs to another runtime identity lineage.');
  }
  if (evaluationValuesWithIndeterminateIdentity.has(target)
    && !evaluationValuesWithIndeterminateIdentity.has(source)) {
    throw new Error('Cannot replace branch-dependent evaluator identity with a definite lineage.');
  }
  evaluationValueLineageRoots.set(target, sourceRoot);
  if (evaluationValuesWithIndeterminateIdentity.has(source)) {
    evaluationValuesWithIndeterminateIdentity.add(target);
  }
}

/** Bind one joined carrier to common runtime identity or mark its identity as branch-dependent. */
export function bindEvaluationValueJoin(
  left: EvaluationValue,
  right: EvaluationValue,
  target: EvaluationValue,
): void {
  if (!evaluationValueHasRuntimeIdentity(target)) {
    return;
  }
  if (left.kind !== target.kind || right.kind !== target.kind) {
    throw new Error(`Cannot join ${left.kind} and ${right.kind} identities into ${target.kind}.`);
  }
  if (evaluationValuesShareLineage(left, right)) {
    bindEvaluationValueLineage(left, target);
    return;
  }
  if (evaluationValueLineageRoots.has(target)) {
    throw new Error('Cannot make an already-bound evaluator lineage branch-dependent.');
  }
  evaluationValuesWithIndeterminateIdentity.add(target);
}

/** Return whether two identity-bearing snapshots are proven to represent the same runtime object. */
export function evaluationValuesShareLineage(left: EvaluationValue, right: EvaluationValue): boolean {
  if (!evaluationValueHasRuntimeIdentity(left) || !evaluationValueHasRuntimeIdentity(right)) {
    return false;
  }
  if (left === right) {
    return true;
  }
  return evaluationValueLineageRoot(left) === evaluationValueLineageRoot(right);
}

/** Decide ECMAScript strict equality while preserving open object/boundary identity. */
export function evaluationStrictEqualityDecision(
  left: EvaluationValue,
  right: EvaluationValue,
): EvaluationValueRelationKind {
  if (left.kind === EvaluationValueKind.BigInt && right.kind === EvaluationValueKind.BigInt) {
    return evaluationBigIntTextEqual(left.text, right.text)
      ? EvaluationValueRelationKind.Match
      : EvaluationValueRelationKind.Miss;
  }
  if (isEvaluationPrimitiveValue(left) && isEvaluationPrimitiveValue(right)) {
    return readEvaluationPrimitive(left) === readEvaluationPrimitive(right)
      ? EvaluationValueRelationKind.Match
      : EvaluationValueRelationKind.Miss;
  }
  if (isIncompleteEvaluationDenotation(left) || isIncompleteEvaluationDenotation(right)) {
    return EvaluationValueRelationKind.Open;
  }
  if (evaluationValuesShareLineage(left, right)) {
    return EvaluationValueRelationKind.Match;
  }
  if (evaluationValueIdentityIsIndeterminate(left) || evaluationValueIdentityIsIndeterminate(right)) {
    return EvaluationValueRelationKind.Open;
  }
  if (evaluationValueHasRuntimeIdentity(left) && evaluationValueHasRuntimeIdentity(right)) {
    return left.kind === EvaluationValueKind.BoundaryObject
      || right.kind === EvaluationValueKind.BoundaryObject
      ? EvaluationValueRelationKind.Open
      : EvaluationValueRelationKind.Miss;
  }
  return EvaluationValueRelationKind.Miss;
}

/** Decide ECMAScript SameValue, used when alternative states may be collapsed into one exact value. */
export function evaluationSameValueDecision(
  left: EvaluationValue,
  right: EvaluationValue,
): EvaluationValueRelationKind {
  if (left.kind === EvaluationValueKind.Number && right.kind === EvaluationValueKind.Number) {
    return Object.is(left.value, right.value)
      ? EvaluationValueRelationKind.Match
      : EvaluationValueRelationKind.Miss;
  }
  return evaluationStrictEqualityDecision(left, right);
}

/** Decide ECMAScript SameValueZero as used by Array.includes, Map, and Set. */
export function evaluationSameValueZeroDecision(
  left: EvaluationValue,
  right: EvaluationValue,
): EvaluationValueRelationKind {
  if (left.kind === EvaluationValueKind.Number && right.kind === EvaluationValueKind.Number) {
    return left.value === right.value || Number.isNaN(left.value) && Number.isNaN(right.value)
      ? EvaluationValueRelationKind.Match
      : EvaluationValueRelationKind.Miss;
  }
  return evaluationStrictEqualityDecision(left, right);
}

/** Boolean strict-equality view for consumers that only retain unanimous exact matches. */
export function evaluationValuesStrictlyEqual(left: EvaluationValue, right: EvaluationValue): boolean {
  return evaluationStrictEqualityDecision(left, right) === EvaluationValueRelationKind.Match;
}

/** Boolean SameValueZero view for consumers that only retain exact matches. */
export function evaluationValuesSameValueZero(left: EvaluationValue, right: EvaluationValue): boolean {
  return evaluationSameValueZeroDecision(left, right) === EvaluationValueRelationKind.Match;
}

function evaluationValueLineageRoot(value: EvaluationValue): object {
  return evaluationValueLineageRoots.get(value) ?? value;
}

function evaluationValueIdentityIsIndeterminate(value: EvaluationValue): boolean {
  return evaluationValueHasRuntimeIdentity(value)
    && evaluationValuesWithIndeterminateIdentity.has(value);
}

function evaluationValueHasRuntimeIdentity(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
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

function isIncompleteEvaluationDenotation(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Unknown
    || value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.StringPattern;
}

function evaluationBigIntTextEqual(left: string, right: string): boolean {
  try {
    return BigInt(left.slice(0, -1)) === BigInt(right.slice(0, -1));
  } catch {
    return left === right;
  }
}
