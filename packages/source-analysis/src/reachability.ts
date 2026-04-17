import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  expandMappedRepoRelativePathCandidates,
  isExercisePath,
  resolveAnalysisProfile,
  type AnalysisProfile,
} from './analysis-profile.js';
import type { AnalysisViews } from './analysis-views.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { TrustKind } from './outcome-algebra.js';
import {
  collectStructuralPackageFileSurface,
  describeMissingStructuralPackageSurface,
  type StructuralPackageFileSurface,
} from './structural-source-file-surface.js';
import {
  compareByPrecedence,
  compareStringsAscending,
  DEFAULT_INQUIRY_ORDERING,
} from './inquiry-policy.js';
import type { InquiryOrdering } from './inquiry-policy.js';

export const PACKAGE_ROOT_KINDS = [
  'public-api',
  'manifest-bin',
  'exercise',
  'candidate-entry',
] as const;

export const PACKAGE_ROUTE_KINDS = [
  'dependency-import',
  'executable-handoff',
] as const;

export const PACKAGE_ROUTE_CLASSES = [
  'production',
  'exercise',
  'candidate',
] as const;

export type PackageRootKind =
  typeof PACKAGE_ROOT_KINDS[number];

export type PackageRouteKind =
  typeof PACKAGE_ROUTE_KINDS[number];

export type PackageRouteClass =
  typeof PACKAGE_ROUTE_CLASSES[number];

export interface PackageRoot {
  readonly id: string;
  readonly kind: PackageRootKind;
  readonly filePath: string;
  readonly trust: TrustKind;
  readonly summary: string;
  readonly detail?: string;
}

export interface PackageRouteEdge {
  readonly id: string;
  readonly kind: PackageRouteKind;
  readonly fromFilePath: string;
  readonly toFilePath: string;
  readonly trust: TrustKind;
  readonly summary: string;
  readonly detail?: string;
}

export interface PackageRouteStep {
  readonly kind: PackageRouteKind;
  readonly fromFilePath: string;
  readonly toFilePath: string;
  readonly trust: TrustKind;
  readonly summary: string;
  readonly detail?: string;
}

export interface PackageRouteWitness {
  readonly rootId: string;
  readonly rootKind: PackageRootKind;
  readonly rootFilePath: string;
  readonly routeClass: PackageRouteClass;
  readonly filePath: string;
  readonly trust: TrustKind;
  readonly stepCount: number;
  readonly files: readonly string[];
  readonly steps: readonly PackageRouteStep[];
  readonly summary: string;
}

export interface PackageFileReachability {
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
  readonly routeWitnesses: readonly PackageRouteWitness[];
}

export interface PackageReachability {
  readonly pkg: PackageExportsSummary;
  readonly files: readonly PackageFileReachability[];
  readonly filesByPath: ReadonlyMap<string, PackageFileReachability>;
  readonly roots: readonly PackageRoot[];
  readonly rootsByFilePath: ReadonlyMap<string, readonly PackageRoot[]>;
  readonly routeEdges: readonly PackageRouteEdge[];
  readonly routeWitnessesByFilePath: ReadonlyMap<string, readonly PackageRouteWitness[]>;
  readonly publicSurfaceFiles: readonly string[];
  readonly candidateEntryFiles: readonly string[];
  readonly exerciseFiles: readonly string[];
}

export interface PackageReachabilityOptions {
  readonly ordering?: InquiryOrdering;
  readonly packageSurface?: StructuralPackageFileSurface;
}

