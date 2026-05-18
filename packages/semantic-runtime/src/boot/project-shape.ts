import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { isImportedAureliaExpression } from '../evaluation/ts-syntax.js';
import { SourceFileRole } from '../kernel/address.js';
import type { ProjectBootFrame } from './frames.js';
import {
  type BootPackageManifest,
  readPackageManifest,
  readPackageWorkspacePatterns,
  isHostPathWithin,
  normalizePosixPath,
  sameHostPath,
} from './host-files.js';

export const enum SemanticProjectShapeKind {
  AureliaApp = 'aurelia-app',
  AureliaResourceLibrary = 'aurelia-resource-library',
  AureliaPackage = 'aurelia-package',
  NonAurelia = 'non-aurelia',
}

export const enum SemanticProjectAnalysisKind {
  /** Project can be opened as a real app-world because it has Aurelia bootstrap signals. */
  AppWorld = 'app-world',
  /** Project is useful for standalone resource/template authoring, but is not itself an app root. */
  ResourceLibraryAuthoring = 'resource-library-authoring',
  /** Project is Aurelia-adjacent package surface; inspect it as package/API input, not as an app. */
  AureliaPackageInspection = 'aurelia-package-inspection',
  /** Project is outside the current Aurelia semantic-runtime app analysis policy. */
  OutsideAurelia = 'outside-aurelia',
}

export const enum SemanticProjectAureliaDependencyScope {
  Dependencies = 'dependencies',
  PeerDependencies = 'peerDependencies',
  DevDependencies = 'devDependencies',
}

export const enum SemanticProjectAureliaDependencyOrigin {
  /** Aurelia dependency was declared by the project frame's own package manifest. */
  ProjectManifest = 'project-manifest',
  /** Aurelia dependency was declared by an ancestor package manifest whose workspaces include the project frame. */
  WorkspaceManifest = 'workspace-manifest',
}

export const enum SemanticProjectAureliaSourceSignalKind {
  AureliaImport = 'aurelia-import',
  AureliaNamespaceImport = 'aurelia-namespace-import',
  AureliaConstructor = 'aurelia-constructor',
  AureliaAppCall = 'aurelia-app-call',
  AureliaEnhanceCall = 'aurelia-enhance-call',
  AureliaRegisterCall = 'aurelia-register-call',
}

export const enum SemanticProjectShapeReasonKind {
  /** Local or workspace manifest declares at least one Aurelia package dependency. */
  AureliaDependency = 'aurelia-dependency',
  /** Ancestor workspace manifest declares Aurelia dependencies and includes this project frame. */
  WorkspaceAureliaContext = 'workspace-aurelia-context',
  /** Source contains `new Aurelia(...)`, `.app(...)`, or `.enhance(...)` activation evidence. */
  AureliaActivationSource = 'aurelia-activation-source',
  /** Source contains Aurelia facade imports or registration calls but no activation evidence. */
  AureliaPackageSource = 'aurelia-package-source',
  /** Admitted source roles include HTML or CSS files that can carry Aurelia resource authoring pressure. */
  ResourceSurfaceSourceFile = 'resource-surface-source-file',
}

export interface SemanticProjectAureliaDependencyScopeCount {
  readonly scope: SemanticProjectAureliaDependencyScope;
  readonly origin: SemanticProjectAureliaDependencyOrigin;
  readonly count: number;
}

export interface SemanticProjectAureliaSourceSignalCount {
  readonly signal: SemanticProjectAureliaSourceSignalKind;
  readonly count: number;
}

export interface SemanticProjectShapeReasonCount {
  readonly reason: SemanticProjectShapeReasonKind;
  readonly count: number;
}

export interface SemanticProjectShape {
  readonly shapeKind: SemanticProjectShapeKind;
  readonly analysisKind: SemanticProjectAnalysisKind;
  readonly aureliaDependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[];
  readonly aureliaSourceSignals: readonly SemanticProjectAureliaSourceSignalCount[];
  readonly shapeReasons: readonly SemanticProjectShapeReasonCount[];
}

