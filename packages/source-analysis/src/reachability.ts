import { existsSync, readFileSync } from 'node:fs';
import { join, posix as pathPosix } from 'node:path';

import * as ts from 'typescript';

import type { LoadedCurrentSourceAnalysisSnapshots } from './current-snapshots.js';
import type { PackageExportRecord, PackageExportsSummary } from './exports/schema.js';
import type { SourceAnalysisTrustKind } from './outcome-algebra.js';
import type { TypeDecl } from './typerefs/schema.js';

export const SOURCE_ANALYSIS_PACKAGE_ROOT_KINDS = [
  'public-api',
  'manifest-bin',
  'exercise',
  'candidate-entry',
] as const;

export const SOURCE_ANALYSIS_PACKAGE_ROUTE_KINDS = [
  'dependency-import',
  'parse-import',
  'executable-handoff',
] as const;

export const SOURCE_ANALYSIS_PACKAGE_ROUTE_CLASSES = [
  'production',
  'exercise',
  'candidate',
] as const;

export type SourceAnalysisPackageRootKind =
  typeof SOURCE_ANALYSIS_PACKAGE_ROOT_KINDS[number];

export type SourceAnalysisPackageRouteKind =
  typeof SOURCE_ANALYSIS_PACKAGE_ROUTE_KINDS[number];

export type SourceAnalysisPackageRouteClass =
  typeof SOURCE_ANALYSIS_PACKAGE_ROUTE_CLASSES[number];

export interface SourceAnalysisPackageRoot {
  readonly id: string;
  readonly kind: SourceAnalysisPackageRootKind;
  readonly filePath: string;
  readonly trust: SourceAnalysisTrustKind;
  readonly summary: string;
  readonly detail?: string;
}

export interface SourceAnalysisPackageRouteEdge {
  readonly id: string;
  readonly kind: SourceAnalysisPackageRouteKind;
  readonly fromFilePath: string;
  readonly toFilePath: string;
  readonly trust: SourceAnalysisTrustKind;
  readonly summary: string;
  readonly detail?: string;
}

export interface SourceAnalysisPackageRouteStep {
  readonly kind: SourceAnalysisPackageRouteKind;
  readonly fromFilePath: string;
  readonly toFilePath: string;
  readonly trust: SourceAnalysisTrustKind;
  readonly summary: string;
  readonly detail?: string;
}

export interface SourceAnalysisPackageRouteWitness {
  readonly rootId: string;
  readonly rootKind: SourceAnalysisPackageRootKind;
  readonly rootFilePath: string;
  readonly routeClass: SourceAnalysisPackageRouteClass;
  readonly filePath: string;
  readonly trust: SourceAnalysisTrustKind;
  readonly stepCount: number;
  readonly files: readonly string[];
  readonly steps: readonly SourceAnalysisPackageRouteStep[];
  readonly summary: string;
}

export interface SourceAnalysisPackageFileReachability {
  readonly filePath: string;
  readonly inboundFiles: readonly string[];
  readonly outboundFiles: readonly string[];
  readonly declarationCount: number;
  readonly exportCount: number;
  readonly rootIds: readonly string[];
  readonly groundedRootIds: readonly string[];
  readonly qualifiedRootIds: readonly string[];
  readonly productionRootIds: readonly string[];
  readonly groundedProductionRootIds: readonly string[];
  readonly qualifiedProductionRootIds: readonly string[];
  readonly exerciseRootIds: readonly string[];
  readonly candidateRootIds: readonly string[];
  readonly publicSurface: boolean;
  readonly routeWitnesses: readonly SourceAnalysisPackageRouteWitness[];
}

export interface SourceAnalysisPackageReachability {
  readonly pkg: PackageExportsSummary;
  readonly files: readonly SourceAnalysisPackageFileReachability[];
  readonly filesByPath: ReadonlyMap<string, SourceAnalysisPackageFileReachability>;
  readonly roots: readonly SourceAnalysisPackageRoot[];
  readonly rootsByFilePath: ReadonlyMap<string, readonly SourceAnalysisPackageRoot[]>;
  readonly routeEdges: readonly SourceAnalysisPackageRouteEdge[];
  readonly routeWitnessesByFilePath: ReadonlyMap<string, readonly SourceAnalysisPackageRouteWitness[]>;
  readonly publicSurfaceFiles: readonly string[];
  readonly candidateEntryFiles: readonly string[];
  readonly exerciseFiles: readonly string[];
}

