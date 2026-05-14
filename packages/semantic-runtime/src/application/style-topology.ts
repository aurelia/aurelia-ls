import path from 'node:path';
import ts from 'typescript';

import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import { SourceFileRole } from '../kernel/address.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type {
  ApplicationStyleAssetKind,
  ApplicationStyleSourceKind,
} from './topology.js';

export interface ApplicationStyleComponentOwner {
  readonly sourcePath: string | null;
  readonly className: string | null;
  readonly elementName: string;
}

export interface ApplicationStyleAssetSite {
  readonly ownerKind: 'component' | 'global';
  readonly ownerSourcePath: string;
  readonly ownerClassName: string | null;
  readonly ownerElementName: string | null;
  readonly assetKind: ApplicationStyleAssetKind;
  readonly sourceKind: ApplicationStyleSourceKind;
  readonly moduleSpecifier: string;
  readonly stylePath: string | null;
  readonly evidenceSourcePath: string;
  readonly start: number;
  readonly end: number;
}

interface CssImportSite {
  readonly source: SourceFileAdmission;
  readonly sourceFile: ts.SourceFile;
  readonly moduleSpecifier: string;
  readonly stylePath: string | null;
  readonly localNames: readonly string[];
  readonly start: number;
  readonly end: number;
}

interface FrameworkStyleImports {
  readonly cssModulesNames: ReadonlySet<string>;
  readonly shadowCssNames: ReadonlySet<string>;
  readonly runtimeNamespaces: ReadonlySet<string>;
}

interface StyleSourceReadContext {
  readonly source: SourceFileAdmission;
  readonly sourceFile: ts.SourceFile;
  readonly owner: StyleOwner;
  readonly imports: readonly CssImportSite[];
  readonly importByLocalName: ReadonlyMap<string, CssImportSite>;
  readonly frameworkImports: FrameworkStyleImports;
  readonly rows: ApplicationStyleAssetSite[];
  readonly seen: Set<string>;
  readonly specializedImportKeys: Set<string>;
}

interface StyleOwner {
  readonly ownerKind: 'component' | 'global';
  readonly ownerSourcePath: string;
  readonly ownerClassName: string | null;
  readonly ownerElementName: string | null;
}

const AURELIA_STYLE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

export function readApplicationStyleAssetSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  componentOwners: readonly ApplicationStyleComponentOwner[],
): readonly ApplicationStyleAssetSite[] {
  const sourceByPath = sourceAdmissionsByNormalizedPath(project.sourceFiles);
  const ownersByPath = componentOwnersByNormalizedPath(componentOwners);
  const rows = project.sourceFiles.flatMap((source) =>
    readSourceStyleAssetSites(source, typeSystem, sourceByPath, ownersByPath)
  );
  return rows.sort((left, right) =>
    left.ownerKind.localeCompare(right.ownerKind)
    || left.ownerSourcePath.localeCompare(right.ownerSourcePath)
    || (left.ownerClassName ?? '').localeCompare(right.ownerClassName ?? '')
    || left.assetKind.localeCompare(right.assetKind)
    || (left.stylePath ?? '').localeCompare(right.stylePath ?? '')
    || left.moduleSpecifier.localeCompare(right.moduleSpecifier)
  );
}

function readSourceStyleAssetSites(
  source: SourceFileAdmission,
  typeSystem: TypeSystemProject,
  sourceByPath: ReadonlyMap<string, SourceFileAdmission>,
  ownersByPath: ReadonlyMap<string, ApplicationStyleComponentOwner>,
): readonly ApplicationStyleAssetSite[] {
  if (source.role !== SourceFileRole.AppSource) {
    return [];
  }
  const sourceFile = typeSystem.readSourceFileByPath(source.path);
  if (sourceFile == null) {
    return [];
  }
  const imports = readCssImports(source, sourceFile, sourceByPath);
  if (imports.length === 0) {
    return [];
  }
  const owner = styleOwnerForSource(source, ownersByPath);
  const context: StyleSourceReadContext = {
    source,
    sourceFile,
    owner,
    imports,
    importByLocalName: cssImportByLocalName(imports),
    frameworkImports: readFrameworkStyleImports(sourceFile),
    rows: [],
    seen: new Set(),
    specializedImportKeys: new Set(),
  };
  visitStyleSource(context, sourceFile);
  for (const cssImport of imports) {
    if (context.specializedImportKeys.has(cssImportKey(cssImport))) {
      continue;
    }
    addStyleAssetSite(context, cssImport, sourceKindForPlainCssImport(cssImport), assetKindForPlainCssImport(owner), cssImport.start, cssImport.end);
  }
  return context.rows;
}

