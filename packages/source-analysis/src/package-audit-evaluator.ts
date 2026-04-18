import type { AnalysisViews } from './analysis-views.js';
import type { DependencySurface } from './dependency-surface.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { InquiryPolicy } from './inquiry-policy.js';
import {
  compareNumbersDescending,
  compareStringsAscending,
} from './ordering.js';
import { collectPartitionBindingCycles } from './partition-coupling.js';
import type {
  IssueSeverity,
  TrustKind,
} from './outcome-algebra.js';
import type {
  PackageFileReachability,
  PackageReachability,
} from './reachability.js';
import type { TypeDecl } from './typerefs/schema.js';

export const PACKAGE_AUDIT_SIGNAL_KINDS = [
  'blindspot',
  'under-integrated-file',
  'layer-cycle',
  'surface-drift',
] as const;

export type PackageAuditSignalKind =
  typeof PACKAGE_AUDIT_SIGNAL_KINDS[number];

export type PackageAuditSignalSubject =
  | {
    readonly kind: 'package';
    readonly pkg: PackageExportsSummary;
    readonly detail?: string;
  }
  | {
    readonly kind: 'file';
    readonly filePath: string;
    readonly detail?: string;
  }
  | {
    readonly kind: 'type-declaration';
    readonly declaration: TypeDecl;
    readonly detail?: string;
  };

export interface PackageAuditSignal {
  readonly code: string;
  readonly kind: PackageAuditSignalKind;
  readonly severity: IssueSeverity;
  readonly confidence: TrustKind;
  readonly title: string;
  readonly summary: string;
  readonly primarySubject: PackageAuditSignalSubject;
  readonly relatedSubjects: readonly PackageAuditSignalSubject[];
  readonly evidence: readonly string[];
}

export interface PackageAuditEvaluatorContext {
  readonly analysis: AnalysisViews;
  readonly pkg: PackageExportsSummary;
  readonly packageFiles: readonly string[];
  readonly uncoveredFiles: readonly string[];
  readonly unresolvedImports: readonly AnalysisViews['deps']['unresolved_imports'][number][];
  readonly declarationsByFile: ReadonlyMap<string, readonly TypeDecl[]>;
  readonly dependencySurface: DependencySurface;
  readonly reachability: PackageReachability;
  readonly policy: InquiryPolicy;
}

export function collectSharedPackageAuditSignals(
  context: PackageAuditEvaluatorContext,
): readonly PackageAuditSignal[] {
  return [
    collectUncoveredFilesSignal(context),
    collectUnresolvedImportsSignal(context),
    collectExerciseOnlyFilesSignal(context),
    collectPublicSurfaceUnexercisedSignal(context),
    collectSourceAreaCycleSignal(context),
    ...collectDormantFileSignals(context),
    collectUnanchoredCandidateRootsSignal(context),
  ].filter((signal): signal is PackageAuditSignal => Boolean(signal));
}

function collectUncoveredFilesSignal(
  context: PackageAuditEvaluatorContext,
): PackageAuditSignal | null {
  if (context.uncoveredFiles.length === 0) {
    return null;
  }

  const uncoveredExercises = context.uncoveredFiles.filter((filePath) =>
    context.reachability.exerciseFiles.includes(filePath),
  );
  const primaryPath = uncoveredExercises[0] ?? context.uncoveredFiles[0]!;
  const title = uncoveredExercises.length === context.uncoveredFiles.length
    ? 'Tests sit outside the graph coverage'
    : 'Some package files sit outside the graph coverage';
  const summary = uncoveredExercises.length === context.uncoveredFiles.length
    ? `${context.uncoveredFiles.length} test file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir} are outside every tsconfig, so they remain blindspot evidence rather than part of the structural source-file surface.`
    : `${context.uncoveredFiles.length} file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir} are outside every tsconfig, so the structural source-file surface still has a real blind spot.`;

  return {
    code: 'package-uncovered-files',
    kind: 'blindspot',
    severity: 'warning',
    confidence: 'grounded',
    title,
    summary,
    primarySubject: fileSubject(primaryPath, 'uncovered file'),
    relatedSubjects: context.uncoveredFiles.slice(0, 8).map((filePath) =>
      fileSubject(filePath, 'uncovered file'),
    ),
    evidence: [
      `${context.uncoveredFiles.length} uncovered file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir}.`,
      ...(uncoveredExercises.length > 0
        ? [`${uncoveredExercises.length} uncovered file${pluralize(uncoveredExercises.length)} currently classify as exercise-layout files, but they stay outside the canonical structural file surface.`]
        : []),
      ...context.uncoveredFiles.slice(0, 4).map((filePath) => `uncovered: ${filePath}`),
    ],
  };
}