export function createSourceAnalysisPackageReachability(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  pkg: PackageExportsSummary,
): SourceAnalysisPackageReachability {
  const packagePrefix = pkg.package_dir.length > 0 ? `${pkg.package_dir}/` : '';
  const packageFiles = new Set<string>();
  const routeEdges = new Map<string, SourceAnalysisPackageRouteEdge>();

  for (const edge of snapshots.deps.edges) {
    const sourceInPackage = edge.source.startsWith(packagePrefix);
    const targetInPackage = edge.target.startsWith(packagePrefix);
    if (!sourceInPackage && !targetInPackage) continue;

    if (sourceInPackage) packageFiles.add(edge.source);
    if (targetInPackage) packageFiles.add(edge.target);

    if (sourceInPackage && targetInPackage) {
      addRouteEdge(
        routeEdges,
        createRouteEdge(
          'dependency-import',
          edge.source,
          edge.target,
          'grounded',
          'Static package-local import captured in the deps snapshot.',
          `${edge.specifier} @ line ${edge.line}`,
        ),
      );
    }
  }

  const declarationsByFile = groupDeclarationsByFile(snapshots.typeRefs.declarations, packagePrefix);
  for (const filePath of declarationsByFile.keys()) {
    packageFiles.add(filePath);
  }

  const exportRecordsByFile = groupExportRecordsByFile(snapshots.exports.exports, pkg.package_dir);
  for (const filePath of exportRecordsByFile.keys()) {
    packageFiles.add(filePath);
  }

  packageFiles.add(pkg.analysis_entrypoint);
  const uncoveredPackageFiles = snapshots.deps.uncovered_files.filter((filePath) =>
    filePath.startsWith(packagePrefix),
  );
  for (const uncoveredFile of uncoveredPackageFiles) {
    packageFiles.add(uncoveredFile);
  }

  for (const edge of discoverParseImportEdges(
    snapshots.deps.root,
    uncoveredPackageFiles,
    packageFiles,
  )) {
    addRouteEdge(routeEdges, edge);
  }

  for (const edge of discoverExecutableHandoffEdges(
    snapshots.deps.root,
    pkg.package_dir,
    packageFiles,
  )) {
    addRouteEdge(routeEdges, edge);
  }

  const outboundByFile = new Map<string, Set<string>>();
  const inboundByFile = new Map<string, Set<string>>();
  const outboundEdgesByFile = new Map<string, SourceAnalysisPackageRouteEdge[]>();
  for (const edge of routeEdges.values()) {
    addSetValue(outboundByFile, edge.fromFilePath, edge.toFilePath);
    addSetValue(inboundByFile, edge.toFilePath, edge.fromFilePath);
    const existing = outboundEdgesByFile.get(edge.fromFilePath) ?? [];
    existing.push(edge);
    outboundEdgesByFile.set(edge.fromFilePath, existing);
  }

  const publicSurfaceFiles = new Set<string>([pkg.analysis_entrypoint, ...exportRecordsByFile.keys()]);
  const roots = new Map<string, SourceAnalysisPackageRoot>();

  addRoot(
    roots,
    createRoot(
      'public-api',
      pkg.analysis_entrypoint,
      'grounded',
      'Package exports anchor this file as the public API root.',
      pkg.package_name,
    ),
  );

  for (const root of resolveManifestBinRoots(snapshots.deps.root, pkg, packageFiles)) {
    addRoot(roots, root);
  }

  const exerciseFiles = [...packageFiles]
    .filter((filePath) => isExerciseFile(pkg.package_dir, filePath))
    .sort((left, right) => left.localeCompare(right));
  for (const filePath of exerciseFiles) {
    addRoot(
      roots,
      createRoot(
        'exercise',
        filePath,
        'qualified',
        'This file looks like an exercise/test root from package layout.',
      ),
    );
  }

  const candidateEntryFiles = [...packageFiles]
    .filter((filePath) => {
      if (roots.has(rootIdForFile('public-api', filePath))
        || roots.has(rootIdForFile('manifest-bin', filePath))
        || roots.has(rootIdForFile('exercise', filePath))) {
        return false;
      }
      if ((inboundByFile.get(filePath)?.size ?? 0) > 0) return false;
      if ((outboundByFile.get(filePath)?.size ?? 0) === 0) return false;
      return true;
    })
    .sort((left, right) => left.localeCompare(right));

  for (const filePath of candidateEntryFiles) {
    addRoot(
      roots,
      createRoot(
        'candidate-entry',
        filePath,
        'qualified',
        'Nothing in the package routes into this file, but it still drives package-local edges.',
      ),
    );
  }

  const rootsByFilePath = new Map<string, SourceAnalysisPackageRoot[]>();
  for (const root of roots.values()) {
    const existing = rootsByFilePath.get(root.filePath) ?? [];
    existing.push(root);
    rootsByFilePath.set(root.filePath, existing);
  }

  const routeWitnessesByFilePath = computeRouteWitnesses(
    packageFiles,
    outboundEdgesByFile,
    roots.values(),
  );

  const files = [...packageFiles]
    .sort((left, right) => left.localeCompare(right))
    .map((filePath) => {
      const routeWitnesses = routeWitnessesByFilePath.get(filePath) ?? [];
      const rootIds = dedupeStrings(routeWitnesses.map((witness) => witness.rootId));
      const groundedRootIds = dedupeStrings(routeWitnesses
        .filter((witness) => witness.trust === 'grounded')
        .map((witness) => witness.rootId));
      const qualifiedRootIds = dedupeStrings(routeWitnesses
        .filter((witness) => witness.trust !== 'grounded')
        .map((witness) => witness.rootId));
      const productionRouteWitnesses = routeWitnesses.filter((witness) => witness.routeClass === 'production');
      const exerciseRouteWitnesses = routeWitnesses.filter((witness) => witness.routeClass === 'exercise');
      const candidateRouteWitnesses = routeWitnesses.filter((witness) => witness.routeClass === 'candidate');

      return {
        filePath,
        inboundFiles: sortedSetValues(inboundByFile.get(filePath)),
        outboundFiles: sortedSetValues(outboundByFile.get(filePath)),
        declarationCount: declarationsByFile.get(filePath)?.length ?? 0,
        exportCount: exportRecordsByFile.get(filePath)?.length ?? 0,
        rootIds,
        groundedRootIds,
        qualifiedRootIds,
        productionRootIds: dedupeStrings(productionRouteWitnesses.map((witness) => witness.rootId)),
        groundedProductionRootIds: dedupeStrings(productionRouteWitnesses
          .filter((witness) => witness.trust === 'grounded')
          .map((witness) => witness.rootId)),
        qualifiedProductionRootIds: dedupeStrings(productionRouteWitnesses
          .filter((witness) => witness.trust !== 'grounded')
          .map((witness) => witness.rootId)),
        exerciseRootIds: dedupeStrings(exerciseRouteWitnesses.map((witness) => witness.rootId)),
        candidateRootIds: dedupeStrings(candidateRouteWitnesses.map((witness) => witness.rootId)),
        publicSurface: publicSurfaceFiles.has(filePath),
        routeWitnesses,
      } satisfies SourceAnalysisPackageFileReachability;
    });

  return {
    pkg,
    files,
    filesByPath: new Map(files.map((file) => [file.filePath, file])),
    roots: [...roots.values()].sort((left, right) =>
      rootRank(left.kind) - rootRank(right.kind)
      || left.filePath.localeCompare(right.filePath),
    ),
    rootsByFilePath: new Map(
      [...rootsByFilePath.entries()].map(([filePath, fileRoots]) => [
        filePath,
        [...fileRoots].sort((left, right) =>
          rootRank(left.kind) - rootRank(right.kind)
          || left.filePath.localeCompare(right.filePath),
        ),
      ]),
    ),
    routeEdges: [...routeEdges.values()].sort((left, right) =>
      routeTrustRank(left.trust) - routeTrustRank(right.trust)
      || routeKindRank(left.kind) - routeKindRank(right.kind)
      || left.fromFilePath.localeCompare(right.fromFilePath)
      || left.toFilePath.localeCompare(right.toFilePath),
    ),
    routeWitnessesByFilePath: new Map(
      [...routeWitnessesByFilePath.entries()].map(([filePath, witnesses]) => [
        filePath,
        [...witnesses].sort(compareRouteWitnesses),
      ]),
    ),
    publicSurfaceFiles: [...publicSurfaceFiles].sort((left, right) => left.localeCompare(right)),
    candidateEntryFiles,
    exerciseFiles,
  };
}

