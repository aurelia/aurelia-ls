import { resolve } from 'node:path';

import * as ts from 'typescript';

import { createLiveQueryKernel } from '../live-query/runtime.js';
import type { PackageExportsSummary } from '../exports-contract.js';
import type { SymbolLocation } from './surface-types.js';

export function createPackageProgram(
  session: ReturnType<typeof createLiveQueryKernel>['session'],
  repoPath: string,
  pkg: PackageExportsSummary,
): ts.Program {
  const entrypointAbs = resolve(repoPath, pkg.analysis_entrypoint);
  const tsconfigPath = session.resolveNearestTsconfig(pkg.package_dir);
  if (!tsconfigPath) {
    return createFallbackProgram(entrypointAbs);
  }

  const loaded = session.tryLoadTsconfig(tsconfigPath);
  if (!loaded.snapshot) {
    return createFallbackProgram(entrypointAbs);
  }

  return session.getProgram(loaded.snapshot.absPath, 'analysis', {
    cache: true,
  }) ?? createFallbackProgram(entrypointAbs);
}

export function createFallbackProgram(
  entrypointAbs: string,
): ts.Program {
  return ts.createProgram(
    [entrypointAbs],
    {
      allowJs: false,
      checkJs: false,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
    },
  );
}

export function getSourceFile(
  program: ts.Program,
  repoPath: string,
  relPath: string,
): ts.SourceFile | null {
  return program.getSourceFile(resolve(repoPath, relPath)) ?? null;
}

export function getModuleSymbol(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): ts.Symbol | null {
  const direct = (sourceFile as ts.SourceFile & { symbol?: ts.Symbol }).symbol;
  return direct ?? checker.getSymbolAtLocation(sourceFile) ?? null;
}

export function resolveAliasedSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

export function unwrapExpression(
  expression: ts.Expression,
): ts.Expression {
  let current = expression;
  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

export function symbolForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  if (ts.isIdentifier(expression)) {
    return checker.getSymbolAtLocation(expression) ?? null;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return checker.getSymbolAtLocation(expression.name)
      ?? checker.getSymbolAtLocation(expression)
      ?? null;
  }
  return null;
}

export function identifierText(
  name: ts.BindingName,
): string | null {
  return ts.isIdentifier(name) ? name.text : null;
}

export function lineOfNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function declarationSite(
  declaration: ts.Declaration,
): SymbolLocation {
  const sourceFile = declaration.getSourceFile();
  let name: string | null = null;
  const namedDeclaration = declaration as ts.NamedDeclaration;
  if (namedDeclaration.name != null && ts.isIdentifier(namedDeclaration.name)) {
    name = namedDeclaration.name.text;
  }

  return {
    name,
    file: toForwardSlash(sourceFile.fileName),
    line: lineOfNode(sourceFile, declaration),
  };
}

export function toRepoRelative(
  session: ReturnType<typeof createLiveQueryKernel>['session'],
  absPath: string,
): string {
  if (!/^(?:[a-zA-Z]:[\\/]|\/)/.test(absPath)) {
    return toForwardSlash(absPath);
  }
  const normalizedAbsPath = resolve(absPath.replace(/\//g, '\\'));
  const relPath = session.toRepoRelative(normalizedAbsPath);
  return relPath.startsWith('..') ? toForwardSlash(normalizedAbsPath) : relPath;
}

export function toForwardSlash(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}

export function hasExportModifier(
  node: ts.Node,
): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

export function isStaticNamedMember(
  member: ts.ClassElement,
  name: string,
): boolean {
  return ('name' in member)
    && member.name != null
    && ts.isIdentifier(member.name)
    && member.name.text === name
    && (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0;
}

export function firstReturnedExpression(
  block: ts.Block,
): ts.Expression | null {
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) {
      return statement.expression;
    }
  }
  return null;
}

export function collectPackageSourceFiles(
  program: ts.Program,
  session: ReturnType<typeof createLiveQueryKernel>['session'],
  packageDir: string,
): readonly ts.SourceFile[] {
  const prefix = `${toForwardSlash(packageDir)}/`;
  return program.getSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile)
    .filter((sourceFile) => {
      const repoRelative = toRepoRelative(session, sourceFile.fileName);
      return repoRelative === packageDir || repoRelative.startsWith(prefix);
    })
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

export function findValueDeclaration(
  symbol: ts.Symbol,
): ts.Declaration | null {
  for (const declaration of symbol.declarations ?? []) {
    if (
      ts.isVariableDeclaration(declaration)
      || ts.isBindingElement(declaration)
      || ts.isFunctionDeclaration(declaration)
    ) {
      return declaration;
    }
  }
  return null;
}
