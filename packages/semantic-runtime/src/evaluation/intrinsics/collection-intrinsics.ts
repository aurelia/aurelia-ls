import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationArrayElement,
  EvaluationBooleanValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationSetValue,
  EvaluationUndefined,
  EvaluationValueKind,
  evaluationValuesEqual,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';

export function evaluateSetConstructor(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  weak: boolean,
): EvaluationValue {
  const iterable = expression.arguments?.[0] == null
    ? null
    : host.evaluateExpression(expression.arguments[0], environment, moduleKey, depth + 1);
  if (iterable == null) {
    return new EvaluationSetValue([], weak, expression, weak);
  }
  if (iterable.kind === EvaluationValueKind.Array) {
    return new EvaluationSetValue(
      iterable.elements,
      weak || iterable.mayHaveUnknownElements,
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
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  weak: boolean,
): EvaluationValue {
  const iterable = expression.arguments?.[0] == null
    ? null
    : host.evaluateExpression(expression.arguments[0], environment, moduleKey, depth + 1);
  if (iterable == null) {
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

  const entries: EvaluationMapEntry[] = [];
  let mayHaveUnknownEntries = weak || iterable.mayHaveUnknownElements;
  for (const element of iterable.elements) {
    const value = element.value;
    if (value.kind !== EvaluationValueKind.Array || value.elements.length < 2) {
      mayHaveUnknownEntries = true;
      continue;
    }
    entries.push(new EvaluationMapEntry(
      value.elements[0]!.value,
      value.elements[1]!.value,
      element.expression,
    ));
  }
  return new EvaluationMapValue(entries, mayHaveUnknownEntries, expression, weak);
}

export function evaluateMapGet(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const checkpoint = host.checkpoint();
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Map) {
    host.restore(checkpoint);
    return null;
  }
  const key = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (key.kind === EvaluationValueKind.Unknown) {
    return key;
  }
  const entry = receiver.entries.find((candidate) => evaluationValuesEqual(candidate.key, key)) ?? null;
  if (entry != null) {
    return entry.value;
  }
  return receiver.mayHaveUnknownEntries
    ? host.unknown('Map.get key did not match known entries and the map may contain unknown entries.', call, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier)
    : EvaluationUndefined;
}

export function evaluateMapSet(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const checkpoint = host.checkpoint();
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Map) {
    host.restore(checkpoint);
    return null;
  }
  const key = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const value = call.arguments[1] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1);
  if (key.kind === EvaluationValueKind.Unknown) {
    return key;
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    return value;
  }
  const existing = receiver.entries.find((candidate) => evaluationValuesEqual(candidate.key, key)) ?? null;
  if (existing == null) {
    receiver.entries.push(new EvaluationMapEntry(key, value, call));
  } else {
    receiver.entries.splice(receiver.entries.indexOf(existing), 1, new EvaluationMapEntry(existing.key, value, call));
  }
  return receiver;
}

export function evaluateCollectionHas(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const checkpoint = host.checkpoint();
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Map && receiver.kind !== EvaluationValueKind.Set) {
    host.restore(checkpoint);
    return null;
  }
  const key = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (key.kind === EvaluationValueKind.Unknown) {
    return key;
  }
  const known = receiver.kind === EvaluationValueKind.Map
    ? receiver.entries.some((candidate) => evaluationValuesEqual(candidate.key, key))
    : receiver.elements.some((candidate) => evaluationValuesEqual(candidate.value, key));
  const mayHaveUnknown = receiver.kind === EvaluationValueKind.Map
    ? receiver.mayHaveUnknownEntries
    : receiver.mayHaveUnknownElements;
  return known || !mayHaveUnknown
    ? new EvaluationBooleanValue(known, call)
    : host.unknown('Collection.has key did not match known entries and the collection may contain unknown entries.', call, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
}

export function evaluateSetAdd(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const checkpoint = host.checkpoint();
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Set) {
    host.restore(checkpoint);
    return null;
  }
  const value = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (value.kind === EvaluationValueKind.Unknown) {
    return value;
  }
  if (!receiver.elements.some((candidate) => evaluationValuesEqual(candidate.value, value))) {
    receiver.elements.push(new EvaluationArrayElement(value, call.arguments[0] ?? null));
  }
  return receiver;
}

export function evaluateCollectionDelete(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const checkpoint = host.checkpoint();
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Map && receiver.kind !== EvaluationValueKind.Set) {
    host.restore(checkpoint);
    return null;
  }
  const key = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (key.kind === EvaluationValueKind.Unknown) {
    return key;
  }
  if (receiver.kind === EvaluationValueKind.Map) {
    const index = receiver.entries.findIndex((candidate) => evaluationValuesEqual(candidate.key, key));
    if (index >= 0) {
      receiver.entries.splice(index, 1);
      return new EvaluationBooleanValue(true, call);
    }
    return new EvaluationBooleanValue(false, call);
  }
  const index = receiver.elements.findIndex((candidate) => evaluationValuesEqual(candidate.value, key));
  if (index >= 0) {
    receiver.elements.splice(index, 1);
    return new EvaluationBooleanValue(true, call);
  }
  return new EvaluationBooleanValue(false, call);
}
