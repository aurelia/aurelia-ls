import ts from 'typescript';
import type { EvaluationArgumentList } from '../argument-list.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../seams.js';
import {
  EvaluationBoundaryValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationFunctionValue,
  type EvaluationRegularExpressionValue,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  evaluationValueEvidence,
  type EvaluationValueEvidence,
} from '../value-pressure.js';
import {
  readArrayStartIndex,
  readArraySpliceDeleteCount,
  readArrayWithIndex,
  readSliceBound,
  stringCoercionText,
} from '../value-coercion.js';

export {
  readArrayStartIndex,
  readArraySpliceDeleteCount,
  readArrayWithIndex,
  readSliceBound,
  stringCoercionText,
};

export const enum IntrinsicCallbackEvaluationKind {
  /** Callback invocation completed within the evaluator's intrinsic callback budget. */
  Evaluated = 'evaluated',
  /** Callback invocation was skipped because the intrinsic callback budget was exhausted. */
  BudgetExhausted = 'budget-exhausted',
}

export type IntrinsicCallbackEvaluation =
  | {
    readonly kind: IntrinsicCallbackEvaluationKind.Evaluated;
    readonly evidence: EvaluationValueEvidence;
  }
  | {
    readonly kind: IntrinsicCallbackEvaluationKind.BudgetExhausted;
  };

export class IntrinsicCallbackFrame {
  private evaluations = 0;

  constructor(
    private readonly host: StaticIntrinsicEvaluationHost,
    private readonly call: ts.CallExpression,
    private readonly moduleKey: string,
    private readonly depth: number,
    private readonly thisValue: EvaluationValueEvidence | null = null,
  ) {}

  /** Admit the complete callback traversal before any user code can mutate evaluator-visible state. */
  admits(evaluations: number): boolean {
    return Number.isInteger(evaluations)
      && evaluations >= 0
      && evaluations <= this.host.guardrails.maxIntrinsicCallbackEvaluations;
  }

  evaluate(
    callback: EvaluationFunctionValue,
    argumentValues: readonly EvaluationValueEvidence[],
  ): IntrinsicCallbackEvaluation {
    if (this.evaluations >= this.host.guardrails.maxIntrinsicCallbackEvaluations) {
      return { kind: IntrinsicCallbackEvaluationKind.BudgetExhausted };
    }
    this.evaluations++;
    const checkpoint = this.host.checkpoint();
    const value = this.host.evaluateFunctionWithArguments(
      callback,
      this.call,
      argumentValues,
      this.moduleKey,
      this.depth,
      this.thisValue,
    );
    return {
      kind: IntrinsicCallbackEvaluationKind.Evaluated,
      evidence: evaluationValueEvidence(
        value,
        this.host.consumeOpenSeamsSince(checkpoint),
      ),
    };
  }
}

export function isBoundaryEvaluationValue(
  value: EvaluationValue,
): value is EvaluationValue & {
  readonly boundaryKind: EvaluationBoundaryValue['boundaryKind'];
  readonly path: string;
} {
  return value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.BoundaryObject;
}

export function boundaryIntrinsicCallValue(
  receiver: EvaluationValue & {
    readonly boundaryKind: EvaluationBoundaryValue['boundaryKind'];
    readonly path: string;
  },
  intrinsicName: string,
  call: ts.CallExpression,
): EvaluationBoundaryValue {
  return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${intrinsicName}(...)`, call);
}

/** Read exact runtime positions from the evaluator's already-completed argument-list phase. */
export function evaluatePositionalIntrinsicArguments(
  argumentList: EvaluationArgumentList,
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
): {
  readonly kind: 'known';
  readonly argumentList: EvaluationArgumentList;
  readonly evidence: readonly EvaluationValueEvidence[];
} | {
  readonly kind: 'open';
  readonly value: EvaluationUnknownValue;
} {
  const evidence = argumentList.exactEvidence();
  if (evidence != null) {
    return { kind: 'known', argumentList, evidence };
  }
  const openSeams = argumentList.aggregateOpenSeams;
  if (openSeams.length > 0) {
    return { kind: 'open', value: new EvaluationUnknownValue(openReason, node, true) };
  }
  return {
    kind: 'open',
    value: host.unknown(openReason, node, moduleKey, EvaluationOpenSeamKind.DynamicCall),
  };
}

export interface IntrinsicSliceRangeRead {
  readonly range: { readonly start: number; readonly end: number } | null;
  readonly openSeams: readonly EvaluationOpenSeam[];
}

export function readSliceRange(
  arguments_: readonly EvaluationValueEvidence[],
  length: number,
): IntrinsicSliceRangeRead {
  const startEvidence = arguments_[0] ?? null;
  const endEvidence = arguments_[1] ?? null;
  const openSeams = [
    ...(startEvidence?.openSeams ?? []),
    ...(endEvidence?.openSeams ?? []),
  ];
  if (openSeams.length > 0) {
    return { range: null, openSeams };
  }
  const start = startEvidence == null
    ? 0
    : readSliceBound(startEvidence.value, length, 0);
  const end = endEvidence == null
    ? length
    : readSliceBound(endEvidence.value, length, length);
  if (start == null || end == null) {
    return { range: null, openSeams: [] };
  }
  return {
    range: {
      start: Math.min(Math.max(start, 0), length),
      end: Math.min(Math.max(end, 0), length),
    },
    openSeams: [],
  };
}

export function regularExpressionValue(
  value: EvaluationRegularExpressionValue,
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): RegExp | null {
  try {
    return new RegExp(value.pattern, value.flags);
  } catch {
    host.open(EvaluationOpenSeamKind.DynamicCall, 'Regular expression value did not construct in the host runtime.', node, moduleKey, []);
    return null;
  }
}
