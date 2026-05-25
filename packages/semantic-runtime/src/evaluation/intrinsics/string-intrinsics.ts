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
  'endsWith',
  'includes',
  'indexOf',
  'localeCompare',
  'replace',
  'replaceAll',
  'slice',
  'split',
  'startsWith',
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