function collectUnresolvedImportsSignal(
  context: PackageAuditEvaluatorContext,
): PackageAuditSignal | null {
  if (context.unresolvedImports.length === 0) {
    return null;
  }

  const first = context.unresolvedImports[0]!;
  return {
    code: 'package-unresolved-imports',
    kind: 'blindspot',
    severity: 'error',
    confidence: 'grounded',
    title: 'Some imports do not resolve in the current graph',
    summary: `${context.unresolvedImports.length} relative import${pluralize(context.unresolvedImports.length)} inside ${context.pkg.package_name} failed to resolve, so the dependency graph is missing expected edges.`,
    primarySubject: fileSubject(first.source, 'unresolved import source'),
    relatedSubjects: context.unresolvedImports.slice(0, 8).map((entry) =>
      fileSubject(entry.source, `${entry.specifier} @ line ${entry.line}`),
    ),
    evidence: context.unresolvedImports.slice(0, 4).map((entry) =>
      `${entry.source}:${entry.line} -> ${entry.specifier}`,
    ),
  };
}

function collectDormantFileSignals(
  context: PackageAuditEvaluatorContext,
): readonly PackageAuditSignal[] {
  const dormantFiles = context.reachability.files
    .filter((file) => isDormantCandidate(context, file))
    .slice(0, 3);

  return dormantFiles.map((file) => {
    const declarations = context.declarationsByFile.get(file.filePath) ?? [];
    const roots = context.reachability.rootsByFilePath.get(file.filePath) ?? [];
    const topWitnesses = file.routeWitnesses.slice(0, 3);
    return {
      code: 'under-integrated-file',
      kind: 'under-integrated-file' as const,
      severity: 'warning' as const,
      confidence: 'grounded' as const,
      title: `${basename(file.filePath)} looks parked rather than integrated`,
      summary: `${file.filePath} has no modeled production route through the public API or manifest-backed executables, is not on the public package surface, and still carries ${declarations.length} tracked declaration${pluralize(declarations.length)}.`,
      primarySubject: fileSubject(file.filePath, 'under-integrated file'),
      relatedSubjects: [
        packageSubject(context.pkg),
        ...declarations.slice(0, 4).map((declaration) => typeDeclarationSubject(declaration)),
      ],
      evidence: [
        `grounded production roots: ${file.groundedProductionRootIds.length}`,
        `qualified production roots: ${file.qualifiedProductionRootIds.length}`,
        `exercise roots: ${file.exerciseRootIds.length}`,
        `candidate roots: ${file.candidateRootIds.length}`,
        `public export records: ${file.exportCount}`,
        `tracked declarations: ${declarations.length}`,
        ...(roots.length > 0
          ? [`root roles: ${roots.map((root) => root.kind).join(', ')}`]
          : []),
        ...topWitnesses.map((witness) => `witness: ${witness.summary}`),
        ...(declarations.length > 0
          ? [`declared types: ${declarations.map((declaration) => declaration.name).join(', ')}`]
          : []),
      ],
    };
  });
}

