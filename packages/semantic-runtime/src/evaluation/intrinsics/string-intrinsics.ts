import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { EvaluationValueEvidence } from '../value-pressure.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  boundaryIntrinsicCallValue,
  evaluatePositionalIntrinsicArguments,
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
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const argumentRead = stringInvocationArguments(frame, host, 'String argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const source = argumentRead.evidence[0]?.value ?? EvaluationUndefined;
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'String', call);
  }
  const text = stringCoercionText(source);
  return text == null
    ? host.unknown('String(...) argument did not reduce to a primitive value.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationStringValue(text, call);
}

export function evaluateStringLocaleCompare(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, 'String.localeCompare receiver retained open pressure.');
  const argumentRead = stringInvocationArguments(frame, host, 'String.localeCompare argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const comparison = argumentRead.evidence[0]?.value ?? EvaluationUndefined;
  if (receiver.kind === EvaluationValueKind.String && comparison.kind === EvaluationValueKind.String) {
    return new EvaluationNumberValue(receiver.value.localeCompare(comparison.value), call);
  }
  return host.unknown('String.localeCompare receiver or comparison value did not reduce to a known string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

export function evaluateStringTransform(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  operation: 'toUpperCase' | 'toLowerCase' | 'trim',
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, `String.${operation} receiver retained open pressure.`);
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
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  operation: 'at' | 'charAt' | 'charCodeAt',
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, `String.${operation} receiver retained open pressure.`);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = stringInvocationArguments(frame, host, `String.${operation} argument list did not close.`);
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const index = readStringIndexArgument(argumentRead.evidence, operation === 'at' ? null : 0);
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
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, 'String.repeat receiver retained open pressure.');
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'repeat', call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('String.repeat receiver did not reduce to a known string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = stringInvocationArguments(frame, host, 'String.repeat argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const count = readStringRepeatCount(argumentRead.evidence);
  if (count == null) {
    return host.unknown('String.repeat count did not reduce to a static non-negative finite integer.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (count > 1_000) {
    return host.unknown('String.repeat count exceeds static evaluator guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationStringValue(receiver.value.repeat(count), call);
}

export function evaluateStringPad(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  operation: 'padStart' | 'padEnd',
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, `String.${operation} receiver retained open pressure.`);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = stringInvocationArguments(frame, host, `String.${operation} argument list did not close.`);
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const targetLength = readStringPadTargetLength(argumentRead.evidence);
  if (targetLength == null) {
    return host.unknown(`String.${operation} target length did not reduce to a static finite number.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (targetLength > 1_000) {
    return host.unknown(`String.${operation} target length exceeds static evaluator guardrail.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const fillText = readStringPadFillText(argumentRead.evidence);
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
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, 'String.substring receiver retained open pressure.');
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'substring', call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('String.substring receiver did not reduce to a known string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = stringInvocationArguments(frame, host, 'String.substring argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const start = readStringSubstringBound(argumentRead.evidence[0] ?? null, 0);
  const end = readStringSubstringBound(argumentRead.evidence[1] ?? null, receiver.value.length);
  if (start == null || end == null) {
    return host.unknown('String.substring bounds did not reduce to static numbers.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const left = Math.min(start, end);
  const right = Math.max(start, end);
  return new EvaluationStringValue(receiver.value.substring(left, right), call);
}

export function evaluateStringPredicate(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  operation: 'startsWith' | 'endsWith' | 'includes',
): EvaluationValue {
  const receiver = stringInvocationReceiver(frame, host, `String.${operation} receiver retained open pressure.`);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, frame.node);
  }
  return evaluateStringPredicateFromReceiver(frame, receiver, host, operation);
}

export function evaluateStringPredicateFromReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  receiver: EvaluationValue,
  host: StaticIntrinsicEvaluationHost,
  operation: 'startsWith' | 'endsWith' | 'includes',
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const argumentRead = stringInvocationArguments(frame, host, `String.${operation} argument list did not close.`);
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const search = argumentRead.evidence[0]?.value ?? EvaluationUndefined;
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
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, 'String.split receiver retained open pressure.');
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'split', call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('String.split receiver did not reduce to a known string.', frame.calleeNode, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = stringInvocationArguments(frame, host, 'String.split argument list did not close.');
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const separator = argumentRead.evidence[0]?.value ?? EvaluationUndefined;
  const limit = argumentRead.evidence[1] == null
    ? undefined
    : readStringSplitLimit(argumentRead.evidence[1].value);
  if (argumentRead.evidence[1] != null && limit == null) {
    return host.unknown('String.split limit did not reduce to a static number.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const splitLimit = limit ?? undefined;
  const parts = splitString(receiver.value, separator, splitLimit, call, moduleKey, host);
  if (parts == null) {
    return host.unknown('String.split separator did not reduce to a static string or regular expression.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationArrayValue(
    parts.map((part) => new EvaluationArrayElement(new EvaluationStringValue(part, call), null)),
    call,
  );
}

export function evaluateStringReplace(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  operation: 'replace' | 'replaceAll',
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = stringInvocationReceiver(frame, host, `String.${operation} receiver retained open pressure.`);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, operation, call);
  }
  if (receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`String.${operation} receiver did not reduce to a known string.`, frame.calleeNode, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = stringInvocationArguments(frame, host, `String.${operation} argument list did not close.`);
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const search = argumentRead.evidence[0]?.value ?? EvaluationUndefined;
  if (argumentRead.evidence[1] == null) {
    return host.unknown(`String.${operation} replacement is missing or spread.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const replacement = argumentRead.evidence[1].value;
  const replacementText = stringCoercionText(replacement);
  if (replacementText == null) {
    return host.unknown(`String.${operation} replacement did not reduce to a static string.`, call.arguments[1] ?? call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
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
  arguments_: readonly EvaluationValueEvidence[],
  missingValue: number | null,
): number | null {
  const value = arguments_[0]?.value ?? null;
  if (value == null) {
    return missingValue;
  }
  if (value.kind === EvaluationValueKind.Undefined && missingValue != null) {
    return missingValue;
  }
  return value.kind === EvaluationValueKind.Number && Number.isFinite(value.value)
    ? Math.trunc(value.value)
    : null;
}

function readStringRepeatCount(
  arguments_: readonly EvaluationValueEvidence[],
): number | null {
  const value = arguments_[0]?.value ?? null;
  if (value == null) {
    return null;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const count = Math.trunc(value.value);
  return count < 0 ? null : count;
}

function readStringPadTargetLength(
  arguments_: readonly EvaluationValueEvidence[],
): number | null {
  const value = arguments_[0]?.value ?? null;
  if (value == null) {
    return null;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value.value));
}

function readStringPadFillText(
  arguments_: readonly EvaluationValueEvidence[],
): string | null {
  const value = arguments_[1]?.value ?? null;
  if (value == null) {
    return ' ';
  }
  return stringCoercionText(value);
}

function readStringSubstringBound(
  evidence: EvaluationValueEvidence | null,
  missingValue: number,
): number | null {
  if (evidence == null) {
    return missingValue;
  }
  const value = evidence.value;
  if (value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.max(0, Math.trunc(value.value));
}

function stringInvocationReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
): EvaluationValue {
  const evidence = frame.thisValue;
  if (evidence == null) {
    return EvaluationUndefined;
  }
  if (evidence.openSeams.length === 0) {
    return evidence.value;
  }
  host.replayOpenSeams(evidence.openSeams);
  return new EvaluationUnknownValue(openReason, frame.calleeNode, true);
}

function stringInvocationArguments(
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
  if (read.kind === 'open') {
    return read;
  }
  const openSeams = read.evidence.flatMap((argument) => argument.openSeams);
  if (openSeams.length === 0) {
    return read;
  }
  host.replayOpenSeams(openSeams);
  return {
    kind: 'open' as const,
    value: new EvaluationUnknownValue(openReason, frame.node, true),
  };
}
