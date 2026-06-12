import ts from 'typescript';

import { normalizeTypeSystemSourceFileName } from './source-path-index.js';

export type FrameworkDeclarationSourcePathIndex = ReadonlyMap<string, string>;

export interface FrameworkDeclarationSourceSpec {
  readonly names: ReadonlySet<string>;
  readonly sourcePathFragments: readonly string[];
}

/** Match a checker symbol against framework-owned declaration sources rather than local lookalike names. */
export function symbolMatchesFrameworkDeclarationSource(
  symbol: ts.Symbol | null | undefined,
  checker: ts.TypeChecker,
  sourcePathByFileName: FrameworkDeclarationSourcePathIndex,
  spec: FrameworkDeclarationSourceSpec,
): boolean {
  if (symbol == null) {
    return false;
  }
  const resolved = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  if (!spec.names.has(resolved.getName())) {
    return false;
  }
  return (resolved.declarations ?? []).some((declaration) =>
    declarationMatchesFrameworkSource(declaration, sourcePathByFileName, spec.sourcePathFragments)
  );
}

/** Match a checker type against framework-owned declaration sources rather than structural shape alone. */
export function typeMatchesFrameworkDeclarationSource(
  type: ts.Type | null | undefined,
  checker: ts.TypeChecker,
  sourcePathByFileName: FrameworkDeclarationSourcePathIndex,
  spec: FrameworkDeclarationSourceSpec,
): boolean {
  if (type == null) {
    return false;
  }
  if (type.isUnionOrIntersection()) {
    return type.types.some((part) =>
      typeMatchesFrameworkDeclarationSource(part, checker, sourcePathByFileName, spec)
    );
  }
  const apparent = checker.getApparentType(type);
  return symbolMatchesFrameworkDeclarationSource(type.symbol, checker, sourcePathByFileName, spec)
    || symbolMatchesFrameworkDeclarationSource(type.aliasSymbol, checker, sourcePathByFileName, spec)
    || symbolMatchesFrameworkDeclarationSource(apparent.symbol, checker, sourcePathByFileName, spec)
    || symbolMatchesFrameworkDeclarationSource(apparent.aliasSymbol, checker, sourcePathByFileName, spec);
}

export function declarationMatchesFrameworkSource(
  declaration: ts.Declaration,
  sourcePathByFileName: FrameworkDeclarationSourcePathIndex,
  sourcePathFragments: readonly string[],
): boolean {
  const sourceFileName = normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName);
  const projectSourcePath = sourcePathByFileName.get(sourceFileName) ?? sourceFileName;
  const normalized = projectSourcePath.replace(/\\/g, '/');
  return sourcePathFragments.some((fragment) => normalized.includes(fragment));
}
