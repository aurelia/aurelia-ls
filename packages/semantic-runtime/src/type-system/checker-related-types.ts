import ts from 'typescript';

export function checkerStringIndexValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  return checker.getIndexTypeOfType(type, ts.IndexKind.String) ?? null;
}

export function checkerNumberIndexValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  return checker.getIndexTypeOfType(type, ts.IndexKind.Number) ?? null;
}

export function checkerIndexedValueType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  return checkerStringIndexValueType(checker, type)
    ?? checkerNumberIndexValueType(checker, type);
}

export function checkerIterableElementType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
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

export function checkerCollectionSymbolName(type: ts.Type): string | null {
  return type.symbol?.getName() ?? type.aliasSymbol?.getName() ?? null;
}

export function checkerNullishType(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  const flags = type.getFlags();
  return (flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0
    || checker.typeToString(type) === 'null'
    || checker.typeToString(type) === 'undefined';
}