export function getSourceAnalysisPackageRouteWitnesses(
  reachability: SourceAnalysisPackageReachability,
  filePath: string,
): readonly SourceAnalysisPackageRouteWitness[] {
  return reachability.routeWitnessesByFilePath.get(filePath) ?? [];
}

function groupDeclarationsByFile(
  declarations: readonly TypeDecl[],
  packagePrefix: string,
): ReadonlyMap<string, readonly TypeDecl[]> {
  const grouped = new Map<string, TypeDecl[]>();
  for (const declaration of declarations) {
    if (!declaration.file.startsWith(packagePrefix)) continue;
    const fileDeclarations = grouped.get(declaration.file) ?? [];
    fileDeclarations.push(declaration);
    grouped.set(declaration.file, fileDeclarations);
  }
  return new Map(
    [...grouped.entries()].map(([filePath, fileDeclarations]) => [
      filePath,
      [...fileDeclarations].sort((left, right) =>
        left.line - right.line || left.name.localeCompare(right.name),
      ),
    ]),
  );
}

function groupExportRecordsByFile(
  records: readonly PackageExportRecord[],
  packageDir: string,
): ReadonlyMap<string, readonly PackageExportRecord[]> {
  const grouped = new Map<string, PackageExportRecord[]>();
  for (const record of records) {
    if (record.package_dir !== packageDir || !record.declaration_file) continue;
    const fileRecords = grouped.get(record.declaration_file) ?? [];
    fileRecords.push(record);
    grouped.set(record.declaration_file, fileRecords);
  }
  return new Map(
    [...grouped.entries()].map(([filePath, fileRecords]) => [
      filePath,
      [...fileRecords].sort((left, right) => left.exported_name.localeCompare(right.exported_name)),
    ]),
  );
}

