import ts from 'typescript';

import { normalizeTypeSystemSourceFileName } from './source-path-index.js';

export type FrameworkDeclarationSourcePathIndex = ReadonlyMap<string, string>;

export interface FrameworkDeclarationSourceSpec {
  readonly names: ReadonlySet<string>;
  readonly sourcePathFragments: readonly string[];
  readonly packageNames?: readonly string[];
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
    declarationMatchesFrameworkSource(declaration, sourcePathByFileName, spec)
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

/** Match a checker type or an explicitly declared heritage type against a framework-owned declaration. */
export function typeOrHeritageMatchesFrameworkDeclarationSource(
  type: ts.Type | null | undefined,
  checker: ts.TypeChecker,
  sourcePathByFileName: FrameworkDeclarationSourcePathIndex,
  spec: FrameworkDeclarationSourceSpec,
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (type == null || seen.has(type)) {
    return false;
  }
  seen.add(type);
  if (typeMatchesFrameworkDeclarationSource(type, checker, sourcePathByFileName, spec)) {
    return true;
  }
  const apparent = checker.getApparentType(type);
  const declarations = uniqueDeclarations([
    ...(type.symbol?.declarations ?? []),
    ...(type.aliasSymbol?.declarations ?? []),
    ...(apparent.symbol?.declarations ?? []),
    ...(apparent.aliasSymbol?.declarations ?? []),
  ]);
  return declarations.some((declaration) => heritageTypesForDeclaration(declaration).some((heritageType) =>
    typeOrHeritageMatchesFrameworkDeclarationSource(
      checker.getTypeAtLocation(heritageType),
      checker,
      sourcePathByFileName,
      spec,
      seen,
    )
  ));
}

export function declarationMatchesFrameworkSource(
  declaration: ts.Declaration,
  sourcePathByFileName: FrameworkDeclarationSourcePathIndex,
  specOrSourcePathFragments: FrameworkDeclarationSourceSpec | readonly string[],
): boolean {
  const sourceFileName = normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName);
  const projectSourcePath = sourcePathByFileName.get(sourceFileName) ?? sourceFileName;
  const normalized = projectSourcePath.replace(/\\/g, '/');
  const sourcePathFragments: readonly string[] = 'names' in specOrSourcePathFragments
    ? specOrSourcePathFragments.sourcePathFragments
    : specOrSourcePathFragments;
  const packageNames: readonly string[] = 'names' in specOrSourcePathFragments
    ? specOrSourcePathFragments.packageNames ?? []
    : [];
  return sourcePathFragments.some((fragment) => normalized.includes(fragment))
    || packageNames.some((packageName) => pathContainsNodeModulePackage(normalized, packageName));
}

export function frameworkDeclarationSourceSpec(
  names: ReadonlySet<string>,
  packageNames: readonly string[],
  sourcePathFragments: readonly string[],
): FrameworkDeclarationSourceSpec {
  return {
    names,
    packageNames,
    sourcePathFragments,
  };
}

function pathContainsNodeModulePackage(
  normalized: string,
  packageName: string,
): boolean {
  const packageRoot = `/node_modules/${packageName}`;
  return normalized.endsWith(packageRoot)
    || normalized.includes(`${packageRoot}/`);
}

function heritageTypesForDeclaration(
  declaration: ts.Declaration,
): readonly ts.ExpressionWithTypeArguments[] {
  if (
    !ts.isClassDeclaration(declaration)
    && !ts.isClassExpression(declaration)
    && !ts.isInterfaceDeclaration(declaration)
  ) {
    return [];
  }
  return declaration.heritageClauses?.flatMap((clause) => clause.types) ?? [];
}

function uniqueDeclarations(
  declarations: readonly ts.Declaration[],
): readonly ts.Declaration[] {
  return [...new Set(declarations)];
}
