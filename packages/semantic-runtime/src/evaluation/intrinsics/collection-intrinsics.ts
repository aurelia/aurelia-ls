import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  evaluationArrayHasExactPositions,
  evaluationArrayIteratorElements,
} from '../array-value-operations.js';
import {
  EvaluationArrayElement,
  EvaluationBooleanValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationSetValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  evaluationValuesSameValueZero,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import { EvaluationValueEvidence } from '../value-pressure.js';
import { evaluatePositionalIntrinsicArguments } from './shared.js';

export function evaluateSetConstructor(
  frame: StaticInvocationFrame<ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
  weak: boolean,
): EvaluationValue {
  const { node: expression, moduleKey } = frame;
  const argumentRead = collectionInvocationArguments(
    frame,
    host,
    `${weak ? 'WeakSet' : 'Set'} constructor argument list did not close.`,
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const iterableEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (iterableEvidence.openSeams.length > 0) {
    return openCollectionInput(
      `${weak ? 'WeakSet' : 'Set'} constructor iterable retained open pressure.`,
      expression,
    );
  }
  const iterable = iterableEvidence.value;
  if (iterable.kind === EvaluationValueKind.Undefined) {
    return new EvaluationSetValue([], weak, expression, weak);
  }
  if (iterable.kind === EvaluationValueKind.Array) {
    if (iterable.exactLength != null && iterable.exactLength > host.guardrails.maxLoopIterations) {
      return host.unknown(
        `${weak ? 'WeakSet' : 'Set'} constructor iterable exceeds the static iteration guardrail.`,
        expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      );
    }
    const elements = evaluationArrayIteratorElements(iterable);
    return new EvaluationSetValue(
      elements ?? iterable.elements,
      weak || elements == null,
      expression,
      weak,
    );
  }
  return host.unknown(
    `${weak ? 'WeakSet' : 'Set'} constructor iterable did not reduce to a known array.`,
    expression,
    moduleKey,
    EvaluationOpenSeamKind.DynamicCall,
  );
}

export function evaluateMapConstructor(
  frame: StaticInvocationFrame<ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
  weak: boolean,
): EvaluationValue {
  const { node: expression, moduleKey } = frame;
  const argumentRead = collectionInvocationArguments(
    frame,
    host,
    `${weak ? 'WeakMap' : 'Map'} constructor argument list did not close.`,
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const iterableEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (iterableEvidence.openSeams.length > 0) {
    return openCollectionInput(
      `${weak ? 'WeakMap' : 'Map'} constructor iterable retained open pressure.`,
      expression,
    );
  }
  const iterable = iterableEvidence.value;
  if (iterable.kind === EvaluationValueKind.Undefined) {
    return new EvaluationMapValue([], weak, expression, weak);
  }
  if (iterable.kind !== EvaluationValueKind.Array) {
    return host.unknown(
      `${weak ? 'WeakMap' : 'Map'} constructor iterable did not reduce to a known array.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  if (iterable.exactLength != null && iterable.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown(
      `${weak ? 'WeakMap' : 'Map'} constructor iterable exceeds the static iteration guardrail.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }

  const entries: EvaluationMapEntry[] = [];
  const iterableElements = evaluationArrayIteratorElements(iterable);
  let mayHaveUnknownEntries = weak || iterableElements == null;
  for (const element of iterableElements ?? iterable.elements) {
    const value = element.value;
    if (
      value.kind !== EvaluationValueKind.Array
      || !evaluationArrayHasExactPositions(value)
    ) {
      mayHaveUnknownEntries = true;
      continue;
    }
    const key = value.elementAtRuntimeIndex(0);
    const entryValue = value.elementAtRuntimeIndex(1);
    const entryOpenSeams = [
      ...element.openSeams,
      ...(key?.openSeams ?? []),
      ...(entryValue?.openSeams ?? []),
    ];
    if (entryOpenSeams.length > 0) {
      host.replayOpenSeams(entryOpenSeams);
      mayHaveUnknownEntries = true;
      continue;
    }
    entries.push(new EvaluationMapEntry(
      key?.value ?? EvaluationUndefined,
      entryValue?.value ?? EvaluationUndefined,
      element.expression,
    ));
  }
  return new EvaluationMapValue(entries, mayHaveUnknownEntries, expression, weak);
}

export function evaluateMapGet(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call, moduleKey } = frame;
  const receiverRead = collectionInvocationReceiver(frame, host, 'Map.get receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Map) {
    return null;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Map.get argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (keyEvidence.openSeams.length > 0) {
    return openCollectionInput('Map.get key retained open pressure.', call);
  }
  const key = keyEvidence.value;
  const entry = receiver.entries.find((candidate) => evaluationValuesSameValueZero(candidate.key, key)) ?? null;
  if (entry != null) {
    return entry.value;
  }
  return receiver.mayHaveUnknownEntries
    ? host.unknown('Map.get key did not match known entries and the map may contain unknown entries.', call, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier)
    : EvaluationUndefined;
}

export function evaluateMapSet(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call } = frame;
  const receiverRead = collectionInvocationReceiver(frame, host, 'Map.set receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Map) {
    return null;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Map.set argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  const valueEvidence = argumentRead.evidence[1]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (keyEvidence.openSeams.length > 0) {
    return openCollectionInput('Map.set key retained open pressure.', call);
  }
  if (valueEvidence.openSeams.length > 0) {
    return openCollectionInput('Map.set value retained open pressure.', call);
  }
  const key = keyEvidence.value;
  const value = valueEvidence.value;
  const existing = receiver.entries.find((candidate) => evaluationValuesSameValueZero(candidate.key, key)) ?? null;
  if (existing == null) {
    receiver.entries.push(new EvaluationMapEntry(key, value, call));
  } else {
    receiver.entries.splice(receiver.entries.indexOf(existing), 1, new EvaluationMapEntry(existing.key, value, call));
  }
  return receiver;
}

export function evaluateCollectionHas(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call, moduleKey } = frame;
  const receiverRead = collectionInvocationReceiver(frame, host, 'Collection.has receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Map && receiver.kind !== EvaluationValueKind.Set) {
    return null;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Collection.has argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (keyEvidence.openSeams.length > 0) {
    return openCollectionInput('Collection.has key retained open pressure.', call);
  }
  const key = keyEvidence.value;
  const known = receiver.kind === EvaluationValueKind.Map
    ? receiver.entries.some((candidate) => evaluationValuesSameValueZero(candidate.key, key))
    : receiver.elements.some((candidate) => evaluationValuesSameValueZero(candidate.value, key));
  const mayHaveUnknown = receiver.kind === EvaluationValueKind.Map
    ? receiver.mayHaveUnknownEntries
    : receiver.mayHaveUnknownElements;
  return known || !mayHaveUnknown
    ? new EvaluationBooleanValue(known, call)
    : host.unknown('Collection.has key did not match known entries and the collection may contain unknown entries.', call, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
}

export function evaluateSetAdd(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call } = frame;
  const receiverRead = collectionInvocationReceiver(frame, host, 'Set.add receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Set) {
    return null;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Set.add argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const valueEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (valueEvidence.openSeams.length > 0) {
    return openCollectionInput('Set.add value retained open pressure.', call);
  }
  const value = valueEvidence.value;
  if (!receiver.elements.some((candidate) => evaluationValuesSameValueZero(candidate.value, value))) {
    receiver.elements.push(new EvaluationArrayElement(
      value,
      argumentRead.argumentList.elements[0]?.expression ?? null,
    ));
  }
  return receiver;
}

export function evaluateCollectionDelete(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const { node: call } = frame;
  const receiverRead = collectionInvocationReceiver(frame, host, 'Collection.delete receiver retained open pressure.');
  if (receiverRead.kind === 'open') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind !== EvaluationValueKind.Map && receiver.kind !== EvaluationValueKind.Set) {
    return null;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Collection.delete argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (keyEvidence.openSeams.length > 0) {
    return openCollectionInput('Collection.delete key retained open pressure.', call);
  }
  const key = keyEvidence.value;
  if (receiver.kind === EvaluationValueKind.Map) {
    const index = receiver.entries.findIndex((candidate) => evaluationValuesSameValueZero(candidate.key, key));
    if (index >= 0) {
      receiver.entries.splice(index, 1);
      return new EvaluationBooleanValue(true, call);
    }
    return new EvaluationBooleanValue(false, call);
  }
  const index = receiver.elements.findIndex((candidate) => evaluationValuesSameValueZero(candidate.value, key));
  if (index >= 0) {
    receiver.elements.splice(index, 1);
    return new EvaluationBooleanValue(true, call);
  }
  return new EvaluationBooleanValue(false, call);
}

function collectionInvocationArguments(
  frame: StaticInvocationFrame<ts.CallExpression | ts.NewExpression>,
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

function collectionInvocationReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
): { readonly kind: 'known'; readonly value: EvaluationValue }
  | { readonly kind: 'open'; readonly value: EvaluationUnknownValue } {
  const evidence = frame.thisValue
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (evidence.openSeams.length === 0) {
    return { kind: 'known', value: evidence.value };
  }
  host.replayOpenSeams(evidence.openSeams);
  return { kind: 'open', value: openCollectionInput(openReason, frame.calleeNode) };
}

function openCollectionInput(
  reason: string,
  node: ts.Node,
): EvaluationUnknownValue {
  return new EvaluationUnknownValue(reason, node, true);
}
