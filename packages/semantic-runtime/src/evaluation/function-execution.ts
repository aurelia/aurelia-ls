import ts from 'typescript';

import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
  type StaticExpressionEvaluationResult,
} from './evaluator.js';
import {
  StaticEvaluationBranchMode,
  StaticEvaluationPolicy,
} from './policy.js';
import type {
  EvaluationFunctionValue,
  EvaluationValue,
} from './values.js';

/** Execute one retained function while admitting effects only from a statically proven path. */
export function executeStaticFunctionEffects(
  fn: EvaluationFunctionValue,
  invocationNode: ts.Node,
  basePolicy: StaticEvaluationPolicy,
  runtimeHost: StaticEvaluationRuntimeHost,
  argumentValues: readonly EvaluationValue[],
  thisValue: EvaluationValue | null = null,
): StaticExpressionEvaluationResult {
  const evaluator = new StaticEvaluator(
    new StaticEvaluationPolicy(
      basePolicy.expressionStatementPolicies,
      basePolicy.guardrails,
      StaticEvaluationBranchMode.PathProvenEffects,
    ),
    runtimeHost,
  );
  return evaluator.evaluateFunctionValue(
    fn,
    invocationNode,
    fn.environment.moduleKey,
    argumentValues,
    thisValue,
  );
}