const AURELIA_PACKAGE_NAMES = new Set([
  'aurelia',
]);

const AURELIA_FACADE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

export function readSemanticProjectShape(project: ProjectBootFrame): SemanticProjectShape {
  const dependencyScopes = [
    ...aureliaDependencyScopes(
      readPackageManifest(project.rootDir),
      SemanticProjectAureliaDependencyOrigin.ProjectManifest,
    ),
    ...workspaceAureliaDependencyScopes(project),
  ];
  const sourceSignals = aureliaSourceSignals(project);
  const shapeKind = bootProjectShapeKind(project, dependencyScopes, sourceSignals);
  return {
    shapeKind,
    analysisKind: semanticProjectAnalysisKindForShape(shapeKind),
    aureliaDependencyScopes: dependencyScopes,
    aureliaSourceSignals: sourceSignals,
    shapeReasons: projectShapeReasons(project, dependencyScopes, sourceSignals),
  };
}

export function semanticProjectAnalysisKindForShape(
  shapeKind: SemanticProjectShapeKind,
): SemanticProjectAnalysisKind {
  switch (shapeKind) {
    case SemanticProjectShapeKind.AureliaApp:
      return SemanticProjectAnalysisKind.AppWorld;
    case SemanticProjectShapeKind.AureliaResourceLibrary:
      return SemanticProjectAnalysisKind.ResourceLibraryAuthoring;
    case SemanticProjectShapeKind.AureliaPackage:
      return SemanticProjectAnalysisKind.AureliaPackageInspection;
    case SemanticProjectShapeKind.NonAurelia:
      return SemanticProjectAnalysisKind.OutsideAurelia;
  }
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
  return countResourceSurfaceSourceFiles(project) > 0;
}

function projectShapeReasons(
  project: ProjectBootFrame,
  dependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[],
  sourceSignals: readonly SemanticProjectAureliaSourceSignalCount[],
): readonly SemanticProjectShapeReasonCount[] {
  const counts = new Map<SemanticProjectShapeReasonKind, number>();
  const aureliaDependencyCount = dependencyScopes.reduce((sum, entry) => sum + entry.count, 0);
  if (aureliaDependencyCount > 0) {
    counts.set(SemanticProjectShapeReasonKind.AureliaDependency, aureliaDependencyCount);
  }
  const workspaceDependencyCount = dependencyScopes
    .filter((entry) => entry.origin === SemanticProjectAureliaDependencyOrigin.WorkspaceManifest)
    .reduce((sum, entry) => sum + entry.count, 0);
  if (workspaceDependencyCount > 0) {
    counts.set(SemanticProjectShapeReasonKind.WorkspaceAureliaContext, workspaceDependencyCount);
  }

  const activationSignals =
    countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaAppCall)
    + countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaEnhanceCall)
    + countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaConstructor);
  if (activationSignals > 0) {
    counts.set(SemanticProjectShapeReasonKind.AureliaActivationSource, activationSignals);
  }

  const packageSignals =
    countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaImport)
    + countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaNamespaceImport)
    + countSourceSignals(sourceSignals, SemanticProjectAureliaSourceSignalKind.AureliaRegisterCall);
  if (packageSignals > 0) {
    counts.set(SemanticProjectShapeReasonKind.AureliaPackageSource, packageSignals);
  }

  const resourceSourceFileCount = countResourceSurfaceSourceFiles(project);
  if (resourceSourceFileCount > 0) {
    counts.set(SemanticProjectShapeReasonKind.ResourceSurfaceSourceFile, resourceSourceFileCount);
  }

  return [...counts.entries()].map(([reason, count]) => ({ reason, count }));
}

function countResourceSurfaceSourceFiles(project: ProjectBootFrame): number {
  return project.sourceFiles.filter((source) =>
    source.role === SourceFileRole.Template
    || source.role === SourceFileRole.Style
  ).length;
}

