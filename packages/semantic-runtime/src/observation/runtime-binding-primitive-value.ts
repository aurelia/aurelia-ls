import ts from 'typescript';
import type { ExpressionAstNode } from '../expression/ast.js';
import {
  RuntimeBindingPrimitiveValueKind,
  type RuntimeBindingPrimitiveValue,
} from './runtime-binding-observation.js';
import {
  booleanLiteralValuesForType,
} from './checker-type-helpers.js';

export function runtimeBindingPrimitiveValueFromExpressionValue(
  value: null | undefined | number | boolean | string,
): RuntimeBindingPrimitiveValue {
  switch (typeof value) {
    case 'string':
      return { kind: RuntimeBindingPrimitiveValueKind.String, value };
    case 'number':
      return { kind: RuntimeBindingPrimitiveValueKind.Number, value };
    case 'boolean':
      return { kind: RuntimeBindingPrimitiveValueKind.Boolean, value };
    case 'undefined':
      return { kind: RuntimeBindingPrimitiveValueKind.Undefined };
    default:
      return { kind: RuntimeBindingPrimitiveValueKind.Null };
  }
}

export function runtimeBindingPrimitiveValueDomainForExpression(
  expression: ExpressionAstNode,
): readonly RuntimeBindingPrimitiveValue[] {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return [runtimeBindingPrimitiveValueFromExpressionValue(expression.value)];
    case 'Paren':
      return runtimeBindingPrimitiveValueDomainForExpression(expression.expression);
    default:
      return [];
  }
}

export function runtimeBindingBooleanLiteralForExpression(
  expression: ExpressionAstNode,
): boolean | null {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'boolean' ? expression.value : null;
    case 'Paren':
      return runtimeBindingBooleanLiteralForExpression(expression.expression);
    default:
      return null;
  }
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
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
      return JSON.stringify(value.value);
    case RuntimeBindingPrimitiveValueKind.Number:
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return String(value.value);
    case RuntimeBindingPrimitiveValueKind.Null:
      return 'null';
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return 'undefined';
  }
}

export function runtimeBindingPrimitiveValueTypeDisplay(
  value: RuntimeBindingPrimitiveValue,
): string {
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
      return runtimeBindingStringLiteralTypeDisplay(value.value);
    case RuntimeBindingPrimitiveValueKind.Number:
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return String(value.value);
    case RuntimeBindingPrimitiveValueKind.Null:
      return 'null';
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return 'undefined';
  }
}

export function runtimeBindingPrimitiveValueDomString(
  value: RuntimeBindingPrimitiveValue,
  nullishDefault: string | null,
): string {
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
      return value.value;
    case RuntimeBindingPrimitiveValueKind.Number:
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return String(value.value);
    case RuntimeBindingPrimitiveValueKind.Null:
      return nullishDefault ?? 'null';
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return nullishDefault ?? 'undefined';
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

export function runtimeBindingPrimitiveValueAssignableToType(
  value: RuntimeBindingPrimitiveValue,
  checker: ts.TypeChecker,
  to: ts.Type,
): boolean {
  switch (value.kind) {
    case RuntimeBindingPrimitiveValueKind.String:
      return checker.isTypeAssignableTo(checker.getStringLiteralType(value.value), to);
    case RuntimeBindingPrimitiveValueKind.Number:
      return checker.isTypeAssignableTo(numberLiteralType(checker, value.value), to);
    case RuntimeBindingPrimitiveValueKind.Boolean:
      return booleanLiteralAssignableToType(value.value, checker, to);
    case RuntimeBindingPrimitiveValueKind.Null:
      return checker.isTypeAssignableTo(checker.getNullType(), to);
    case RuntimeBindingPrimitiveValueKind.Undefined:
      return checker.isTypeAssignableTo(checker.getUndefinedType(), to);
  }
}

function numberLiteralType(checker: ts.TypeChecker, value: number): ts.Type {
  const typedChecker = checker as ts.TypeChecker & {
    readonly getNumberLiteralType?: (value: number) => ts.Type;
  };
  return typedChecker.getNumberLiteralType?.(value) ?? checker.getNumberType();
}

function booleanLiteralAssignableToType(
  value: boolean,
  checker: ts.TypeChecker,
  to: ts.Type,
): boolean {
  const literalValues = booleanLiteralValuesForType(to);
  if (literalValues != null) {
    return literalValues.includes(value);
  }
  return checker.isTypeAssignableTo(checker.getBooleanType(), to);
}

export function runtimeBindingStringLiteralTypeDisplay(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
