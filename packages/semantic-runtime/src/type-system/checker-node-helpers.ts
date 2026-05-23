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