function readCssImports(
  source: SourceFileAdmission,
  sourceFile: ts.SourceFile,
  sourceByPath: ReadonlyMap<string, SourceFileAdmission>,
): readonly CssImportSite[] {
  return sourceFile.statements.flatMap((statement): readonly CssImportSite[] => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      return [];
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    if (!isCssModuleSpecifier(moduleSpecifier)) {
      return [];
    }
    return [{
      source,
      sourceFile,
      moduleSpecifier,
      stylePath: resolveLocalStylePath(source.path, moduleSpecifier, sourceByPath),
      localNames: importLocalNames(statement.importClause),
      start: statement.getStart(sourceFile),
      end: statement.end,
    }];
  });
}

function importLocalNames(importClause: ts.ImportClause | undefined): readonly string[] {
  if (importClause == null) {
    return [];
  }
  const names: string[] = [];
  if (importClause.name != null) {
    names.push(importClause.name.text);
  }
  const namedBindings = importClause.namedBindings;
  if (namedBindings == null) {
    return names;
  }
  if (ts.isNamespaceImport(namedBindings)) {
    names.push(namedBindings.name.text);
  } else {
    for (const element of namedBindings.elements) {
      names.push(element.name.text);
    }
  }
  return names;
}

function readFrameworkStyleImports(sourceFile: ts.SourceFile): FrameworkStyleImports {
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
    const importClause = statement.importClause;
    const namedBindings = importClause?.namedBindings;
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
  return {
    cssModulesNames,
    shadowCssNames,
    runtimeNamespaces,
  };
}

function visitStyleSource(
  context: StyleSourceReadContext,
  node: ts.Node,
): void {
  if (ts.isCallExpression(node)) {
    const callKind = styleCallKind(context.frameworkImports, node.expression);
    if (callKind != null) {
      for (const argument of node.arguments) {
        const cssImport = ts.isIdentifier(argument)
          ? context.importByLocalName.get(argument.text) ?? null
          : null;
        if (cssImport != null) {
          context.specializedImportKeys.add(cssImportKey(cssImport));
          addStyleAssetSite(context, cssImport, callKind, assetKindForStyleCall(callKind), node.getStart(context.sourceFile), node.end);
        } else if (callKind === 'shadow-css-call') {
          addInlineStyleRegistrySite(context, 'shadow-dom-styles', 'shadow-css-call', argument);
        } else {
          addInlineStyleRegistrySite(context, 'css-module-style', 'css-module-call', argument);
        }
      }
    }
  }
  ts.forEachChild(node, (child) => visitStyleSource(context, child));
}

function styleCallKind(
  frameworkImports: FrameworkStyleImports,
  expression: ts.Expression,
): Extract<ApplicationStyleSourceKind, 'css-module-call' | 'shadow-css-call'> | null {
  const callee = unwrapExpression(expression);
  if (ts.isIdentifier(callee)) {
    if (frameworkImports.cssModulesNames.has(callee.text)) {
      return 'css-module-call';
    }
    if (frameworkImports.shadowCssNames.has(callee.text)) {
      return 'shadow-css-call';
    }
    return null;
  }
  if (
    ts.isPropertyAccessExpression(callee)
    && ts.isIdentifier(callee.expression)
    && frameworkImports.runtimeNamespaces.has(callee.expression.text)
  ) {
    if (callee.name.text === 'cssModules') {
      return 'css-module-call';
    }
    if (callee.name.text === 'shadowCSS') {
      return 'shadow-css-call';
    }
  }
  return null;
}

function addInlineStyleRegistrySite(
  context: StyleSourceReadContext,
  assetKind: ApplicationStyleAssetKind,
  sourceKind: ApplicationStyleSourceKind,
  expression: ts.Expression,
): void {
  addStyleAssetSiteFromParts(
    context,
    assetKind,
    sourceKind,
    '',
    null,
    expression.getStart(context.sourceFile),
    expression.end,
  );
}

function addStyleAssetSite(
  context: StyleSourceReadContext,
  cssImport: CssImportSite,
  sourceKind: ApplicationStyleSourceKind,
  assetKind: ApplicationStyleAssetKind,
  start: number,
  end: number,
): void {
  addStyleAssetSiteFromParts(
    context,
    assetKind,
    sourceKind,
    cssImport.moduleSpecifier,
    cssImport.stylePath,
    start,
    end,
  );
}

