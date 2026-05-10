import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { isImportedAureliaExpression } from '../evaluation/ts-syntax.js';
import { SourceFileRole } from '../kernel/address.js';
import type { ProjectBootFrame } from './frames.js';
import {
  type BootPackageManifest,
  readPackageManifest,
} from './host-files.js';

export const enum SemanticProjectShapeKind {
  AureliaApp = 'aurelia-app',
  AureliaResourceLibrary = 'aurelia-resource-library',
  AureliaPackage = 'aurelia-package',
  NonAurelia = 'non-aurelia',
}

export const enum SemanticProjectAureliaDependencyScope {
  Dependencies = 'dependencies',
  PeerDependencies = 'peerDependencies',
  DevDependencies = 'devDependencies',
}

export const enum SemanticProjectAureliaSourceSignalKind {
  AureliaImport = 'aurelia-import',
  AureliaNamespaceImport = 'aurelia-namespace-import',
  AureliaConstructor = 'aurelia-constructor',
  AureliaAppCall = 'aurelia-app-call',
  AureliaEnhanceCall = 'aurelia-enhance-call',
  AureliaRegisterCall = 'aurelia-register-call',
}

export interface SemanticProjectAureliaDependencyScopeCount {
  readonly scope: SemanticProjectAureliaDependencyScope;
  readonly count: number;
}

export interface SemanticProjectAureliaSourceSignalCount {
  readonly signal: SemanticProjectAureliaSourceSignalKind;
  readonly count: number;
}

export interface SemanticProjectShape {
  readonly shapeKind: SemanticProjectShapeKind;
  readonly aureliaDependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[];
  readonly aureliaSourceSignals: readonly SemanticProjectAureliaSourceSignalCount[];
}

const AURELIA_PACKAGE_NAMES = new Set([
  'aurelia',
]);

const AURELIA_FACADE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

export function readSemanticProjectShape(project: ProjectBootFrame): SemanticProjectShape {
  const dependencyScopes = aureliaDependencyScopes(readPackageManifest(project.rootDir));
  const sourceSignals = aureliaSourceSignals(project);
  return {
    shapeKind: bootProjectShapeKind(project, dependencyScopes, sourceSignals),
    aureliaDependencyScopes: dependencyScopes,
    aureliaSourceSignals: sourceSignals,
  };
}

function bootProjectShapeKind(
  project: ProjectBootFrame,
  dependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[],
  sourceSignals: readonly SemanticProjectAureliaSourceSignalCount[],
): SemanticProjectShapeKind {
  const hasAureliaSignal = dependencyScopes.length > 0 || sourceSignals.length > 0;
  if (
    countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaAppCall) > 0
    || countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaEnhanceCall) > 0
    || countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaConstructor) > 0
  ) {
    return SemanticProjectShapeKind.AureliaApp;
  }
  if (hasAureliaSignal && projectHasResourceLibraryShape(project)) {
    return SemanticProjectShapeKind.AureliaResourceLibrary;
  }
  return hasAureliaSignal
    ? SemanticProjectShapeKind.AureliaPackage
    : SemanticProjectShapeKind.NonAurelia;
}

function projectHasResourceLibraryShape(project: ProjectBootFrame): boolean {
  return project.sourceFiles.some((source) =>
    source.role === SourceFileRole.Template
    || source.role === SourceFileRole.Style
  );
}

function aureliaDependencyScopes(
  manifest: BootPackageManifest | null,
): readonly SemanticProjectAureliaDependencyScopeCount[] {
  if (manifest == null) {
    return [];
  }
  return [
    dependencyScopeCount(SemanticProjectAureliaDependencyScope.Dependencies, manifest.dependencies),
    dependencyScopeCount(SemanticProjectAureliaDependencyScope.PeerDependencies, manifest.peerDependencies),
    dependencyScopeCount(SemanticProjectAureliaDependencyScope.DevDependencies, manifest.devDependencies),
  ].filter((entry): entry is SemanticProjectAureliaDependencyScopeCount => entry != null);
}

function dependencyScopeCount(
  scope: SemanticProjectAureliaDependencyScope,
  value: unknown,
): SemanticProjectAureliaDependencyScopeCount | null {
  const entries = value != null && typeof value === 'object'
    ? Object.keys(value)
    : [];
  const count = entries.filter(isAureliaPackageSpecifier).length;
  return count === 0 ? null : { scope, count };
}

function isAureliaPackageSpecifier(specifier: string): boolean {
  return AURELIA_PACKAGE_NAMES.has(specifier) || specifier.startsWith('@aurelia/');
}