function resolveManifestBinRoots(
  repoRoot: string,
  pkg: PackageExportsSummary,
  packageFiles: ReadonlySet<string>,
): readonly SourceAnalysisPackageRoot[] {
  const packageJsonPath = join(repoRoot, pkg.package_dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      readonly bin?: string | Record<string, string>;
    };
    const binEntries = normalizeBinEntries(manifest.bin);
    return binEntries.flatMap((entry) => {
      const filePath = resolveManifestTargetToSourceFile(pkg.package_dir, entry.target, packageFiles);
      if (!filePath) return [];
      return [createRoot(
        'manifest-bin',
        filePath,
        'grounded',
        'Package manifest exposes this file as a CLI or executable root.',
        `${entry.name} -> ${entry.target}`,
      )];
    });
  } catch {
    return [];
  }
}

function discoverParseImportEdges(
  repoRoot: string,
  uncoveredPackageFiles: readonly string[],
  packageFiles: ReadonlySet<string>,
): readonly SourceAnalysisPackageRouteEdge[] {
  const edges: SourceAnalysisPackageRouteEdge[] = [];

  for (const filePath of uncoveredPackageFiles) {
    const fileAbsPath = join(repoRoot, filePath);
    if (!existsSync(fileAbsPath)) continue;

    let sourceText: string;
    try {
      sourceText = readFileSync(fileAbsPath, 'utf-8');
    } catch {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      fileAbsPath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKindForPath(filePath),
    );

    for (const reference of collectModuleReferences(sourceFile)) {
      if (!isPackageLocalSpecifier(reference.specifier)) continue;
      const targetFilePath = resolveRelativeModuleSpecifier(filePath, reference.specifier, packageFiles);
      if (!targetFilePath || targetFilePath === filePath) continue;

      edges.push(createRouteEdge(
        'parse-import',
        filePath,
        targetFilePath,
        'qualified',
        'Parse-only package-local import recovered from an uncovered source file.',
        `${reference.specifier} @ line ${reference.line}`,
      ));
    }
  }

  return edges;
}

