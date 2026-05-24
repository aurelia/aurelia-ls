import ts from 'typescript';
import { checkerNumberIndexValueType } from '../type-system/checker-related-types.js';

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

/** Return every boolean literal value in a boolean-literal union, or null for non-literal members. */
export function booleanLiteralValuesForType(type: ts.Type): readonly boolean[] | null {
  const parts = type.isUnion() ? type.types : [type];
  const values: boolean[] = [];
  for (const part of parts) {
    if ((part.flags & ts.TypeFlags.BooleanLiteral) === 0) {
      return null;
    }
    const intrinsicName = (part as unknown as { readonly intrinsicName?: string }).intrinsicName;
    if (intrinsicName !== 'true' && intrinsicName !== 'false') {
      return null;
    }
    values.push(intrinsicName === 'true');
  }
  return [...new Set(values)];
}

/** True when the checker type is assignable to a boolean-like primitive lane. */
export function isBooleanLike(type: ts.Type): boolean {
  return typeParts(type).some((part) => (part.flags & ts.TypeFlags.BooleanLike) !== 0);
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
  const elementTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    return name === 'Set' || name === 'ReadonlySet'
      ? [typeReferenceArguments(checker, part)[0] ?? null]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (elementTypes.length > 0) {
    return elementTypes[0]!;
  }
  return null;
}

/** Return the element type for mutable Array, tuple, or Set shapes. */
export function mutableCollectionElementTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const arrayElementType = mutableArrayElementTypeFor(checker, type);
  if (arrayElementType != null) {
    return arrayElementType;
  }
  const elementTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    return name === 'Set'
      ? [typeReferenceArguments(checker, part)[0] ?? null]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (elementTypes.length > 0) {
    return elementTypes[0]!;
  }
  return null;
}

/** Return the element type for Array and tuple shapes. */
export function arrayElementTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const elementTypes = typeParts(type).flatMap((part) =>
    checker.isArrayType(part) || checker.isTupleType(part)
      ? [checkerNumberIndexValueType(checker, part)]
      : []
  ).filter((part): part is ts.Type => part != null);
  if (elementTypes.length > 0) {
    return elementTypes[0]!;
  }
  return null;
}

/** Return the element type for mutable Array and tuple shapes. */
export function mutableArrayElementTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const elementTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    if (name === 'ReadonlyArray') {
      return [];
    }
    return checker.isArrayType(part) || checker.isTupleType(part)
      ? [checkerNumberIndexValueType(checker, part)]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (elementTypes.length > 0) {
    return elementTypes[0]!;
  }
  return null;
}

/** True when every possible checker type part is a runtime Array/tuple instance. */
export function isRuntimeArrayInstanceType(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  const parts = typeParts(type);
  return parts.length > 0
    && parts.every((part) => checker.isArrayType(part) || checker.isTupleType(part));
}

/** Return the key type for Map or ReadonlyMap shapes. */
export function mapKeyTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const keyTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    return name === 'Map' || name === 'ReadonlyMap'
      ? [typeReferenceArguments(checker, part)[0] ?? null]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (keyTypes.length > 0) {
    return keyTypes[0]!;
  }
  return null;
}

/** Return the key type for mutable Map shapes. */
export function mutableMapKeyTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const keyTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    return name === 'Map'
      ? [typeReferenceArguments(checker, part)[0] ?? null]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (keyTypes.length > 0) {
    return keyTypes[0]!;
  }
  return null;
}

/** Return the value type for Map or ReadonlyMap shapes. */
export function mapValueTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const valueTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    return name === 'Map' || name === 'ReadonlyMap'
      ? [typeReferenceArguments(checker, part)[1] ?? null]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (valueTypes.length > 0) {
    return valueTypes[0]!;
  }
  return null;
}

/** Return the value type for mutable Map shapes. */
export function mutableMapValueTypeFor(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const valueTypes = typeParts(type).flatMap((part) => {
    const name = namedTypeSymbolName(part);
    return name === 'Map'
      ? [typeReferenceArguments(checker, part)[1] ?? null]
      : [];
  }).filter((part): part is ts.Type => part != null);
  if (valueTypes.length > 0) {
    return valueTypes[0]!;
  }
  return null;
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

function typeParts(type: ts.Type): readonly ts.Type[] {
  return type.isUnion() ? type.types : [type];
}
