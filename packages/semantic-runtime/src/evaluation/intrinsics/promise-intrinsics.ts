import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationPromiseValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import { EvaluationValueEvidence } from '../value-pressure.js';
import { evaluatePositionalIntrinsicArguments } from './shared.js';

export function evaluatePromiseResolve(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call } = frame;
  const argumentRead = promiseInvocationArguments(frame, host, 'Promise.resolve argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const argument = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (argument.openSeams.length > 0) {
    return new EvaluationUnknownValue(
      'Promise.resolve value retained open pressure.',
      call,
      true,
    );
  }
  const value = argument.value;
  return value.kind === EvaluationValueKind.Promise
    ? value
    : new EvaluationPromiseValue(value, call);
}

export function evaluatePromiseContinuation(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call } = frame;
  const receiverRead = promiseInvocationReceiver(frame, host, 'Promise continuation receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = promiseInvocationArguments(frame, host, 'Promise continuation argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  return receiver.kind === EvaluationValueKind.Promise
    ? new EvaluationPromiseValue(receiver.fulfilledValue, call)
    : null;
}

export function evaluatePromiseThen(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = promiseInvocationReceiver(frame, host, 'Promise.then receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Promise) {
    return null;
  }
  const argumentRead = promiseInvocationArguments(frame, host, 'Promise.then argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const onFulfilledEvidence = argumentRead.evidence[0] ?? null;
  if (onFulfilledEvidence == null) {
    return new EvaluationPromiseValue(receiver.fulfilledValue, call);
  }
  if (onFulfilledEvidence.openSeams.length > 0) {
    return new EvaluationUnknownValue(
      'Promise.then fulfillment callback retained open pressure.',
      argumentRead.argumentList.elements[0]?.expression ?? call,
      true,
    );
  }
  const onFulfilled = onFulfilledEvidence.value;
  if (onFulfilled.kind !== EvaluationValueKind.Function) {
    return host.unknown(
      'Promise.then fulfillment callback did not reduce to a known function.',
      argumentRead.argumentList.elements[0]?.expression ?? call,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  const fulfilled = host.evaluateFunctionWithArguments(
    onFulfilled,
    call,
    [new EvaluationValueEvidence(receiver.fulfilledValue, [])],
    moduleKey,
    depth + 1,
    null,
  );
  return fulfilled.kind === EvaluationValueKind.Promise
    ? fulfilled
    : new EvaluationPromiseValue(fulfilled, call);
}

function promiseInvocationArguments(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
) {
  const read = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    frame.node,
    frame.moduleKey,
    host,
    openReason,
  );
  if (read.kind === 'known') {
    for (const evidence of read.evidence) {
      host.replayOpenSeams(evidence.openSeams);
    }
  }
  return read;
}

function promiseInvocationReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
): { readonly kind: 'known'; readonly value: EvaluationValue }
  | { readonly kind: 'open'; readonly value: EvaluationUnknownValue } {
  const receiver = frame.thisValue
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (receiver.openSeams.length === 0) {
    return { kind: 'known', value: receiver.value };
  }
  host.replayOpenSeams(receiver.openSeams);
  return {
    kind: 'open',
    value: new EvaluationUnknownValue(openReason, frame.calleeNode, true),
  };
}
