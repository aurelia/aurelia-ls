import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationRegularExpressionValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  evaluatePositionalIntrinsicArguments,
  stringCoercionText,
} from './shared.js';

export function evaluateRegExpConstructor(
  frame: StaticInvocationFrame<ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateRegExpArguments(frame, host);
}

export function evaluateRegExpCall(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateRegExpArguments(frame, host);
}

export function evaluateRegExpArguments(
  frame: StaticInvocationFrame<ts.CallExpression | ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node, moduleKey } = frame;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    node,
    moduleKey,
    host,
    'RegExp argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  for (const evidence of argumentRead.evidence) {
    host.replayOpenSeams(evidence.openSeams);
  }
  if (
    (argumentRead.evidence[0]?.openSeams.length ?? 0) > 0
    || (argumentRead.evidence[1]?.openSeams.length ?? 0) > 0
  ) {
    return new EvaluationUnknownValue(
      'RegExp pattern or flags retained open pressure.',
      node,
      true,
    );
  }
  const patternValue = argumentRead.evidence[0]?.value ?? EvaluationUndefined;
  const flagsValue = argumentRead.evidence[1]?.value ?? null;
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

export function regularExpressionPatternText(value: EvaluationValue): string | null {
  if (value.kind === EvaluationValueKind.RegularExpression) {
    return value.pattern;
  }
  if (value.kind === EvaluationValueKind.Undefined) {
    return '';
  }
  return stringCoercionText(value);
}

export function regularExpressionFlagsText(value: EvaluationValue): string | null {
  return stringCoercionText(value);
}
