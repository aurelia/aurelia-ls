import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

export type SourceAnalysisPackageRootKind =
  typeof SOURCE_ANALYSIS_PACKAGE_ROOT_KINDS[number];

export interface SourceAnalysisPackageRoot {
  readonly id: string;
  readonly kind: SourceAnalysisPackageRootKind;
  readonly filePath: string;
  readonly trust: SourceAnalysisTrustKind;
  readonly summary: string;
  readonly detail?: string;
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
  readonly publicSurface: boolean;
}

export interface SourceAnalysisPackageReachability {
  readonly pkg: PackageExportsSummary;
  readonly files: readonly SourceAnalysisPackageFileReachability[];
  readonly filesByPath: ReadonlyMap<string, SourceAnalysisPackageFileReachability>;
  readonly roots: readonly SourceAnalysisPackageRoot[];
  readonly rootsByFilePath: ReadonlyMap<string, readonly SourceAnalysisPackageRoot[]>;
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
  const outboundByFile = new Map<string, Set<string>>();
  const inboundByFile = new Map<string, Set<string>>();

  for (const edge of snapshots.deps.edges) {
    const sourceInPackage = edge.source.startsWith(packagePrefix);
    const targetInPackage = edge.target.startsWith(packagePrefix);
    if (!sourceInPackage && !targetInPackage) continue;

    if (sourceInPackage) packageFiles.add(edge.source);
    if (targetInPackage) packageFiles.add(edge.target);

    if (sourceInPackage && targetInPackage) {
      addSetValue(outboundByFile, edge.source, edge.target);
      addSetValue(inboundByFile, edge.target, edge.source);
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
  for (const uncoveredFile of snapshots.deps.uncovered_files) {
    if (uncoveredFile.startsWith(packagePrefix)) {
      packageFiles.add(uncoveredFile);
    }
  }

  applyExecutableHandoffEdges(
    snapshots.deps.root,
    pkg.package_dir,
    packageFiles,
    outboundByFile,
    inboundByFile,
  );

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
        'Nothing in the package imports this file, but it still drives package-local edges.',
      ),
    );
  }

  const rootsByFilePath = new Map<string, SourceAnalysisPackageRoot[]>();
  for (const root of roots.values()) {
    const existing = rootsByFilePath.get(root.filePath) ?? [];
    existing.push(root);
    rootsByFilePath.set(root.filePath, existing);
  }

  const reachableRootIdsByFile = computeReachableRoots(packageFiles, outboundByFile, roots.values());
  const files = [...packageFiles]
    .sort((left, right) => left.localeCompare(right))
    .map((filePath) => {
      const rootIds = [...(reachableRootIdsByFile.get(filePath) ?? new Set<string>())].sort((left, right) =>
        left.localeCompare(right),
      );
      const groundedRootIds = rootIds.filter((rootId) => (roots.get(rootId)?.trust ?? 'unavailable') === 'grounded');
      const qualifiedRootIds = rootIds.filter((rootId) => (roots.get(rootId)?.trust ?? 'unavailable') !== 'grounded');
      return {
        filePath,
        inboundFiles: sortedSetValues(inboundByFile.get(filePath)),
        outboundFiles: sortedSetValues(outboundByFile.get(filePath)),
        declarationCount: declarationsByFile.get(filePath)?.length ?? 0,
        exportCount: exportRecordsByFile.get(filePath)?.length ?? 0,
        rootIds,
        groundedRootIds,
        qualifiedRootIds,
        publicSurface: publicSurfaceFiles.has(filePath),
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
    publicSurfaceFiles: [...publicSurfaceFiles].sort((left, right) => left.localeCompare(right)),
    candidateEntryFiles,
    exerciseFiles,
  };
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

function applyExecutableHandoffEdges(
  repoRoot: string,
  packageDir: string,
  packageFiles: ReadonlySet<string>,
  outboundByFile: Map<string, Set<string>>,
  inboundByFile: Map<string, Set<string>>,
): void {
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
      const targetFile = resolveManifestTargetToSourceFile(packageDir, handoffTarget, packageFiles);
      if (!targetFile || targetFile === filePath) continue;
      addSetValue(outboundByFile, filePath, targetFile);
      addSetValue(inboundByFile, targetFile, filePath);
    }
  }
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

function addRoot(
  roots: Map<string, SourceAnalysisPackageRoot>,
  root: SourceAnalysisPackageRoot,
): void {
  if (!roots.has(root.id)) {
    roots.set(root.id, root);
  }
}

function computeReachableRoots(
  packageFiles: ReadonlySet<string>,
  outboundByFile: ReadonlyMap<string, ReadonlySet<string>>,
  roots: Iterable<SourceAnalysisPackageRoot>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const reachableRootIdsByFile = new Map<string, Set<string>>();
  for (const filePath of packageFiles) {
    reachableRootIdsByFile.set(filePath, new Set<string>());
  }

  for (const root of roots) {
    const seen = new Set<string>();
    const queue = [root.filePath];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      const rootIds = reachableRootIdsByFile.get(current);
      if (rootIds) {
        rootIds.add(root.id);
      }
      for (const target of outboundByFile.get(current) ?? []) {
        if (!seen.has(target)) {
          queue.push(target);
        }
      }
    }
  }

  return reachableRootIdsByFile;
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
  return filePath.startsWith(`${packageDir}/test/`)
    || filePath.startsWith(`${packageDir}/tests/`)
    || /\.test\.[cm]?[jt]sx?$/i.test(filePath)
    || /\.spec\.[cm]?[jt]sx?$/i.test(filePath);
}

function rootIdForFile(kind: SourceAnalysisPackageRootKind, filePath: string): string {
  return `${kind}:${filePath}`;
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

function dedupeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function assertNever(value: never): never {
  throw new Error(`Unhandled reachability case: ${String(value)}`);
}
