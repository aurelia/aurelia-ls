import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { SourceFileRef } from '../refs.js';
import { guessScriptKind } from './ts-ast-helpers.js';

export interface ImportedBinding {
  readonly moduleSpecifier: string;
  readonly exportName: string;
}

export interface ForwardedExport {
  readonly moduleSpecifier: string;
  readonly exportName: string;
}

export function readParsedSourceFile(
  cache: Map<string, ts.SourceFile | null>,
  file: SourceFileRef,
): ts.SourceFile | null {
  const resolvedPath = path.isAbsolute(file.path)
    ? file.path
    : path.join(file.program.repoRoot, file.path);
  const normalized = resolvedPath.replace(/\\/g, '/');
  const cached = cache.get(normalized);
  if (cached !== undefined) {
    return cached;
  }

  if (!fs.existsSync(resolvedPath)) {
    cache.set(normalized, null);
    return null;
  }

  const text = fs.readFileSync(resolvedPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    resolvedPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    guessScriptKind(resolvedPath),
  );
  cache.set(normalized, sourceFile);
  return sourceFile;
}

export function resolveImportedSourceFile(
  from: SourceFileRef,
  moduleSpecifier: string,
): SourceFileRef | null {
  const fromPath = path.isAbsolute(from.path)
    ? from.path
    : path.join(from.program.repoRoot, from.path);
  const candidateBase = path.resolve(path.dirname(fromPath), moduleSpecifier);
  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    path.join(candidateBase, 'index.ts'),
    path.join(candidateBase, 'index.tsx'),
    path.join(candidateBase, 'index.js'),
    path.join(candidateBase, 'index.jsx'),
  ];

  for (const current of candidates) {
    if (!fs.existsSync(current)) {
      continue;
    }

    const normalized = path.relative(from.program.repoRoot, current).replace(/\\/g, '/');
    return new SourceFileRef(
      `file:${normalized}`,
      from.program,
      normalized,
    );
  }

  return null;
}

export function findImportedBinding(
  sourceFile: ts.SourceFile,
  localName: string,
): ImportedBinding | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const clause = statement.importClause;
    if (clause == null) {
      continue;
    }

    if (clause.name?.text === localName) {
      return {
        moduleSpecifier: statement.moduleSpecifier.text,
        exportName: 'default',
      };
    }

    const bindings = clause.namedBindings;
    if (bindings != null && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.name.text !== localName) {
          continue;
        }

        return {
          moduleSpecifier: statement.moduleSpecifier.text,
          exportName: element.propertyName?.text ?? element.name.text,
        };
      }
    }
  }

  return null;
}

export function findTopLevelBinding(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Declaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
          return declaration;
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement))
      && statement.name?.text === name
    ) {
      return statement;
    }
  }

  return null;
}

export function findExportedBinding(
  sourceFile: ts.SourceFile,
  exportName: string,
): ts.Declaration | null {
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
          return declaration;
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement))
      && statement.name?.text === exportName
    ) {
      return statement;
    }
  }

  return null;
}

export function findForwardedExport(
  sourceFile: ts.SourceFile,
  exportName: string,
): ForwardedExport | null {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement)
      || statement.exportClause == null
      || !ts.isNamedExports(statement.exportClause)
      || statement.moduleSpecifier == null
      || !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }

    for (const element of statement.exportClause.elements) {
      if (element.name.text !== exportName) {
        continue;
      }

      return {
        moduleSpecifier: statement.moduleSpecifier.text,
        exportName: element.propertyName?.text ?? element.name.text,
      };
    }
  }

  return null;
}

export function hasExportModifier(
  node: ts.Node,
): boolean {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  return modifiers?.some((current) => current.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

export function isRelativeModuleSpecifier(
  moduleSpecifier: string,
): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

export function normalizeSourceFilePath(
  file: SourceFileRef,
): string {
  return file.path.replace(/\\/g, '/');
}
