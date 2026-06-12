import ts from 'typescript';

import { unwrapExpression } from '../evaluation/ts-syntax.js';

const DI_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

export const DI_RESOLVE_WRAPPER_EXPORTS = new Set([
  'all',
  'lazy',
  'optional',
  'factory',
  'own',
  'resource',
  'optionalResource',
  'allResources',
  'newInstanceForScope',
  'newInstanceOf',
]);

export function isAureliaResolveExpression(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return sourceFileImportsLocal(current.getSourceFile(), current.text, 'resolve', DI_MODULES);
  }
  if (!ts.isPropertyAccessExpression(current) || current.name.text !== 'resolve') {
    return false;
  }
  const namespace = unwrapExpression(current.expression);
  return ts.isIdentifier(namespace)
    && sourceFileImportsNamespace(namespace.getSourceFile(), namespace.text, DI_MODULES);
}

export function isAureliaResolveWrapperExpression(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }
  const callee = unwrapExpression(current.expression);
  if (ts.isIdentifier(callee)) {
    return [...DI_RESOLVE_WRAPPER_EXPORTS].some((exportedName) =>
      sourceFileImportsLocal(callee.getSourceFile(), callee.text, exportedName, DI_MODULES)
    );
  }
  if (!ts.isPropertyAccessExpression(callee) || !DI_RESOLVE_WRAPPER_EXPORTS.has(callee.name.text)) {
    return false;
  }
  const namespace = unwrapExpression(callee.expression);
  return ts.isIdentifier(namespace)
    && sourceFileImportsNamespace(namespace.getSourceFile(), namespace.text, DI_MODULES);
}

function sourceFileImportsLocal(
  sourceFile: ts.SourceFile,
  localName: string,
  exportName: string,
  modules: ReadonlySet<string>,
): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    if (!modules.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const named = statement.importClause?.namedBindings;
    if (named == null || !ts.isNamedImports(named)) {
      continue;
    }
    if (named.elements.some((element) =>
      element.name.text === localName
      && (element.propertyName?.text ?? element.name.text) === exportName
    )) {
      return true;
    }
  }
  return false;
}

function sourceFileImportsNamespace(
  sourceFile: ts.SourceFile,
  localName: string,
  modules: ReadonlySet<string>,
): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    if (!modules.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const named = statement.importClause?.namedBindings;
    if (named != null && ts.isNamespaceImport(named) && named.name.text === localName) {
      return true;
    }
  }
  return false;
}
