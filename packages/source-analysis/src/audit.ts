import { loadCurrentSourceAnalysisSnapshots, type LoadedCurrentSourceAnalysisSnapshots } from './current-snapshots.js';
import type { PackageExportRecord, PackageExportsSummary } from './exports/schema.js';
import type { TypeDecl } from './typerefs/schema.js';
import type {
  SourceAnalysisClosureBasis,
  SourceAnalysisContinuation,
  SourceAnalysisIssue,
  SourceAnalysisIssueOrigin,
  SourceAnalysisIssueSeverity,
  SourceAnalysisOutcome,
  SourceAnalysisTrustKind,
  SourceAnalysisTrustProfile,
} from './outcome-algebra.js';
import { SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION } from './outcome-algebra.js';
import type {
  SourceAnalysisAnswer,
  SourceAnalysisAnswerProvenanceEntry,
  SourceAnalysisContinuationBasis,
  SourceAnalysisFocusKind,
  SourceAnalysisFocusRef,
  SourceAnalysisQuery,
  SourceAnalysisReadMode,
  SourceAnalysisWorldFrame,
} from './query-model.js';
import { SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION } from './query-model.js';
import type {
  SourceAnalysisPackageFileReachability,
  SourceAnalysisPackageReachability,
} from './reachability.js';
import { createSourceAnalysisPackageReachability } from './reachability.js';

export const SOURCE_ANALYSIS_AUDIT_FINDING_KINDS = [
  'blindspot',
  'under-integrated-file',
  'surface-drift',
] as const;

export type SourceAnalysisAuditFindingKind =
  typeof SOURCE_ANALYSIS_AUDIT_FINDING_KINDS[number];

export interface SourceAnalysisAuditRef {
  readonly kind: SourceAnalysisFocusKind | 'subsystem';
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

export interface SourceAnalysisAuditFinding {
  readonly code: string;
  readonly kind: SourceAnalysisAuditFindingKind;
  readonly severity: SourceAnalysisIssueSeverity;
  readonly confidence: SourceAnalysisTrustKind;
  readonly title: string;
  readonly summary: string;
  readonly primaryRef: SourceAnalysisAuditRef;
  readonly relatedRefs: readonly SourceAnalysisAuditRef[];
  readonly evidence: readonly string[];
}

export interface SourceAnalysisAuditValue {
  readonly title: string;
  readonly summaryLines: readonly string[];
  readonly primaryRef: SourceAnalysisAuditRef;
  readonly relatedRefs: readonly SourceAnalysisAuditRef[];
  readonly findings: readonly SourceAnalysisAuditFinding[];
}

interface PackageAuditContext {
  readonly snapshots: LoadedCurrentSourceAnalysisSnapshots;
  readonly pkg: PackageExportsSummary;
  readonly packageFiles: readonly string[];
  readonly uncoveredFiles: readonly string[];
  readonly unresolvedImports: LoadedCurrentSourceAnalysisSnapshots['deps']['unresolved_imports'];
  readonly declarationsByFile: ReadonlyMap<string, readonly TypeDecl[]>;
  readonly exportRecordsByFile: ReadonlyMap<string, readonly PackageExportRecord[]>;
  readonly reachability: SourceAnalysisPackageReachability;
}

export function createCurrentSourceAnalysisAuditAnswer(
  query: SourceAnalysisQuery,
  target?: string,
  waitMs = 0,
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  return createSourceAnalysisAuditAnswer(
    query,
    loadCurrentSourceAnalysisSnapshots(target, waitMs),
  );
}

export function createSourceAnalysisAuditAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  switch (query.focusRef.kind) {
    case 'package':
      return buildPackageAuditAnswer(query, snapshots, query.focusRef.value);
    default:
      return createUnsupportedAnswer(
        query,
        snapshots,
        `Audit for focus kind "${query.focusRef.kind}" is not implemented yet.`,
      );
  }
}

function buildPackageAuditAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  packageQuery: string,
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  const pkgMatches = resolvePackages(snapshots, packageQuery);
  if (pkgMatches.length === 0) {
    return createMissAnswer(
      query,
      snapshots,
      `No package matches "${packageQuery}".`,
      { kind: 'package', value: packageQuery },
      [],
    );
  }

  if (pkgMatches.length > 1) {
    return createAmbiguousAnswer(
      query,
      snapshots,
      `Package query "${packageQuery}" is ambiguous.`,
      { kind: 'package', value: packageQuery },
      pkgMatches.map((pkg) => packageRef(pkg)),
    );
  }

  const pkg = pkgMatches[0]!;
  const context = createPackageAuditContext(snapshots, pkg);
  const findings = collectPackageAuditFindings(context);

  const blindspotCount = findings.filter((finding) => finding.kind === 'blindspot').length;
  const dormantCount = findings.filter((finding) => finding.kind === 'under-integrated-file').length;
  const driftCount = findings.filter((finding) => finding.kind === 'surface-drift').length;

  const summaryLines = findings.length === 0
    ? [`No strong integration red flags closed for ${pkg.package_name} in the current snapshots.`]
    : [
      `${pkg.package_name} shows ${findings.length} likely integration red flag${pluralize(findings.length)} in the current snapshots.`,
      ...(blindspotCount > 0
        ? [`${blindspotCount} blind spot${pluralize(blindspotCount)} keep the exercise/dead-code picture open.`]
        : []),
      ...(dormantCount > 0
        ? [`${dormantCount} file${pluralize(dormantCount)} look${dormantCount === 1 ? 's' : ''} parked rather than integrated.`]
        : []),
      ...(driftCount > 0
        ? [`${driftCount} finding${pluralize(driftCount)} points at architectural surface drift rather than direct dead code.`]
        : []),
    ];

  const relatedRefs = dedupeRefs([
    fileRef(pkg.analysis_entrypoint, 'package entrypoint'),
    ...findings.flatMap((finding) => [finding.primaryRef, ...finding.relatedRefs]),
  ]).slice(0, 12);

  const tag = blindspotCount > 0 ? 'open-boundary' : 'hit';
  const trust = trustForFindings(findings);
  const closureBasis = closureBasisForPackageAudit(context, findings);
  const issues = issuesForFindings(findings);
  const continuations = continuationsForFindings(pkg, findings);
  const provenance = provenanceForPackageAudit(context, findings);

  return createAnswer(
    query,
    snapshots,
    { kind: 'package', value: pkg.package_name, label: pkg.package_name },
    tag,
    {
      title: `${pkg.package_name} package audit`,
      summaryLines,
      primaryRef: packageRef(pkg),
      relatedRefs,
      findings,
    },
    trust,
    closureBasis,
    issues,
    continuations,
    provenance,
  );
}

function createPackageAuditContext(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  pkg: PackageExportsSummary,
): PackageAuditContext {
  const reachability = createSourceAnalysisPackageReachability(snapshots, pkg);
  const packagePrefix = pkg.package_dir.length > 0 ? `${pkg.package_dir}/` : '';
  const packageFiles = new Set<string>(reachability.files.map((file) => file.filePath));
  const uncoveredFiles = snapshots.deps.uncovered_files.filter((filePath) =>
    filePath.startsWith(packagePrefix),
  );
  const unresolvedImports = snapshots.deps.unresolved_imports.filter((entry) =>
    entry.source.startsWith(packagePrefix),
  );

  for (const edge of snapshots.deps.edges) {
    if (edge.source.startsWith(packagePrefix)) {
      packageFiles.add(edge.source);
    }
    if (edge.target.startsWith(packagePrefix)) {
      packageFiles.add(edge.target);
    }
  }

  const declarationsByFile = new Map<string, TypeDecl[]>();
  for (const declaration of snapshots.typeRefs.declarations) {
    if (!declaration.file.startsWith(packagePrefix)) continue;
    packageFiles.add(declaration.file);
    const declarations = declarationsByFile.get(declaration.file) ?? [];
    declarations.push(declaration);
    declarationsByFile.set(declaration.file, declarations);
  }

  const exportRecordsByFile = new Map<string, PackageExportRecord[]>();
  for (const record of snapshots.exports.exports) {
    if (record.package_dir !== pkg.package_dir) continue;
    packageFiles.add(record.analysis_entrypoint);
    if (!record.declaration_file) continue;
    packageFiles.add(record.declaration_file);
    const exportRecords = exportRecordsByFile.get(record.declaration_file) ?? [];
    exportRecords.push(record);
    exportRecordsByFile.set(record.declaration_file, exportRecords);
  }

  return {
    snapshots,
    pkg,
    packageFiles: [...packageFiles].sort((left, right) => left.localeCompare(right)),
    uncoveredFiles,
    unresolvedImports,
    declarationsByFile: new Map(
      [...declarationsByFile.entries()].map(([filePath, declarations]) => [
        filePath,
        [...declarations].sort((left, right) =>
          left.line - right.line || left.name.localeCompare(right.name),
        ),
      ]),
    ),
    exportRecordsByFile: new Map(
      [...exportRecordsByFile.entries()].map(([filePath, exportRecords]) => [
        filePath,
        [...exportRecords].sort((left, right) => left.exported_name.localeCompare(right.exported_name)),
      ]),
    ),
    reachability,
  };
}

