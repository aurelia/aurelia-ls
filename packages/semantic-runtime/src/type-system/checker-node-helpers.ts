import ts from 'typescript';
import { unwrapExpression } from '../evaluation/ts-syntax.js';

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

/** Read the local value-import declaration of a Program expression before following its alias. */
export function checkerValueImportName(
  expression: ts.Expression,
  checker: ts.TypeChecker,
  modules: ReadonlySet<string>,
): string | null {
  const value = unwrapExpression(expression);
  const namespace = ts.isPropertyAccessExpression(value);
  const identifier = namespace ? unwrapExpression(value.expression) : value;
  if (!ts.isIdentifier(identifier)) return null;
  for (const declaration of checker.getSymbolAtLocation(identifier)?.declarations ?? []) {
    if (!ts.isNamespaceImport(declaration) && !ts.isImportSpecifier(declaration)) continue;
    if (namespace !== ts.isNamespaceImport(declaration)) continue;
    if (ts.isImportSpecifier(declaration) && declaration.isTypeOnly) continue;
    const clause = ts.isNamespaceImport(declaration) ? declaration.parent : declaration.parent.parent;
    const source = clause.parent.moduleSpecifier;
    if (!clause.isTypeOnly && ts.isStringLiteralLike(source) && modules.has(source.text)) {
      if (ts.isImportSpecifier(declaration)) return (declaration.propertyName ?? declaration.name).text;
      if (ts.isPropertyAccessExpression(value)) return value.name.text;
    }
  }
  return null;
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
