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

export interface RuntimeAssignmentValueConverterWritebackProjection {
  readonly converterCount: number;
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
    return {
      converterCount: converters.length,
      targetToSourceValueType: null,
      openReason: null,
      openKind: null,
    };
  }

  let current = input.targetValueType;
  for (let index = 0; index < converters.length; index += 1) {
    const converter = converters[index]!;
    const evaluation = input.evaluator.evaluateValueConverterMethodFromType(
      input.context.child(
        converter,
        `converter:${index}:${localKeyPart(converter.name.name)}:from-view`,
      ),
      VALUE_CONVERTER_FROM_VIEW_METHOD,
      current,
    );
    if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return {
        converterCount: converters.length,
        targetToSourceValueType: null,
        openReason: evaluation.summary,
        openKind: evaluation.openKind,
      };
    }
    current = evaluation.typeReference;
  }

  return {
    converterCount: converters.length,
    targetToSourceValueType: current,
    openReason: null,
    openKind: null,
  };
}
