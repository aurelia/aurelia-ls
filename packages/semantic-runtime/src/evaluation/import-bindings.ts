import ts from 'typescript';

import {
  unwrapExpression,
} from './ts-syntax.js';

export interface SourceImportBindings {
  readonly locals: ReadonlyMap<string, string>;
  readonly namespaces: ReadonlySet<string>;
}

/** Read named and namespace imports for a bounded module/export set. */
export function readSourceImportBindings(
  sourceFile: ts.SourceFile,
  moduleSpecifiers: ReadonlySet<string>,
  exportedNames: ReadonlySet<string>,
): SourceImportBindings {
  const locals = new Map<string, string>();
  const namespaces = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    if (!moduleSpecifiers.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings ?? null;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      namespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      const exportedName = element.propertyName?.text ?? element.name.text;
      if (exportedNames.has(exportedName)) {
        locals.set(element.name.text, exportedName);
      }
    }
  }
  return {
    locals,
    namespaces,
  };
}

/** Resolve an identifier or namespace-property expression back to one of the imported export names. */
export function readImportedExportName(
  expression: ts.Expression,
  bindings: SourceImportBindings,
  bareAllowedExports: ReadonlySet<string> | true,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    const exportedName = bindings.locals.get(current.text) ?? null;
    return exportedName != null && (bareAllowedExports === true || bareAllowedExports.has(exportedName))
      ? exportedName
      : null;
  }
  if (
    ts.isPropertyAccessExpression(current)
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.namespaces.has((unwrapExpression(current.expression) as ts.Identifier).text)
    && (bareAllowedExports === true || bareAllowedExports.has(current.name.text))
  ) {
    return current.name.text;
  }
  return null;
}

/** Check whether a type annotation refers to one of the imported export names, including qualified namespace types. */
export function typeNodeReferencesImportedExport(
  typeNode: ts.TypeNode | null,
  bindings: SourceImportBindings,
  allowedExports: ReadonlySet<string>,
): boolean {
  if (typeNode == null) {
    return false;
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName;
    if (ts.isIdentifier(typeName)) {
      const exportedName = bindings.locals.get(typeName.text) ?? null;
      return exportedName != null && allowedExports.has(exportedName);
    }
    return ts.isQualifiedName(typeName)
      && ts.isIdentifier(typeName.left)
      && bindings.namespaces.has(typeName.left.text)
      && allowedExports.has(typeName.right.text);
  }
  return typeNode.forEachChild((child) =>
    ts.isTypeNode(child) && typeNodeReferencesImportedExport(child, bindings, allowedExports)
  ) === true;
}
