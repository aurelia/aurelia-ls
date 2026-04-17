import { existsSync, readdirSync, realpathSync, type Dirent } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import * as ts from 'typescript';

import type { AnalysisProfile } from './analysis-profile.js';
import type { RepoSession } from './repo-session.js';
import {
  type SnapshotExcludedBoundaryEdgeKind,
  type SnapshotExcludedBoundaryReference,
  type SnapshotExcludedFrontierEvidence,
  type SnapshotFrontierEvidence,
} from './snapshots.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFileScanResult,
} from './tsconfig-source-files.js';

interface PrefixSurfaceStats {
  readonly sourceFileCount: number;
  readonly packageCount: number;
}

const SOURCE_FILE_PATTERN = /\.(d\.ts|tsx?|mts|cts)$/i;
const SKIP_DIRS = new Set(['.git', 'node_modules']);

const MODULE_RESOLUTION_HOST: ts.ModuleResolutionHost = {
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  directoryExists: ts.sys.directoryExists,
  getCurrentDirectory: () => process.cwd(),
  getDirectories: ts.sys.getDirectories,
  realpath: ts.sys.realpath,
};

export function collectSnapshotFrontierEvidence(
  session: RepoSession,
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): SnapshotFrontierEvidence {
  const profile = session.profile;
  if (profile.excludedRepoRelativePrefixes.length === 0) {
    return {
      excluded_frontiers: [],
      warnings: [],
    };
  }

  const boundaryReferencesByPrefix = collectExcludedBoundaryReferences(session, profile, sourceFileScan);
  const excludedFrontiers = profile.excludedRepoRelativePrefixes
    .map((prefix) => {
      const stats = inspectPrefixSurface(profile.repoPath, prefix);
      const boundaryReferences = boundaryReferencesByPrefix.references.get(prefix) ?? [];
      if (
        stats.sourceFileCount === 0
        && stats.packageCount === 0
        && boundaryReferences.length === 0
      ) {
        return null;
      }

      return {
        prefix,
        source_file_count: stats.sourceFileCount,
        package_count: stats.packageCount,
        inbound_boundary_count: boundaryReferences.length,
        boundary_references: boundaryReferences,
      } satisfies SnapshotExcludedFrontierEvidence;
    })
    .filter((frontier): frontier is SnapshotExcludedFrontierEvidence => frontier !== null)
    .sort((left, right) =>
      right.inbound_boundary_count - left.inbound_boundary_count
      || right.source_file_count - left.source_file_count
      || left.prefix.localeCompare(right.prefix)
    );

  return {
    excluded_frontiers: excludedFrontiers,
    warnings: boundaryReferencesByPrefix.warnings,
  };
}

export function snapshotFrontierEvidenceHasContent(
  evidence: SnapshotFrontierEvidence | null | undefined,
): evidence is SnapshotFrontierEvidence {
  return Boolean(
    evidence
    && (evidence.excluded_frontiers.length > 0 || evidence.warnings.length > 0),
  );
}

function collectExcludedBoundaryReferences(
  session: RepoSession,
  profile: AnalysisProfile,
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): {
  readonly references: ReadonlyMap<string, readonly SnapshotExcludedBoundaryReference[]>;
  readonly warnings: readonly string[];
} {
  const seenFiles = new Set<string>();
  const seenReferences = new Set<string>();
  const referencesByPrefix = new Map<string, SnapshotExcludedBoundaryReference[]>();
  const scan = sourceFileScan ?? scanParsedTsconfigSourceFiles(session);
  const warnings = [...scan.warnings];

  for (const batch of scan.batches) {
    const resolutionCache = ts.createModuleResolutionCache(
      batch.snapshot.configDir,
      (value) => value.toLowerCase(),
      batch.snapshot.parsed.options,
    );

    for (const file of batch.sourceFiles) {
      if (seenFiles.has(file.relPath)) {
        continue;
      }
      seenFiles.add(file.relPath);
      collectFileBoundaryReferences(
        file.sourceFile,
        file.relPath,
        batch.snapshot.parsed.options,
        resolutionCache,
        session,
        profile,
        referencesByPrefix,
        seenReferences,
      );
    }
  }

  return {
    references: new Map(
      [...referencesByPrefix.entries()].map(([prefix, references]) => [
        prefix,
        [...references].sort((left, right) =>
          left.source.localeCompare(right.source)
          || left.line - right.line
          || left.target.localeCompare(right.target),
        ),
      ]),
    ),
    warnings,
  };
}