function collectExerciseOnlyFilesSignal(
  context: PackageAuditEvaluatorContext,
): PackageAuditSignal | null {
  const exerciseOnlyFiles = context.reachability.files
    .filter((file) => isExerciseOnlyCandidate(context, file))
    .sort((left, right) =>
      compareFileAuditMetrics(context.policy.auditMetricOrders.exerciseOnly, left, right)
      || compareStringsAscending(left.filePath, right.filePath),
    );

  if (exerciseOnlyFiles.length === 0) {
    return null;
  }

  const primary = exerciseOnlyFiles[0]!;
  return {
    code: 'exercise-only-files',
    kind: 'surface-drift',
    severity: 'warning',
    confidence: 'qualified',
    title: 'Some source files are only justified by exercise routes',
    summary: `${exerciseOnlyFiles.length} source file${pluralize(exerciseOnlyFiles.length)} under ${context.pkg.package_name} ${exerciseOnlyFiles.length === 1 ? 'is' : 'are'} currently reachable only from exercise roots and ${exerciseOnlyFiles.length === 1 ? 'has' : 'have'} no modeled production route. That usually means the implementation is test-only, scaffold-only, or still missing its intended product integration.`,
    primarySubject: fileSubject(primary.filePath, 'exercise-only source file'),
    relatedSubjects: exerciseOnlyFiles.slice(0, 8).map((file) =>
      fileSubject(file.filePath, 'exercise-only source file'),
    ),
    evidence: exerciseOnlyFiles.slice(0, 6).flatMap((file) => {
      const witness = file.routeWitnesses.find((candidate) => candidate.routeClass === 'exercise');
      return [
        `${file.filePath}: exerciseRoots=${file.exerciseRootIds.length}, declarations=${file.declarationCount}, exports=${file.exportCount}`,
        ...(witness ? [`witness: ${witness.summary}`] : []),
      ];
    }),
  };
}

function collectPublicSurfaceUnexercisedSignal(
  context: PackageAuditEvaluatorContext,
): PackageAuditSignal | null {
  const unexercisedPublicFiles = context.reachability.files
    .filter((file) => isPublicSurfaceUnexercisedCandidate(context, file))
    .sort((left, right) =>
      compareFileAuditMetrics(context.policy.auditMetricOrders.publicSurface, left, right)
      || compareStringsAscending(left.filePath, right.filePath),
    );

  if (unexercisedPublicFiles.length === 0) {
    return null;
  }

  const primary = unexercisedPublicFiles[0]!;
  return {
    code: 'public-surface-unexercised',
    kind: 'surface-drift',
    severity: 'info',
    confidence: 'qualified',
    title: 'Some public surface files have no modeled exercise route',
    summary: `${unexercisedPublicFiles.length} public surface file${pluralize(unexercisedPublicFiles.length)} under ${context.pkg.package_name} ${unexercisedPublicFiles.length === 1 ? 'has' : 'have'} production reachability but no modeled exercise route. That leaves the public contract structurally present but unexercised by the current test/runtime witness model.`,
    primarySubject: fileSubject(primary.filePath, 'public surface without exercise route'),
    relatedSubjects: unexercisedPublicFiles.slice(0, 8).map((file) =>
      fileSubject(file.filePath, 'public surface without exercise route'),
    ),
    evidence: unexercisedPublicFiles.slice(0, 6).flatMap((file) => {
      const productionWitness = file.routeWitnesses.find((candidate) => candidate.routeClass === 'production');
      return [
        `${file.filePath}: productionRoots=${file.productionRootIds.length}, groundedProductionRoots=${file.groundedProductionRootIds.length}, declarations=${file.declarationCount}, exports=${file.exportCount}`,
        ...(productionWitness ? [`production witness: ${productionWitness.summary}`] : []),
      ];
    }),
  };
}