function discoverExecutableHandoffEdges(
  repoRoot: string,
  packageDir: string,
  packageFiles: ReadonlySet<string>,
): readonly SourceAnalysisPackageRouteEdge[] {
  const edges: SourceAnalysisPackageRouteEdge[] = [];

  for (const filePath of packageFiles) {
    const fileAbsPath = join(repoRoot, filePath);
    if (!existsSync(fileAbsPath)) continue;

    let sourceText: string;
    try {
      sourceText = readFileSync(fileAbsPath, 'utf-8');
    } catch {
      continue;
    }

    if (!/\b(spawn|spawnSync|execFile|execFileSync|fork)\b/.test(sourceText)) {
      continue;
    }

    for (const handoffTarget of discoverExecutableHandoffTargets(sourceText)) {
      const targetFilePath = resolveManifestTargetToSourceFile(packageDir, handoffTarget, packageFiles);
      if (!targetFilePath || targetFilePath === filePath) continue;
      edges.push(createRouteEdge(
        'executable-handoff',
        filePath,
        targetFilePath,
        'qualified',
        'String-addressed executable handoff recovered from source text.',
        handoffTarget,
      ));
    }
  }

  return edges;
}

function collectModuleReferences(
  sourceFile: ts.SourceFile,
): ReadonlyArray<{ readonly specifier: string; readonly line: number }> {
  const references: Array<{ readonly specifier: string; readonly line: number }> = [];

  function addReference(specifier: string, line: number): void {
    references.push({ specifier, line });
  }

  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      addReference(node.moduleSpecifier.text, line);
    } else if (ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length > 0
      && ts.isStringLiteral(node.arguments[0]!)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      addReference(node.arguments[0]!.text, line);
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return references;
}

function scriptKindForPath(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}

function isPackageLocalSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

