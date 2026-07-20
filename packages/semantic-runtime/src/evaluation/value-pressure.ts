import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

/** One best-known evaluator value carried across an addressable edge with its exact qualifying pressure. */
export class EvaluationValueEvidence {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly value: EvaluationValue,
    openSeams: readonly EvaluationOpenSeam[],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** Build edge evidence from one evaluation while localizing pressure already retained by child slots. */
export function evaluationValueEvidence(
  value: EvaluationValue,
  observed: readonly EvaluationOpenSeam[],
): EvaluationValueEvidence {
  const candidate = value.kind === EvaluationValueKind.Unknown
    ? value.retainedCandidate
    : null;
  return new EvaluationValueEvidence(
    candidate ?? value,
    unretainedEvaluationOpenSeams(candidate ?? value, observed),
  );
}

/** Pressure that qualifies use of the value carrier itself rather than one addressable child slot. */
export function evaluationValueOwnOpenSeams(
  value: EvaluationValue,
): readonly EvaluationOpenSeam[] {
  switch (value.kind) {
    case EvaluationValueKind.Array:
      return value.aggregateOpenSeams;
    case EvaluationValueKind.Object:
      return value.shapeOpenSeams;
    case EvaluationValueKind.Instance:
      return compactEvaluationOpenSeams([
        ...value.constructionOpenSeams,
        ...value.shapeOpenSeams,
      ]);
    default:
      return [];
  }
}

/**
 * Keep only pressure that remains causal to an edge after the returned value has retained its child-slot evidence.
 *
 * The evaluator's audit stream intentionally records every encountered seam. Edge carriers must be narrower: a seam
 * retained by `value.openChild` must not also qualify an enclosing `value.closedChild` or lexical alias of `value`.
 */
/** Pressure observed while producing a value that no retained carrier inside that value already owns. */
export function unretainedEvaluationOpenSeams(
  value: EvaluationValue,
  observed: readonly EvaluationOpenSeam[],
): readonly EvaluationOpenSeam[] {
  if (observed.length === 0) {
    return [];
  }
  const retained = new Set<EvaluationOpenSeam>();
  collectRetainedEvaluationOpenSeams(value, retained, new Set());
  return compactEvaluationOpenSeams(observed.filter((seam) => !retained.has(seam)));
}

function collectRetainedEvaluationOpenSeams(
  value: EvaluationValue,
  target: Set<EvaluationOpenSeam>,
  seen: Set<EvaluationValue>,
): void {
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const seam of evaluationValueOwnOpenSeams(value)) {
    target.add(seam);
  }

  switch (value.kind) {
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
      for (const element of value.elements) {
        addSlotPressure(element.openSeams, element.value, target, seen);
      }
      return;
    case EvaluationValueKind.Map:
      for (const entry of value.entries) {
        collectRetainedEvaluationOpenSeams(entry.key, target, seen);
        collectRetainedEvaluationOpenSeams(entry.value, target, seen);
      }
      return;
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      for (const property of value.properties.values()) {
        addSlotPressure(property.openSeams, property.value, target, seen);
      }
      return;
    case EvaluationValueKind.ModuleNamespace:
      for (const entry of value.exportEntries.values()) {
        addSlotPressure(entry.openSeams, entry.value, target, seen);
      }
      return;
    case EvaluationValueKind.Promise:
      collectRetainedEvaluationOpenSeams(value.fulfilledValue, target, seen);
      return;
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.StringPattern:
      return;
  }
}

function addSlotPressure(
  openSeams: readonly EvaluationOpenSeam[],
  value: EvaluationValue,
  target: Set<EvaluationOpenSeam>,
  seen: Set<EvaluationValue>,
): void {
  for (const seam of openSeams) {
    target.add(seam);
  }
  collectRetainedEvaluationOpenSeams(value, target, seen);
}
