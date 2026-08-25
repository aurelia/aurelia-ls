import type {
  ExpressionAstNode,
  ValueConverterExpression,
} from '../expression/ast.js';
import { runtimeAssignmentValueConverterChainForExpression } from '../expression/runtime-assignment.js';
import { localKeyPart } from '../kernel/local-key.js';
import type {
  CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeEvaluationResultKind } from './expression-type-evaluation.js';
import type { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';
import type { CheckerTypeReference } from './type-shape.js';
import {
  VALUE_CONVERTER_FROM_VIEW_METHOD,
} from './value-converter-call-surface.js';

export interface RuntimeAssignmentValueConverterWritebackEvaluator {
  evaluateValueConverterMethodFromType(
    context: CheckerExpressionTypeEvaluationContext<ValueConverterExpression>,
    methodName: typeof VALUE_CONVERTER_FROM_VIEW_METHOD,
    inputType: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation;
}

export const enum RuntimeValueConverterWritebackStageState {
  /** The checker projected this converter's `fromView` return type. */
  Type = 'type',
  /** The checker attempted this converter's `fromView` call but could not close its return type. */
  Open = 'open',
  /** A prior converter left the input type open, so this structural stage could not be projected. */
  InputOpen = 'input-open',
}

export interface RuntimeAssignmentValueConverterWritebackStage {
  readonly converter: ValueConverterExpression;
  /** Outer-to-inner `astAssign` execution order. */
  readonly stageIndex: number;
  readonly state: RuntimeValueConverterWritebackStageState;
  readonly inputType: CheckerTypeReference | null;
  readonly outputType: CheckerTypeReference | null;
  readonly openReason: string | null;
  readonly openKind: CheckerExpressionTypeOpenKind | null;
}

export interface RuntimeAssignmentValueConverterWritebackProjection {
  readonly stages: readonly RuntimeAssignmentValueConverterWritebackStage[];
  readonly targetToSourceValueType: CheckerTypeReference | null;
  readonly openReason: string | null;
  readonly openKind: CheckerExpressionTypeOpenKind | null;
}

/**
 * Projects Aurelia `astAssign` value-converter `fromView(...)` writeback through the shared TypeChecker call path.
 */
export function projectRuntimeAssignmentValueConverterWriteback(input: {
  readonly expression: ExpressionAstNode;
  readonly evaluator: RuntimeAssignmentValueConverterWritebackEvaluator;
  readonly context: CheckerExpressionTypeEvaluationContext;
  readonly targetValueType: CheckerTypeReference | null;
}): RuntimeAssignmentValueConverterWritebackProjection | null {
  const converters = runtimeAssignmentValueConverterChainForExpression(input.expression);
  if (converters.length === 0) {
    return null;
  }
  if (input.targetValueType == null) {
    const openReason = 'Target-to-source value type was not projected.';
    return {
      stages: converters.map((converter, stageIndex) => ({
        converter,
        stageIndex,
        state: RuntimeValueConverterWritebackStageState.InputOpen,
        inputType: null,
        outputType: null,
        openReason,
        openKind: null,
      })),
      targetToSourceValueType: null,
      openReason,
      openKind: null,
    };
  }

  const stages: RuntimeAssignmentValueConverterWritebackStage[] = [];
  let current: CheckerTypeReference | null = input.targetValueType;
  let partialCurrent: CheckerTypeReference | null = null;
  let openReason: string | null = null;
  let openKind: CheckerExpressionTypeOpenKind | null = null;
  for (let index = 0; index < converters.length; index += 1) {
    const converter = converters[index]!;
    if (current == null) {
      stages.push({
        converter,
        stageIndex: index,
        state: RuntimeValueConverterWritebackStageState.InputOpen,
        inputType: partialCurrent,
        outputType: null,
        openReason: `Writeback input remains open after an earlier converter: ${openReason ?? 'no closed input type was available.'}`,
        openKind,
      });
      partialCurrent = null;
      continue;
    }
    const stageInput = current;
    const evaluation = input.evaluator.evaluateValueConverterMethodFromType(
      input.context.child(
        converter,
        `converter:${index}:${localKeyPart(converter.name.name)}:from-view`,
      ),
      VALUE_CONVERTER_FROM_VIEW_METHOD,
      current,
    );
    if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      stages.push({
        converter,
        stageIndex: index,
        state: RuntimeValueConverterWritebackStageState.Open,
        inputType: stageInput,
        outputType: evaluation.partialTypeReference,
        openReason: evaluation.summary,
        openKind: evaluation.openKind,
      });
      current = null;
      partialCurrent = evaluation.partialTypeReference;
      openReason = evaluation.summary;
      openKind = evaluation.openKind;
      continue;
    }
    current = evaluation.typeReference;
    partialCurrent = current;
    stages.push({
      converter,
      stageIndex: index,
      state: RuntimeValueConverterWritebackStageState.Type,
      inputType: stageInput,
      outputType: current,
      openReason: null,
      openKind: null,
    });
  }

  return {
    stages,
    targetToSourceValueType: current,
    openReason,
    openKind,
  };
}