function resolveRelativeModuleSpecifier(
  sourceFilePath: string,
  specifier: string,
  packageFiles: ReadonlySet<string>,
): string | null {
  const sourceDir = pathPosix.dirname(sourceFilePath);
  const normalized = specifier.startsWith('/')
    ? specifier.slice(1)
    : pathPosix.normalize(pathPosix.join(sourceDir, specifier));
  const baseCandidates = dedupeStrings([
    normalized,
    normalized.replace(/\.[cm]?js$/i, '.ts'),
    normalized.replace(/\.[cm]?js$/i, '.tsx'),
    normalized.replace(/\.[cm]?js$/i, '.mts'),
    normalized.replace(/\.[cm]?js$/i, '.cts'),
  ]);
  const candidates = dedupeStrings(baseCandidates.flatMap((candidate) => [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.mts`,
    `${candidate}.cts`,
    `${candidate}/index.ts`,
    `${candidate}/index.tsx`,
    `${candidate}/index.mts`,
    `${candidate}/index.cts`,
  ]));

  for (const candidate of candidates) {
    if (packageFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function discoverExecutableHandoffTargets(sourceText: string): readonly string[] {
  const matches: string[] = [];
  const matcher = /['"`]([^'"`\r\n]*\bout\/[^'"`\r\n]+?\.[cm]?js)['"`]/g;
  let match: RegExpExecArray | null = matcher.exec(sourceText);
  while (match) {
    const target = match[1];
    if (target) {
      matches.push(target);
    }
    match = matcher.exec(sourceText);
  }
  return dedupeStrings(matches);
}

function normalizeBinEntries(
  value: string | Record<string, string> | undefined,
): ReadonlyArray<{ readonly name: string; readonly target: string }> {
  if (!value) return [];
  if (typeof value === 'string') {
    return [{ name: 'bin', target: value }];
  }
  return Object.entries(value)
    .map(([name, target]) => ({ name, target }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function resolveManifestTargetToSourceFile(
  packageDir: string,
  target: string,
  packageFiles: ReadonlySet<string>,
): string | null {
  const normalized = normalizeRepoRelativePath(packageDir, target);
  const baseCandidates = dedupeStrings([
    normalized,
    normalized.replace(/(^|\/)(out|dist|build)\//i, '$1src/'),
  ]);
  const candidates = dedupeStrings(baseCandidates.flatMap((candidate) => [
    candidate,
    candidate.replace(/\.d\.[cm]?ts$/i, '.ts'),
    candidate.replace(/\.[cm]?js$/i, '.ts'),
    candidate.replace(/\.[cm]?js$/i, '.tsx'),
    candidate.replace(/\.[cm]?js$/i, '.mts'),
    candidate.replace(/\.[cm]?js$/i, '.cts'),
  ]));

  for (const candidate of candidates) {
    if (packageFiles.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeRepoRelativePath(packageDir: string, pathValue: string): string {
  const trimmed = pathValue.replace(/\\/g, '/').replace(/^\.\//, '');
  return packageDir.length > 0
    ? `${packageDir}/${trimmed}`.replace(/\/{2,}/g, '/')
    : trimmed;
}

function createRoot(
  kind: SourceAnalysisPackageRootKind,
  filePath: string,
  trust: SourceAnalysisTrustKind,
  summary: string,
  detail?: string,
): SourceAnalysisPackageRoot {
  return {
    id: rootIdForFile(kind, filePath),
    kind,
    filePath,
    trust,
    summary,
    ...(detail ? { detail } : {}),
  };
}

function createRouteEdge(
  kind: SourceAnalysisPackageRouteKind,
  fromFilePath: string,
  toFilePath: string,
  trust: SourceAnalysisTrustKind,
  summary: string,
  detail?: string,
): SourceAnalysisPackageRouteEdge {
  return {
    id: `${kind}:${fromFilePath}->${toFilePath}`,
    kind,
    fromFilePath,
    toFilePath,
    trust,
    summary,
    ...(detail ? { detail } : {}),
  };
}

function addRoot(
  roots: Map<string, SourceAnalysisPackageRoot>,
  root: SourceAnalysisPackageRoot,
): void {
  if (!roots.has(root.id)) {
    roots.set(root.id, root);
  }
}

function addRouteEdge(
  routeEdges: Map<string, SourceAnalysisPackageRouteEdge>,
  edge: SourceAnalysisPackageRouteEdge,
): void {
  if (!routeEdges.has(edge.id)) {
    routeEdges.set(edge.id, edge);
  }
}

function computeRouteWitnesses(
  packageFiles: ReadonlySet<string>,
  outboundEdgesByFile: ReadonlyMap<string, readonly SourceAnalysisPackageRouteEdge[]>,
  roots: Iterable<SourceAnalysisPackageRoot>,
): ReadonlyMap<string, readonly SourceAnalysisPackageRouteWitness[]> {
  const routeWitnessesByFilePath = new Map<string, SourceAnalysisPackageRouteWitness[]>();
  for (const filePath of packageFiles) {
    routeWitnessesByFilePath.set(filePath, []);
  }

  for (const root of roots) {
    const bestByFile = new Map<string, RouteScore>();
    const previousEdgeByFile = new Map<string, SourceAnalysisPackageRouteEdge | null>();
    const queue: RouteQueueEntry[] = [{
      filePath: root.filePath,
      score: routeScoreForTrust(root.trust),
    }];

    bestByFile.set(root.filePath, routeScoreForTrust(root.trust));
    previousEdgeByFile.set(root.filePath, null);

    while (queue.length > 0) {
      queue.sort(compareRouteQueueEntries);
      const current = queue.shift()!;
      const bestScore = bestByFile.get(current.filePath);
      if (!bestScore || compareRouteScore(current.score, bestScore) > 0) {
        continue;
      }

      const outgoingEdges = outboundEdgesByFile.get(current.filePath) ?? [];
      for (const edge of outgoingEdges) {
        const nextScore = addRouteScore(current.score, edge.trust);
        const priorScore = bestByFile.get(edge.toFilePath);
        if (!priorScore || compareRouteScore(nextScore, priorScore) < 0) {
          bestByFile.set(edge.toFilePath, nextScore);
          previousEdgeByFile.set(edge.toFilePath, edge);
          queue.push({
            filePath: edge.toFilePath,
            score: nextScore,
          });
        }
      }
    }

    for (const [filePath, score] of bestByFile.entries()) {
      const routeWitness = createRouteWitness(root, filePath, score, previousEdgeByFile);
      const existing = routeWitnessesByFilePath.get(filePath) ?? [];
      existing.push(routeWitness);
      routeWitnessesByFilePath.set(filePath, existing);
    }
  }

  return new Map(
    [...routeWitnessesByFilePath.entries()].map(([filePath, witnesses]) => [
      filePath,
      [...witnesses].sort(compareRouteWitnesses),
    ]),
  );
}

function createRouteWitness(
  root: SourceAnalysisPackageRoot,
  filePath: string,
  score: RouteScore,
  previousEdgeByFile: ReadonlyMap<string, SourceAnalysisPackageRouteEdge | null>,
): SourceAnalysisPackageRouteWitness {
  const steps = reconstructRouteSteps(root.filePath, filePath, previousEdgeByFile);
  const files = [root.filePath, ...steps.map((step) => step.toFilePath)];
  const routeClass = routeClassForRootKind(root.kind);
  const trust = trustForPenalty(score.penalty);

  return {
    rootId: root.id,
    rootKind: root.kind,
    rootFilePath: root.filePath,
    routeClass,
    filePath,
    trust,
    stepCount: steps.length,
    files,
    steps,
    summary: summarizeWitness(root, filePath, steps, trust),
  };
}

function reconstructRouteSteps(
  rootFilePath: string,
  filePath: string,
  previousEdgeByFile: ReadonlyMap<string, SourceAnalysisPackageRouteEdge | null>,
): readonly SourceAnalysisPackageRouteStep[] {
  if (filePath === rootFilePath) {
    return [];
  }

  const reversed: SourceAnalysisPackageRouteStep[] = [];
  let currentFilePath = filePath;
  while (currentFilePath !== rootFilePath) {
    const previousEdge = previousEdgeByFile.get(currentFilePath);
    if (!previousEdge) {
      break;
    }
    reversed.push({
      kind: previousEdge.kind,
      fromFilePath: previousEdge.fromFilePath,
      toFilePath: previousEdge.toFilePath,
      trust: previousEdge.trust,
      summary: previousEdge.summary,
      ...(previousEdge.detail ? { detail: previousEdge.detail } : {}),
    });
    currentFilePath = previousEdge.fromFilePath;
  }

  return reversed.reverse();
}

function summarizeWitness(
  root: SourceAnalysisPackageRoot,
  filePath: string,
  steps: readonly SourceAnalysisPackageRouteStep[],
  trust: SourceAnalysisTrustKind,
): string {
  if (steps.length === 0) {
    return `${basename(filePath)} is itself a ${root.kind} route root (${trust}).`;
  }

  const chain = [root.filePath, ...steps.map((step) => step.toFilePath)]
    .map((segment) => basename(segment))
    .join(' -> ');
  return `${root.kind} route reaches ${basename(filePath)} via ${chain} (${trust}).`;
}

function addSetValue(
  map: Map<string, Set<string>>,
  key: string,
  value: string,
): void {
  const values = map.get(key) ?? new Set<string>();
  values.add(value);
  map.set(key, values);
}

function sortedSetValues(values: ReadonlySet<string> | undefined): readonly string[] {
  return [...(values ?? new Set<string>())].sort((left, right) => left.localeCompare(right));
}

function isExerciseFile(packageDir: string, filePath: string): boolean {
  const testPrefix = packageDir.length > 0 ? `${packageDir}/test/` : 'test/';
  const testsPrefix = packageDir.length > 0 ? `${packageDir}/tests/` : 'tests/';
  return filePath.startsWith(testPrefix)
    || filePath.startsWith(testsPrefix)
    || /\.test\.[cm]?[jt]sx?$/i.test(filePath)
    || /\.spec\.[cm]?[jt]sx?$/i.test(filePath);
}

function rootIdForFile(kind: SourceAnalysisPackageRootKind, filePath: string): string {
  return `${kind}:${filePath}`;
}

function routeClassForRootKind(kind: SourceAnalysisPackageRootKind): SourceAnalysisPackageRouteClass {
  switch (kind) {
    case 'public-api':
    case 'manifest-bin':
      return 'production';
    case 'exercise':
      return 'exercise';
    case 'candidate-entry':
      return 'candidate';
    default:
      return assertNever(kind);
  }
}

function rootRank(kind: SourceAnalysisPackageRootKind): number {
  switch (kind) {
    case 'public-api':
      return 1;
    case 'manifest-bin':
      return 2;
    case 'exercise':
      return 3;
    case 'candidate-entry':
      return 4;
    default:
      return assertNever(kind);
  }
}

function routeKindRank(kind: SourceAnalysisPackageRouteKind): number {
  switch (kind) {
    case 'dependency-import':
      return 1;
    case 'parse-import':
      return 2;
    case 'executable-handoff':
      return 3;
    default:
      return assertNever(kind);
  }
}

function routeClassRank(kind: SourceAnalysisPackageRouteClass): number {
  switch (kind) {
    case 'production':
      return 1;
    case 'exercise':
      return 2;
    case 'candidate':
      return 3;
    default:
      return assertNever(kind);
  }
}

function routeTrustRank(kind: SourceAnalysisTrustKind): number {
  switch (kind) {
    case 'grounded':
      return 1;
    case 'qualified':
      return 2;
    case 'frontier':
      return 3;
    case 'unavailable':
      return 4;
    default:
      return assertNever(kind);
  }
}

function dedupeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function compareRouteWitnesses(
  left: SourceAnalysisPackageRouteWitness,
  right: SourceAnalysisPackageRouteWitness,
): number {
  return routeClassRank(left.routeClass) - routeClassRank(right.routeClass)
    || routeTrustRank(left.trust) - routeTrustRank(right.trust)
    || left.stepCount - right.stepCount
    || left.rootFilePath.localeCompare(right.rootFilePath)
    || left.filePath.localeCompare(right.filePath);
}

interface RouteScore {
  readonly penalty: number;
  readonly steps: number;
}

interface RouteQueueEntry {
  readonly filePath: string;
  readonly score: RouteScore;
}

function routeScoreForTrust(trust: SourceAnalysisTrustKind): RouteScore {
  return {
    penalty: trust === 'grounded' ? 0 : 1,
    steps: 0,
  };
}

function addRouteScore(score: RouteScore, trust: SourceAnalysisTrustKind): RouteScore {
  return {
    penalty: score.penalty + (trust === 'grounded' ? 0 : 1),
    steps: score.steps + 1,
  };
}

function compareRouteScore(left: RouteScore, right: RouteScore): number {
  return left.penalty - right.penalty
    || left.steps - right.steps;
}

function compareRouteQueueEntries(left: RouteQueueEntry, right: RouteQueueEntry): number {
  return compareRouteScore(left.score, right.score)
    || left.filePath.localeCompare(right.filePath);
}

function trustForPenalty(penalty: number): SourceAnalysisTrustKind {
  return penalty === 0 ? 'grounded' : 'qualified';
}

function basename(filePath: string): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled reachability case: ${String(value)}`);
}