function aureliaSourceSignals(project: ProjectBootFrame): readonly SemanticProjectAureliaSourceSignalCount[] {
  const counts = new Map<SemanticProjectAureliaSourceSignalKind, number>();
  for (const source of project.sourceFiles) {
    if (source.role !== SourceFileRole.AppSource) {
      continue;
    }
    const text = readSourceText(project.rootDir, source.path);
    if (text == null) {
      continue;
    }
    countSourceFileSignals(counts, source.path, text);
  }
  return [...counts.entries()]
    .map(([signal, count]) => ({ signal, count }));
}

function readSourceText(
  rootDir: string,
  sourcePath: string,
): string | null {
  try {
    return readFileSync(path.join(rootDir, sourcePath), 'utf8');
  } catch {
    return null;
  }
}

function countSourceFileSignals(
  counts: Map<SemanticProjectAureliaSourceSignalKind, number>,
  sourcePath: string,
  text: string,
): void {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(sourcePath),
  );
  const bindings = new SourceAureliaBindings();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      readAureliaImportBindings(statement, bindings, counts);
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer != null && ts.isIdentifier(node.name)) {
      if (isAureliaFacadeValue(node.initializer, bindings)) {
        bindings.aureliaInstances.add(node.name.text);
      }
    }
    if (ts.isNewExpression(node) && isImportedAureliaExpression(node.expression, bindings)) {
      incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaConstructor);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      countAureliaAppActivationSignal(counts, method, node.expression.expression, bindings);
      if (method === 'register' && isAureliaFacadeValue(node.expression.expression, bindings)) {
        incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaRegisterCall);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

function countAureliaAppActivationSignal(
  counts: Map<SemanticProjectAureliaSourceSignalKind, number>,
  method: string,
  receiver: ts.Expression,
  bindings: SourceAureliaBindings,
): void {
  if (!isAureliaFacadeValue(receiver, bindings)) {
    return;
  }
  if (method === 'app') {
    incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaAppCall);
  }
  if (method === 'enhance') {
    incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaEnhanceCall);
  }
}

class SourceAureliaBindings {
  readonly aureliaIdentifiers = new Set<string>();
  readonly aureliaNamespaces = new Set<string>();
  readonly aureliaInstances = new Set<string>();
}

function readAureliaImportBindings(
  statement: ts.ImportDeclaration,
  bindings: SourceAureliaBindings,
  counts: Map<SemanticProjectAureliaSourceSignalKind, number>,
): void {
  const specifier = stringLiteralText(statement.moduleSpecifier);
  if (specifier == null || !AURELIA_FACADE_MODULES.has(specifier)) {
    return;
  }
  const defaultImport = statement.importClause?.name ?? null;
  if (defaultImport != null) {
    bindings.aureliaIdentifiers.add(defaultImport.text);
    incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaImport);
  }
  const namedBindings = statement.importClause?.namedBindings ?? null;
  if (namedBindings == null) {
    return;
  }
  if (ts.isNamespaceImport(namedBindings)) {
    bindings.aureliaNamespaces.add(namedBindings.name.text);
    incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaNamespaceImport);
    return;
  }
  for (const element of namedBindings.elements) {
    const importedName = element.propertyName?.text ?? element.name.text;
    if (importedName === 'Aurelia') {
      bindings.aureliaIdentifiers.add(element.name.text);
      incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaImport);
    }
  }
}

function isAureliaFacadeValue(
  expression: ts.Expression,
  bindings: SourceAureliaBindings,
): boolean {
  const current = unwrapParentheses(expression);
  if (isImportedAureliaExpression(current, bindings)) {
    return true;
  }
  if (ts.isIdentifier(current) && bindings.aureliaInstances.has(current.text)) {
    return true;
  }
  if (ts.isNewExpression(current)) {
    return isImportedAureliaExpression(current.expression, bindings);
  }
  return ts.isCallExpression(current)
    && ts.isPropertyAccessExpression(current.expression)
    && (
      current.expression.name.text === 'register'
      || current.expression.name.text === 'app'
      || current.expression.name.text === 'enhance'
    )
    && isAureliaFacadeValue(current.expression.expression, bindings);
}

function unwrapParentheses(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function stringLiteralText(node: ts.Node): string | null {
  return ts.isStringLiteralLike(node) ? node.text : null;
}

function scriptKindForPath(sourcePath: string): ts.ScriptKind {
  const extension = path.extname(sourcePath).toLowerCase();
  if (extension === '.tsx') {
    return ts.ScriptKind.TSX;
  }
  if (extension === '.jsx') {
    return ts.ScriptKind.JSX;
  }
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function incrementSignal(
  counts: Map<SemanticProjectAureliaSourceSignalKind, number>,
  signal: SemanticProjectAureliaSourceSignalKind,
): void {
  counts.set(signal, (counts.get(signal) ?? 0) + 1);
}

function countSourceSignals(
  counts: readonly SemanticProjectAureliaSourceSignalCount[],
  signal: SemanticProjectAureliaSourceSignalKind,
): number {
  return counts.find((entry) => entry.signal === signal)?.count ?? 0;
}
