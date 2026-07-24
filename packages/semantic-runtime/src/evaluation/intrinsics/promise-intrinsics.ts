import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationPromiseSettlementKind,
  EvaluationPromiseValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  readEvaluationCallability,
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
  const value = argument.value;
  return value.kind === EvaluationValueKind.Promise && argument.openSeams.length === 0
    ? value
    : argument.openSeams.length === 0
      ? EvaluationPromiseValue.fulfilled(argument, call)
      : EvaluationPromiseValue.open(argument, call);
}

export function evaluatePromiseReject(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const argumentRead = promiseInvocationArguments(frame, host, 'Promise.reject argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  return EvaluationPromiseValue.rejected(
    argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []),
    frame.node,
  );
}

export function evaluatePromiseThen(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call, moduleKey } = frame;
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
  const settlement = receiver.settlement;
  if (settlement.kind === EvaluationPromiseSettlementKind.Open) {
    const onFulfilled = argumentRead.evidence[0] ?? null;
    const onRejected = argumentRead.evidence[1] ?? null;
    if (!promiseHandlerMayExecute(onFulfilled) && !promiseHandlerMayExecute(onRejected)) {
      return EvaluationPromiseValue.fromSettlement(settlement, call);
    }
    return openPromiseReaction(
      settlement.evidence,
      call,
      moduleKey,
      host,
      'Promise.then source settlement remained open.',
      [...promiseHandlerPressure(onFulfilled), ...promiseHandlerPressure(onRejected)],
    );
  }
  const callbackEvidence = settlement.kind === EvaluationPromiseSettlementKind.Fulfilled
    ? argumentRead.evidence[0] ?? null
    : argumentRead.evidence[1] ?? null;
  return promiseReactionWithoutExecution(
    receiver,
    callbackEvidence,
    argumentRead.argumentList.elements[settlement.kind === EvaluationPromiseSettlementKind.Fulfilled ? 0 : 1]?.expression
      ?? call,
    call,
    moduleKey,
    host,
  );
}

export function evaluatePromiseCatch(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiverRead = promiseInvocationReceiver(frame, host, 'Promise.catch receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Promise) {
    return null;
  }
  const argumentRead = promiseInvocationArguments(frame, host, 'Promise.catch argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  return receiver.settlement.kind === EvaluationPromiseSettlementKind.Rejected
    ? promiseReactionWithoutExecution(
        receiver,
        argumentRead.evidence[0] ?? null,
        argumentRead.argumentList.elements[0]?.expression ?? frame.node,
        frame.node,
        frame.moduleKey,
        host,
      )
    : receiver.settlement.kind === EvaluationPromiseSettlementKind.Fulfilled
      ? EvaluationPromiseValue.fromSettlement(receiver.settlement, frame.node)
      : promiseHandlerMayExecute(argumentRead.evidence[0] ?? null)
        ? openPromiseReaction(
            receiver.settlement.evidence,
            frame.node,
            frame.moduleKey,
            host,
            'Promise.catch source settlement remained open.',
            promiseHandlerPressure(argumentRead.evidence[0] ?? null),
          )
        : EvaluationPromiseValue.fromSettlement(receiver.settlement, frame.node);
}

export function evaluatePromiseFinally(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiverRead = promiseInvocationReceiver(frame, host, 'Promise.finally receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Promise) {
    return null;
  }
  const argumentRead = promiseInvocationArguments(frame, host, 'Promise.finally argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const callback = argumentRead.evidence[0] ?? null;
  return callback == null || isDefinitelyNonCallable(callback.value)
    ? EvaluationPromiseValue.fromSettlement(receiver.settlement, frame.node)
      : openPromiseReaction(
          receiver.settlement.evidence,
          frame.node,
          frame.moduleKey,
          host,
          'Promise.finally callback settlement requires deferred execution.',
          promiseHandlerPressure(callback),
        );
}

function promiseReactionWithoutExecution(
  receiver: EvaluationPromiseValue,
  callback: EvaluationValueEvidence | null,
  callbackNode: ts.Node,
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationPromiseValue {
  if (callback == null || isDefinitelyNonCallable(callback.value)) {
    return EvaluationPromiseValue.fromSettlement(receiver.settlement, call);
  }
  return openPromiseReaction(
    receiver.settlement.evidence,
    callbackNode,
    moduleKey,
    host,
    'Promise reaction callback requires deferred graph-isolated execution.',
    promiseHandlerPressure(callback),
  );
}

function openPromiseReaction(
  candidate: EvaluationValueEvidence,
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
  summary: string,
  dependencyOpenSeams: readonly EvaluationOpenSeam[] = [],
): EvaluationPromiseValue {
  const checkpoint = host.checkpoint();
  host.open(EvaluationOpenSeamKind.DynamicCall, summary, node, moduleKey, []);
  const openSeams = host.consumeOpenSeamsSince(checkpoint);
  return EvaluationPromiseValue.open(
    new EvaluationValueEvidence(
      new EvaluationBoundaryValue(
        EvaluationBoundaryKind.AsyncExecution,
        'Promise reaction settlement',
        node,
      ),
      [...candidate.openSeams, ...dependencyOpenSeams, ...openSeams],
    ),
    node,
  );
}

function isDefinitelyNonCallable(value: EvaluationValue): boolean {
  return readEvaluationCallability(value) === false;
}

function promiseHandlerMayExecute(handler: EvaluationValueEvidence | null): boolean {
  return handler != null && !isDefinitelyNonCallable(handler.value);
}

function promiseHandlerPressure(handler: EvaluationValueEvidence | null): readonly EvaluationOpenSeam[] {
  return handler?.openSeams ?? [];
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