function collectPackageAuditFindings(
  context: PackageAuditContext,
): readonly SourceAnalysisAuditFinding[] {
  const findings = [
    collectUncoveredFilesFinding(context),
    collectUnresolvedImportsFinding(context),
    ...collectDormantFileFindings(context),
    collectUnanchoredCandidateRootsFinding(context),
  ].filter((finding): finding is SourceAnalysisAuditFinding => Boolean(finding));

  return findings.sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity)
    || confidenceRank(right.confidence) - confidenceRank(left.confidence)
    || left.title.localeCompare(right.title),
  );
}

function collectUncoveredFilesFinding(
  context: PackageAuditContext,
): SourceAnalysisAuditFinding | null {
  if (context.uncoveredFiles.length === 0) {
    return null;
  }

  const uncoveredExercises = context.uncoveredFiles.filter((filePath) =>
    context.reachability.exerciseFiles.includes(filePath),
  );
  const exerciseTargets = context.reachability.files
    .filter((file) =>
      file.exerciseRootIds.length > 0
      && !context.reachability.exerciseFiles.includes(file.filePath),
    )
    .map((file) => file.filePath);
  const primaryPath = uncoveredExercises[0] ?? context.uncoveredFiles[0]!;
  const title = uncoveredExercises.length === context.uncoveredFiles.length
    ? 'Tests sit outside the graph coverage'
    : 'Some package files sit outside the graph coverage';
  const summary = uncoveredExercises.length === context.uncoveredFiles.length
    ? `${context.uncoveredFiles.length} test file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir} are outside every tsconfig. Parse-only route recovery now reaches ${exerciseTargets.length} package file${pluralize(exerciseTargets.length)}, but that exercise evidence is still qualified rather than snapshot-grounded.`
    : `${context.uncoveredFiles.length} file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir} are outside every tsconfig, so the dependency graph has a real blind spot.`;

  return {
    code: 'package-uncovered-files',
    kind: 'blindspot',
    severity: 'warning',
    confidence: 'grounded',
    title,
    summary,
    primaryRef: fileRef(primaryPath, 'uncovered file'),
    relatedRefs: context.uncoveredFiles.slice(0, 8).map((filePath) => fileRef(filePath, 'uncovered file')),
    evidence: [
      `${context.uncoveredFiles.length} uncovered file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir}.`,
      ...(uncoveredExercises.length > 0
        ? [`${uncoveredExercises.length} uncovered file${pluralize(uncoveredExercises.length)} currently classify as exercise roots, so exercise reachability depends on parse-only recovery.`]
        : []),
      ...(exerciseTargets.length > 0
        ? [`parse-only exercise routes currently reach ${exerciseTargets.length} package file${pluralize(exerciseTargets.length)}.`]
        : []),
      ...exerciseTargets.slice(0, 4).map((filePath) => `exercise route target: ${filePath}`),
      ...context.uncoveredFiles.slice(0, 4).map((filePath) => `uncovered: ${filePath}`),
    ],
  };
}

