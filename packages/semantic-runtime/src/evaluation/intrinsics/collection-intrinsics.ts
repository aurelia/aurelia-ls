import ts from 'typescript';

import type { StaticInvocationFrame } from '../invocation.js';
import {
  EvaluationKeyedCollectionLookupKind,
  addEvaluationSetElement,
  canDriveKeyedCollectionIdentity,
  clearEvaluationMap,
  clearEvaluationSet,
  deleteEvaluationMapEntry,
  deleteEvaluationSetElement,
  evaluationMapLookup,
  evaluationSetLookup,
  setEvaluationMapEntry,
} from '../keyed-collection-operations.js';
import {
  evaluationIteratorProjection,
} from '../iterator-projection.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../seams.js';
import {
  EvaluationBooleanValue,
  EvaluationMapValue,
  EvaluationSetValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationArrayElement,
  type EvaluationValue,
} from '../values.js';
import { EvaluationValueEvidence } from '../value-pressure.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
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
    return unknownFromCollectionEvidence(
      iterableEvidence,
      `${weak ? 'WeakSet' : 'Set'} constructor iterable retained open pressure.`,
      expression,
      host,
    );
  }
  const iterable = iterableEvidence.value;
  if (iterable.kind === EvaluationValueKind.Undefined || iterable.kind === EvaluationValueKind.Null) {
    return new EvaluationSetValue([], expression, undefined, weak);
  }
  const projection = evaluationIteratorProjection(iterable, expression);
  if (projection == null) {
    return host.unknown(
      `${weak ? 'WeakSet' : 'Set'} constructor source is not a modeled iterable.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  if (!projection.shape.hasExactPositions || projection.shape.exactLength == null) {
    replayIteratorPressure(projection.shape.aggregateOpenSeams, host);
    return host.unknown(
      `${weak ? 'WeakSet' : 'Set'} constructor iterable membership or order did not close.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  if (projection.shape.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown(
      `${weak ? 'WeakSet' : 'Set'} constructor iterable exceeds the static iteration guardrail.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }

  const result = new EvaluationSetValue([], expression, undefined, weak);
  for (const element of projection.elements) {
    const evidence = collectionKeyEvidence(
      new EvaluationValueEvidence(element.value, element.openSeams),
      `${weak ? 'WeakSet' : 'Set'} constructor member identity remained runtime-dependent.`,
      element.expression ?? expression,
      moduleKey,
      host,
    );
    if (weak && !mayBeWeakCollectionKey(evidence.value)) {
      return host.unknown(
        'WeakSet constructor member is not a valid weak key.',
        element.expression ?? expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      );
    }
    addEvaluationSetElement(result, evidence, element.expression);
  }
  return result;
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
    return unknownFromCollectionEvidence(
      iterableEvidence,
      `${weak ? 'WeakMap' : 'Map'} constructor iterable retained open pressure.`,
      expression,
      host,
    );
  }
  const iterable = iterableEvidence.value;
  if (iterable.kind === EvaluationValueKind.Undefined || iterable.kind === EvaluationValueKind.Null) {
    return new EvaluationMapValue([], expression, undefined, weak);
  }
  const projection = evaluationIteratorProjection(iterable, expression);
  if (projection == null) {
    return host.unknown(
      `${weak ? 'WeakMap' : 'Map'} constructor source is not a modeled iterable.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  if (!projection.shape.hasExactPositions || projection.shape.exactLength == null) {
    replayIteratorPressure(projection.shape.aggregateOpenSeams, host);
    return host.unknown(
      `${weak ? 'WeakMap' : 'Map'} constructor iterable membership or order did not close.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  if (projection.shape.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown(
      `${weak ? 'WeakMap' : 'Map'} constructor iterable exceeds the static iteration guardrail.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }

  const result = new EvaluationMapValue([], expression, undefined, weak);
  for (const element of projection.elements) {
    const pair = mapConstructorPair(element, expression);
    if (pair == null) {
      return host.unknown(
        `${weak ? 'WeakMap' : 'Map'} constructor iterator produced a non-entry value.`,
        element.expression ?? expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      );
    }
    const keyEvidence = collectionKeyEvidence(
      pair.key,
      `${weak ? 'WeakMap' : 'Map'} constructor key identity remained runtime-dependent.`,
      pair.keyExpression ?? element.expression ?? expression,
      moduleKey,
      host,
    );
    if (weak && !mayBeWeakCollectionKey(keyEvidence.value)) {
      return host.unknown(
        'WeakMap constructor key is not a valid weak key.',
        pair.keyExpression ?? element.expression ?? expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      );
    }
    setEvaluationMapEntry(
      result,
      keyEvidence,
      pair.value,
      pair.keyExpression,
      pair.valueExpression,
    );
  }
  return result;
}

export function evaluateMapGet(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = exactCollectionReceiver(frame, host, EvaluationValueKind.Map, 'Map.get');
  if (receiver == null || receiver instanceof EvaluationUnknownValue) {
    return receiver;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Map.get argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyArgument = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (collectionIsExactlyEmpty(receiver) && keyArgument.openSeams.length === 0) {
    return EvaluationUndefined;
  }
  const key = collectionKeyEvidence(
    keyArgument,
    'Map.get key identity remained runtime-dependent.',
    frame.node,
    frame.moduleKey,
    host,
  );
  const lookup = evaluationMapLookup(receiver, key);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    const entry = lookup.entry!;
    const openSeams = [...entry.valueOpenSeams, ...entry.presenceOpenSeams];
    if (openSeams.length === 0) {
      return entry.value;
    }
    host.replayOpenSeams(openSeams);
    return new EvaluationUnknownValue(
      'Map.get retained a candidate value qualified by an open write.',
      frame.node,
      true,
      entry.value,
    );
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Miss) {
    return EvaluationUndefined;
  }
  return unknownCollectionLookup('Map.get could not decide keyed membership.', lookup.openSeams, frame, host);
}

export function evaluateMapSet(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = exactCollectionReceiver(frame, host, EvaluationValueKind.Map, 'Map.set');
  if (receiver == null || receiver instanceof EvaluationUnknownValue) {
    return receiver;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Map.set argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyElement = argumentRead.argumentList.elements[0] ?? null;
  const valueElement = argumentRead.argumentList.elements[1] ?? null;
  const key = collectionKeyEvidence(
    argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []),
    'Map.set key identity remained runtime-dependent.',
    keyElement?.expression ?? frame.node,
    frame.moduleKey,
    host,
  );
  if (receiver.weak && !mayBeWeakCollectionKey(key.value)) {
    return host.unknown('WeakMap.set key is not a valid weak key.', frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  setEvaluationMapEntry(
    receiver,
    key,
    argumentRead.evidence[1] ?? new EvaluationValueEvidence(EvaluationUndefined, []),
    keyElement?.expression ?? null,
    valueElement?.expression ?? null,
  );
  return receiver;
}

export function evaluateCollectionHas(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = collectionReceiver(frame, host, 'Collection.has');
  if (receiver == null || receiver instanceof EvaluationUnknownValue) {
    return receiver;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Collection.has argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyArgument = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (collectionIsExactlyEmpty(receiver) && keyArgument.openSeams.length === 0) {
    return new EvaluationBooleanValue(false, frame.node);
  }
  const key = collectionKeyEvidence(
    keyArgument,
    'Collection.has key identity remained runtime-dependent.',
    frame.node,
    frame.moduleKey,
    host,
  );
  const lookup = receiver.kind === EvaluationValueKind.Map
    ? evaluationMapLookup(receiver, key)
    : evaluationSetLookup(receiver, key);
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Match) {
    return new EvaluationBooleanValue(true, frame.node);
  }
  if (lookup.kind === EvaluationKeyedCollectionLookupKind.Miss) {
    return new EvaluationBooleanValue(false, frame.node);
  }
  return unknownCollectionLookup('Collection.has could not decide keyed membership.', lookup.openSeams, frame, host);
}

export function evaluateSetAdd(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = exactCollectionReceiver(frame, host, EvaluationValueKind.Set, 'Set.add');
  if (receiver == null || receiver instanceof EvaluationUnknownValue) {
    return receiver;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Set.add argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const element = argumentRead.argumentList.elements[0] ?? null;
  const value = collectionKeyEvidence(
    argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []),
    'Set.add value identity remained runtime-dependent.',
    element?.expression ?? frame.node,
    frame.moduleKey,
    host,
  );
  if (receiver.weak && !mayBeWeakCollectionKey(value.value)) {
    return host.unknown('WeakSet.add value is not a valid weak key.', frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  addEvaluationSetElement(receiver, value, element?.expression ?? null);
  return receiver;
}

export function evaluateCollectionDelete(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = collectionReceiver(frame, host, 'Collection.delete');
  if (receiver == null || receiver instanceof EvaluationUnknownValue) {
    return receiver;
  }
  const argumentRead = collectionInvocationArguments(frame, host, 'Collection.delete argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const keyArgument = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (collectionIsExactlyEmpty(receiver) && keyArgument.openSeams.length === 0) {
    return new EvaluationBooleanValue(false, frame.node);
  }
  const key = collectionKeyEvidence(
    keyArgument,
    'Collection.delete key identity remained runtime-dependent.',
    frame.node,
    frame.moduleKey,
    host,
  );
  const keyExpression = argumentRead.argumentList.elements[0]?.expression ?? null;
  const result = receiver.kind === EvaluationValueKind.Map
    ? deleteEvaluationMapEntry(receiver, key, keyExpression)
    : deleteEvaluationSetElement(receiver, key, keyExpression);
  if (result.kind === EvaluationKeyedCollectionLookupKind.Match) {
    return new EvaluationBooleanValue(true, frame.node);
  }
  if (result.kind === EvaluationKeyedCollectionLookupKind.Miss) {
    return new EvaluationBooleanValue(false, frame.node);
  }
  return unknownCollectionLookup('Collection.delete could not decide keyed membership.', result.openSeams, frame, host);
}

export function evaluateCollectionClear(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const receiver = collectionReceiver(frame, host, 'Collection.clear');
  if (receiver == null || receiver instanceof EvaluationUnknownValue) {
    return receiver;
  }
  if (receiver.weak) {
    return null;
  }
  if (receiver.kind === EvaluationValueKind.Map) {
    clearEvaluationMap(receiver);
  } else {
    clearEvaluationSet(receiver);
  }
  return EvaluationUndefined;
}

function collectionInvocationArguments(
  frame: StaticInvocationFrame<ts.CallExpression | ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
) {
  return evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    frame.node,
    frame.moduleKey,
    host,
    openReason,
  );
}

function collectionReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  operation: string,
): EvaluationMapValue | EvaluationSetValue | EvaluationUnknownValue | null {
  const evidence = frame.thisValue ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (evidence.openSeams.length > 0) {
    return unknownFromCollectionEvidence(
      evidence,
      `${operation} receiver retained open pressure.`,
      frame.calleeNode,
      host,
    );
  }
  return evidence.value.kind === EvaluationValueKind.Map || evidence.value.kind === EvaluationValueKind.Set
    ? evidence.value
    : null;
}

function collectionIsExactlyEmpty(receiver: EvaluationMapValue | EvaluationSetValue): boolean {
  return receiver.exactSize === 0 && receiver.shape.hasExactMembership;
}

function exactCollectionReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  kind: EvaluationValueKind.Map,
  operation: string,
): EvaluationMapValue | EvaluationUnknownValue | null;
function exactCollectionReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  kind: EvaluationValueKind.Set,
  operation: string,
): EvaluationSetValue | EvaluationUnknownValue | null;
function exactCollectionReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  kind: EvaluationValueKind.Map | EvaluationValueKind.Set,
  operation: string,
): EvaluationMapValue | EvaluationSetValue | EvaluationUnknownValue | null {
  const receiver = collectionReceiver(frame, host, operation);
  return receiver == null || receiver instanceof EvaluationUnknownValue || receiver.kind === kind
    ? receiver
    : null;
}

function collectionKeyEvidence(
  evidence: EvaluationValueEvidence,
  reason: string,
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValueEvidence {
  if (evidence.openSeams.length > 0 || canDriveKeyedCollectionIdentity(evidence.value)) {
    return evidence;
  }
  const checkpoint = host.checkpoint();
  host.open(EvaluationOpenSeamKind.DynamicMutation, reason, node, moduleKey, []);
  return new EvaluationValueEvidence(evidence.value, host.openSeamsSince(checkpoint));
}

function unknownCollectionLookup(
  reason: string,
  openSeams: readonly EvaluationOpenSeam[],
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationUnknownValue {
  if (openSeams.length > 0) {
    host.replayOpenSeams(openSeams);
  }
  return host.unknown(reason, frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

function unknownFromCollectionEvidence(
  evidence: EvaluationValueEvidence,
  reason: string,
  node: ts.Node,
  host: StaticIntrinsicEvaluationHost,
): EvaluationUnknownValue {
  host.replayOpenSeams(evidence.openSeams);
  return new EvaluationUnknownValue(reason, node, true, evidence.value);
}

function replayIteratorPressure(
  openSeams: readonly EvaluationOpenSeam[],
  host: StaticIntrinsicEvaluationHost,
): void {
  if (openSeams.length > 0) {
    host.replayOpenSeams(openSeams);
  }
}

function mapConstructorPair(
  element: EvaluationArrayElement,
  fallbackNode: ts.Expression,
): {
  readonly key: EvaluationValueEvidence;
  readonly value: EvaluationValueEvidence;
  readonly keyExpression: ts.Expression | null;
  readonly valueExpression: ts.Expression | null;
} | null {
  const pair = element.value;
  if (pair.kind !== EvaluationValueKind.Array || !pair.shape.hasExactPositions || pair.exactLength == null) {
    return null;
  }
  const key = pair.elementAtRuntimeIndex(0);
  const value = pair.elementAtRuntimeIndex(1);
  return {
    key: new EvaluationValueEvidence(
      key?.value ?? EvaluationUndefined,
      [...element.openSeams, ...(key?.openSeams ?? [])],
    ),
    value: new EvaluationValueEvidence(
      value?.value ?? EvaluationUndefined,
      [...element.openSeams, ...(value?.openSeams ?? [])],
    ),
    keyExpression: key?.expression ?? element.expression ?? fallbackNode,
    valueExpression: value?.expression ?? element.expression ?? fallbackNode,
  };
}

function mayBeWeakCollectionKey(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Unknown:
      return true;
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
      return false;
  }
}
