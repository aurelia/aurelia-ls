import ts from 'typescript';

import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../evaluation/evaluator.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationFrame,
  type StaticInvocationOccurrence,
} from '../evaluation/invocation.js';
import {
  StaticEvaluationBranchMode,
  StaticEvaluationPolicy,
} from '../evaluation/policy.js';
import { delegateStaticEvaluationRuntimeHost } from '../evaluation/runtime-host.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import type { EvaluationExpressionAbruptCompletion } from '../evaluation/completion.js';
import {
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';

export type DiRegistryContainerCallHandler = (
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
) => EvaluationValue;

/** Candidate-local answer from one evaluator-backed registry invocation. */
export class DiRegistryExecutionResult {
  constructor(
    readonly value: EvaluationValue | null,
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null,
    readonly openSeams: readonly EvaluationOpenSeam[],
    readonly handledInvocations: readonly StaticInvocationOccurrence<ts.CallExpression>[],
  ) {}
}

/** Execute one exact registry function while delegating reached container calls to its owning DI consumer. */
export function executeDiRegistryFunction(
  registerFunction: EvaluationFunctionValue,
  registryValue: EvaluationValue,
  containerValue: EvaluationValue,
  invocationNode: ts.Node,
  basePolicy: StaticEvaluationPolicy,
  baseRuntimeHost: StaticEvaluationRuntimeHost,
  onContainerCall: DiRegistryContainerCallHandler,
): DiRegistryExecutionResult {
  const graph = baseRuntimeHost.evaluationValueGraph;
  const evaluationRegisterFunction = graph?.adoptExternal(registerFunction) ?? registerFunction;
  const evaluationRegistryValue = graph?.adoptExternal(registryValue) ?? registryValue;
  const evaluationContainerValue = graph?.adoptExternal(containerValue) ?? containerValue;
  const handledArgumentLists = new Set<object>();
  const runtimeHost = delegateStaticEvaluationRuntimeHost(
    baseRuntimeHost,
    (frame, host) => {
      if (
        frame.kind !== StaticInvocationKind.Call
        || !ts.isCallExpression(frame.node)
        || frame.thisValue?.value !== evaluationContainerValue
        || frame.propertyKey == null
      ) {
        return StaticInvocationNotApplicable;
      }
      if (host.checkpoint().openSeamCount > 0) {
        return staticInvocationValue(evaluationContainerValue);
      }
      handledArgumentLists.add(frame.argumentList);
      return staticInvocationValue(onContainerCall(frame, host));
    },
  );
  const evaluator = new StaticEvaluator(
    new StaticEvaluationPolicy(
      basePolicy.expressionStatementPolicies,
      basePolicy.guardrails,
      StaticEvaluationBranchMode.PathProvenEffects,
    ),
    runtimeHost,
  );
  const result = evaluator.evaluateFunctionValue(
    evaluationRegisterFunction,
    invocationNode,
    evaluationRegisterFunction.environment.moduleKey,
    [evaluationContainerValue],
    evaluationRegistryValue,
  );
  return new DiRegistryExecutionResult(
    result.value,
    result.abruptCompletion,
    result.openSeams,
    result.invocations.filter((invocation): invocation is StaticInvocationOccurrence<ts.CallExpression> =>
      invocation.kind === StaticInvocationKind.Call
      && ts.isCallExpression(invocation.node)
      && invocation.thisValue?.value === evaluationContainerValue
      && invocation.propertyKey != null
      && handledArgumentLists.has(invocation.argumentList)
    ),
  );
}
