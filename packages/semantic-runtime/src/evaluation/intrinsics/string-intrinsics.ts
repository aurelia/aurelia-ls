import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  boundaryIntrinsicCallValue,
  isBoundaryEvaluationValue,
  regularExpressionValue,
  stringCoercionText,
} from './shared.js';

/** String prototype methods recognized as static evaluator host boundaries. */
export const staticStringPrototypeBoundaryMethods: ReadonlySet<string> = new Set([
  'at',
  'charAt',
  'charCodeAt',
  'endsWith',
  'includes',
  'indexOf',
  'localeCompare',
  'padEnd',
  'padStart',
  'repeat',
  'replace',
  'replaceAll',
  'slice',
  'split',
  'startsWith',
  'substring',
  'toLowerCase',
  'toUpperCase',
  'trim',
]);

export function evaluateStringCall(
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

export function evaluateStringLocaleCompare(
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

export function evaluateStringTransform(
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

export function evaluateStringAt(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  operation: 'at' | 'charAt' | 'charCodeAt',
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const index = readStringIndexArgument(call, environment, moduleKey, depth + 1, host, operation === 'at' ? null : 0);
  if (index == null) {
    return host.unknown(`String.${operation} index did not reduce to a static number.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const resolved = index < 0 ? receiver.value.length + index : index;
  if (operation === 'charCodeAt') {
    const code = resolved < 0 || resolved >= receiver.value.length
      ? Number.NaN
      : receiver.value.charCodeAt(resolved);
    return new EvaluationNumberValue(code, call);
  }
  if (operation === 'at') {
    const value = receiver.value.at(index);
    return value == null ? EvaluationUndefined : new EvaluationStringValue(value, call);
  }
  return new EvaluationStringValue(
    resolved < 0 || resolved >= receiver.value.length ? '' : receiver.value.charAt(resolved),
    call,
  );
}

export function evaluateStringRepeat(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'repeat', call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('String.repeat receiver did not reduce to a known string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const count = readStringRepeatCount(call, environment, moduleKey, depth + 1, host);
  if (count == null) {
    return host.unknown('String.repeat count did not reduce to a static non-negative finite integer.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (count > 1_000) {
    return host.unknown('String.repeat count exceeds static evaluator guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationStringValue(receiver.value.repeat(count), call);
}

export function evaluateStringPad(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  operation: 'padStart' | 'padEnd',
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const targetLength = readStringPadTargetLength(call, environment, moduleKey, depth + 1, host);
  if (targetLength == null) {
    return host.unknown(`String.${operation} target length did not reduce to a static finite number.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (targetLength > 1_000) {
    return host.unknown(`String.${operation} target length exceeds static evaluator guardrail.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const fillText = readStringPadFillText(call, environment, moduleKey, depth + 1, host);
  if (fillText == null) {
    return host.unknown(`String.${operation} fill string did not reduce to a static primitive.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationStringValue(
    operation === 'padStart'
      ? receiver.value.padStart(targetLength, fillText)
      : receiver.value.padEnd(targetLength, fillText),
    call,
  );
}

export function evaluateStringSubstring(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'substring', call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('String.substring receiver did not reduce to a known string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const start = readStringSubstringBound(call.arguments[0] ?? null, environment, moduleKey, depth + 1, host, 0);
  const end = readStringSubstringBound(call.arguments[1] ?? null, environment, moduleKey, depth + 1, host, receiver.value.length);
  if (start == null || end == null) {
    return host.unknown('String.substring bounds did not reduce to static numbers.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const left = Math.min(start, end);
  const right = Math.max(start, end);
  return new EvaluationStringValue(receiver.value.substring(left, right), call);
}

export function evaluateStringPredicate(
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
  return evaluateStringPredicateFromReceiver(call, receiver, environment, moduleKey, depth + 1, host, operation);
}

export function evaluateStringPredicateFromReceiver(
  call: ts.CallExpression,
  receiver: EvaluationValue,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  operation: 'startsWith' | 'endsWith' | 'includes',
): EvaluationValue {
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

export function evaluateStringSplit(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'split', call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('String.split receiver did not reduce to a known string.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const separator = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const limit = call.arguments[1] == null
    ? undefined
    : readStringSplitLimit(host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1));
  if (call.arguments[1] != null && limit == null) {
    return host.unknown('String.split limit did not reduce to a static number.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const splitLimit = limit ?? undefined;
  const parts = splitString(receiver.value, separator, splitLimit, call, moduleKey, host);
  if (parts == null) {
    return host.unknown('String.split separator did not reduce to a static string or regular expression.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    parts.map((part) => new EvaluationArrayElement(new EvaluationStringValue(part, call), null)),
    false,
    call,
  );
}

export function evaluateStringReplace(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  operation: 'replace' | 'replaceAll',
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const search = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (call.arguments[1] == null || ts.isSpreadElement(call.arguments[1])) {
    return host.unknown(`String.${operation} replacement is missing or spread.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const replacement = host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1);
  const replacementText = stringCoercionText(replacement);
  if (replacementText == null) {
    return host.unknown(`String.${operation} replacement did not reduce to a static string.`, call.arguments[1], moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const result = replaceString(receiver.value, search, replacementText, operation, call, moduleKey, host);
  return result == null
    ? host.unknown(`String.${operation} search value did not reduce to a static string or regular expression.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationStringValue(result, call);
}

export function splitString(
  value: string,
  separator: EvaluationValue,
  limit: number | undefined,
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): readonly string[] | null {
  if (separator.kind === EvaluationValueKind.Undefined) {
    return [value].slice(0, limit);
  }
  if (separator.kind === EvaluationValueKind.String) {
    return value.split(separator.value, limit);
  }
  if (separator.kind === EvaluationValueKind.RegularExpression) {
    const regexp = regularExpressionValue(separator, node, moduleKey, host);
    return regexp == null ? null : value.split(regexp, limit);
  }
  return null;
}

export function replaceString(
  value: string,
  search: EvaluationValue,
  replacement: string,
  operation: 'replace' | 'replaceAll',
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): string | null {
  if (search.kind === EvaluationValueKind.String) {
    return operation === 'replaceAll'
      ? value.split(search.value).join(replacement)
      : value.replace(search.value, replacement);
  }
  if (search.kind === EvaluationValueKind.RegularExpression) {
    const regexp = regularExpressionValue(search, node, moduleKey, host);
    if (regexp == null) {
      return null;
    }
    if (operation === 'replaceAll' && !search.flags.includes('g')) {
      return value.replace(new RegExp(search.pattern, `${search.flags}g`), replacement);
    }
    return value.replace(regexp, replacement);
  }
  return null;
}

export function readStringSplitLimit(value: EvaluationValue): number | undefined | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return undefined;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value.value));
}

function readStringIndexArgument(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  missingValue: number | null,
): number | null {
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return missingValue;
  }
  if (ts.isSpreadElement(argument)) {
    return null;
  }
  const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
  if (value.kind === EvaluationValueKind.Undefined && missingValue != null) {
    return missingValue;
  }
  return value.kind === EvaluationValueKind.Number && Number.isFinite(value.value)
    ? Math.trunc(value.value)
    : null;
}

function readStringRepeatCount(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): number | null {
  const argument = call.arguments[0] ?? null;
  if (argument == null || ts.isSpreadElement(argument)) {
    return null;
  }
  const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const count = Math.trunc(value.value);
  return count < 0 ? null : count;
}

function readStringPadTargetLength(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): number | null {
  const argument = call.arguments[0] ?? null;
  if (argument == null || ts.isSpreadElement(argument)) {
    return null;
  }
  const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value.value));
}

function readStringPadFillText(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): string | null {
  const argument = call.arguments[1] ?? null;
  if (argument == null) {
    return ' ';
  }
  if (ts.isSpreadElement(argument)) {
    return null;
  }
  const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
  return stringCoercionText(value);
}

function readStringSubstringBound(
  expression: ts.Expression | null,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  missingValue: number,
): number | null {
  if (expression == null) {
    return missingValue;
  }
  if (ts.isSpreadElement(expression)) {
    return null;
  }
  const value = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
  if (value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value.value));
}
