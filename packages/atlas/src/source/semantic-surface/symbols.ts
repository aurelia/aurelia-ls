import ts from "typescript";

import { declarationNameNode } from "./ast.js";

export function symbolForDeclaration(
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
): ts.Symbol | null {
  const name = declarationNameNode(declaration);
  const symbol = name === undefined
    ? checker.getSymbolAtLocation(declaration)
    : checker.getSymbolAtLocation(name) ?? checker.getSymbolAtLocation(declaration);
  return symbol === undefined ? null : resolveAlias(checker, symbol);
}

export function symbolForNode(
  checker: ts.TypeChecker,
  node: ts.Node,
): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(node);
  return symbol === undefined ? null : resolveAlias(checker, symbol);
}

export function symbolForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  return symbolForNode(checker, expression);
}

export function symbolForExpressionName(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  const symbolNode = ts.isPropertyAccessExpression(expression)
    ? expression.name
    : ts.isElementAccessExpression(expression) &&
        expression.argumentExpression !== undefined
      ? expression.argumentExpression
    : expression;
  const symbol =
    checker.getSymbolAtLocation(symbolNode) ??
    checker.getSymbolAtLocation(expression);
  return symbol === undefined ? null : resolveAlias(checker, symbol);
}

export function resolveAlias(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
}

export function symbolKeyForSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): string | null {
  try {
    return checker.getFullyQualifiedName(symbol);
  } catch {
    return symbol.getName();
  }
}

export function canonicalSourceSymbolKey(key: string): string {
  return key
    .replace(/\\/gu, "/")
    .replace("/dist/types/", "/src/")
    .replace(/\.d(?=["'])/gu, "");
}
