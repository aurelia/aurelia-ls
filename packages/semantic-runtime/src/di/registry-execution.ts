import ts from 'typescript';

import {
  type StaticEvaluationRuntimeHost,
} from '../evaluation/evaluator.js';
import { executeStaticFunctionEffects } from '../evaluation/function-execution.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationFrame,
  type StaticInvocationOccurrence,
} from '../evaluation/invocation.js';
import {
  type StaticEvaluationPolicy,
} from '../evaluation/policy.js';
import { delegateStaticEvaluationRuntimeHost } from '../evaluation/runtime-host.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import type { EvaluationExpressionAbruptCompletion } from '../evaluation/completion.js';
import {
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { evaluationValuesShareLineage } from '../evaluation/value-relation.js';

export type DiRegistryContainerCallHandler = (
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
) => EvaluationValue;

/** Candidate-local answer from one evaluator-backed registry invocation. */
export class DiRegistryExecutionResult {
  constructor(
    readonly value: EvaluationValue | null,
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null,
    /** Pressure that directly qualifies the returned value. */
    readonly openSeams: readonly EvaluationOpenSeam[],
    /** Every unresolved boundary reached while executing effects, including discarded expression results. */
    readonly auditOpenSeams: readonly EvaluationOpenSeam[],
    readonly handledInvocations: readonly StaticInvocationOccurrence<ts.CallExpression>[],
    /** Modeled evaluator writes performed by this registry invocation. */
    readonly mutationCount: number,
  ) {}
}

/** Execute one exact registry function while delegating reached container calls to its owning DI consumer. */
export function executeDiRegistryFunction(
  registerFunction: EvaluationFunctionValue,
  registryValue: EvaluationValue,
  containerValue: EvaluationValue,
  parameterValues: readonly EvaluationValue[],
  invocationNode: ts.Node,
  basePolicy: StaticEvaluationPolicy,
  baseRuntimeHost: StaticEvaluationRuntimeHost,
  onContainerCall: DiRegistryContainerCallHandler,
): DiRegistryExecutionResult {
  const graph = baseRuntimeHost.evaluationValueGraph;
  const evaluationRegisterFunction = graph?.adoptExternal(registerFunction) ?? registerFunction;
  const evaluationRegistryValue = graph?.adoptExternal(registryValue) ?? registryValue;
  const evaluationContainerValue = graph?.adoptExternal(containerValue) ?? containerValue;
  const evaluationParameterValues = parameterValues.map((value) => graph?.adoptExternal(value) ?? value);
  const handledInvocations = new Set<StaticInvocationFrame['identity']>();
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
      handledInvocations.add(frame.identity);
      return staticInvocationValue(onContainerCall(frame, host));
    },
  );
  const result = executeStaticFunctionEffects(
    evaluationRegisterFunction,
    invocationNode,
    basePolicy,
    runtimeHost,
    [evaluationContainerValue, ...evaluationParameterValues],
    evaluationRegistryValue,
  );
  return new DiRegistryExecutionResult(
    result.value,
    result.abruptCompletion,
    result.openSeams,
    result.auditOpenSeams,
    result.invocations.filter((invocation): invocation is StaticInvocationOccurrence<ts.CallExpression> =>
      invocation.kind === StaticInvocationKind.Call
      && ts.isCallExpression(invocation.node)
      && invocation.thisValue != null
      && evaluationValuesShareLineage(invocation.thisValue.value, evaluationContainerValue)
      && invocation.propertyKey != null
      && handledInvocations.has(invocation.identity)
    ),
    result.mutationCount,
  );
}