function collectSourceAreaCycleSignal(
  context: PackageAuditEvaluatorContext,
): PackageAuditSignal | null {
  const sourcePrefix = context.pkg.package_dir.length > 0
    ? `${context.pkg.package_dir}/src/`
    : 'src/';
  const cycles = collectPartitionBindingCycles(
    {
      root: context.analysis.root,
      edges: context.dependencySurface.edges,
    },
    'source-area',
    sourcePrefix,
  );

  if (cycles.length === 0) {
    return null;
  }

  const strongestCycle = cycles[0]!;
  const representativeFiles = strongestCycle.partitions
    .map((partition) => representativeFileForPartition(context, partition.partitionId))
    .filter((filePath): filePath is string => Boolean(filePath));
  const primarySubject = representativeFiles[0]
    ? fileSubject(representativeFiles[0], 'cyclic source area')
    : packageSubject(context.pkg);

  return {
    code: 'source-area-cycle',
    kind: 'layer-cycle',
    severity: 'warning',
    confidence: 'grounded',
    title: 'Top-level source areas still form a dependency cycle',
    summary: `${context.pkg.package_name} still has ${cycles.length} source-area cycle${pluralize(cycles.length)}. The strongest cycle ties together ${strongestCycle.partitions.length} top-level areas (${strongestCycle.partitions.map((partition) => renderPartitionTail(partition.partitionId)).join(', ')}), so the intended internal layer boundary still does not close on a DAG.`,
    primarySubject,
    relatedSubjects: [
      packageSubject(context.pkg),
      ...representativeFiles.slice(1, 8).map((filePath) => fileSubject(filePath, 'cyclic source area')),
    ],
    evidence: [
      `cycle partitions: ${strongestCycle.partitions.map((partition) => partition.partitionId).join(', ')}`,
      `cycle edge weight: ${strongestCycle.edgeCount}`,
      ...strongestCycle.edges.slice(0, 6).map((edge) =>
        `${renderPartitionTail(edge.from.partitionId)} -> ${renderPartitionTail(edge.to.partitionId)}: edges=${edge.edgeCount}, bindings=${edge.bindings.length}`,
      ),
    ],
  };
}

function collectUnanchoredCandidateRootsSignal(
  context: PackageAuditEvaluatorContext,
): PackageAuditSignal | null {
  const candidateRoots = context.reachability.roots
    .filter((root) => root.kind === 'candidate-entry')
    .map((root) => ({
      root,
      file: context.reachability.filesByPath.get(root.filePath),
    }))
    .filter((entry): entry is { root: PackageReachability['roots'][number]; file: PackageFileReachability } =>
      Boolean(entry.file),
    )
    .sort((left, right) =>
      compareFileAuditMetrics(context.policy.auditMetricOrders.candidateEntry, left.file, right.file)
      || compareStringsAscending(left.root.filePath, right.root.filePath),
    );

  if (candidateRoots.length === 0) {
    return null;
  }

  const topCandidates = candidateRoots.slice(0, 6);
  const primary = topCandidates[0]!;
  return {
    code: 'candidate-entry-roots',
    kind: 'surface-drift',
    severity: 'info',
    confidence: 'grounded',
    title: 'Some files act like entry roots without a grounded route',
    summary: `${candidateRoots.length} file${pluralize(candidateRoots.length)} under ${context.pkg.package_name} ${candidateRoots.length === 1 ? 'has' : 'have'} no inbound imports but still drive package-local edges. The audit cannot tie ${candidateRoots.length === 1 ? 'it' : 'them'} to the public API or a manifest-backed executable surface, so ${candidateRoots.length === 1 ? 'it remains' : 'they remain'} under-modeled route heads.`,
    primarySubject: fileSubject(primary.root.filePath, 'candidate entry root'),
    relatedSubjects: topCandidates.map(({ root }) => fileSubject(root.filePath, root.kind)),
    evidence: topCandidates.map(({ root, file }) =>
      `${root.filePath}: outbound=${file.outboundFiles.length}, declarations=${file.declarationCount}, publicSurface=${file.publicSurface ? 'yes' : 'no'}`,
    ),
  };
}

