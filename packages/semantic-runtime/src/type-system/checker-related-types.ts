import ts from 'typescript';
import {
  CheckerIndexedAccessKeyKind,
  CheckerTypeShapeKind,
  type CheckerTypeShape,
} from './type-shape.js';

export interface CheckerIndexedValueType {
  readonly keyKind: CheckerIndexedAccessKeyKind;
  readonly type: ts.Type;
}

export interface CheckerRepeatableElementTypeInfo {
  readonly elementType: ts.Type | null;
  readonly supportedConstituents: number;
  readonly unsupportedConstituents: number;
  readonly openConstituents: number;
  readonly nullishConstituents: number;
}

const repeatableElementInfoByChecker = new WeakMap<ts.TypeChecker, WeakMap<ts.Type, CheckerRepeatableElementTypeInfo>>();

export function checkerStringIndexValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  return checkerIndexValueType(checker, type, ts.IndexKind.String);
}

export function checkerNumberIndexValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  return checkerIndexValueType(checker, type, ts.IndexKind.Number);
}

export function checkerIndexedValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  return checkerIndexedValueTypeInfo(checker, type)?.type ?? null;
}

export function checkerIndexedValueTypeInfo(
  checker: ts.TypeChecker,
  type: ts.Type,
): CheckerIndexedValueType | null {
  if (type.isUnion()) {
    return unionRelatedIndexedValueType(checker, type.types);
  }

  const stringValueType = checkerStringIndexValueType(checker, type);
  const numberValueType = checkerNumberIndexValueType(checker, type);
  if (stringValueType != null && numberValueType != null) {
    return {
      keyKind: checker.typeToString(stringValueType) === checker.typeToString(numberValueType)
        ? CheckerIndexedAccessKeyKind.StringAndNumber
        : CheckerIndexedAccessKeyKind.String,
      type: stringValueType,
    };
  }
  if (stringValueType != null) {
    return {
      keyKind: CheckerIndexedAccessKeyKind.String,
      type: stringValueType,
    };
  }
  if (numberValueType != null) {
    return {
      keyKind: CheckerIndexedAccessKeyKind.Number,
      type: numberValueType,
    };
  }
  return null;
}

export function checkerIterableElementType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  if (type.isUnion()) {
    return unionRelatedType(
      checker,
      type.types,
      (constituent) => checkerIterableElementType(checker, constituent),
    );
  }

  if ((type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) !== 0) {
    return checker.getNumberType();
  }

  const numberIndexType = checkerNumberIndexValueType(checker, type);
  if (numberIndexType != null) {
    return numberIndexType;
  }

  const symbolName = checkerCollectionSymbolName(type);
  if (symbolName === 'Set' || symbolName === 'ReadonlySet') {
    return checker.getTypeArguments(type as ts.TypeReference)[0] ?? null;
  }
  return null;
}

export function checkerRepeatableElementTypeInfo(
  checker: ts.TypeChecker,
  type: ts.Type,
): CheckerRepeatableElementTypeInfo {
  const cache = repeatableElementTypeInfoCache(checker);
  const cached = cache.get(type);
  if (cached != null) {
    return cached;
  }
  const info = computeCheckerRepeatableElementTypeInfo(checker, type);
  cache.set(type, info);
  return info;
}

function computeCheckerRepeatableElementTypeInfo(
  checker: ts.TypeChecker,
  type: ts.Type,
): CheckerRepeatableElementTypeInfo {
  if (type.isUnion()) {
    return unionRepeatableElementTypeInfo(checker, type.types);
  }

  if (checkerNullishType(checker, type)) {
    return repeatableElementInfo(null, 0, 0, 0, 1);
  }

  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never | ts.TypeFlags.TypeParameter)) !== 0) {
    return repeatableElementInfo((type.flags & ts.TypeFlags.Any) !== 0 ? checker.getAnyType() : null, 0, 0, 1, 0);
  }

  const elementType = checkerDefaultRepeatableElementType(checker, type);
  return elementType == null
    ? repeatableElementInfo(null, 0, 1, 0, 0)
    : repeatableElementInfo(elementType, 1, 0, 0, 0);
}

function repeatableElementTypeInfoCache(
  checker: ts.TypeChecker,
): WeakMap<ts.Type, CheckerRepeatableElementTypeInfo> {
  let cache = repeatableElementInfoByChecker.get(checker);
  if (cache === undefined) {
    // Repeat-source classification can hit the same TypeChecker type from scope construction, diagnostics, and
    // completion. Cache only this small relation, not whole projected shapes; this spends a little checker-epoch memory
    // to avoid repeated TypeChecker relation work without growing the kernel or public query answers.
    cache = new WeakMap();
    repeatableElementInfoByChecker.set(checker, cache);
  }
  return cache;
}

export function checkerRepeatableElementType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const info = checkerRepeatableElementTypeInfo(checker, type);
  return info.unsupportedConstituents === 0 ? info.elementType : null;
}

export function checkerIndexKindForKeyType(type: ts.Type): ts.IndexKind | null {
  if (type.isUnion()) {
    const kinds = new Set(
      type.types
        .filter((constituent) => !checkerNullishType(null, constituent))
        .map((constituent) => checkerIndexKindForKeyType(constituent)),
    );
    kinds.delete(null);
    if (kinds.size === 1) {
      return [...kinds][0] ?? null;
    }
    return null;
  }

  if ((type.flags & ts.TypeFlags.NumberLike) !== 0) {
    return ts.IndexKind.Number;
  }
  if ((type.flags & ts.TypeFlags.StringLike) !== 0) {
    return ts.IndexKind.String;
  }
  return null;
}

