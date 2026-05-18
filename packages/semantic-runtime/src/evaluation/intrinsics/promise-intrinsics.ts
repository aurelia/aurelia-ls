import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationPromiseValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';

export function evaluatePromiseResolve(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const argument = call.arguments[0];
  if (argument == null || ts.isSpreadElement(argument)) {
    return null;
  }
  const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
  return value.kind === EvaluationValueKind.Promise
    ? value
    : new EvaluationPromiseValue(value, call);
}

export function evaluatePromiseContinuation(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  return receiver.kind === EvaluationValueKind.Promise
    ? new EvaluationPromiseValue(receiver.fulfilledValue, call)
    : null;
}

export function evaluatePromiseThen(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Promise) {
    return null;
  }
  const onFulfilledExpression = call.arguments[0];
  if (onFulfilledExpression == null || ts.isSpreadElement(onFulfilledExpression)) {
    return new EvaluationPromiseValue(receiver.fulfilledValue, call);
  }
  const onFulfilled = host.evaluateExpression(onFulfilledExpression, environment, moduleKey, depth + 1);
  if (onFulfilled.kind !== EvaluationValueKind.Function) {
    return host.unknown(
      'Promise.then fulfillment callback did not reduce to a known function.',
      onFulfilledExpression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  const fulfilled = host.evaluateFunctionWithArguments(
    onFulfilled,
    call,
    [receiver.fulfilledValue],
    moduleKey,
    depth + 1,
  );
  return fulfilled.kind === EvaluationValueKind.Promise
    ? fulfilled
    : new EvaluationPromiseValue(fulfilled, call);
}
