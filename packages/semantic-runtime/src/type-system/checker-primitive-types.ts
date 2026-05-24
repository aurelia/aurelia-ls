import ts from 'typescript';
import {
  mapExpressionPrimitiveLiteralValue,
  type ExpressionPrimitiveLiteralValue,
} from '../expression/ast.js';

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