function collectUnresolvedImportsFinding(
  context: PackageAuditContext,
): SourceAnalysisAuditFinding | null {
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
    primaryRef: fileRef(first.source, 'unresolved import source'),
    relatedRefs: context.unresolvedImports.slice(0, 8).map((entry) => ({
      kind: 'file' as const,
      value: entry.source,
      label: basename(entry.source),
      detail: `${entry.specifier} @ line ${entry.line}`,
    })),
    evidence: context.unresolvedImports.slice(0, 4).map((entry) =>
      `${entry.source}:${entry.line} -> ${entry.specifier}`,
    ),
  };
}

function collectDormantFileFindings(
  context: PackageAuditContext,
): readonly SourceAnalysisAuditFinding[] {
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
      primaryRef: fileRef(file.filePath, 'under-integrated file'),
      relatedRefs: dedupeRefs([
        packageRef(context.pkg),
        ...declarations.slice(0, 4).map((declaration) => typeRef(declaration)),
      ]),
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

function collectUnanchoredCandidateRootsFinding(
  context: PackageAuditContext,
): SourceAnalysisAuditFinding | null {
  const candidateRoots = context.reachability.roots
    .filter((root) => root.kind === 'candidate-entry')
    .map((root) => ({
      root,
      file: context.reachability.filesByPath.get(root.filePath),
    }))
    .filter((entry): entry is { root: SourceAnalysisPackageReachability['roots'][number]; file: SourceAnalysisPackageFileReachability } =>
      Boolean(entry.file),
    )
    .sort((left, right) =>
      scoreCandidateEntry(right.file) - scoreCandidateEntry(left.file)
      || left.root.filePath.localeCompare(right.root.filePath),
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
    primaryRef: fileRef(primary.root.filePath, 'candidate entry root'),
    relatedRefs: topCandidates.map(({ root }) => fileRef(root.filePath, root.kind)),
    evidence: topCandidates.map(({ root, file }) =>
      `${root.filePath}: outbound=${file.outboundFiles.length}, declarations=${file.declarationCount}, publicSurface=${file.publicSurface ? 'yes' : 'no'}`,
    ),
  };
}

function isDormantCandidate(
  context: PackageAuditContext,
  file: SourceAnalysisPackageFileReachability,
): boolean {
  const sourcePrefix = context.pkg.package_dir.length > 0
    ? `${context.pkg.package_dir}/src/`
    : 'src/';
  if (!file.filePath.startsWith(sourcePrefix)) return false;
  if (file.publicSurface) return false;
  if (file.productionRootIds.length > 0) return false;
  if (file.declarationCount === 0) return false;
  return true;
}

function scoreCandidateEntry(file: SourceAnalysisPackageFileReachability): number {
  return file.outboundFiles.length * 10
    + file.declarationCount * 5
    + file.exportCount * 3
    + (file.publicSurface ? 1 : 0);
}

function trustForFindings(
  findings: readonly SourceAnalysisAuditFinding[],
): SourceAnalysisTrustProfile {
  if (findings.length === 0) {
    return {
      kind: 'grounded',
      summary: 'No strong red flags closed from the current static evidence.',
    };
  }

  if (findings.some((finding) => finding.kind === 'blindspot')) {
    return {
      kind: 'qualified',
      summary: 'The audit found grounded red flags, but blind spots in graph coverage keep the final dead-code picture open.',
    };
  }

  return {
    kind: 'grounded',
    summary: 'The audit findings are grounded in the current deps, typerefs, and exports snapshots.',
  };
}

function closureBasisForPackageAudit(
  context: PackageAuditContext,
  findings: readonly SourceAnalysisAuditFinding[],
): readonly SourceAnalysisClosureBasis[] {
  const groundedRoots = context.reachability.roots.filter((root) => root.trust === 'grounded');
  const qualifiedRoots = context.reachability.roots.filter((root) => root.trust !== 'grounded');
  return [
    {
      kind: 'route',
      summary: `This audit composes dependency coverage, type declarations, public export surface, and ${groundedRoots.length} grounded root${pluralize(groundedRoots.length)} plus ${qualifiedRoots.length} qualified root${pluralize(qualifiedRoots.length)} into package-level red flags.`,
      provenanceRefs: [
        ...groundedRoots.map((root) => `${root.kind}:${root.filePath}`),
        ...qualifiedRoots.map((root) => `${root.kind}:${root.filePath}`),
      ].slice(0, 10),
    },
    {
      kind: 'freshness',
      summary: `The audit is grounded in snapshots generated at ${context.snapshots.deps.generated_at}, ${context.snapshots.typeRefs.generated_at}, and ${context.snapshots.exports.generated_at}.`,
      provenanceRefs: [
        context.snapshots.deps.generated_at,
        context.snapshots.typeRefs.generated_at,
        context.snapshots.exports.generated_at,
      ],
    },
    ...(findings.some((finding) => finding.kind === 'blindspot')
      ? [{
        kind: 'boundary' as const,
        summary: 'Blind spots such as uncovered files or unresolved imports keep full closure on deadness and exercise incomplete.',
      }]
      : []),
  ];
}

function issuesForFindings(
  findings: readonly SourceAnalysisAuditFinding[],
): readonly SourceAnalysisIssue[] {
  return findings.slice(0, 6).map((finding) => ({
    code: finding.code,
    message: finding.summary,
    severity: finding.severity,
    origin: originForFinding(finding.kind),
  }));
}

function provenanceForPackageAudit(
  context: PackageAuditContext,
  findings: readonly SourceAnalysisAuditFinding[],
): readonly SourceAnalysisAnswerProvenanceEntry[] {
  return [
    snapshotProvenanceEntry('deps', context.snapshots.deps.generated_at, context.snapshots.deps.source_commit),
    snapshotProvenanceEntry('typerefs', context.snapshots.typeRefs.generated_at, context.snapshots.typeRefs.source_commit),
    snapshotProvenanceEntry('exports', context.snapshots.exports.generated_at, context.snapshots.exports.source_commit),
    ...(findings.length > 0
      ? [{
        kind: 'route' as const,
        label: `${context.pkg.package_name} package audit`,
        ref: context.pkg.package_name,
        detail: `findings=${findings.length}`,
      }]
      : []),
    {
      kind: 'route',
      label: 'package reachability roots',
      ref: context.pkg.package_name,
      detail: context.reachability.roots
        .map((root) => `${root.kind}:${basename(root.filePath)}`)
        .slice(0, 8)
        .join(', '),
    },
  ];
}

function continuationsForFindings(
  pkg: PackageExportsSummary,
  findings: readonly SourceAnalysisAuditFinding[],
): readonly SourceAnalysisContinuation[] {
  return dedupeContinuations([
    continuation('join', 'Inspect the package entrypoint', pkg.analysis_entrypoint, 'package entrypoint'),
    ...findings.slice(0, 4).map((finding) =>
      continuation('join', `Inspect ${finding.primaryRef.label}`, finding.primaryRef.value, finding.title),
    ),
  ]);
}

function createAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  focusRef: SourceAnalysisFocusRef,
  tag: SourceAnalysisOutcome<SourceAnalysisAuditValue>['tag'],
  value: SourceAnalysisAuditValue,
  trust: SourceAnalysisTrustProfile,
  closureBasis: readonly SourceAnalysisClosureBasis[],
  issues: readonly SourceAnalysisIssue[],
  continuations: readonly SourceAnalysisContinuation[],
  provenance: readonly SourceAnalysisAnswerProvenanceEntry[],
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  const readMode = defaultReadMode(query.questionRoute);
  const worldFrame = defaultWorldFrame(snapshots, query.worldFrame);
  const continuationBasis: SourceAnalysisContinuationBasis = {
    focusRef,
    questionRoute: query.questionRoute,
    readMode,
    worldFrame,
    governingAnchorRefs: value.relatedRefs.map((ref) => ref.value).slice(0, 4),
  };

  const outcome: SourceAnalysisOutcome<SourceAnalysisAuditValue> = {
    schemaVersion: SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION,
    tag,
    summary: value.summaryLines[0] ?? value.title,
    trust,
    value,
    closureBasis,
    issues,
    continuations,
  };

  return {
    schemaVersion: SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION,
    query: {
      inquiryEpisode: query.inquiryEpisode ?? 'inventory-and-audit-sweep',
      focusRef,
      questionRoute: query.questionRoute,
      readMode,
      worldFrame,
      requestedSlotIds: query.requestedSlotIds,
      continuationBasis: query.continuationBasis ?? continuationBasis,
    },
    slots: {
      focus_ref: focusRef,
      question_route: query.questionRoute,
      read_mode: readMode,
      world_frame: worldFrame,
      outcome,
      closure_basis: closureBasis,
      provenance,
      continuation_basis: continuationBasis,
      delta: {
        kind: 'none',
        count: 0,
        affectedRefs: [],
      },
    },
    outcome,
  };
}

function createMissAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  message: string,
  focusRef: SourceAnalysisFocusRef,
  relatedRefs: readonly SourceAnalysisAuditRef[],
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  return createAnswer(
    query,
    snapshots,
    focusRef,
    'miss-unknown-shape',
    {
      title: 'Package audit miss',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      findings: [],
    },
    {
      kind: 'unavailable',
      summary: 'No package-level audit target closed for this focus.',
    },
    [{
      kind: 'route',
      summary: 'No package in the current snapshots matched the requested focus.',
    }],
    [{
      code: 'audit-miss',
      message,
      severity: 'info',
      origin: 'shape',
    }],
    [],
    [],
  );
}

function createAmbiguousAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  message: string,
  focusRef: SourceAnalysisFocusRef,
  relatedRefs: readonly SourceAnalysisAuditRef[],
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  return createAnswer(
    query,
    snapshots,
    focusRef,
    'ambiguous',
    {
      title: 'Package audit ambiguity',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      findings: [],
    },
    {
      kind: 'qualified',
      summary: 'Multiple package-level audit targets match the current focus.',
    },
    [{
      kind: 'route',
      summary: 'The current package query needs one more narrowing move before a single audit is honest.',
    }],
    [{
      code: 'audit-ambiguous',
      message,
      severity: 'warning',
      origin: 'query',
    }],
    relatedRefs.slice(0, 4).map((ref) =>
      continuation('join', `Inspect ${ref.label}`, ref.value, ref.detail ?? 'narrowing move'),
    ),
    [],
  );
}

function createUnsupportedAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  message: string,
): SourceAnalysisAnswer<SourceAnalysisAuditValue> {
  return createAnswer(
    query,
    snapshots,
    query.focusRef,
    'unsupported',
    {
      title: 'Package audit unsupported',
      summaryLines: [message],
      primaryRef: {
        kind: query.focusRef.kind,
        value: query.focusRef.value,
        label: query.focusRef.label ?? query.focusRef.value,
      },
      relatedRefs: [],
      findings: [],
    },
    {
      kind: 'unavailable',
      summary: 'The current audit surface only supports package focuses.',
    },
    [{
      kind: 'route',
      summary: 'Audit currently closes on package-level focuses only.',
    }],
    [{
      code: 'audit-unsupported',
      message,
      severity: 'warning',
      origin: 'query',
    }],
    [],
    [],
  );
}

function resolvePackages(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly PackageExportsSummary[] {
  const normalized = query.toLowerCase();
  const exact = snapshots.exports.packages.filter((pkg) =>
    pkg.package_name.toLowerCase() === normalized
    || pkg.package_dir.toLowerCase() === normalized,
  );
  if (exact.length > 0) return exact;

  const shortMatches = snapshots.exports.packages.filter((pkg) =>
    pkg.package_name.split('/').at(-1)?.toLowerCase() === normalized
    || pkg.package_dir.split('/').at(-1)?.toLowerCase() === normalized,
  );
  if (shortMatches.length > 0) return shortMatches;

  return snapshots.exports.packages.filter((pkg) =>
    pkg.package_name.toLowerCase().includes(normalized)
    || pkg.package_dir.toLowerCase().includes(normalized),
  );
}

function packageRef(pkg: PackageExportsSummary): SourceAnalysisAuditRef {
  return {
    kind: 'package',
    value: pkg.package_name,
    label: pkg.package_name,
    ...(pkg.package_dir.length > 0 ? { detail: pkg.package_dir } : {}),
  };
}

function fileRef(filePath: string, detail?: string): SourceAnalysisAuditRef {
  return {
    kind: 'file',
    value: filePath,
    label: basename(filePath),
    ...(detail ? { detail } : {}),
  };
}

function typeRef(declaration: TypeDecl): SourceAnalysisAuditRef {
  return {
    kind: 'type',
    value: declaration.name,
    label: declaration.name,
    detail: `${declaration.file}:${declaration.line}`,
  };
}

function defaultWorldFrame(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  worldFrame: SourceAnalysisWorldFrame | undefined,
): SourceAnalysisWorldFrame {
  return {
    repoPath: worldFrame?.repoPath ?? snapshots.deps.root,
    target: worldFrame?.target ?? 'current',
    regimeAnchor: worldFrame?.regimeAnchor ?? 'hosted',
    partiality: worldFrame?.partiality ?? 'complete',
    freshness: worldFrame?.freshness ?? 'snapshot',
  };
}

function defaultReadMode(
  questionRoute: SourceAnalysisQuery['questionRoute'],
): SourceAnalysisReadMode {
  return questionRoute === 'inventory' ? 'summary-card' : 'focus-card';
}

function continuation(
  targetQuestionRoute: SourceAnalysisQuery['questionRoute'],
  label: string,
  targetFocusRef: string,
  detail: string,
): SourceAnalysisContinuation {
  return {
    kind: targetQuestionRoute === 'route' ? 'reroute' : 'inspect-support',
    label,
    description: detail,
    targetQuestionRoute,
    targetFocusRef,
  };
}

function snapshotProvenanceEntry(
  kind: 'deps' | 'typerefs' | 'exports',
  generatedAt: string,
  sourceCommit: string,
): SourceAnalysisAnswerProvenanceEntry {
  return {
    kind: 'snapshot',
    label: `${kind} snapshot`,
    ref: generatedAt,
    detail: `source_commit=${sourceCommit}`,
  };
}

function originForFinding(
  kind: SourceAnalysisAuditFindingKind,
): SourceAnalysisIssueOrigin {
  switch (kind) {
    case 'blindspot':
      return 'boundary';
    case 'under-integrated-file':
      return 'shape';
    case 'surface-drift':
      return 'shape';
    default:
      return assertNever(kind);
  }
}

function pluralize(count: number): string {
  return count === 1 ? '' : 's';
}

function basename(filePath: string): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function dedupeRefs(
  refs: readonly SourceAnalysisAuditRef[],
): readonly SourceAnalysisAuditRef[] {
  const seen = new Set<string>();
  const deduped: SourceAnalysisAuditRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}\0${ref.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }
  return deduped;
}

function dedupeContinuations(
  continuations: readonly SourceAnalysisContinuation[],
): readonly SourceAnalysisContinuation[] {
  const seen = new Set<string>();
  const deduped: SourceAnalysisContinuation[] = [];
  for (const continuation of continuations) {
    const key = `${continuation.targetQuestionRoute ?? ''}\0${continuation.targetFocusRef ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(continuation);
  }
  return deduped;
}

function severityRank(severity: SourceAnalysisIssueSeverity): number {
  switch (severity) {
    case 'error':
      return 3;
    case 'warning':
      return 2;
    case 'info':
      return 1;
    default:
      return assertNever(severity);
  }
}

function confidenceRank(kind: SourceAnalysisTrustKind): number {
  switch (kind) {
    case 'grounded':
      return 4;
    case 'qualified':
      return 3;
    case 'frontier':
      return 2;
    case 'unavailable':
      return 1;
    default:
      return assertNever(kind);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled source-analysis audit case: ${String(value)}`);
}
