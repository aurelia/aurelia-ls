import ts from 'typescript';

export function resolveAliasedSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

export function symbolForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(expression);
  return symbol == null
    ? null
    : resolveAliasedSymbol(checker, symbol);
}

export function firstSymbolDeclaration(symbol: ts.Symbol): ts.Declaration | null {
  return symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
}

/** Resolve a property symbol through the declared type first, then TypeScript's apparent-type surface. */
export function checkerPropertySymbol(
  checker: ts.TypeChecker,
  type: ts.Type,
  propertyName: string,
): ts.Symbol | null {
  return checker.getPropertyOfType(type, propertyName)
    ?? checker.getPropertyOfType(checker.getApparentType(type), propertyName)
    ?? null;
}

/** Read the value type of a symbol at its first declaration, with an optional caller-owned fallback location. */
export function checkerSymbolValueType(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  fallbackLocation: ts.Node | null = null,
): ts.Type | null {
  const declaration = firstSymbolDeclaration(symbol) ?? fallbackLocation;
  return declaration == null
    ? null
    : checker.getTypeOfSymbolAtLocation(symbol, declaration);
}