function isDormantCandidate(
  context: PackageAuditEvaluatorContext,
  file: PackageFileReachability,
): boolean {
  const sourcePrefix = context.pkg.package_dir.length > 0
    ? `${context.pkg.package_dir}/src/`
    : 'src/';
  if (!file.filePath.startsWith(sourcePrefix)) return false;
  if (file.publicSurface) return false;
  if (file.productionRootIds.length > 0) return false;
  if (file.exerciseRootIds.length > 0) return false;
  if (file.declarationCount === 0) return false;
  return true;
}

function isExerciseOnlyCandidate(
  context: PackageAuditEvaluatorContext,
  file: PackageFileReachability,
): boolean {
  const sourcePrefix = context.pkg.package_dir.length > 0
    ? `${context.pkg.package_dir}/src/`
    : 'src/';
  if (!file.filePath.startsWith(sourcePrefix)) return false;
  if (file.publicSurface) return false;
  if (file.productionRootIds.length > 0) return false;
  if (file.exerciseRootIds.length === 0) return false;
  if (file.declarationCount === 0 && file.exportCount === 0) return false;
  return true;
}

function isPublicSurfaceUnexercisedCandidate(
  context: PackageAuditEvaluatorContext,
  file: PackageFileReachability,
): boolean {
  if (!file.publicSurface) return false;
  if (file.exerciseRootIds.length > 0) return false;
  if (file.productionRootIds.length === 0) return false;
  if (file.filePath === context.pkg.analysis_entrypoint) return false;
  return true;
}

function compareFileAuditMetrics(
  metrics: readonly InquiryPolicy['auditMetricOrders']['exerciseOnly'][number][],
  left: PackageFileReachability,
  right: PackageFileReachability,
): number {
  return compareMetricSequence(metrics, left, right, fileAuditMetricValue);
}

function compareMetricSequence<T>(
  metrics: readonly InquiryPolicy['auditMetricOrders']['exerciseOnly'][number][],
  left: T,
  right: T,
  valueForMetric: (
    metric: InquiryPolicy['auditMetricOrders']['exerciseOnly'][number],
    item: T,
  ) => number,
): number {
  for (const metric of metrics) {
    const comparison = compareNumbersDescending(
      valueForMetric(metric, left),
      valueForMetric(metric, right),
    );
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function fileAuditMetricValue(
  metric: InquiryPolicy['auditMetricOrders']['exerciseOnly'][number],
  file: PackageFileReachability,
): number {
  switch (metric) {
    case 'outbound-count':
      return file.outboundFiles.length;
    case 'declaration-count':
      return file.declarationCount;
    case 'export-count':
      return file.exportCount;
    case 'public-surface':
      return file.publicSurface ? 1 : 0;
    case 'exercise-root-count':
      return file.exerciseRootIds.length;
    case 'production-root-count':
      return file.productionRootIds.length;
    case 'grounded-production-root-count':
      return file.groundedProductionRootIds.length;
    default:
      return 0;
  }
}

function packageSubject(
  pkg: PackageExportsSummary,
  detail?: string,
): PackageAuditSignalSubject {
  return {
    kind: 'package',
    pkg,
    ...(detail ? { detail } : {}),
  };
}

function fileSubject(
  filePath: string,
  detail?: string,
): PackageAuditSignalSubject {
  return {
    kind: 'file',
    filePath,
    ...(detail ? { detail } : {}),
  };
}

function typeDeclarationSubject(
  declaration: TypeDecl,
  detail?: string,
): PackageAuditSignalSubject {
  return {
    kind: 'type-declaration',
    declaration,
    ...(detail ? { detail } : {}),
  };
}

function representativeFileForPartition(
  context: PackageAuditEvaluatorContext,
  partitionId: string,
): string | null {
  const prefix = `${partitionId}/`;
  return context.packageFiles.find((filePath) => filePath.startsWith(prefix)) ?? null;
}

function renderPartitionTail(
  partitionId: string,
): string {
  return partitionId.split('/').at(-1) ?? partitionId;
}

function basename(
  filePath: string,
): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function pluralize(
  count: number,
): string {
  return count === 1 ? '' : 's';
}
