import ts from 'typescript';

import { unwrapExpression } from '../evaluation/ts-syntax.js';

export const enum AureliaStyleRegistryCallKind {
  CssModules = 'css-module-call',
  ShadowCss = 'shadow-css-call',
}

interface AureliaStyleRegistryImports {
  readonly cssModulesNames: ReadonlySet<string>;
  readonly shadowCssNames: ReadonlySet<string>;
  readonly runtimeNamespaces: ReadonlySet<string>;
}

const AURELIA_STYLE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

const styleRegistryImportsBySourceFile = new WeakMap<ts.SourceFile, AureliaStyleRegistryImports>();

/** Return the framework style registry call kind for cssModules(...) and shadowCSS(...) calls. */
export function aureliaStyleRegistryCallKind(
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): AureliaStyleRegistryCallKind | null {
  return styleRegistryCallKind(readAureliaStyleRegistryImports(sourceFile), expression);
}

export function aureliaStyleRegistryKeyName(
  kind: AureliaStyleRegistryCallKind,
): string {
  switch (kind) {
    case AureliaStyleRegistryCallKind.CssModules:
      return 'cssModules';
    case AureliaStyleRegistryCallKind.ShadowCss:
      return 'shadowCSS';
  }
}

function readAureliaStyleRegistryImports(
  sourceFile: ts.SourceFile,
): AureliaStyleRegistryImports {
  const cached = styleRegistryImportsBySourceFile.get(sourceFile);
  if (cached !== undefined) {
    return cached;
  }
  const cssModulesNames = new Set<string>();
  const shadowCssNames = new Set<string>();
  const runtimeNamespaces = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!AURELIA_STYLE_MODULES.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      runtimeNamespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (importedName === 'cssModules') {
        cssModulesNames.add(element.name.text);
      } else if (importedName === 'shadowCSS') {
        shadowCssNames.add(element.name.text);
      }
    }
  }
  const imports = {
    cssModulesNames,
    shadowCssNames,
    runtimeNamespaces,
  };
  styleRegistryImportsBySourceFile.set(sourceFile, imports);
  return imports;
}

function styleRegistryCallKind(
  imports: AureliaStyleRegistryImports,
  expression: ts.Expression,
): AureliaStyleRegistryCallKind | null {
  const callee = unwrapExpression(expression);
  if (ts.isIdentifier(callee)) {
    if (imports.cssModulesNames.has(callee.text)) {
      return AureliaStyleRegistryCallKind.CssModules;
    }
    if (imports.shadowCssNames.has(callee.text)) {
      return AureliaStyleRegistryCallKind.ShadowCss;
    }
    return null;
  }
  if (
    ts.isPropertyAccessExpression(callee)
    && ts.isIdentifier(callee.expression)
    && imports.runtimeNamespaces.has(callee.expression.text)
  ) {
    if (callee.name.text === 'cssModules') {
      return AureliaStyleRegistryCallKind.CssModules;
    }
    if (callee.name.text === 'shadowCSS') {
      return AureliaStyleRegistryCallKind.ShadowCss;
    }
  }
  return null;
}
