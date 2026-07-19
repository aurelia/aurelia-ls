import ts from 'typescript';

import type { ModuleEnvironmentRecord } from '../evaluation/environment.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../evaluation/evaluator.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  StaticEvaluationBranchMode,
  StaticEvaluationPolicy,
} from '../evaluation/policy.js';
import { delegateStaticEvaluationRuntimeHost } from '../evaluation/runtime-host.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import {
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';

/** One container call reached by concrete registry execution after its arguments were evaluated. */
export class DiRegistryExecutedContainerCall {
  constructor(
    readonly call: ts.CallExpression,
    readonly methodName: string,
    readonly callTimeEnvironment: ModuleEnvironmentRecord,
    readonly argumentValues: readonly EvaluationValue[],
    readonly invocationOrdinal: number,
  ) {}
}

export type DiRegistryContainerCallHandler = (
  event: DiRegistryExecutedContainerCall,
  host: StaticIntrinsicEvaluationHost,
) => EvaluationValue;

/** Candidate-local answer from one evaluator-backed registry invocation. */
export class DiRegistryExecutionResult {
  constructor(
    readonly value: EvaluationValue,
    readonly openSeams: readonly EvaluationOpenSeam[],
    readonly handledCalls: readonly DiRegistryExecutedContainerCall[],
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
  const handledCalls: DiRegistryExecutedContainerCall[] = [];
  let invocationOrdinal = 0;
  const runtimeHost = delegateStaticEvaluationRuntimeHost(
    baseRuntimeHost,
    (call, environment, moduleKey, depth, host) => {
      const access = ts.isPropertyAccessExpression(call.expression) ? call.expression : null;
      if (access == null) {
        return null;
      }
      const receiver = host.evaluateExpression(access.expression, environment, moduleKey, depth + 1);
      if (receiver !== containerValue) {
        return null;
      }
      const argumentValues = call.arguments.map((argument) =>
        host.evaluateExpression(ts.isSpreadElement(argument) ? argument.expression : argument, environment, moduleKey, depth + 1)
      );
      const event = new DiRegistryExecutedContainerCall(
        call,
        access.name.text,
        environment.clone(),
        argumentValues,
        invocationOrdinal++,
      );
      if (host.checkpoint().openSeamCount > 0) {
        return containerValue;
      }
      handledCalls.push(event);
      return onContainerCall(event, host);
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
    registerFunction,
    invocationNode,
    registerFunction.environment.moduleKey,
    [containerValue],
    registryValue,
  );
  return new DiRegistryExecutionResult(result.value, result.openSeams, handledCalls);
}
