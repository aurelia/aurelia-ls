import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  boundaryIntrinsicCallValue,
  isBoundaryEvaluationValue,
  stringCoercionText,
} from './shared.js';

export function evaluateObjectAssign(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const properties = new Map<string, EvaluationObjectProperty>();
  let mayHaveUnknownProperties = false;
  for (const argument of call.arguments) {
    const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
    if (value.kind !== EvaluationValueKind.Object) {
      mayHaveUnknownProperties = true;
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Object.assign argument did not reduce to a known object.', argument, moduleKey);
      continue;
    }
    for (const [name, property] of value.properties) {
      properties.set(name, property);
    }
    mayHaveUnknownProperties ||= value.mayHaveUnknownProperties;
  }
  return new EvaluationObjectValue(properties, mayHaveUnknownProperties, call);
}

export function evaluateObjectValues(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const source = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'Object.values', call);
  }
  const entries = objectEnumerableEntries(source);
  if (entries == null) {
    return host.unknown('Object.values source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    entries.entries.map((entry) =>
      new EvaluationArrayElement(entry.value, entry.expression)
    ),
    entries.mayHaveUnknownEntries,
    call,
  );
}

export function evaluateObjectKeys(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const source = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'Object.keys', call);
  }
  const entries = objectEnumerableEntries(source);
  if (entries == null) {
    return host.unknown('Object.keys source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    entries.entries.map((entry) =>
      new EvaluationArrayElement(new EvaluationStringValue(entry.name, call), entry.expression)
    ),
    entries.mayHaveUnknownEntries,
    call,
  );
}

export function evaluateObjectEntries(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const source = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'Object.entries', call);
  }
  const entries = objectEnumerableEntries(source);
  if (entries == null) {
    return host.unknown('Object.entries source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    entries.entries.map((entry) =>
      new EvaluationArrayElement(
        new EvaluationArrayValue([
          new EvaluationArrayElement(new EvaluationStringValue(entry.name, call), entry.expression),
          new EvaluationArrayElement(entry.value, entry.expression),
        ], false, call),
        entry.expression,
      )
    ),
    entries.mayHaveUnknownEntries,
    call,
  );
}

export function evaluateObjectFromEntries(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const source = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'Object.fromEntries', call);
  }
  const entries = iterableEntriesForObjectFromEntries(source, call, moduleKey, host);
  if (entries == null) {
    return host.unknown('Object.fromEntries source did not reduce to known entries.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const properties = new Map<string, EvaluationObjectProperty>();
  let mayHaveUnknownProperties = entries.mayHaveUnknownEntries;
  for (const entry of entries.entries) {
    const key = stringCoercionText(entry.key);
    if (key == null) {
      mayHaveUnknownProperties = true;
      host.open(EvaluationOpenSeamKind.DynamicCall, 'Object.fromEntries entry key did not reduce to a property key.', entry.node, moduleKey);
      continue;
    }
    properties.set(key, new EvaluationObjectProperty(key, entry.value, entry.node));
  }
  return new EvaluationObjectValue(properties, mayHaveUnknownProperties, call);
}

export interface ObjectEnumerableEntry {
  readonly name: string;
  readonly value: EvaluationValue;
  readonly expression: ts.Expression | null;
}

export function objectEnumerableEntries(
  source: EvaluationValue,
): { readonly entries: readonly ObjectEnumerableEntry[]; readonly mayHaveUnknownEntries: boolean } | null {
  switch (source.kind) {
    case EvaluationValueKind.Object:
      return entriesFromObjectProperties(source.properties, source.mayHaveUnknownProperties);
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
      return entriesFromObjectProperties(source.properties, false);
    case EvaluationValueKind.Instance:
      return entriesFromObjectProperties(source.properties, source.mayHaveUnknownProperties);
    case EvaluationValueKind.Array:
      return {
        entries: source.elements.map((element, index) => ({
          name: String(index),
          value: element.value,
          expression: element.expression,
        })),
        mayHaveUnknownEntries: source.mayHaveUnknownElements,
      };
    default:
      return null;
  }
}

export function entriesFromObjectProperties(
  properties: ReadonlyMap<string, EvaluationObjectProperty>,
  mayHaveUnknownProperties: boolean,
): { readonly entries: readonly ObjectEnumerableEntry[]; readonly mayHaveUnknownEntries: boolean } {
  return {
    entries: [...properties.values()].map((property) => ({
      name: property.name,
      value: property.value,
      expression: ts.isExpression(property.node) ? property.node : null,
    })),
    mayHaveUnknownEntries: mayHaveUnknownProperties,
  };
}

export interface ObjectFromEntriesEntry {
  readonly key: EvaluationValue;
  readonly value: EvaluationValue;
  readonly node: ts.Node;
}

export function iterableEntriesForObjectFromEntries(
  source: EvaluationValue,
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): { readonly entries: readonly ObjectFromEntriesEntry[]; readonly mayHaveUnknownEntries: boolean } | null {
  if (source.kind === EvaluationValueKind.Map) {
    return {
      entries: source.entries.map((entry) => ({
        key: entry.key,
        value: entry.value,
        node: entry.expression ?? call,
      })),
      mayHaveUnknownEntries: source.mayHaveUnknownEntries,
    };
  }
  if (source.kind !== EvaluationValueKind.Array) {
    return null;
  }
  const entries: ObjectFromEntriesEntry[] = [];
  let mayHaveUnknownEntries = source.mayHaveUnknownElements;
  for (const element of source.elements) {
    const entry = objectFromEntriesEntry(element.value, element.expression ?? call);
    if (entry == null) {
      mayHaveUnknownEntries = true;
      host.open(EvaluationOpenSeamKind.DynamicCall, 'Object.fromEntries element did not reduce to a known entry pair.', element.expression ?? call, moduleKey);
      continue;
    }
    entries.push(entry);
  }
  return { entries, mayHaveUnknownEntries };
}

export function objectFromEntriesEntry(
  value: EvaluationValue,
  node: ts.Node,
): ObjectFromEntriesEntry | null {
  if (value.kind === EvaluationValueKind.Array) {
    return {
      key: value.elements[0]?.value ?? EvaluationUndefined,
      value: value.elements[1]?.value ?? EvaluationUndefined,
      node,
    };
  }
  if (value.kind === EvaluationValueKind.Object) {
    const key = value.properties.get('0')?.value;
    const entryValue = value.properties.get('1')?.value;
    if (key != null && entryValue != null) {
      return { key, value: entryValue, node };
    }
  }
  return null;
}