export function createPackageReachability(
  analysis: AnalysisViews,
  pkg: PackageExportsSummary,
  options?: PackageReachabilityOptions,
): PackageReachability {
  const ordering = options?.ordering ?? DEFAULT_INQUIRY_ORDERING;
  const packageSurface = options?.packageSurface ?? collectStructuralPackageFileSurface(analysis, pkg);
  if (!packageSurface) {
    throw new Error(describeMissingStructuralPackageSurface());
  }
  const profile = resolveAnalysisProfile({ repoPath: analysis.root });
  const packageFiles = new Set<string>(packageSurface.files);
  const routeEdges = new Map<string, PackageRouteEdge>();
  const canonicalizePackageFilePath = (filePath: string): string =>
    canonicalizeSourceBackedPackageFile(profile, analysis.root, filePath);
  const declarationsByFile = packageSurface.declarationsByFile;
  const exportRecordsByFile = packageSurface.exportRecordsByFile;
  // TODO: If uncovered files need to influence route reasoning again, spend
  // them as explicit blindspot evidence/evaluator inputs rather than promoting
  // them back into the canonical package file surface.

  for (const edge of analysis.deps.edges) {
    const sourcePath = canonicalizePackageFilePath(edge.source);
    const targetPath = canonicalizePackageFilePath(edge.target);
    const sourceInPackage = packageFiles.has(sourcePath);
    const targetInPackage = packageFiles.has(targetPath);
    if (!sourceInPackage && !targetInPackage) continue;

    if (sourceInPackage && targetInPackage) {
      addRouteEdge(
        routeEdges,
        createRouteEdge(
          'dependency-import',
          sourcePath,
          targetPath,
          'grounded',
          'Static package-local import captured in the deps analysis view.',
          `${edge.specifier} @ line ${edge.line}`,
        ),
      );
    }
  }
  const manifestPublicApiRoots = resolveManifestPublicApiRoots(
    profile,
    analysis.root,
    pkg,
    packageFiles,
  );

  for (const edge of discoverExecutableHandoffEdges(
    profile,
    analysis.root,
    pkg.package_dir,
    packageFiles,
  )) {
    addRouteEdge(routeEdges, edge);
  }

  const outboundByFile = new Map<string, Set<string>>();
  const inboundByFile = new Map<string, Set<string>>();
  const outboundEdgesByFile = new Map<string, PackageRouteEdge[]>();
  for (const edge of routeEdges.values()) {
    addSetValue(outboundByFile, edge.fromFilePath, edge.toFilePath);
    addSetValue(inboundByFile, edge.toFilePath, edge.fromFilePath);
    const existing = outboundEdgesByFile.get(edge.fromFilePath) ?? [];
    existing.push(edge);
    outboundEdgesByFile.set(edge.fromFilePath, existing);
  }

  const publicSurfaceFiles = new Set<string>([
    pkg.analysis_entrypoint,
    ...exportRecordsByFile.keys(),
    ...manifestPublicApiRoots.map((root) => root.filePath),
  ]);
  const roots = new Map<string, PackageRoot>();

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
  for (const root of manifestPublicApiRoots) {
    addRoot(roots, root);
  }

  for (const root of resolveManifestBinRoots(profile, analysis.root, pkg, packageFiles)) {
    addRoot(roots, root);
  }

  const exerciseFiles = [...packageFiles]
    .filter((filePath) => isExerciseFile(profile, pkg.package_dir, filePath))
    .sort((left, right) => left.localeCompare(right));
  for (const filePath of exerciseFiles) {
    addRoot(
      roots,
      createRoot(
        'exercise',
        filePath,
        'grounded',
        'This file is a test/exercise root with grounded structural file coverage.',
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

  const rootsByFilePath = new Map<string, PackageRoot[]>();
  for (const root of roots.values()) {
    const existing = rootsByFilePath.get(root.filePath) ?? [];
    existing.push(root);
    rootsByFilePath.set(root.filePath, existing);
  }

  const routeWitnessesByFilePath = computeRouteWitnesses(
    packageFiles,
    outboundEdgesByFile,
    roots.values(),
    ordering,
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
      } satisfies PackageFileReachability;
    });

  return {
    pkg,
    files,
    filesByPath: new Map(files.map((file) => [file.filePath, file])),
    roots: [...roots.values()].sort((left, right) =>
      compareByPrecedence(ordering.rootKind, left.kind, right.kind)
      || compareStringsAscending(left.filePath, right.filePath),
    ),
    rootsByFilePath: new Map(
      [...rootsByFilePath.entries()].map(([filePath, fileRoots]) => [
        filePath,
        [...fileRoots].sort((left, right) =>
          compareByPrecedence(ordering.rootKind, left.kind, right.kind)
          || compareStringsAscending(left.filePath, right.filePath),
        ),
      ]),
    ),
    routeEdges: [...routeEdges.values()].sort((left, right) =>
      compareByPrecedence(ordering.trust, left.trust, right.trust)
      || compareByPrecedence(ordering.routeKind, left.kind, right.kind)
      || compareStringsAscending(left.fromFilePath, right.fromFilePath)
      || compareStringsAscending(left.toFilePath, right.toFilePath),
    ),
    routeWitnessesByFilePath: new Map(
      [...routeWitnessesByFilePath.entries()].map(([filePath, witnesses]) => [
        filePath,
        [...witnesses].sort((left, right) => compareRouteWitnesses(left, right, ordering)),
      ]),
    ),
    publicSurfaceFiles: [...publicSurfaceFiles].sort((left, right) => left.localeCompare(right)),
    candidateEntryFiles,
    exerciseFiles,
  };
}

export function getPackageRouteWitnesses(
  reachability: PackageReachability,
  filePath: string,
): readonly PackageRouteWitness[] {
  return reachability.routeWitnessesByFilePath.get(filePath) ?? [];
}

function resolveManifestBinRoots(
  profile: AnalysisProfile,
  repoRoot: string,
  pkg: PackageExportsSummary,
  packageFiles: ReadonlySet<string>,
): readonly PackageRoot[] {
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
      const filePath = resolveManifestTargetToSourceFile(profile, pkg.package_dir, entry.target, packageFiles);
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

function resolveManifestPublicApiRoots(
  profile: AnalysisProfile,
  repoRoot: string,
  pkg: PackageExportsSummary,
  packageFiles: ReadonlySet<string>,
): readonly PackageRoot[] {
  const packageJsonPath = join(repoRoot, pkg.package_dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      readonly exports?: unknown;
    };
    const exportEntries = normalizeManifestExportEntries(manifest.exports);
    return exportEntries.flatMap((entry) => {
      const filePath = resolveManifestTargetToSourceFile(profile, pkg.package_dir, entry.target, packageFiles);
      if (!filePath) return [];
      return [createRoot(
        'public-api',
        filePath,
        'grounded',
        'Package manifest exposes this file as a public import surface.',
        `${entry.subpath} -> ${entry.target}`,
      )];
    });
  } catch {
    return [];
  }
}

function discoverExecutableHandoffEdges(
  profile: AnalysisProfile,
  repoRoot: string,
  packageDir: string,
  packageFiles: ReadonlySet<string>,
): readonly PackageRouteEdge[] {
  const edges: PackageRouteEdge[] = [];

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
      const targetFilePath = resolveManifestTargetToSourceFile(profile, packageDir, handoffTarget, packageFiles);
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

function normalizeManifestExportEntries(
  value: unknown,
): ReadonlyArray<{ readonly subpath: string; readonly target: string }> {
  const entries: Array<{ readonly subpath: string; readonly target: string }> = [];

  function visit(subpath: string, node: unknown): void {
    if (typeof node === 'string') {
      entries.push({ subpath, target: node });
      return;
    }
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (subpath === '.' && key.startsWith('.')) {
        visit(key, child);
        continue;
      }
      visit(subpath, child);
    }
  }

  visit('.', value);
  return entries
    .filter((entry) => entry.target.includes('/out/') || entry.target.startsWith('./out/'))
    .sort((left, right) =>
      left.subpath.localeCompare(right.subpath) || left.target.localeCompare(right.target),
    );
}

function resolveManifestTargetToSourceFile(
  profile: AnalysisProfile,
  packageDir: string,
  target: string,
  packageFiles: ReadonlySet<string>,
): string | null {
  const normalized = normalizeRepoRelativePath(packageDir, target);
  const baseCandidates = expandMappedRepoRelativePathCandidates(profile, normalized);
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

function canonicalizeSourceBackedPackageFile(
  profile: AnalysisProfile,
  repoRoot: string,
  filePath: string,
): string {
  const candidates = dedupeStrings(expandMappedRepoRelativePathCandidates(profile, filePath).flatMap((candidate) => [
    candidate,
    candidate.replace(/\.d\.[cm]?ts$/i, '.ts'),
    candidate.replace(/\.[cm]?js$/i, '.ts'),
    candidate.replace(/\.[cm]?js$/i, '.tsx'),
    candidate.replace(/\.[cm]?js$/i, '.mts'),
    candidate.replace(/\.[cm]?js$/i, '.cts'),
  ]));

  for (const candidate of candidates) {
    if (existsSync(join(repoRoot, candidate))) {
      return candidate;
    }
  }

  return filePath;
}

function normalizeRepoRelativePath(packageDir: string, pathValue: string): string {
  const trimmed = pathValue.replace(/\\/g, '/').replace(/^\.\//, '');
  return packageDir.length > 0
    ? `${packageDir}/${trimmed}`.replace(/\/{2,}/g, '/')
    : trimmed;
}

function createRoot(
  kind: PackageRootKind,
  filePath: string,
  trust: TrustKind,
  summary: string,
  detail?: string,
): PackageRoot {
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
  kind: PackageRouteKind,
  fromFilePath: string,
  toFilePath: string,
  trust: TrustKind,
  summary: string,
  detail?: string,
): PackageRouteEdge {
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
  roots: Map<string, PackageRoot>,
  root: PackageRoot,
): void {
  if (!roots.has(root.id)) {
    roots.set(root.id, root);
  }
}

function addRouteEdge(
  routeEdges: Map<string, PackageRouteEdge>,
  edge: PackageRouteEdge,
): void {
  if (!routeEdges.has(edge.id)) {
    routeEdges.set(edge.id, edge);
  }
}

function computeRouteWitnesses(
  packageFiles: ReadonlySet<string>,
  outboundEdgesByFile: ReadonlyMap<string, readonly PackageRouteEdge[]>,
  roots: Iterable<PackageRoot>,
  ordering: InquiryOrdering,
): ReadonlyMap<string, readonly PackageRouteWitness[]> {
  const routeWitnessesByFilePath = new Map<string, PackageRouteWitness[]>();
  for (const filePath of packageFiles) {
    routeWitnessesByFilePath.set(filePath, []);
  }

  for (const root of roots) {
    const bestByFile = new Map<string, RouteScore>();
    const previousEdgeByFile = new Map<string, PackageRouteEdge | null>();
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
      [...witnesses].sort((left, right) => compareRouteWitnesses(left, right, ordering)),
    ]),
  );
}

function createRouteWitness(
  root: PackageRoot,
  filePath: string,
  score: RouteScore,
  previousEdgeByFile: ReadonlyMap<string, PackageRouteEdge | null>,
): PackageRouteWitness {
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
  previousEdgeByFile: ReadonlyMap<string, PackageRouteEdge | null>,
): readonly PackageRouteStep[] {
  if (filePath === rootFilePath) {
    return [];
  }

  const reversed: PackageRouteStep[] = [];
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
  root: PackageRoot,
  filePath: string,
  steps: readonly PackageRouteStep[],
  trust: TrustKind,
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

function isExerciseFile(
  profile: AnalysisProfile,
  packageDir: string,
  filePath: string,
): boolean {
  if (!filePath.startsWith(packageDir.length > 0 ? `${packageDir}/` : '')) {
    return false;
  }
  return isExercisePath(profile, filePath);
}

function rootIdForFile(kind: PackageRootKind, filePath: string): string {
  return `${kind}:${filePath}`;
}

function routeClassForRootKind(kind: PackageRootKind): PackageRouteClass {
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

function dedupeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function compareRouteWitnesses(
  left: PackageRouteWitness,
  right: PackageRouteWitness,
  ordering: InquiryOrdering,
): number {
  return compareByPrecedence(ordering.routeClass, left.routeClass, right.routeClass)
    || compareByPrecedence(ordering.trust, left.trust, right.trust)
    || left.stepCount - right.stepCount
    || compareStringsAscending(left.rootFilePath, right.rootFilePath)
    || compareStringsAscending(left.filePath, right.filePath);
}

interface RouteScore {
  readonly penalty: number;
  readonly steps: number;
}

interface RouteQueueEntry {
  readonly filePath: string;
  readonly score: RouteScore;
}

function routeScoreForTrust(trust: TrustKind): RouteScore {
  return {
    penalty: trust === 'grounded' ? 0 : 1,
    steps: 0,
  };
}

function addRouteScore(score: RouteScore, trust: TrustKind): RouteScore {
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

function trustForPenalty(penalty: number): TrustKind {
  return penalty === 0 ? 'grounded' : 'qualified';
}

function basename(filePath: string): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled reachability case: ${String(value)}`);
}
