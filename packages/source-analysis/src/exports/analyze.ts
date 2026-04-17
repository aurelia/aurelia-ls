import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ts from 'typescript';

import { createExportTraceRuntime } from '../export-trace-runtime-surface.js';
import { collectSnapshotFrontierEvidence } from '../frontier-evidence.js';
import type { ProgramReuseOptions } from '../program-reuse-options.js';
import { RepoSession } from '../repo-session.js';
import {
  classifyExportSymbol,
  type ExportSymbolClassification,
} from '../semantic/export-symbol-surface.js';
import { describeSnapshotProfile } from '../snapshots.js';
import {
  buildStructuralClaimGraph,
  type PackageClaim,
  type StructuralClaimGraphRuntime,
} from '../structural-claim-graph.js';
import type {
  ExportsOutput,
  PackageExportRecord,
  PackageExportsSummary,
} from './schema.js';

interface ExportsAnalysisScope {
  readonly session: RepoSession;
  readonly repoPath: string;
  readonly runtime: StructuralClaimGraphRuntime;
  readonly workspacePackageEntrypointsByName: ReadonlyMap<string, string>;
}

export interface ExportsAnalysisResult {
  output: ExportsOutput;
  reportLines: string[];
  warnings: string[];
}

function gitHead(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execFileSync('git', ['hash-object', filePath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function resolveTsconfigForPackage(
  scope: ExportsAnalysisScope,
  packageDir: string,
): string | null {
  return scope.session.resolveNearestTsconfig(packageDir);
}

function createFallbackProgram(entrypointAbs: string): ts.Program {
  return ts.createProgram(
    [entrypointAbs],
    {
      allowJs: false,
      checkJs: false,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
    },
  );
}

function createPackageProgram(
  scope: ExportsAnalysisScope,
  packageClaim: PackageClaim,
  options: ProgramReuseOptions,
): ts.Program {
  const entrypointAbs = resolve(scope.repoPath, packageClaim.attributes.analysisEntrypoint);
  const tsconfigPath = resolveTsconfigForPackage(scope, packageClaim.attributes.packageDir);

  if (!tsconfigPath) {
    return createFallbackProgram(entrypointAbs);
  }

  const loaded = scope.session.tryLoadTsconfig(tsconfigPath);
  if (!loaded.snapshot) {
    return createFallbackProgram(entrypointAbs);
  }

  try {
    return scope.session.getProgram(loaded.snapshot.absPath, 'analysis', {
      cache: options.cachePrograms,
    }) ?? createFallbackProgram(entrypointAbs);
  } catch {
    return createFallbackProgram(entrypointAbs);
  }
}

function getModuleSymbol(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): ts.Symbol | null {
  const direct = (sourceFile as ts.SourceFile & { symbol?: ts.Symbol }).symbol;
  return direct ?? checker.getSymbolAtLocation(sourceFile) ?? null;
}

function computePackageRevision(
  scope: ExportsAnalysisScope,
  files: Iterable<string>,
): string {
  const hash = createHash('sha1');

  for (const relPath of [...new Set(files)].sort()) {
    hash.update(relPath);
    hash.update('\0');

    const absPath = resolve(scope.repoPath, relPath);
    if (!existsSync(absPath)) {
      hash.update('(missing)');
      hash.update('\0');
      continue;
    }

    hash.update(readFileSync(absPath));
    hash.update('\0');
  }

  return hash.digest('hex');
}

function createEmptyPackageSummary(
  scope: ExportsAnalysisScope,
  packageClaim: PackageClaim,
): PackageExportsSummary {
  return {
    package_name: packageClaim.attributes.packageName,
    package_dir: packageClaim.attributes.packageDir,
    package_revision: computePackageRevision(scope, [
      packageClaim.attributes.packageJsonPath,
      packageClaim.attributes.analysisEntrypoint,
      packageClaim.attributes.sourceEntrypoint ?? '',
      packageClaim.attributes.publicTypesEntrypoint ?? '',
    ].filter(Boolean)),
    analysis_basis: packageClaim.attributes.analysisBasis,
    analysis_entrypoint: packageClaim.attributes.analysisEntrypoint,
    source_entrypoint: packageClaim.attributes.sourceEntrypoint,
    public_types_entrypoint: packageClaim.attributes.publicTypesEntrypoint,
    export_count: 0,
    type_only_export_count: 0,
    value_export_count: 0,
    merged_export_count: 0,
  };
}

function analyzePackage(
  scope: ExportsAnalysisScope,
  packageClaim: PackageClaim,
  options: ProgramReuseOptions,
): {
  summary: PackageExportsSummary;
  records: PackageExportRecord[];
} {
  const program = createPackageProgram(scope, packageClaim, options);
  const checker = program.getTypeChecker();
  const exportTraceRuntime = createExportTraceRuntime({
    repoPath: scope.repoPath,
    repoSession: scope.session,
    structuralRuntime: scope.runtime,
    program,
    checker,
    compilerOptions: program.getCompilerOptions(),
    workspacePackageEntrypointsByName: scope.workspacePackageEntrypointsByName,
  });

  const entrypointSourceFile = exportTraceRuntime.getSourceFile(packageClaim.attributes.analysisEntrypoint);
  const entrypointModuleSymbol = entrypointSourceFile
    ? getModuleSymbol(checker, entrypointSourceFile)
    : null;

  if (!entrypointSourceFile || !entrypointModuleSymbol) {
    return {
      summary: createEmptyPackageSummary(scope, packageClaim),
      records: [],
    };
  }

  const packageFiles = new Set<string>([
    packageClaim.attributes.packageJsonPath,
    packageClaim.attributes.analysisEntrypoint,
  ]);
  if (packageClaim.attributes.sourceEntrypoint) packageFiles.add(packageClaim.attributes.sourceEntrypoint);
  if (packageClaim.attributes.publicTypesEntrypoint) packageFiles.add(packageClaim.attributes.publicTypesEntrypoint);

  const exportSymbols = checker
    .getExportsOfModule(entrypointModuleSymbol)
    .filter((symbol) => symbol.getName() !== '__esModule')
    .sort((left, right) => left.getName().localeCompare(right.getName()));

  const records: PackageExportRecord[] = exportSymbols.map((exportSymbol) => {
    const exportedName = exportSymbol.getName();
    const trace = exportTraceRuntime.traceExport(
      packageClaim.attributes.analysisEntrypoint,
      exportedName,
    );
    const classification: ExportSymbolClassification = classifyExportSymbol(scope, checker, exportSymbol);

    if (trace) {
      for (const step of trace.chain) {
        packageFiles.add(step.file);
        if (step.target_file) packageFiles.add(step.target_file);
      }
    }
    if (classification.declarationFile) {
      packageFiles.add(classification.declarationFile);
    }

    const typeOnly = trace?.typeOnly ?? (!classification.valueExported && classification.typeExported);
    const originalName = trace?.originalName ?? classification.declarationName ?? exportedName;
    const tracedDeclaration = trace?.chain.at(-1)?.kind === 'local-declaration'
      ? trace.chain.at(-1)
      : null;
    const declarationFile = tracedDeclaration?.file ?? classification.declarationFile;
    const declarationLine = tracedDeclaration?.line ?? classification.declarationLine;
    const declarationName = tracedDeclaration?.original_name
      ?? tracedDeclaration?.exported_name
      ?? classification.declarationName
      ?? originalName;

    return {
      package_name: packageClaim.attributes.packageName,
      package_dir: packageClaim.attributes.packageDir,
      analysis_basis: packageClaim.attributes.analysisBasis,
      analysis_entrypoint: packageClaim.attributes.analysisEntrypoint,
      exported_name: exportedName,
      original_name: originalName,
      declaration_name: declarationName,
      source_module: declarationFile,
      declaration_file: declarationFile,
      declaration_line: declarationLine,
      type_only: typeOnly,
      type_exported: classification.typeExported || typeOnly,
      value_exported: !typeOnly && classification.valueExported,
      face_kind: classification.faceKind,
      face_kinds: classification.faceKinds,
      namespace_export: trace?.namespaceExport ?? false,
      chain: trace?.chain ?? [{
        file: packageClaim.attributes.analysisEntrypoint,
        line: 1,
        kind: 'fallback',
        exported_name: exportedName,
        original_name: originalName,
      }],
    };
  });

  const typeOnlyExportCount = records.filter((record) => record.type_only).length;
  const valueExportCount = records.filter((record) => record.value_exported).length;
  const mergedExportCount = records.filter((record) => record.face_kind === 'merged').length;

  return {
    summary: {
      package_name: packageClaim.attributes.packageName,
      package_dir: packageClaim.attributes.packageDir,
      package_revision: computePackageRevision(scope, packageFiles),
      analysis_basis: packageClaim.attributes.analysisBasis,
      analysis_entrypoint: packageClaim.attributes.analysisEntrypoint,
      source_entrypoint: packageClaim.attributes.sourceEntrypoint,
      public_types_entrypoint: packageClaim.attributes.publicTypesEntrypoint,
      export_count: records.length,
      type_only_export_count: typeOnlyExportCount,
      value_export_count: valueExportCount,
      merged_export_count: mergedExportCount,
    },
    records,
  };
}

export function generateExportsAnalysis(
  nextSession: RepoSession,
  options: ProgramReuseOptions = {},
): ExportsAnalysisResult {
  const runtime = buildStructuralClaimGraph(nextSession);
  return generateExportsAnalysisFromRuntime(nextSession, runtime, options);
}

export function generateExportsAnalysisFromRuntime(
  nextSession: RepoSession,
  runtime: StructuralClaimGraphRuntime,
  options: ProgramReuseOptions = {},
): ExportsAnalysisResult {
  const workspacePackageEntrypointsByName = new Map<string, string>();
  for (const packageClaim of runtime.index.packages) {
    workspacePackageEntrypointsByName.set(
      packageClaim.attributes.packageName,
      packageClaim.attributes.sourceEntrypoint ?? packageClaim.attributes.analysisEntrypoint,
    );
  }

  const scope: ExportsAnalysisScope = {
    session: nextSession,
    repoPath: nextSession.repoPath,
    runtime,
    workspacePackageEntrypointsByName,
  };

  const packageAnalyses = runtime.index.packages.map((packageClaim) => analyzePackage(scope, packageClaim, options));
  const packageSummaries = packageAnalyses
    .map((analysis) => analysis.summary)
    .sort((left, right) => left.package_name.localeCompare(right.package_name));
  const exportRecords = packageAnalyses
    .flatMap((analysis) => analysis.records)
    .sort((left, right) =>
      left.package_name.localeCompare(right.package_name)
      || left.exported_name.localeCompare(right.exported_name),
    );
  const frontiers = collectSnapshotFrontierEvidence(nextSession);

  const output: ExportsOutput = {
    root: scope.repoPath,
    generated_at: new Date().toISOString(),
    source_commit: gitHead(scope.repoPath),
    analyzer_commit: gitBlobHash(resolve(import.meta.dirname!, 'analyze.js')),
    profile: describeSnapshotProfile(nextSession.profile),
    frontiers,
    summary: {
      packages_analyzed: packageSummaries.length,
      exports: exportRecords.length,
      type_only_exports: exportRecords.filter((record) => record.type_only).length,
      value_exports: exportRecords.filter((record) => record.value_exported).length,
      merged_exports: exportRecords.filter((record) => record.face_kind === 'merged').length,
    },
    packages: packageSummaries,
    exports: exportRecords,
  };

  const reportLines = [
    '',
    `Snapshot target:    ${output.profile.target}`,
    `Profile:            ${output.profile.profileId}${output.profile.profilePath ? ` (${output.profile.profilePath})` : ''}`,
    `Excluded prefixes:  ${output.profile.excludedRepoRelativePrefixes.length}`,
    `Named frontiers:    ${output.frontiers.excluded_frontiers.length}`,
    '',
    `Packages analyzed: ${packageSummaries.length}`,
    `Exports:           ${output.summary.exports}`,
    `Type-only exports: ${output.summary.type_only_exports}`,
    `Value exports:     ${output.summary.value_exports}`,
    `Merged exports:    ${output.summary.merged_exports}`,
    '',
  ];

  return {
    output,
    reportLines,
    warnings: [...runtime.graph.warnings, ...frontiers.warnings],
  };
}
