import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { EvaluationBoundaryKind } from './values.js';

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
