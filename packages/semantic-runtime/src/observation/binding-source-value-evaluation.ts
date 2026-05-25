import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  openSeamReasonKindForEvaluationBoundary,
} from '../evaluation/boundary-open-reason.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';

/** Source-value evaluation result shape shared by binding, router, template, and composition consumers. */
export const enum RuntimeBindingSourceValueEvaluationKind {
  /** Evaluation closed to a modeled value. */
  Value = 'value',
  /** Evaluation reached a runtime-dependent or unsupported semantic boundary. */
  Open = 'open',
}

/** Closed value or explicit open reason for a binding-source value read. */
export class RuntimeBindingSourceValueEvaluation {
  constructor(
    readonly kind: RuntimeBindingSourceValueEvaluationKind,
    readonly value: EvaluationValue | null,
    readonly openReason: string | null,
    readonly openReasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {}

  static value(value: EvaluationValue): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(RuntimeBindingSourceValueEvaluationKind.Value, value, null);
  }

  static open(
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(
      RuntimeBindingSourceValueEvaluationKind.Open,
      null,
      reason,
      [...new Set(reasonKinds)],
    );
  }
}

export function openBindingSourceNeedsRuntimeValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
  );
}

/** Converts an evaluator value plus retained open summaries into a binding-source value result. */
export function bindingSourceValueEvaluationResult(
  value: EvaluationValue,
  openSummaries: readonly string[],
): RuntimeBindingSourceValueEvaluation {
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [openSeamReasonKindForEvaluationBoundary(value.boundaryKind)],
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    );
  }
  if (openSummaries.length > 0) {
    return RuntimeBindingSourceValueEvaluation.open(
      openSummaries.join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    );
  }
  return RuntimeBindingSourceValueEvaluation.value(value);
}

export function openBindingSourceSlotNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
  );
}

export function openBindingSourceMemberNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceMemberNoStaticValue],
  );
}

export function openBindingSourceUnsupportedExpression(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
  );
}
