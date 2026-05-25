import ts from 'typescript';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationBoundaryValue,
  EvaluationValueKind,
  type EvaluationFunctionValue,
  type EvaluationRegularExpressionValue,
  type EvaluationValue,
} from '../values.js';
import type { ModuleEnvironmentRecord } from '../environment.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
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
    readonly value: EvaluationValue;
  }
  | {
    readonly kind: IntrinsicCallbackEvaluationKind.BudgetExhausted;
  };

export class IntrinsicCallbackFrame {
  private readonly checkpoint;
  private evaluations = 0;

  constructor(
    private readonly host: StaticIntrinsicEvaluationHost,
    private readonly call: ts.CallExpression,
    private readonly moduleKey: string,
    private readonly depth: number,
  ) {
    this.checkpoint = host.checkpoint();
  }

  evaluate(
    callback: EvaluationFunctionValue,
    argumentValues: readonly EvaluationValue[],
  ): IntrinsicCallbackEvaluation {
    if (this.evaluations >= this.host.guardrails.maxIntrinsicCallbackEvaluations) {
      return { kind: IntrinsicCallbackEvaluationKind.BudgetExhausted };
    }
    this.evaluations++;
    return {
      kind: IntrinsicCallbackEvaluationKind.Evaluated,
      value: this.host.evaluateFunctionWithArguments(
        callback,
        this.call,
        argumentValues,
        this.moduleKey,
        this.depth,
      ),
    };
  }

  restore(): void {
    this.host.restore(this.checkpoint);
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

export function readSliceRange(
  call: ts.CallExpression,
  length: number,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): { readonly start: number; readonly end: number } | null {
  const start = call.arguments[0] == null
    ? 0
    : readSliceBound(host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1), length, 0);
  const end = call.arguments[1] == null
    ? length
    : readSliceBound(host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1), length, length);
  if (start == null || end == null) {
    return null;
  }
  return {
    start: Math.min(Math.max(start, 0), length),
    end: Math.min(Math.max(end, 0), length),
  };
}

export function arrayCallbackValue(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  label: string,
): { readonly kind: 'known'; readonly value: EvaluationFunctionValue } | { readonly kind: 'open'; readonly value: EvaluationValue } {
  const callbackExpression = call.arguments[0];
  if (callbackExpression == null) {
    return {
      kind: 'open',
      value: host.unknown(`${label} is missing.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall),
    };
  }
  if (ts.isSpreadElement(callbackExpression)) {
    return {
      kind: 'open',
      value: host.unknown(`${label} was provided through a spread argument.`, callbackExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall),
    };
  }
  const callback = host.evaluateExpression(callbackExpression, environment, moduleKey, depth + 1);
  return callback.kind === EvaluationValueKind.Function
    ? { kind: 'known', value: callback }
    : {
      kind: 'open',
      value: host.unknown(`${label} did not reduce to a known function.`, callbackExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall),
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
    host.open(EvaluationOpenSeamKind.DynamicCall, 'Regular expression value did not construct in the host runtime.', node, moduleKey);
    return null;
  }
}

export function evaluateCallArgumentValues(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): readonly EvaluationValue[] {
  const values: EvaluationValue[] = [];
  for (const argument of call.arguments) {
    const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
    if (ts.isSpreadElement(argument) && value.kind === EvaluationValueKind.Array) {
      values.push(...value.elements.map((element) => element.value));
    } else {
      values.push(value);
    }
  }
  return values;
}