function aureliaDependencyScopes(
  manifest: BootPackageManifest | null,
  origin: SemanticProjectAureliaDependencyOrigin,
): readonly SemanticProjectAureliaDependencyScopeCount[] {
  if (manifest == null) {
    return [];
  }
  return [
    dependencyScopeCount(SemanticProjectAureliaDependencyScope.Dependencies, origin, manifest.dependencies),
    dependencyScopeCount(SemanticProjectAureliaDependencyScope.PeerDependencies, origin, manifest.peerDependencies),
    dependencyScopeCount(SemanticProjectAureliaDependencyScope.DevDependencies, origin, manifest.devDependencies),
  ].filter((entry): entry is SemanticProjectAureliaDependencyScopeCount => entry != null);
}

function dependencyScopeCount(
  scope: SemanticProjectAureliaDependencyScope,
  origin: SemanticProjectAureliaDependencyOrigin,
  value: unknown,
): SemanticProjectAureliaDependencyScopeCount | null {
  const entries = value != null && typeof value === 'object'
    ? Object.keys(value)
    : [];
  const count = entries.filter(isAureliaPackageSpecifier).length;
  return count === 0 ? null : { scope, origin, count };
}

function isAureliaPackageSpecifier(specifier: string): boolean {
  return AURELIA_PACKAGE_NAMES.has(specifier) || specifier.startsWith('@aurelia/');
}

function workspaceAureliaDependencyScopes(
  project: ProjectBootFrame,
): readonly SemanticProjectAureliaDependencyScopeCount[] {
  const manifest = nearestWorkspaceManifestForProject(project);
  return aureliaDependencyScopes(manifest, SemanticProjectAureliaDependencyOrigin.WorkspaceManifest);
}

function nearestWorkspaceManifestForProject(
  project: ProjectBootFrame,
): BootPackageManifest | null {
  const workspaceRoot = path.resolve(project.workspaceRootDir);
  const projectRoot = path.resolve(project.rootDir);
  let current = path.dirname(projectRoot);

  while (isSameOrDescendantPath(workspaceRoot, current)) {
    const manifest = readPackageManifest(current);
    if (manifest != null && manifestWorkspacesIncludeProject(manifest, current, projectRoot)) {
      return manifest;
    }
    if (sameHostPath(current, workspaceRoot)) {
      break;
    }
    current = path.dirname(current);
  }

  return null;
}

function manifestWorkspacesIncludeProject(
  manifest: BootPackageManifest,
  manifestRoot: string,
  projectRoot: string,
): boolean {
  const patterns = readPackageWorkspacePatterns(manifest);
  if (patterns.length === 0) {
    return false;
  }
  const relativeProjectRoot = normalizePosixPath(path.relative(manifestRoot, projectRoot));
  return relativeProjectRoot.length > 0 && patterns.some((pattern) =>
    workspacePatternMatchesProject(pattern, relativeProjectRoot)
  );
}

function workspacePatternMatchesProject(
  pattern: string,
  relativeProjectRoot: string,
): boolean {
  const normalizedPattern = normalizeWorkspacePattern(pattern);
  return globPatternToRegExp(normalizedPattern).test(relativeProjectRoot);
}

function normalizeWorkspacePattern(pattern: string): string {
  let normalized = normalizePosixPath(pattern).replace(/^\.\//, '');
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function globPatternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') {
        return '(?:[^/]+/)*[^/]+';
      }
      return segment
        .replace(/[\\^$+?.()|[\]{}]/g, '\\$&')
        .replace(/\*/g, '[^/]*');
    })
    .join('/');
  return new RegExp(`^${body}$`);
}

function isSameOrDescendantPath(parent: string, child: string): boolean {
  return isHostPathWithin(child, parent);
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
    if (!textCanContainAureliaFacadeSignal(text)) {
      continue;
    }
    countSourceFileSignals(counts, source.path, text);
  }
  return [...counts.entries()]
    .map(([signal, count]) => ({ signal, count }));
}

function textCanContainAureliaFacadeSignal(text: string): boolean {
  return text.includes('aurelia') || text.includes('@aurelia/');
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
