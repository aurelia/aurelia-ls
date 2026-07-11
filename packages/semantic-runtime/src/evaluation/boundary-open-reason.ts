import { OpenSeamReasonKind } from '../kernel/open-seam.js';
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
