import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationRegularExpressionValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import { stringCoercionText } from './shared.js';

export function evaluateRegExpConstructor(
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

export function evaluateRegExpCall(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateRegExpArguments(call, call.arguments, environment, moduleKey, depth + 1, host);
}

export function evaluateRegExpArguments(
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