function addStyleAssetSiteFromParts(
  context: StyleSourceReadContext,
  assetKind: ApplicationStyleAssetKind,
  sourceKind: ApplicationStyleSourceKind,
  moduleSpecifier: string,
  stylePath: string | null,
  start: number,
  end: number,
): void {
  const key = [
    context.owner.ownerKind,
    context.owner.ownerSourcePath,
    context.owner.ownerClassName ?? '',
    assetKind,
    sourceKind,
    moduleSpecifier,
    stylePath ?? '',
    stylePath == null && moduleSpecifier === '' ? `${start}:${end}` : '',
  ].join('\0');
  if (context.seen.has(key)) {
    return;
  }
  context.seen.add(key);
  context.rows.push({
    ...context.owner,
    assetKind,
    sourceKind,
    moduleSpecifier,
    stylePath,
    evidenceSourcePath: context.source.path,
    start,
    end,
  });
}

function cssImportByLocalName(
  imports: readonly CssImportSite[],
): ReadonlyMap<string, CssImportSite> {
  const result = new Map<string, CssImportSite>();
  for (const cssImport of imports) {
    for (const localName of cssImport.localNames) {
      result.set(localName, cssImport);
    }
  }
  return result;
}

function cssImportKey(cssImport: CssImportSite): string {
  return `${cssImport.source.path}\0${cssImport.moduleSpecifier}\0${cssImport.stylePath ?? ''}`;
}

function componentOwnersByNormalizedPath(
  owners: readonly ApplicationStyleComponentOwner[],
): ReadonlyMap<string, ApplicationStyleComponentOwner> {
  const result = new Map<string, ApplicationStyleComponentOwner>();
  for (const owner of owners) {
    if (owner.sourcePath == null) {
      continue;
    }
    result.set(normalizeProjectPath(owner.sourcePath), owner);
  }
  return result;
}

function styleOwnerForSource(
  source: SourceFileAdmission,
  ownersByPath: ReadonlyMap<string, ApplicationStyleComponentOwner>,
): StyleOwner {
  const component = ownersByPath.get(normalizeProjectPath(source.path)) ?? null;
  return component == null
    ? {
      ownerKind: 'global',
      ownerSourcePath: source.path,
      ownerClassName: null,
      ownerElementName: null,
    }
    : {
      ownerKind: 'component',
      ownerSourcePath: component.sourcePath ?? source.path,
      ownerClassName: component.className,
      ownerElementName: component.elementName,
    };
}

function sourceAdmissionsByNormalizedPath(
  sources: readonly SourceFileAdmission[],
): ReadonlyMap<string, SourceFileAdmission> {
  return new Map(sources.map((source) => [normalizeProjectPath(source.path), source]));
}

function resolveLocalStylePath(
  importerPath: string,
  moduleSpecifier: string,
  sourceByPath: ReadonlyMap<string, SourceFileAdmission>,
): string | null {
  const specifier = moduleSpecifier.split(/[?#]/u, 1)[0] ?? moduleSpecifier;
  if (!specifier.startsWith('.')) {
    return null;
  }
  const importerDir = path.posix.dirname(normalizeProjectPath(importerPath));
  const resolved = normalizeProjectPath(path.posix.normalize(path.posix.join(importerDir, specifier)));
  const candidates = stylePathCandidates(resolved);
  for (const candidate of candidates) {
    const source = sourceByPath.get(candidate);
    if (source?.role === SourceFileRole.Style) {
      return source.path;
    }
  }
  return null;
}

function stylePathCandidates(resolved: string): readonly string[] {
  const extension = path.posix.extname(resolved);
  return extension.length > 0
    ? [resolved]
    : [`${resolved}.css`];
}

function isCssModuleSpecifier(moduleSpecifier: string): boolean {
  const specifier = moduleSpecifier.split(/[?#]/u, 1)[0] ?? moduleSpecifier;
  return /\.css$/iu.test(specifier);
}

function sourceKindForPlainCssImport(
  _cssImport: CssImportSite,
): ApplicationStyleSourceKind {
  return 'css-import';
}

function assetKindForPlainCssImport(
  owner: StyleOwner,
): ApplicationStyleAssetKind {
  return owner.ownerKind === 'component'
    ? 'component-stylesheet'
    : 'global-stylesheet';
}

function assetKindForStyleCall(
  sourceKind: Extract<ApplicationStyleSourceKind, 'css-module-call' | 'shadow-css-call'>,
): ApplicationStyleAssetKind {
  return sourceKind === 'css-module-call'
    ? 'css-module-style'
    : 'shadow-dom-styles';
}

function normalizeProjectPath(value: string): string {
  return value.replace(/\\/gu, '/').replace(/^\.\//u, '');
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}
