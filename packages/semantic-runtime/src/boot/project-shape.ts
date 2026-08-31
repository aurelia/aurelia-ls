import path from 'node:path';
import ts from 'typescript';
import { isImportedAureliaExpression } from '../evaluation/ts-syntax.js';
import { SourceFileRole } from '../kernel/address.js';
import { AuthoredSourceTextCache } from '../kernel/authored-source-text.js';
import type { ProjectBootFrame } from './frames.js';
import {
  type BootPackageManifest,
  manifestWorkspacesIncludeProject,
  readPackageManifest,
  isHostPathWithin,
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

/** Per-source boot syntax needed to prove direct Aurelia activations before static value evaluation. */
export interface SemanticProjectAppSourceSyntax {
  readonly sourcePath: string;
  readonly signals: readonly SemanticProjectAureliaSourceSignalCount[];
  /** Direct `.app(...)` calls whose enclosing syntax executes as part of module initialization. */
  readonly authoredDirectApplicationEntrypointCount: number;
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
      readPackageManifest(project.inputGeneration.host, project.rootDir),
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
    const manifest = readPackageManifest(project.inputGeneration.host, current);
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

function isSameOrDescendantPath(parent: string, child: string): boolean {
  return isHostPathWithin(child, parent);
}

function aureliaSourceSignals(project: ProjectBootFrame): readonly SemanticProjectAureliaSourceSignalCount[] {
  const counts = new Map<SemanticProjectAureliaSourceSignalKind, number>();
  for (const source of readSemanticProjectAppSourceSyntax(project)) {
    for (const row of source.signals) {
      counts.set(row.signal, (counts.get(row.signal) ?? 0) + row.count);
    }
  }
  return [...counts.entries()]
    .map(([signal, count]) => ({ signal, count }));
}

/** Read per-source direct Aurelia syntax signals once for this immutable boot frame. */
export function readSemanticProjectAppSourceSyntax(
  project: ProjectBootFrame,
): readonly SemanticProjectAppSourceSyntax[] {
  const sourceText = new AuthoredSourceTextCache(project.rootDir, project.inputGeneration.host);
  const rows: SemanticProjectAppSourceSyntax[] = [];
  for (const source of project.sourceFiles) {
    if (source.role !== SourceFileRole.AppSource) {
      continue;
    }
    const authoredSource = sourceText.read(source.path);
    if (authoredSource == null) {
      continue;
    }
    const signalCounts = new Map<SemanticProjectAureliaSourceSignalKind, number>();
    let authoredDirectApplicationEntrypointCount = 0;
    if (textCanContainAureliaFacadeSignal(authoredSource.text)) {
      const sourceFile = ts.createSourceFile(
        source.path,
        authoredSource.text,
        ts.ScriptTarget.Latest,
        true,
        scriptKindForPath(source.path),
      );
      authoredDirectApplicationEntrypointCount = countSourceFileSignals(signalCounts, sourceFile);
    }
    rows.push(Object.freeze({
      sourcePath: source.path,
      signals: Object.freeze([...signalCounts.entries()].map(([signal, count]) => ({ signal, count }))),
      authoredDirectApplicationEntrypointCount,
    }));
  }
  project.requireCurrent();
  return Object.freeze(rows);
}

function textCanContainAureliaFacadeSignal(text: string): boolean {
  return text.includes('aurelia') || text.includes('@aurelia/');
}

function countSourceFileSignals(
  counts: Map<SemanticProjectAureliaSourceSignalKind, number>,
  sourceFile: ts.SourceFile,
): number {
  const bindings = new SourceAureliaBindings();
  let authoredDirectApplicationEntrypointCount = 0;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      readAureliaImportBindings(statement, bindings, counts);
    }
  }
  readDirectModuleAureliaInstances(sourceFile, bindings);

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer != null && ts.isIdentifier(node.name)) {
      if (isConstVariableDeclaration(node) && isAureliaFacadeValue(node.initializer, bindings)) {
        bindings.aureliaInstances.add(node.name.text);
      }
    }
    if (ts.isNewExpression(node) && isImportedAureliaExpression(node.expression, bindings)) {
      incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaConstructor);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const activationSignal = aureliaAppActivationSignal(method, node.expression.expression, bindings);
      if (activationSignal != null) {
        incrementSignal(counts, activationSignal);
        if (
          activationSignal === SemanticProjectAureliaSourceSignalKind.AureliaAppCall
          && isDirectModuleExecution(node)
          && isDirectAureliaFacadeValue(node.expression.expression, bindings)
        ) {
          authoredDirectApplicationEntrypointCount += 1;
        }
      }
      if (method === 'register' && isAureliaFacadeValue(node.expression.expression, bindings)) {
        incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaRegisterCall);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return authoredDirectApplicationEntrypointCount;
}

