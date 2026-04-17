import { relative } from 'node:path';

import * as ts from 'typescript';

import type { ExportFaceKind } from './export-contract.js';

export interface ExportSymbolSemanticScope {
  readonly repoPath: string;
}

export interface ExportSymbolClassification {
  declarationName: string;
  declarationFile: string | null;
  declarationLine: number | null;
  faceKind: ExportFaceKind | 'merged';
  faceKinds: ExportFaceKind[];
  typeExported: boolean;
  valueExported: boolean;
}

export function classifyExportSymbol(
  scope: ExportSymbolSemanticScope,
  checker: ts.TypeChecker,
  exportSymbol: ts.Symbol,
): ExportSymbolClassification {
  const resolvedSymbol = (exportSymbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(exportSymbol)
    : exportSymbol;
  const declarations = resolvedSymbol.declarations ?? exportSymbol.declarations ?? [];

  if (declarations.length === 0) {
    return {
      declarationName: resolvedSymbol.getName(),
      declarationFile: null,
      declarationLine: null,
      faceKind: 'unknown',
      faceKinds: ['unknown'],
      typeExported: (resolvedSymbol.flags & ts.SymbolFlags.Type) !== 0,
      valueExported: (resolvedSymbol.flags & ts.SymbolFlags.Value) !== 0,
    };
  }

  const classified = classifyDeclarations(scope, declarations);
  if (!classified.declarationName) {
    classified.declarationName = resolvedSymbol.getName();
  }
  if (!classified.typeExported && (resolvedSymbol.flags & ts.SymbolFlags.Type) !== 0) {
    classified.typeExported = true;
  }
  if (!classified.valueExported && (resolvedSymbol.flags & ts.SymbolFlags.Value) !== 0) {
    classified.valueExported = true;
  }
  return classified;
}

function classifyDeclarations(
  scope: ExportSymbolSemanticScope,
  declarations: readonly ts.Declaration[],
): ExportSymbolClassification {
  const faceKinds = new Set<ExportFaceKind>();
  let declarationName = '';
  let declarationFile: string | null = null;
  let declarationLine: number | null = null;
  let typeExported = false;
  let valueExported = false;

  const preferredDeclarations = [...declarations].sort((left, right) => {
    const leftIsDeclarationFile = left.getSourceFile().isDeclarationFile ? 1 : 0;
    const rightIsDeclarationFile = right.getSourceFile().isDeclarationFile ? 1 : 0;
    return leftIsDeclarationFile - rightIsDeclarationFile;
  });

  for (const declaration of preferredDeclarations) {
    const faceKind = faceKindForDeclaration(declaration);
    faceKinds.add(faceKind);
    const sourceFile = declaration.getSourceFile();
    const relPath = toRepoRelative(scope, sourceFile.fileName);

    if (!declarationFile && !relPath.startsWith('..')) {
      declarationFile = relPath;
      declarationLine = lineOfNode(sourceFile, declaration);
      const maybeNamed = declaration as ts.NamedDeclaration;
      if (maybeNamed.name && ts.isIdentifier(maybeNamed.name)) {
        declarationName = maybeNamed.name.text;
      }
    }

    if (faceKind === 'interface' || faceKind === 'type-alias') {
      typeExported = true;
      continue;
    }

    if (faceKind === 'class' || faceKind === 'enum') {
      typeExported = true;
      valueExported = true;
      continue;
    }

    if (faceKind === 'function' || faceKind === 'const' || faceKind === 'variable' || faceKind === 'namespace') {
      valueExported = true;
    }
  }

  const orderedFaceKinds = [...faceKinds].sort();
  return {
    declarationName,
    declarationFile,
    declarationLine,
    faceKind: orderedFaceKinds.length > 1
      ? 'merged'
      : (orderedFaceKinds[0] ?? 'unknown'),
    faceKinds: orderedFaceKinds,
    typeExported,
    valueExported,
  };
}

function faceKindForDeclaration(
  node: ts.Declaration,
): ExportFaceKind {
  if (ts.isTypeAliasDeclaration(node)) return 'type-alias';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isModuleDeclaration(node)) return 'namespace';
  if (ts.isVariableDeclaration(node)) {
    const flags = ts.getCombinedNodeFlags(node.parent);
    return (flags & ts.NodeFlags.Const) !== 0 ? 'const' : 'variable';
  }
  return 'unknown';
}

function lineOfNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function toRepoRelative(
  scope: ExportSymbolSemanticScope,
  absPath: string,
): string {
  return toForwardSlash(relative(scope.repoPath, absPath));
}

function toForwardSlash(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}