export function checkerCollectionSymbolName(type: ts.Type): string | null {
  return type.symbol?.getName() ?? type.aliasSymbol?.getName() ?? null;
}

export function checkerNullishType(
  checker: ts.TypeChecker | null,
  type: ts.Type,
): boolean {
  const flags = type.getFlags();
  return (flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0
    || checker?.typeToString(type) === 'null'
    || checker?.typeToString(type) === 'undefined';
}

export function checkerDefinitelyNullishType(
  checker: ts.TypeChecker | null,
  type: ts.Type,
): boolean {
  if (type.isUnion()) {
    return type.types.length > 0
      && type.types.every((constituent) => checkerDefinitelyNullishType(checker, constituent));
  }
  return checkerNullishType(checker, type);
}

export function checkerTypeShapeIsDefinitelyNullish(
  typeShape: CheckerTypeShape,
): boolean {
  const carrierType = typeShape.carrier?.type ?? null;
  if (carrierType != null) {
    return checkerDefinitelyNullishType(typeShape.carrier?.checker ?? null, carrierType);
  }
  return typeShape.shapeKind === CheckerTypeShapeKind.Primitive
    && (typeShape.display === 'null' || typeShape.display === 'undefined' || typeShape.display === 'void');
}

function checkerIndexValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
  indexKind: ts.IndexKind,
): ts.Type | null {
  if (type.isUnion()) {
    return unionRelatedType(
      checker,
      type.types,
      (constituent) => checkerIndexValueType(checker, constituent, indexKind),
    );
  }
  return checker.getIndexTypeOfType(type, indexKind) ?? null;
}

function unionRepeatableElementTypeInfo(
  checker: ts.TypeChecker,
  types: readonly ts.Type[],
): CheckerRepeatableElementTypeInfo {
  const infos = types.map((type) => checkerRepeatableElementTypeInfo(checker, type));
  const elementTypes = infos
    .map((info) => info.elementType)
    .filter((type): type is ts.Type => type != null);
  return repeatableElementInfo(
    infos.some((info) => info.unsupportedConstituents > 0)
      ? null
      : commonRelatedType(checker, elementTypes),
    sumRepeatableInfo(infos, 'supportedConstituents'),
    sumRepeatableInfo(infos, 'unsupportedConstituents'),
    sumRepeatableInfo(infos, 'openConstituents'),
    sumRepeatableInfo(infos, 'nullishConstituents'),
  );
}

function checkerDefaultRepeatableElementType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  if ((type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) !== 0) {
    return checker.getNumberType();
  }

  const symbolName = checkerCollectionSymbolName(type);
  if (symbolName === 'Array' || symbolName === 'ReadonlyArray') {
    return checker.getTypeArguments(type as ts.TypeReference)[0]
      ?? checkerNumberIndexValueType(checker, type)
      ?? checker.getUnknownType();
  }
  if (symbolName === 'Set' || symbolName === 'ReadonlySet') {
    return checker.getTypeArguments(type as ts.TypeReference)[0] ?? checker.getUnknownType();
  }
  if (symbolName === 'Map' || symbolName === 'ReadonlyMap') {
    // The iterator projector synthesizes [key, value] entries; this predicate only needs to admit Map as a built-in repeat source.
    return checker.getUnknownType();
  }
  if (checker.isTupleType(type) || checker.isArrayType(type)) {
    return checkerNumberIndexValueType(checker, type) ?? checker.getUnknownType();
  }
  return null;
}

function repeatableElementInfo(
  elementType: ts.Type | null,
  supportedConstituents: number,
  unsupportedConstituents: number,
  openConstituents: number,
  nullishConstituents: number,
): CheckerRepeatableElementTypeInfo {
  return {
    elementType,
    supportedConstituents,
    unsupportedConstituents,
    openConstituents,
    nullishConstituents,
  };
}

function sumRepeatableInfo(
  infos: readonly CheckerRepeatableElementTypeInfo[],
  key: keyof Omit<CheckerRepeatableElementTypeInfo, 'elementType'>,
): number {
  return infos.reduce((sum, info) => sum + info[key], 0);
}

function commonRelatedType(
  checker: ts.TypeChecker,
  types: readonly ts.Type[],
): ts.Type | null {
  if (types.length === 0) {
    return null;
  }
  const [first, ...rest] = types;
  return first != null && rest.every((type) => checker.typeToString(type) === checker.typeToString(first))
    ? first
    : null;
}

function unionRelatedType(
  checker: ts.TypeChecker,
  types: readonly ts.Type[],
  read: (type: ts.Type) => ts.Type | null,
): ts.Type | null {
  const related = types
    .filter((type) => !checkerNullishType(checker, type))
    .map(read)
    .filter((type): type is ts.Type => type != null);
  if (related.length === 0) {
    return null;
  }
  const [first, ...rest] = related;
  return first != null && rest.every((type) => checker.typeToString(type) === checker.typeToString(first))
    ? first
    : null;
}

function unionRelatedIndexedValueType(
  checker: ts.TypeChecker,
  types: readonly ts.Type[],
): CheckerIndexedValueType | null {
  const related = types
    .filter((type) => !checkerNullishType(checker, type))
    .map((type) => checkerIndexedValueTypeInfo(checker, type))
    .filter((info): info is CheckerIndexedValueType => info != null);
  if (related.length === 0) {
    return null;
  }
  const [first, ...rest] = related;
  return first != null && rest.every((info) =>
    info.keyKind === first.keyKind
    && checker.typeToString(info.type) === checker.typeToString(first.type)
  )
    ? first
    : null;
}
