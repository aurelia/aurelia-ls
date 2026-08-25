import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { EvaluationAbruptCompletion } from './completion.js';
import {
  evaluationOpenSeamDefaultReasonKinds,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

/** Map evaluator boundary carriers to product/open-seam reason vocabulary. */
export function openSeamReasonKindForEvaluationBoundary(
  boundaryKind: EvaluationBoundaryKind,
): OpenSeamReasonKind {
  switch (boundaryKind) {
    case EvaluationBoundaryKind.HostEnvironment:
      return OpenSeamReasonKind.HostEnvironmentValue;
    case EvaluationBoundaryKind.ExternalModule:
      return OpenSeamReasonKind.ExternalModuleValue;
    case EvaluationBoundaryKind.AsyncExecution:
      return OpenSeamReasonKind.AsyncExecutionValue;
    case EvaluationBoundaryKind.BindingScope:
      return OpenSeamReasonKind.BindingSourceSlotNoStaticValue;
  }
}

/** Preserve evaluator boundary provenance when a product turns an open value into its own seam. */
export function openSeamReasonKindsForEvaluationValue(
  value: EvaluationValue | null,
): readonly OpenSeamReasonKind[] {
  if (value == null) {
    return [];
  }
  switch (value.kind) {
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.BoundaryObject:
      return [openSeamReasonKindForEvaluationBoundary(value.boundaryKind)];
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Array:
      return [...new Set(value.uncertainties.flatMap((uncertainty) =>
        uncertainty.boundaryKind == null
          ? []
          : [openSeamReasonKindForEvaluationBoundary(uncertainty.boundaryKind)]
      ))];
    default:
      return [];
  }
}

/** Preserve abrupt-control-flow identity when a value-shaped consumer publishes an open boundary. */
export function openSeamReasonKindsForEvaluationAbruptCompletion(
  completion: EvaluationAbruptCompletion | null,
): readonly OpenSeamReasonKind[] {
  return completion == null ? [] : [OpenSeamReasonKind.StaticEvaluationAbruptCompletion];
}

/** Preserve every machine-readable cause carried by one evaluator value read. */
export function openSeamReasonKindsForEvaluationRead(
  read: {
    readonly value: EvaluationValue | null;
    readonly openSeams: readonly EvaluationOpenSeam[];
    readonly abruptCompletion: EvaluationAbruptCompletion | null;
  } | null,
): readonly OpenSeamReasonKind[] {
  if (read == null) {
    return [];
  }
  return [...new Set([
    ...read.openSeams.flatMap((seam) =>
      seam.reasonKinds.length === 0
        ? evaluationOpenSeamDefaultReasonKinds(seam.seamKind)
        : seam.reasonKinds
    ),
    ...openSeamReasonKindsForEvaluationValue(read.value),
    ...openSeamReasonKindsForEvaluationAbruptCompletion(read.abruptCompletion),
  ])];
}

/** Preserve evaluator pressure from reads, such as target reads, which do not expose a value carrier. */
export function openSeamReasonKindsForEvaluationPressure(
  openSeams: readonly EvaluationOpenSeam[],
  abruptCompletion: EvaluationAbruptCompletion | null,
): readonly OpenSeamReasonKind[] {
  return [...new Set([
    ...openSeams.flatMap((seam) =>
      seam.reasonKinds.length === 0
        ? evaluationOpenSeamDefaultReasonKinds(seam.seamKind)
        : seam.reasonKinds
    ),
    ...openSeamReasonKindsForEvaluationAbruptCompletion(abruptCompletion),
  ])];
}