function aureliaAppActivationSignal(
  method: string,
  receiver: ts.Expression,
  bindings: SourceAureliaBindings,
): SemanticProjectAureliaSourceSignalKind | null {
  if (!isAureliaFacadeValue(receiver, bindings)) {
    return null;
  }
  if (method === 'app') {
    return SemanticProjectAureliaSourceSignalKind.AureliaAppCall;
  }
  if (method === 'enhance') {
    return SemanticProjectAureliaSourceSignalKind.AureliaEnhanceCall;
  }
  return null;
}

function isDirectModuleExecution(node: ts.Node): boolean {
  let current: ts.Node = node;
  while (!ts.isSourceFile(current.parent)) {
    current = current.parent;
    if (
      ts.isFunctionLike(current)
      || ts.isClassLike(current)
      || ts.isIfStatement(current)
      || ts.isSwitchStatement(current)
      || ts.isCaseClause(current)
      || ts.isDefaultClause(current)
      || ts.isIterationStatement(current, false)
      || ts.isConditionalExpression(current)
      || (
        ts.isBinaryExpression(current)
        && (
          current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
          || current.operatorToken.kind === ts.SyntaxKind.BarBarToken
          || current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
        )
      )
    ) {
      return false;
    }
  }
  return ts.isExpressionStatement(current)
    || ts.isVariableStatement(current)
    || ts.isExportAssignment(current);
}

class SourceAureliaBindings {
  readonly aureliaIdentifiers = new Set<string>();
  readonly aureliaNamespaces = new Set<string>();
  readonly aureliaInstances = new Set<string>();
  readonly directAureliaInstances = new Set<string>();
}

function readDirectModuleAureliaInstances(
  sourceFile: ts.SourceFile,
  bindings: SourceAureliaBindings,
): void {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name)
        && declaration.initializer != null
        && isDirectAureliaFacadeValue(declaration.initializer, bindings)
      ) {
        bindings.directAureliaInstances.add(declaration.name.text);
      }
    }
  }
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
  const importClause = statement.importClause ?? null;
  if (importClause?.isTypeOnly === true) {
    return;
  }
  const defaultImport = importClause?.name ?? null;
  if (defaultImport != null) {
    bindings.aureliaIdentifiers.add(defaultImport.text);
    incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaImport);
  }
  const namedBindings = importClause?.namedBindings ?? null;
  if (namedBindings == null) {
    return;
  }
  if (ts.isNamespaceImport(namedBindings)) {
    bindings.aureliaNamespaces.add(namedBindings.name.text);
    incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaNamespaceImport);
    return;
  }
  for (const element of namedBindings.elements) {
    if (element.isTypeOnly) {
      continue;
    }
    const importedName = element.propertyName?.text ?? element.name.text;
    if (importedName === 'Aurelia') {
      bindings.aureliaIdentifiers.add(element.name.text);
      incrementSignal(counts, SemanticProjectAureliaSourceSignalKind.AureliaImport);
    }
  }
}

function isConstVariableDeclaration(node: ts.VariableDeclaration): boolean {
  return ts.isVariableDeclarationList(node.parent)
    && (node.parent.flags & ts.NodeFlags.Const) !== 0;
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

function isDirectAureliaFacadeValue(
  expression: ts.Expression,
  bindings: SourceAureliaBindings,
): boolean {
  const current = unwrapParentheses(expression);
  if (isImportedAureliaExpression(current, bindings)) {
    return true;
  }
  if (ts.isIdentifier(current) && bindings.directAureliaInstances.has(current.text)) {
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
    && isDirectAureliaFacadeValue(current.expression.expression, bindings);
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
