import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import { readEvaluationEnumerableOwnEntries } from '../enumerable-own-properties.js';
import {
  evaluationArrayHasExactPositions,
} from '../array-value-operations.js';
import { evaluationIteratorProjection } from '../iterator-projection.js';
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
  EvaluationUnknownValue,
  EvaluationValueKind,
  openEvaluationObjectProperties,
  type EvaluationValue,
} from '../values.js';
import { EvaluationValueEvidence } from '../value-pressure.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  boundaryIntrinsicCallValue,
  evaluatePositionalIntrinsicArguments,
  isBoundaryEvaluationValue,
  stringCoercionText,
} from './shared.js';

export function evaluateObjectAssign(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Object.assign argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const properties = new Map<string, EvaluationObjectProperty>();
  let mayHaveUnknownProperties = false;
  const shapeOpenSeams: EvaluationOpenSeam[] = [];
  for (let index = 0; index < argumentRead.evidence.length; index += 1) {
    const evidence = argumentRead.evidence[index]!;
    const argument = argumentRead.argumentList.elements[index]?.expression ?? call;
    const value = evidence.value;
    host.replayOpenSeams(evidence.openSeams);
    if (value.kind !== EvaluationValueKind.Object) {
      mayHaveUnknownProperties = true;
      const checkpoint = host.checkpoint();
      host.open(EvaluationOpenSeamKind.DynamicMutation, 'Object.assign argument did not reduce to a known object.', argument, moduleKey, []);
      const pressure = compactEvaluationOpenSeams([
        ...evidence.openSeams,
        ...host.openSeamsSince(checkpoint),
      ]);
      openEvaluationObjectProperties(properties, pressure);
      shapeOpenSeams.push(...pressure);
      continue;
    }
    const directPressure = evidence.openSeams;
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
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const sourceRead = objectInvocationSource(frame, host, 'Object.values source retained open pressure.');
  if (sourceRead.kind === 'open') {
    return sourceRead.value;
  }
  const source = sourceRead.value;
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
    call,
    entries.toArrayShape(),
  );
}

export function evaluateObjectKeys(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const sourceRead = objectInvocationSource(frame, host, 'Object.keys source retained open pressure.');
  if (sourceRead.kind === 'open') {
    return sourceRead.value;
  }
  const source = sourceRead.value;
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
    call,
    entries.toArrayShape(),
  );
}

export function evaluateObjectEntries(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const sourceRead = objectInvocationSource(frame, host, 'Object.entries source retained open pressure.');
  if (sourceRead.kind === 'open') {
    return sourceRead.value;
  }
  const source = sourceRead.value;
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
        ], call),
        entry.expression,
      )
    ),
    call,
    entries.toArrayShape(),
  );
}

export function evaluateObjectFromEntries(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const sourceRead = objectInvocationSource(frame, host, 'Object.fromEntries source retained open pressure.');
  if (sourceRead.kind === 'open') {
    return sourceRead.value;
  }
  const source = sourceRead.value;
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
    if (entry.keyOpenSeams.length > 0) {
      host.replayOpenSeams(entry.keyOpenSeams);
      mayHaveUnknownProperties = true;
      openEvaluationObjectProperties(properties, entry.keyOpenSeams);
      shapeOpenSeams.push(...entry.keyOpenSeams);
      continue;
    }
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
      entry.valueOpenSeams,
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
      ...entries.openSeams,
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
  readonly keyOpenSeams: readonly EvaluationOpenSeam[];
  readonly valueOpenSeams: readonly EvaluationOpenSeam[];
}

export function iterableEntriesForObjectFromEntries(
  source: EvaluationValue,
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): {
  readonly entries: readonly ObjectFromEntriesEntry[];
  readonly mayHaveUnknownEntries: boolean;
  readonly openSeams: readonly EvaluationOpenSeam[];
} | null {
  const projection = evaluationIteratorProjection(source, call);
  if (projection == null) {
    return null;
  }
  const entries: ObjectFromEntriesEntry[] = [];
  let mayHaveUnknownEntries = !projection.shape.hasExactPositions;
  for (const element of projection.elements) {
    const entry = objectFromEntriesEntry(element.value, element.expression ?? call, element.openSeams);
    if (entry == null) {
      mayHaveUnknownEntries = true;
      host.open(EvaluationOpenSeamKind.DynamicCall, 'Object.fromEntries element did not reduce to a known entry pair.', element.expression ?? call, moduleKey, []);
      continue;
    }
    entries.push(entry);
  }
  return {
    entries,
    mayHaveUnknownEntries,
    openSeams: projection.shape.aggregateOpenSeams,
  };
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
    const keyElement = value.elementAtRuntimeIndex(0);
    const valueElement = value.elementAtRuntimeIndex(1);
    return {
      key: keyElement?.value ?? EvaluationUndefined,
      value: valueElement?.value ?? EvaluationUndefined,
      node,
      keyOpenSeams: compactEvaluationOpenSeams([
        ...openSeams,
        ...(keyElement?.openSeams ?? []),
      ]),
      valueOpenSeams: compactEvaluationOpenSeams([
        ...openSeams,
        ...(valueElement?.openSeams ?? []),
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
        keyOpenSeams: compactEvaluationOpenSeams([
          ...openSeams,
          ...(value.properties.get('0')?.openSeams ?? []),
        ]),
        valueOpenSeams: compactEvaluationOpenSeams([
          ...openSeams,
          ...(value.properties.get('1')?.openSeams ?? []),
        ]),
      };
    }
  }
  return null;
}

function objectInvocationSource(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
): { readonly kind: 'known'; readonly value: EvaluationValue }
  | { readonly kind: 'open'; readonly value: EvaluationUnknownValue } {
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    frame.node,
    frame.moduleKey,
    host,
    `${openReason} Argument list did not close.`,
  );
  if (argumentRead.kind === 'open') {
    return argumentRead;
  }
  for (const evidence of argumentRead.evidence) {
    host.replayOpenSeams(evidence.openSeams);
  }
  const source = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  return source.openSeams.length === 0
    ? { kind: 'known', value: source.value }
    : {
        kind: 'open',
        value: new EvaluationUnknownValue(openReason, frame.node, true),
      };
}
