import ts from 'typescript';

/** Return every string literal value in a string-literal union, or null for non-literal members. */
export function stringLiteralValuesForType(type: ts.Type): readonly string[] | null {
  const parts = type.isUnion() ? type.types : [type];
  const values: string[] = [];
  for (const part of parts) {
    if ((part.flags & ts.TypeFlags.StringLiteral) === 0) {
      return null;
    }
    values.push((part as ts.StringLiteralType).value);
  }
  return values;
}

/** True when the checker type is assignable to a boolean-like primitive lane. */
export function isBooleanLike(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.BooleanLike) !== 0;
}

/** Return the element type for Array, tuple, Set, or ReadonlySet shapes. */
export function collectionElementTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const arrayElementType = arrayElementTypeFor(checker, type);
  if (arrayElementType != null) {
    return arrayElementType;
  }
  const name = namedTypeSymbolName(type);
  if (name === 'Set' || name === 'ReadonlySet') {
    return typeReferenceArguments(checker, type)[0] ?? null;
  }
  return null;
}

/** Return the element type for Array and tuple shapes. */
export function arrayElementTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return checker.getIndexTypeOfType(type, ts.IndexKind.Number) ?? null;
  }
  return null;
}

/** Return the key type for Map or ReadonlyMap shapes. */
export function mapKeyTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const name = namedTypeSymbolName(type);
  if (name !== 'Map' && name !== 'ReadonlyMap') {
    return null;
  }
  return typeReferenceArguments(checker, type)[0] ?? null;
}

/** Return type-reference arguments when the checker type carries them. */
export function typeReferenceArguments(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Type[] {
  return ((type.flags & ts.TypeFlags.Object) !== 0 && ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0)
    ? checker.getTypeArguments(type as ts.TypeReference)
    : [];
}

/** Return the alias or symbol name for a checker type when available. */
export function namedTypeSymbolName(type: ts.Type): string | null {
  return type.aliasSymbol?.getName()
    ?? type.symbol?.getName()
    ?? null;
}
