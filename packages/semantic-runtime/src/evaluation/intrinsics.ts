import ts from 'typescript';
import type { ModuleEnvironmentRecord } from './environment.js';
import type { StaticEvaluationGuardrails } from './policy.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationPromiseValue,
  EvaluationRegularExpressionValue,
  EvaluationSetValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  evaluationValuesEqual,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationFunctionValue,
  type EvaluationUnknownValue,
  type EvaluationValue,
} from './values.js';
import {
  readCallCalleeText,
  unwrapExpression,
} from './ts-syntax.js';

export interface StaticIntrinsicEvaluationHost {
  readonly guardrails: StaticEvaluationGuardrails;

  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.CallExpression,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
  ): void;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  checkpoint(): StaticIntrinsicEvaluationCheckpoint;

  restore(checkpoint: StaticIntrinsicEvaluationCheckpoint): void;

  resolveCommonJsRequire(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  resolveDynamicImport(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  evaluateCallExpression(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue | null;
}

export interface StaticIntrinsicEvaluationCheckpoint {
  readonly openSeamCount: number;
  readonly statementCount: number;
}

export function evaluateKnownConstructor(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const constructorName = readCallCalleeText(expression.expression);
  switch (constructorName) {
    case 'Set':
      return evaluateSetConstructor(expression, environment, moduleKey, depth + 1, host, false);
    case 'WeakSet':
      return evaluateSetConstructor(expression, environment, moduleKey, depth + 1, host, true);
    case 'Map':
      return evaluateMapConstructor(expression, environment, moduleKey, depth + 1, host, false);
    case 'WeakMap':
      return evaluateMapConstructor(expression, environment, moduleKey, depth + 1, host, true);
    case 'Array':
      return evaluateArrayConstructor(expression, environment, moduleKey, depth + 1, host);
    case 'RegExp':
      return evaluateRegExpConstructor(expression, environment, moduleKey, depth + 1, host);
    default:
      return null;
  }
}

export function evaluateKnownIntrinsic(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const hostValue = host.evaluateCallExpression(call, environment, moduleKey, depth, host);
  if (hostValue != null) {
    return hostValue;
  }

  const calleeText = readCallCalleeText(call.expression);
  if (call.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return evaluateDynamicImport(call, moduleKey, host);
  }
  if (calleeText === 'require') {
    return evaluateCommonJsRequire(call, moduleKey, host);
  }
  if (calleeText === 'RegExp') {
    return evaluateRegExpCall(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'String') {
    return evaluateStringCall(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Array.isArray') {
    return evaluateArrayIsArray(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.freeze' && call.arguments[0] != null) {
    return host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  }
  if (calleeText === 'Object.assign') {
    return evaluateObjectAssign(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.values') {
    return evaluateObjectValues(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Array.of') {
    return new EvaluationArrayValue(
      call.arguments.map((argument) => new EvaluationArrayElement(
        host.evaluateExpression(argument, environment, moduleKey, depth + 1),
        argument,
      )),
      false,
      call,
    );
  }

  const callee = unwrapExpression(call.expression);
  if (ts.isPropertyAccessExpression(callee)) {
    switch (callee.name.text) {
      case 'concat':
        return evaluateArrayConcat(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'filter':
        return evaluateArrayFilter(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'fill':
        return evaluateArrayFill(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'slice':
        return evaluateArrayOrStringSlice(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'toUpperCase':
        return evaluateStringTransform(call, callee.expression, environment, moduleKey, depth + 1, host, 'toUpperCase');
      case 'toLowerCase':
        return evaluateStringTransform(call, callee.expression, environment, moduleKey, depth + 1, host, 'toLowerCase');
      case 'trim':
        return evaluateStringTransform(call, callee.expression, environment, moduleKey, depth + 1, host, 'trim');
      case 'startsWith':
      case 'endsWith':
      case 'includes':
        return evaluateStringPredicate(call, callee.expression, environment, moduleKey, depth + 1, host, callee.name.text);
      case 'sort':
        return evaluateArraySort(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'localeCompare':
        return evaluateStringLocaleCompare(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'get':
        return evaluateMapGet(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'set':
        return evaluateMapSet(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'has':
        return evaluateCollectionHas(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'add':
        return evaluateSetAdd(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'delete':
        return evaluateCollectionDelete(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'then':
        return evaluatePromiseThen(call, callee.expression, environment, moduleKey, depth + 1, host);
      case 'catch':
      case 'finally':
        return evaluatePromiseContinuation(call, callee.expression, environment, moduleKey, depth + 1, host);
    }
  }
  return null;
}

function evaluatePromiseContinuation(
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

function evaluatePromiseThen(
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

function evaluateArrayConstructor(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const args = expression.arguments ?? [];
  if (args.length !== 1) {
    return new EvaluationArrayValue(
      args.map((argument) => new EvaluationArrayElement(
        host.evaluateExpression(argument, environment, moduleKey, depth + 1),
        argument,
      )),
      false,
      expression,
    );
  }

  const lengthValue = host.evaluateExpression(args[0]!, environment, moduleKey, depth + 1);
  if (lengthValue.kind !== EvaluationValueKind.Number) {
    return new EvaluationArrayValue([], true, expression);
  }
  const length = Math.max(0, Math.min(1_000, Math.trunc(lengthValue.value)));
  return new EvaluationArrayValue(
    Array.from({ length }, () => new EvaluationArrayElement(EvaluationUndefined, args[0]!)),
    length !== lengthValue.value || lengthValue.value > 1_000,
    expression,
  );
}

function evaluateSetConstructor(
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

function evaluateMapConstructor(
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

function evaluateRegExpConstructor(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateRegExpArguments(
    expression,
    expression.arguments ?? [],
    environment,
    moduleKey,
    depth + 1,
    host,
  );
}

function evaluateRegExpCall(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateRegExpArguments(call, call.arguments, environment, moduleKey, depth + 1, host);
}

function evaluateStringCall(
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
    return boundaryIntrinsicCallValue(source, 'String', call);
  }
  const text = stringCoercionText(source);
  return text == null
    ? host.unknown('String(...) argument did not reduce to a primitive value.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationStringValue(text, call);
}

function evaluateRegExpArguments(
  node: ts.Expression,
  args: readonly ts.Expression[],
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const patternValue = args[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(args[0], environment, moduleKey, depth + 1);
  const flagsValue = args[1] == null
    ? null
    : host.evaluateExpression(args[1], environment, moduleKey, depth + 1);
  const pattern = regularExpressionPatternText(patternValue);
  const flags = flagsValue == null || flagsValue.kind === EvaluationValueKind.Undefined
    ? patternValue.kind === EvaluationValueKind.RegularExpression ? patternValue.flags : ''
    : regularExpressionFlagsText(flagsValue);
  if (pattern == null || flags == null) {
    return host.unknown(
      'RegExp pattern or flags did not reduce to a static value.',
      node,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  return new EvaluationRegularExpressionValue(pattern, flags, node);
}

function regularExpressionPatternText(value: EvaluationValue): string | null {
  if (value.kind === EvaluationValueKind.RegularExpression) {
    return value.pattern;
  }
  if (value.kind === EvaluationValueKind.Undefined) {
    return '';
  }
  return stringCoercionText(value);
}

function regularExpressionFlagsText(value: EvaluationValue): string | null {
  return stringCoercionText(value);
}

function stringCoercionText(value: EvaluationValue): string | null {
  if (value.kind === EvaluationValueKind.BigInt) {
    return value.text.endsWith('n') ? value.text.slice(0, -1) : value.text;
  }
  if (value.kind === EvaluationValueKind.RegularExpression) {
    return `/${value.pattern}/${value.flags}`;
  }
  if (!isEvaluationPrimitiveValue(value)) {
    return null;
  }
  return String(readEvaluationPrimitive(value));
}

function evaluateMapGet(
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

function evaluateMapSet(
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

function evaluateCollectionHas(
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

function evaluateSetAdd(
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

function evaluateCollectionDelete(
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

function evaluateCommonJsRequire(
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const specifier = call.arguments[0];
  if (specifier == null || !ts.isStringLiteralLike(specifier)) {
    return host.unknown('CommonJS require(...) did not expose a static string specifier.', call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
  }
  return host.resolveCommonJsRequire(moduleKey, specifier.text, call)
    ?? host.unknown(`CommonJS require('${specifier.text}') did not resolve to a local module value.`, call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
}

function evaluateDynamicImport(
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const specifier = call.arguments[0];
  if (specifier == null || !ts.isStringLiteralLike(specifier)) {
    return host.unknown('Dynamic import did not expose a static string specifier.', call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
  }
  return host.resolveDynamicImport(moduleKey, specifier.text, call)
    ?? host.unknown(`Dynamic import '${specifier.text}' from ${moduleKey} did not resolve to a local module value.`, call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
}

function evaluateObjectAssign(
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

function evaluateObjectValues(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const source = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (source.kind !== EvaluationValueKind.Object) {
    return host.unknown('Object.values source did not reduce to a known object.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    [...source.properties.values()].map((property) =>
      new EvaluationArrayElement(property.value, ts.isExpression(property.node) ? property.node : null)
    ),
    source.mayHaveUnknownProperties,
    call,
  );
}

function evaluateArrayConcat(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'concat', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.concat receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const elements: EvaluationArrayElement[] = [...receiver.elements];
  let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
  let mayHaveUnknownOrder = receiver.mayHaveUnknownOrder;
  for (const value of evaluateCallArgumentValues(call, environment, moduleKey, depth + 1, host)) {
    if (value.kind === EvaluationValueKind.Array) {
      elements.push(...value.elements);
      mayHaveUnknownElements ||= value.mayHaveUnknownElements;
      mayHaveUnknownOrder ||= value.mayHaveUnknownOrder;
    } else {
      elements.push(new EvaluationArrayElement(value, call));
    }
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, call, mayHaveUnknownOrder);
}

function evaluateArrayFilter(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'filter', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.filter receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicateExpression = call.arguments[0];
  if (predicateExpression == null) {
    return host.unknown('Array.filter predicate is missing.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = host.evaluateExpression(predicateExpression, environment, moduleKey, depth + 1);
  if (predicate.kind !== EvaluationValueKind.Function) {
    return host.unknown('Array.filter predicate did not reduce to a known function.', predicateExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  const checkpoint = host.checkpoint();
  const elements: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
  let mayHaveUnknownOrder = receiver.mayHaveUnknownOrder;
  let predicateEvaluations = 0;
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    if (predicateEvaluations >= host.guardrails.maxIntrinsicCallbackEvaluations) {
      host.restore(checkpoint);
      return new EvaluationArrayValue([], true, call, true);
    }
    predicateEvaluations++;
    const predicateResult = host.evaluateFunctionWithArguments(
      predicate,
      call,
      [
        element.value,
        new EvaluationNumberValue(index, call),
        receiver,
      ],
      moduleKey,
      depth + 1,
    );
    const keep = readEvaluationTruthiness(predicateResult);
    if (keep == null) {
      mayHaveUnknownElements = true;
      continue;
    }
    if (keep) {
      elements.push(element);
    }
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, call, mayHaveUnknownOrder);
}

function evaluateArrayFill(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'fill', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.fill receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const value = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const range = readSliceRange(call, receiver.elements.length, environment, moduleKey, depth + 1, host);
  if (range == null) {
    return new EvaluationArrayValue(receiver.elements, true, call, receiver.mayHaveUnknownOrder);
  }
  for (let index = range.start; index < range.end; index++) {
    receiver.elements[index] = new EvaluationArrayElement(value, call.arguments[0] ?? null);
  }
  return receiver;
}

function evaluateArrayOrStringSlice(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'slice', call);
  }
  if (receiver.kind === EvaluationValueKind.Array) {
    const range = readSliceRange(call, receiver.elements.length, environment, moduleKey, depth + 1, host);
    return range == null
      ? new EvaluationArrayValue(receiver.elements, true, call, true)
      : new EvaluationArrayValue(
        receiver.elements.slice(range.start, range.end),
        receiver.mayHaveUnknownElements,
        call,
        receiver.mayHaveUnknownOrder,
      );
  }
  if (receiver.kind === EvaluationValueKind.String) {
    const range = readSliceRange(call, receiver.value.length, environment, moduleKey, depth + 1, host);
    return range == null
      ? host.unknown('String.slice bounds did not reduce to static numbers.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : new EvaluationStringValue(receiver.value.slice(range.start, range.end), call);
  }
  return host.unknown('slice receiver did not reduce to a known array or string.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

function readSliceRange(
  call: ts.CallExpression,
  length: number,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): { readonly start: number; readonly end: number } | null {
  const start = call.arguments[0] == null
    ? 0
    : readSliceBound(host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1), length, 0);
  const end = call.arguments[1] == null
    ? length
    : readSliceBound(host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1), length, length);
  if (start == null || end == null) {
    return null;
  }
  return {
    start: Math.min(Math.max(start, 0), length),
    end: Math.min(Math.max(end, 0), length),
  };
}

function readSliceBound(
  value: EvaluationValue,
  length: number,
  undefinedValue: number,
): number | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return undefinedValue;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const integer = Math.trunc(value.value);
  return integer < 0
    ? length + integer
    : integer;
}

function isBoundaryEvaluationValue(
  value: EvaluationValue,
): value is EvaluationValue & {
  readonly boundaryKind: EvaluationBoundaryValue['boundaryKind'];
  readonly path: string;
} {
  return value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.BoundaryObject;
}

function boundaryIntrinsicCallValue(
  receiver: EvaluationValue & {
    readonly boundaryKind: EvaluationBoundaryValue['boundaryKind'];
    readonly path: string;
  },
  intrinsicName: string,
  call: ts.CallExpression,
): EvaluationBoundaryValue {
  return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${intrinsicName}(...)`, call);
}

function evaluateArrayIsArray(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const value = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (value.kind === EvaluationValueKind.Unknown) {
    return value;
  }
  if (isBoundaryEvaluationValue(value)) {
    return boundaryIntrinsicCallValue(value, 'Array.isArray', call);
  }
  return new EvaluationBooleanValue(value.kind === EvaluationValueKind.Array, call);
}

function evaluateArraySort(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'sort', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.sort receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  const sorted = sortArrayElements(call, receiver.elements, environment, moduleKey, depth + 1, host);
  receiver.replaceElementOrder(sorted.elements, sorted.mayHaveUnknownOrder);
  return receiver;
}

function sortArrayElements(
  call: ts.CallExpression,
  elements: readonly EvaluationArrayElement[],
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
} {
  const compareExpression = call.arguments[0];
  if (compareExpression == null) {
    return sortWithComparator(elements, defaultArraySortCompare);
  }

  const checkpoint = host.checkpoint();
  const compareValue = host.evaluateExpression(compareExpression, environment, moduleKey, depth + 1);
  if (compareValue.kind !== EvaluationValueKind.Function) {
    host.restore(checkpoint);
    return {
      elements,
      mayHaveUnknownOrder: true,
    };
  }

  let comparatorEvaluations = 0;
  const sorted = sortWithComparator(elements, (left, right) => {
    if (comparatorEvaluations >= host.guardrails.maxIntrinsicCallbackEvaluations) {
      return null;
    }
    comparatorEvaluations++;
    const result = host.evaluateFunctionWithArguments(
      compareValue,
      call,
      [left.value, right.value],
      moduleKey,
      depth + 1,
    );
    return result.kind === EvaluationValueKind.Number
      ? result.value
      : null;
  });
  if (sorted.mayHaveUnknownOrder) {
    host.restore(checkpoint);
  }
  return sorted;
}

function sortWithComparator(
  elements: readonly EvaluationArrayElement[],
  compare: (left: EvaluationArrayElement, right: EvaluationArrayElement) => number | null,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
} {
  let mayHaveUnknownOrder = false;
  const decorated = elements.map((element, index) => ({ element, index }));
  decorated.sort((left, right) => {
    const result = compare(left.element, right.element);
    if (result == null || Number.isNaN(result)) {
      mayHaveUnknownOrder = true;
      return left.index - right.index;
    }
    return result === 0
      ? left.index - right.index
      : result;
  });
  return {
    elements: decorated.map((entry) => entry.element),
    mayHaveUnknownOrder,
  };
}

function defaultArraySortCompare(
  left: EvaluationArrayElement,
  right: EvaluationArrayElement,
): number | null {
  const leftText = defaultArraySortText(left.value);
  const rightText = defaultArraySortText(right.value);
  if (leftText == null || rightText == null) {
    return null;
  }
  return leftText.localeCompare(rightText);
}

function defaultArraySortText(value: EvaluationValue): string | null {
  return stringCoercionText(value);
}

function evaluateStringLocaleCompare(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  const comparison = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (receiver.kind === EvaluationValueKind.String && comparison.kind === EvaluationValueKind.String) {
    return new EvaluationNumberValue(receiver.value.localeCompare(comparison.value), call);
  }
  return host.unknown('String.localeCompare receiver or comparison value did not reduce to a known string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

function evaluateStringTransform(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  operation: 'toUpperCase' | 'toLowerCase' | 'trim',
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  switch (operation) {
    case 'toUpperCase':
      return new EvaluationStringValue(receiver.value.toUpperCase(), call);
    case 'toLowerCase':
      return new EvaluationStringValue(receiver.value.toLowerCase(), call);
    case 'trim':
      return new EvaluationStringValue(receiver.value.trim(), call);
  }
}

function evaluateStringPredicate(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  operation: 'startsWith' | 'endsWith' | 'includes',
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  const search = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.String || search.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver or search value did not reduce to a known string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  switch (operation) {
    case 'startsWith':
      return new EvaluationBooleanValue(receiver.value.startsWith(search.value), call);
    case 'endsWith':
      return new EvaluationBooleanValue(receiver.value.endsWith(search.value), call);
    case 'includes':
      return new EvaluationBooleanValue(receiver.value.includes(search.value), call);
  }
}

function evaluateCallArgumentValues(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): readonly EvaluationValue[] {
  const values: EvaluationValue[] = [];
  for (const argument of call.arguments) {
    const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
    if (ts.isSpreadElement(argument) && value.kind === EvaluationValueKind.Array) {
      values.push(...value.elements.map((element) => element.value));
    } else {
      values.push(value);
    }
  }
  return values;
}
