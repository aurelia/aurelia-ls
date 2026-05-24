import ts from 'typescript';
import {
  mapExpressionPrimitiveLiteralValue,
  type ExpressionAstNode,
  type ExpressionPrimitiveLiteralValue,
} from '../expression/ast.js';
import {
  RuntimeBindingPrimitiveValueKind,
  type RuntimeBindingPrimitiveValue,
} from './runtime-binding-observation.js';
import { checkerPrimitiveLiteralType } from '../type-system/checker-primitive-types.js';

export function runtimeBindingPrimitiveValueFromExpressionValue(
  value: ExpressionPrimitiveLiteralValue,
): RuntimeBindingPrimitiveValue {
  return mapExpressionPrimitiveLiteralValue<RuntimeBindingPrimitiveValue>(value, {
    string: (stringValue) => ({ kind: RuntimeBindingPrimitiveValueKind.String, value: stringValue }),
    number: (numberValue) => ({ kind: RuntimeBindingPrimitiveValueKind.Number, value: numberValue }),
    boolean: (booleanValue) => ({ kind: RuntimeBindingPrimitiveValueKind.Boolean, value: booleanValue }),
    null: () => ({ kind: RuntimeBindingPrimitiveValueKind.Null }),
    undefined: () => ({ kind: RuntimeBindingPrimitiveValueKind.Undefined }),
  });
}

export function runtimeBindingPrimitiveValueDomainForExpression(
  expression: ExpressionAstNode,
): readonly RuntimeBindingPrimitiveValue[] {
  const value = runtimeBindingPrimitiveValueForExpression(expression);
  return value == null ? [] : [value];
}

export function runtimeBindingPrimitiveValueForExpression(
  expression: ExpressionAstNode,
): RuntimeBindingPrimitiveValue | null {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return runtimeBindingPrimitiveValueFromExpressionValue(expression.value);
    case 'Paren':
      return runtimeBindingPrimitiveValueForExpression(expression.expression);
    default:
      return null;
  }
}

export function runtimeBindingBooleanLiteralForExpression(
  expression: ExpressionAstNode,
): boolean | null {
  const value = runtimeBindingPrimitiveValueForExpression(expression);
  return value?.kind === RuntimeBindingPrimitiveValueKind.Boolean ? value.value : null;
}

export function runtimeBindingStringDomainForPrimitiveValues(
  values: readonly RuntimeBindingPrimitiveValue[],
): readonly string[] {
  return values.flatMap((value) =>
    value.kind === RuntimeBindingPrimitiveValueKind.String ? [value.value] : []
  );
}

export function runtimeBindingStringPrimitiveDomain(
  values: readonly string[],
): readonly RuntimeBindingPrimitiveValue[] {
  return values.map((value) => ({
    kind: RuntimeBindingPrimitiveValueKind.String,
    value,
  }));
}

export function runtimeBindingPrimitiveValueDomainKinds(
  values: readonly RuntimeBindingPrimitiveValue[],
): readonly (RuntimeBindingPrimitiveValueKind | `${RuntimeBindingPrimitiveValueKind}`)[] {
  return [...new Set(values.map((value) => value.kind))];
}

export function runtimeBindingPrimitiveValueApiDisplay(
  value: RuntimeBindingPrimitiveValue,
): string {
  return runtimeBindingPrimitiveValueDisplay(value, {
    string: (stringValue) => JSON.stringify(stringValue),
    null: 'null',
    undefined: 'undefined',
  });
}

export function runtimeBindingPrimitiveValueTypeDisplay(
  value: RuntimeBindingPrimitiveValue,
): string {
  return runtimeBindingPrimitiveValueDisplay(value, {
    string: runtimeBindingStringLiteralTypeDisplay,
    null: 'null',
    undefined: 'undefined',
  });
}

export function runtimeBindingPrimitiveValueDomString(
  value: RuntimeBindingPrimitiveValue,
  nullishDefault: string | null,
): string {
  return runtimeBindingPrimitiveValueDisplay(value, {
    string: (stringValue) => stringValue,
    null: nullishDefault ?? 'null',
    undefined: nullishDefault ?? 'undefined',
  });
}

interface RuntimeBindingPrimitiveValueDisplayPolicy {
  readonly string: (value: string) => string;
  readonly null: string;
  readonly undefined: string;
}

/** Format one primitive value-domain entry while keeping API, type, and DOM policies explicit at the call site. */
function runtimeBindingPrimitiveValueDisplay(
  value: RuntimeBindingPrimitiveValue,
  policy: RuntimeBindingPrimitiveValueDisplayPolicy,
): string {
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
      return policy.string(value.value);
    case RuntimeBindingPrimitiveValueKind.Number:
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return String(value.value);
    case RuntimeBindingPrimitiveValueKind.Null:
      return policy.null;
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return policy.undefined;
  }
}

export function uniqueRuntimeBindingPrimitiveValueDomain(
  values: readonly RuntimeBindingPrimitiveValue[],
): readonly RuntimeBindingPrimitiveValue[] {
  const seen = new Set<string>();
  const result: RuntimeBindingPrimitiveValue[] = [];
  for (const value of values) {
    const key = runtimeBindingPrimitiveValueKey(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

export function runtimeBindingPrimitiveValueKey(
  value: RuntimeBindingPrimitiveValue,
): string {
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
    case RuntimeBindingPrimitiveValueKind.Number:
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return `${value.kind}:${String(value.value)}`;
    case RuntimeBindingPrimitiveValueKind.Null:
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return value.kind;
  }
}

/** Convert a runtime binding primitive value back to its parser-level primitive value for shared TypeChecker helpers. */
export function runtimeBindingPrimitiveValueExpressionValue(
  value: RuntimeBindingPrimitiveValue,
): ExpressionPrimitiveLiteralValue {
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
    case RuntimeBindingPrimitiveValueKind.Number:
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return value.value;
    case RuntimeBindingPrimitiveValueKind.Null:
      return null;
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return undefined;
  }
}

export function runtimeBindingPrimitiveValueAssignableToType(
  value: RuntimeBindingPrimitiveValue,
  checker: ts.TypeChecker,
  to: ts.Type,
): boolean {
  return checker.isTypeAssignableTo(
    checkerPrimitiveLiteralType(checker, runtimeBindingPrimitiveValueExpressionValue(value)),
    to,
  );
}

export function runtimeBindingStringLiteralTypeDisplay(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