function collectFileBoundaryReferences(
  sourceFile: ts.SourceFile,
  sourceRel: string,
  compilerOptions: ts.CompilerOptions,
  resolutionCache: ts.ModuleResolutionCache,
  session: RepoSession,
  profile: AnalysisProfile,
  referencesByPrefix: Map<string, SnapshotExcludedBoundaryReference[]>,
  seenReferences: Set<string>,
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const typeOnly = node.importClause?.isTypeOnly ?? false;
      recordBoundaryReference(
        'import',
        node.moduleSpecifier,
        sourceFile,
        sourceRel,
        compilerOptions,
        resolutionCache,
        session,
        profile,
        line,
        typeOnly,
        referencesByPrefix,
        seenReferences,
      );
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      recordBoundaryReference(
        'reexport',
        node.moduleSpecifier,
        sourceFile,
        sourceRel,
        compilerOptions,
        resolutionCache,
        session,
        profile,
        line,
        node.isTypeOnly,
        referencesByPrefix,
        seenReferences,
      );
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length > 0
    ) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      recordBoundaryReference(
        'dynamic-import',
        node.arguments[0]!,
        sourceFile,
        sourceRel,
        compilerOptions,
        resolutionCache,
        session,
        profile,
        line,
        false,
        referencesByPrefix,
        seenReferences,
      );
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
}

function recordBoundaryReference(
  edgeKind: SnapshotExcludedBoundaryEdgeKind,
  specNode: ts.Expression,
  sourceFile: ts.SourceFile,
  sourceRel: string,
  compilerOptions: ts.CompilerOptions,
  resolutionCache: ts.ModuleResolutionCache,
  session: RepoSession,
  profile: AnalysisProfile,
  line: number,
  typeOnly: boolean,
  referencesByPrefix: Map<string, SnapshotExcludedBoundaryReference[]>,
  seenReferences: Set<string>,
): void {
  if (!ts.isStringLiteral(specNode)) {
    return;
  }

  const resolved = resolveExcludedBoundaryTarget(
    specNode.text,
    sourceFile.fileName,
    compilerOptions,
    resolutionCache,
    session,
    profile,
  );
  if (!resolved) {
    return;
  }

  const key = [
    sourceRel,
    line,
    edgeKind,
    specNode.text,
    resolved.target,
  ].join('\0');
  if (seenReferences.has(key)) {
    return;
  }
  seenReferences.add(key);

  const entry: SnapshotExcludedBoundaryReference = {
    source: sourceRel,
    target: resolved.target,
    specifier: specNode.text,
    line,
    edge_kind: edgeKind,
    type_only: typeOnly,
    excluded_prefix: resolved.prefix,
  };
  const bucket = referencesByPrefix.get(resolved.prefix) ?? [];
  bucket.push(entry);
  referencesByPrefix.set(resolved.prefix, bucket);
}

function resolveExcludedBoundaryTarget(
  specifier: string,
  fromFileName: string,
  compilerOptions: ts.CompilerOptions,
  resolutionCache: ts.ModuleResolutionCache,
  session: RepoSession,
  profile: AnalysisProfile,
): { readonly prefix: string; readonly target: string } | null {
  const resolved = ts.resolveModuleName(
    specifier,
    fromFileName,
    compilerOptions,
    MODULE_RESOLUTION_HOST,
    resolutionCache,
  ).resolvedModule;

  if (!resolved) {
    return null;
  }

  if (resolved.isExternalLibraryImport) {
    try {
      const real = realpathSync(resolved.resolvedFileName);
      const rel = toForwardSlash(relative(profile.repoPath, real));
      if (rel.startsWith('..') || rel.includes('node_modules/')) {
        return null;
      }
      const prefix = matchingExcludedPrefix(profile, rel);
      return prefix ? { prefix, target: rel } : null;
    } catch {
      return null;
    }
  }

  const rel = session.toRepoRelative(resolve(resolved.resolvedFileName));
  if (rel.startsWith('..') || rel.includes('node_modules/')) {
    return null;
  }
  const prefix = matchingExcludedPrefix(profile, rel);
  return prefix ? { prefix, target: rel } : null;
}

function inspectPrefixSurface(
  repoPath: string,
  prefix: string,
): PrefixSurfaceStats {
  const absPath = resolve(repoPath, prefix);
  if (!existsSync(absPath)) {
    return {
      sourceFileCount: 0,
      packageCount: 0,
    };
  }

  return walkPrefix(absPath);
}

function walkPrefix(
  absPath: string,
): PrefixSurfaceStats {
  let sourceFileCount = 0;
  let packageCount = 0;
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(absPath, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    return {
      sourceFileCount: 0,
      packageCount: 0,
    };
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        const nested = walkPrefix(join(absPath, entry.name));
        sourceFileCount += nested.sourceFileCount;
        packageCount += nested.packageCount;
      }
      continue;
    }

    if (entry.name === 'package.json') {
      packageCount += 1;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      sourceFileCount += 1;
    }
  }

  return {
    sourceFileCount,
    packageCount,
  };
}

function matchingExcludedPrefix(
  profile: AnalysisProfile,
  pathValue: string,
): string | null {
  const normalized = pathValue.replace(/\\/g, '/');
  let bestMatch: string | null = null;
  for (const prefix of profile.excludedRepoRelativePrefixes) {
    if (
      normalized === prefix
      || normalized.startsWith(`${prefix}/`)
    ) {
      if (!bestMatch || prefix.length > bestMatch.length) {
        bestMatch = prefix;
      }
    }
  }
  return bestMatch;
}

function toForwardSlash(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}
