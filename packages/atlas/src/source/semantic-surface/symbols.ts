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
  if (ts.isPropertyAccessExpression(expression)) {
    return symbolForNode(checker, expression.name) ?? symbolForNode(checker, expression);
  }
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    const key = checker.getTypeAtLocation(expression.argumentExpression);
    if (key.isStringLiteral() || key.isNumberLiteral()) {
      const member = checker.getPropertyOfType(checker.getTypeAtLocation(expression.expression), String(key.value));
      if (member !== undefined) return resolveAlias(checker, member);
    }
  }
  return symbolForNode(checker, expression);
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
