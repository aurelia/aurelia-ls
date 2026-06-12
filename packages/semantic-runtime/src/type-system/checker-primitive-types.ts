import ts from 'typescript';
import {
  mapExpressionPrimitiveLiteralValue,
  type ExpressionPrimitiveLiteralValue,
} from '../expression/ast.js';
import { uniqueStrings } from '../kernel/collections.js';
import type { KernelStore } from '../kernel/store.js';
import { checkerRawTypeAssignable } from './checker-type-assignability.js';
import { readCheckerTypeShape } from './checker-type-shape-access.js';
import {
  checkerCallableReturnTypesForRuntimeArguments,
  checkerRuntimeUnknownArguments,
  type CheckerRuntimeArgumentType,
} from './checker-signature-parameters.js';
import {
  CheckerTypeShapeKind,
  type CheckerTypeReference,
} from './type-shape.js';

/** Broad TypeScript primitive lane used for runtime operations whose result is not a literal expression. */
export type CheckerPrimitiveName = 'string' | 'number' | 'boolean' | 'undefined';

/** Return the TypeScript broad primitive type for runtime operations such as interpolation, arithmetic, and `typeof`. */
export function checkerPrimitiveType(
  checker: ts.TypeChecker,
  primitive: CheckerPrimitiveName,
): ts.Type {
  switch (primitive) {
    case 'string':
      return checker.getStringType();
    case 'number':
      return checker.getNumberType();
    case 'boolean':
      return checker.getBooleanType();
    case 'undefined':
      return checker.getUndefinedType();
  }
}

/** Return the TypeScript literal type matching `checker.getTypeAtLocation(...)` for primitive literal expressions. */
export function checkerPrimitiveLiteralType(
  checker: ts.TypeChecker,
  value: ExpressionPrimitiveLiteralValue,
): ts.Type {
  return mapExpressionPrimitiveLiteralValue(value, {
    string: (stringValue) => checker.getStringLiteralType(stringValue),
    number: (numberValue) => checker.getNumberLiteralType(numberValue),
    boolean: (booleanValue) => booleanValue ? checker.getTrueType() : checker.getFalseType(),
    null: () => checker.getNullType(),
    undefined: () => checker.getUndefinedType(),
  });
}

/** Checks whether a broad TypeScript primitive is assignable to a target type. */
export function checkerPrimitiveTypeAssignableToType(
  checker: ts.TypeChecker,
  primitive: CheckerPrimitiveName,
  to: ts.Type,
): boolean {
  return checkerRawTypeAssignable(checker, checkerPrimitiveType(checker, primitive), to);
}

/** Checks whether a source type is assignable to a broad TypeScript primitive. */
export function checkerTypeAssignableToPrimitiveType(
  checker: ts.TypeChecker,
  from: ts.Type,
  primitive: CheckerPrimitiveName,
): boolean {
  return checkerRawTypeAssignable(checker, from, checkerPrimitiveType(checker, primitive));
}

/** Checks whether a retained type reference is assignable to a broad primitive, using display-only fallback only when no checker carrier survives. */
export function checkerTypeReferenceAssignableToPrimitiveType(
  store: KernelStore,
  reference: CheckerTypeReference | null,
  primitive: CheckerPrimitiveName,
): boolean | null {
  const shape = readCheckerTypeShape(store, reference);
  const carrier = shape?.carrier ?? null;
  if (carrier != null) {
    return checkerTypeAssignableToPrimitiveType(carrier.checker, carrier.type, primitive);
  }
  return checkerTypeDisplayAssignableToPrimitive(reference?.display ?? shape?.display ?? null, primitive);
}

/** Checks whether a retained callable reference returns a value assignable to a broad primitive. */
export function checkerCallableReferenceReturnAssignableToPrimitiveType(
  store: KernelStore,
  reference: CheckerTypeReference | null,
  primitive: CheckerPrimitiveName,
  runtimeArguments: readonly CheckerRuntimeArgumentType[] | number = [],
): boolean | null {
  if (reference == null
    || reference.shapeKind === CheckerTypeShapeKind.Any
    || reference.shapeKind === CheckerTypeShapeKind.Unknown) {
    return null;
  }
  const shape = readCheckerTypeShape(store, reference);
  const shapeKind = shape?.shapeKind ?? reference.shapeKind;
  if (shapeKind === CheckerTypeShapeKind.Any || shapeKind === CheckerTypeShapeKind.Unknown) {
    return null;
  }
  if (shapeKind !== CheckerTypeShapeKind.Function) {
    return false;
  }
  const carrier = shape?.carrier ?? null;
  if (carrier != null) {
    const argumentsForCall = typeof runtimeArguments === 'number'
      ? checkerRuntimeUnknownArguments(carrier.checker, runtimeArguments)
      : runtimeArguments;
    const returnTypes = checkerCallableReturnTypesForRuntimeArguments(carrier.checker, carrier.type, argumentsForCall);
    return returnTypes.length === 0
      ? null
      : returnTypes.every((returnType) =>
        checkerTypeAssignableToPrimitiveType(carrier.checker, returnType.type, primitive)
      );
  }
  if (shape?.callReturnType != null) {
    return checkerTypeReferenceAssignableToPrimitiveType(store, shape.callReturnType, primitive);
  }
  return checkerFunctionDisplayReturnAssignableToPrimitive(shape?.display ?? reference.display ?? null, primitive);
}

/** Checks whether a parser-level primitive literal value is assignable to a target type. */
export function checkerPrimitiveLiteralAssignableToType(
  checker: ts.TypeChecker,
  value: ExpressionPrimitiveLiteralValue,
  to: ts.Type,
): boolean {
  return checkerRawTypeAssignable(checker, checkerPrimitiveLiteralType(checker, value), to);
}

/** Checks whether an authored DOM string literal value is assignable to a target type. */
export function checkerStringLiteralAssignableToType(
  checker: ts.TypeChecker,
  value: string,
  to: ts.Type,
): boolean {
  return checkerRawTypeAssignable(checker, checker.getStringLiteralType(value), to);
}

/** Converts an authored string-domain into de-duplicated TypeScript string literal types. */
export function checkerStringLiteralTypes(
  checker: ts.TypeChecker,
  values: readonly string[],
): readonly ts.Type[] {
  return uniqueStrings(values).map((value) => checker.getStringLiteralType(value));
}

/** Display-only primitive assignability fallback for compact retained references that no longer carry a checker. */
export function checkerTypeDisplayAssignableToPrimitive(
  display: string | null,
  primitive: CheckerPrimitiveName,
): boolean | null {
  if (display == null || display === 'unknown' || display === 'any') {
    return null;
  }
  if (primitive === 'boolean') {
    return display === 'boolean'
      || display === 'true'
      || display === 'false'
      || display.split('|').map((part) => part.trim()).every((part) => part === 'true' || part === 'false');
  }
  return display === primitive;
}

/** Display-only callable-return fallback for compact retained function references. */
export function checkerFunctionDisplayReturnAssignableToPrimitive(
  display: string | null,
  primitive: CheckerPrimitiveName,
): boolean | null {
  if (display == null) {
    return null;
  }
  const arrowIndex = display.lastIndexOf('=>');
  return arrowIndex < 0
    ? null
    : checkerTypeDisplayAssignableToPrimitive(display.slice(arrowIndex + 2).trim(), primitive);
}
