import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import { readEvaluationEnumerableOwnEntries } from '../enumerable-own-properties.js';
import { evaluationArrayHasExactPositions } from '../array-value-operations.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  openEvaluationObjectProperties,
  type EvaluationValue,
} from '../values.js';
import { unretainedEvaluationOpenSeams } from '../value-pressure.js';
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
  const shapeOpenSeams: EvaluationOpenSeam[] = [];
  for (const argument of call.arguments) {
    const checkpoint = host.checkpoint();
    const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
    if (value.kind !== EvaluationValueKind.Object) {
      mayHaveUnknownProperties = true;
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Object.assign argument did not reduce to a known object.', argument, moduleKey, []);
      const pressure = host.openSeamsSince(checkpoint);
      openEvaluationObjectProperties(properties, pressure);
      shapeOpenSeams.push(...pressure);
      continue;
    }
    const directPressure = unretainedEvaluationOpenSeams(value, host.openSeamsSince(checkpoint));
    if (value.mayHaveUnknownProperties) {
      const shapePressure = compactEvaluationOpenSeams([
        ...value.shapeOpenSeams,
        ...directPressure,
      ]);
      openEvaluationObjectProperties(properties, shapePressure);
      shapeOpenSeams.push(...shapePressure);
    }
    for (const [name, property] of value.properties) {
      properties.set(name, property.withState(property.state, directPressure));
    }
    mayHaveUnknownProperties ||= value.mayHaveUnknownProperties;
  }
  return new EvaluationObjectValue(
    properties,
    mayHaveUnknownProperties,
    call,
    [],
    compactEvaluationOpenSeams(shapeOpenSeams),
  );
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
  const entries = readEvaluationEnumerableOwnEntries(source);
  if (entries == null) {
    return host.unknown('Object.values source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    entries.entries.map((entry) =>
      new EvaluationArrayElement(entry.value, entry.expression, entry.openSeams)
    ),
    entries.mayHaveUnknownEntries,
    call,
    entries.mayHaveUnknownEntries,
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
  const entries = readEvaluationEnumerableOwnEntries(source);
  if (entries == null) {
    return host.unknown('Object.keys source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    entries.entries.map((entry) =>
      new EvaluationArrayElement(new EvaluationStringValue(entry.name, call), entry.expression)
    ),
    entries.mayHaveUnknownEntries,
    call,
    entries.mayHaveUnknownEntries,
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
  const entries = readEvaluationEnumerableOwnEntries(source);
  if (entries == null) {
    return host.unknown('Object.entries source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    entries.entries.map((entry) =>
      new EvaluationArrayElement(
        new EvaluationArrayValue([
          new EvaluationArrayElement(new EvaluationStringValue(entry.name, call), entry.expression),
          new EvaluationArrayElement(entry.value, entry.expression, entry.openSeams),
        ], false, call),
        entry.expression,
      )
    ),
    entries.mayHaveUnknownEntries,
    call,
    entries.mayHaveUnknownEntries,
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
  const shapeOpenSeams: EvaluationOpenSeam[] = [];
  for (const entry of entries.entries) {
    const key = stringCoercionText(entry.key);
    if (key == null) {
      mayHaveUnknownProperties = true;
      const checkpoint = host.checkpoint();
      host.open(EvaluationOpenSeamKind.DynamicCall, 'Object.fromEntries entry key did not reduce to a property key.', entry.node, moduleKey, []);
      const pressure = host.openSeamsSince(checkpoint);
      openEvaluationObjectProperties(properties, pressure);
      shapeOpenSeams.push(...pressure);
      continue;
    }
    properties.set(key, new EvaluationObjectProperty(
      key,
      entry.value,
      entry.node,
      EvaluationObjectPropertyState.Closed,
      entry.openSeams,
    ));
  }
  if (entries.mayHaveUnknownEntries) {
    const checkpoint = host.checkpoint();
    host.open(
      EvaluationOpenSeamKind.DynamicCall,
      'Object.fromEntries source retained unknown entry membership.',
      call,
      moduleKey,
      [],
    );
    const pressure = compactEvaluationOpenSeams([
      ...(source.kind === EvaluationValueKind.Array ? source.shapeOpenSeams : []),
      ...host.openSeamsSince(checkpoint),
    ]);
    openEvaluationObjectProperties(properties, pressure);
    shapeOpenSeams.push(...pressure);
  }
  return new EvaluationObjectValue(
    properties,
    mayHaveUnknownProperties,
    call,
    [],
    compactEvaluationOpenSeams(shapeOpenSeams),
  );
}

export interface ObjectFromEntriesEntry {
  readonly key: EvaluationValue;
  readonly value: EvaluationValue;
  readonly node: ts.Node;
  readonly openSeams: readonly EvaluationOpenSeam[];
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
        openSeams: [],
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
    const entry = objectFromEntriesEntry(element.value, element.expression ?? call, element.openSeams);
    if (entry == null) {
      mayHaveUnknownEntries = true;
      host.open(EvaluationOpenSeamKind.DynamicCall, 'Object.fromEntries element did not reduce to a known entry pair.', element.expression ?? call, moduleKey, []);
      continue;
    }
    entries.push(entry);
  }
  return { entries, mayHaveUnknownEntries };
}

export function objectFromEntriesEntry(
  value: EvaluationValue,
  node: ts.Node,
  openSeams: readonly EvaluationOpenSeam[] = [],
): ObjectFromEntriesEntry | null {
  if (value.kind === EvaluationValueKind.Array) {
    if (!evaluationArrayHasExactPositions(value)) {
      return null;
    }
    return {
      key: value.elements[0]?.value ?? EvaluationUndefined,
      value: value.elements[1]?.value ?? EvaluationUndefined,
      node,
      openSeams: compactEvaluationOpenSeams([
        ...openSeams,
        ...(value.elements[0]?.openSeams ?? []),
        ...(value.elements[1]?.openSeams ?? []),
      ]),
    };
  }
  if (value.kind === EvaluationValueKind.Object) {
    const key = value.properties.get('0')?.value;
    const entryValue = value.properties.get('1')?.value;
    if (key != null && entryValue != null) {
      return {
        key,
        value: entryValue,
        node,
        openSeams: compactEvaluationOpenSeams([
          ...openSeams,
          ...(value.properties.get('0')?.openSeams ?? []),
          ...(value.properties.get('1')?.openSeams ?? []),
        ]),
      };
    }
  }
  return null;
}
