import {
  coerceAnalysisViews,
  loadCurrentAnalysisViews,
  type AnalysisViews,
} from './analysis-views.js';
import type { LoadedCurrentSnapshotSet } from './current-snapshots.js';
import type { PackageExportRecord, PackageExportsSummary } from './exports/schema.js';
import type { TypeDecl } from './typerefs/schema.js';
import {
  inspectAnalyzabilityPostureFromAnalysisViews,
  inspectFocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import type { AnswerCard, AnswerRef } from './answer-card.js';
import {
  createStructuredAnswerCard,
} from './answer-card.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import {
  compareByPrecedence,
  compareNumbersDescending,
  compareStringsAscending,
  resolveInquiryPolicy,
  type AuditMetric,
  type InquiryPolicy,
} from './inquiry-policy.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
  IssueOrigin,
  IssueSeverity,
  TrustKind,
  TrustProfile,
} from './outcome-algebra.js';
import type {
  InquiryAnswer,
  InquiryProvenanceEntry,
  FocusRef,
  Inquiry,
  ReadMode,
  WorldFrame,
} from './inquiry-model.js';
import type {
  PackageFileReachability,
  PackageReachability,
} from './reachability.js';
import { createPackageReachability } from './reachability.js';
import type { PackageCoordinationSurface } from './coordination-surface.js';
import { createPackageCoordinationSurface } from './coordination-surface.js';

export const AUDIT_FINDING_KINDS = [
  'blindspot',
  'under-integrated-file',
  'surface-drift',
] as const;

export type AuditFindingKind =
  typeof AUDIT_FINDING_KINDS[number];

export type AuditRef = AnswerRef;

export interface AuditFinding {
  readonly code: string;
  readonly kind: AuditFindingKind;
  readonly severity: IssueSeverity;
  readonly confidence: TrustKind;
  readonly title: string;
  readonly summary: string;
  readonly primaryRef: AuditRef;
  readonly relatedRefs: readonly AuditRef[];
  readonly evidence: readonly string[];
}

export type AuditValue = AnswerCard<AuditRef> & {
  readonly findings: readonly AuditFinding[];
};

interface PackageAuditContext {
  readonly analysis: AnalysisViews;
  readonly analysisFreshness: WorldFrame['freshness'];
  readonly pkg: PackageExportsSummary;
  readonly packageFiles: readonly string[];
  readonly uncoveredFiles: readonly string[];
  readonly unresolvedImports: AnalysisViews['deps']['unresolved_imports'];
  readonly declarationsByFile: ReadonlyMap<string, readonly TypeDecl[]>;
  readonly exportRecordsByFile: ReadonlyMap<string, readonly PackageExportRecord[]>;
  readonly reachability: PackageReachability;
  readonly coordinationSurface: PackageCoordinationSurface | null;
  readonly policy: InquiryPolicy;
}

export function createCurrentAuditAnswer(
  query: Inquiry,
  target?: string,
  waitMs = 0,
): InquiryAnswer<AuditValue> {
  return createAuditAnswer(
    query,
    loadCurrentAnalysisViews(target, waitMs),
  );
}

export function createAuditAnswer(
  query: Inquiry,
  analysisInput: AnalysisViews | LoadedCurrentSnapshotSet,
): InquiryAnswer<AuditValue> {
  const analysis = coerceAnalysisViews(analysisInput);
  switch (query.focusRef.kind) {
    case 'package':
      return buildPackageAuditAnswer(query, analysis, query.focusRef.value);
    default:
      return createUnsupportedAnswer(
        query,
        analysis,
        `Audit for focus kind "${query.focusRef.kind}" is not implemented yet.`,
      );
  }
}

function buildPackageAuditAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  packageQuery: string,
): InquiryAnswer<AuditValue> {
  const normalizedPackageQuery = trimTrailingFocusPunctuation(packageQuery);
  const posture = inspectAnalyzabilityPostureFromAnalysisViews(analysis);
  const requestedRegimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: normalizedPackageQuery,
    queryHints: [normalizedPackageQuery],
  });
  const pkgMatches = resolvePackages(analysis, normalizedPackageQuery);
  if (pkgMatches.length === 0) {
    if (requestedRegimeContext.directlyExcludedFrontier) {
      return createExcludedFrontierAnswer(
        query,
        analysis,
        normalizedPackageQuery,
        requestedRegimeContext,
      );
    }
    return createMissAnswer(
      query,
      analysis,
      `No package matches "${normalizedPackageQuery}".`,
      { kind: 'package', value: normalizedPackageQuery },
      [],
    );
  }

  if (pkgMatches.length > 1) {
    return createAmbiguousAnswer(
      query,
      analysis,
      `Package query "${normalizedPackageQuery}" is ambiguous.`,
      { kind: 'package', value: normalizedPackageQuery },
      pkgMatches.map((pkg) => packageRef(pkg)),
    );
  }

  const pkg = pkgMatches[0]!;
  const policy = resolveInquiryPolicy(query, {
    focusKind: 'package',
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });
  const context = createPackageAuditContext(
    analysis,
    pkg,
    resolveAuditRepoPath(query.worldFrame?.repoPath),
    query.worldFrame?.freshness,
    policy,
  );
  const findings = collectPackageAuditFindings(context);
  const regimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: pkg.package_name,
    pathPrefixes: [pkg.package_dir],
    queryHints: [pkg.package_name, pkg.package_dir, normalizedPackageQuery],
  });

  const blindspotCount = findings.filter((finding) => finding.kind === 'blindspot').length;
  const dormantCount = findings.filter((finding) => finding.kind === 'under-integrated-file').length;
  const driftCount = findings.filter((finding) => finding.kind === 'surface-drift').length;

  const summaryLines = findings.length === 0
    ? [`No strong integration red flags closed for ${pkg.package_name} in the ${analysisSurfaceLabel(query.worldFrame)}.`]
    : [
      `${pkg.package_name} shows ${findings.length} likely integration red flag${pluralize(findings.length)} in the ${analysisSurfaceLabel(query.worldFrame)}.`,
      ...(blindspotCount > 0
        ? [`${blindspotCount} blind spot${pluralize(blindspotCount)} keep the exercise/dead-code picture open.`]
        : []),
      ...(dormantCount > 0
        ? [`${dormantCount} file${pluralize(dormantCount)} look${dormantCount === 1 ? 's' : ''} parked rather than integrated.`]
        : []),
      ...(driftCount > 0
        ? [`${driftCount} finding${pluralize(driftCount)} points at architectural surface drift rather than direct dead code.`]
        : []),
      ...regimeContext.lines,
    ];

  const relatedRefs = dedupeRefs([
    fileRef(pkg.analysis_entrypoint, 'package entrypoint'),
    ...findings.flatMap((finding) => [finding.primaryRef, ...finding.relatedRefs]),
  ]).slice(0, 12);

  const tag = blindspotCount > 0 || regimeContext.tag === 'open-boundary'
    ? 'open-boundary'
    : 'hit';
  const trust = mergeTrustProfiles(trustForFindings(findings, context.analysisFreshness), regimeContext.trust);
  const closureBasis = [
    ...closureBasisForPackageAudit(context, findings),
    ...regimeContext.closureBasis,
  ];
  const issues = [
    ...issuesForFindings(findings),
    ...regimeContext.issues,
  ];
  const continuations = [
    ...continuationsForFindings(pkg, findings),
    ...regimeContext.continuations,
  ];
  const provenance = [
    ...provenanceForPackageAudit(context, findings),
    ...regimeContext.provenance,
  ];
  const document = createAuditDocument(summaryLines, findings, relatedRefs, {
    blindspotCount,
    dormantCount,
    driftCount,
    regimeFacts: regimeContext.facts,
  });

  return createAnswer(
    query,
    analysis,
    policy,
    { kind: 'package', value: pkg.package_name, label: pkg.package_name },
    tag,
    createStructuredAnswerCard({
      title: `${pkg.package_name} package audit`,
      primaryRef: packageRef(pkg),
      relatedRefs,
      document,
      policy,
      extra: {
        findings,
      },
    }),
    trust,
    closureBasis,
    issues,
    continuations,
    provenance,
  );
}

function createPackageAuditContext(
  analysis: AnalysisViews,
  pkg: PackageExportsSummary,
  repoPath: string,
  analysisFreshness: WorldFrame['freshness'],
  policy: InquiryPolicy,
): PackageAuditContext {
  const reachability = createPackageReachability(analysis, pkg, {
    ordering: policy.ordering,
  });
  const packagePrefix = pkg.package_dir.length > 0 ? `${pkg.package_dir}/` : '';
  const packageFiles = new Set<string>(reachability.files.map((file) => file.filePath));
  const uncoveredFiles = analysis.deps.uncovered_files.filter((filePath) =>
    filePath.startsWith(packagePrefix),
  );
  const unresolvedImports = analysis.deps.unresolved_imports.filter((entry) =>
    entry.source.startsWith(packagePrefix),
  );

  for (const edge of analysis.deps.edges) {
    if (edge.source.startsWith(packagePrefix)) {
      packageFiles.add(edge.source);
    }
    if (edge.target.startsWith(packagePrefix)) {
      packageFiles.add(edge.target);
    }
  }

  const declarationsByFile = new Map<string, TypeDecl[]>();
  for (const declaration of analysis.typeRefs.declarations) {
    if (!declaration.file.startsWith(packagePrefix)) continue;
    packageFiles.add(declaration.file);
    const declarations = declarationsByFile.get(declaration.file) ?? [];
    declarations.push(declaration);
    declarationsByFile.set(declaration.file, declarations);
  }

  const exportRecordsByFile = new Map<string, PackageExportRecord[]>();
  for (const record of analysis.exports.exports) {
    if (record.package_dir !== pkg.package_dir) continue;
    packageFiles.add(record.analysis_entrypoint);
    if (!record.declaration_file) continue;
    packageFiles.add(record.declaration_file);
    const exportRecords = exportRecordsByFile.get(record.declaration_file) ?? [];
    exportRecords.push(record);
    exportRecordsByFile.set(record.declaration_file, exportRecords);
  }

  const coordinationSurface = createSafeCoordinationSurface(repoPath, [...packageFiles]);

  return {
    analysis,
    analysisFreshness,
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
    coordinationSurface,
    policy,
  };
}

function collectPackageAuditFindings(
  context: PackageAuditContext,
): readonly AuditFinding[] {
  const findings = [
    collectUncoveredFilesFinding(context),
    collectUnresolvedImportsFinding(context),
    collectExerciseOnlyFilesFinding(context),
    collectPublicSurfaceUnexercisedFinding(context),
    collectAnswerCoordinationFragmentationFinding(context),
    collectPresentationFragmentationFinding(context),
    ...collectDormantFileFindings(context),
    collectUnanchoredCandidateRootsFinding(context),
  ].filter((finding): finding is AuditFinding => Boolean(finding));

  return findings.sort((left, right) =>
    compareByPrecedence(context.policy.ordering.issueSeverity, left.severity, right.severity)
    || compareByPrecedence(context.policy.ordering.trust, left.confidence, right.confidence)
    || compareStringsAscending(left.title, right.title),
  );
}

function collectUncoveredFilesFinding(
  context: PackageAuditContext,
): AuditFinding | null {
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
    ? `${context.uncoveredFiles.length} test file${pluralize(context.uncoveredFiles.length)} under ${context.pkg.package_dir} are outside every tsconfig. Parse-only route recovery now reaches ${exerciseTargets.length} package file${pluralize(exerciseTargets.length)}, but that exercise evidence is still qualified rather than fully grounded in the current analysis views.`
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
): AuditFinding | null {
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
): readonly AuditFinding[] {
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

function collectExerciseOnlyFilesFinding(
  context: PackageAuditContext,
): AuditFinding | null {
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
    primaryRef: fileRef(primary.filePath, 'exercise-only source file'),
    relatedRefs: exerciseOnlyFiles.slice(0, 8).map((file) => fileRef(file.filePath, 'exercise-only source file')),
    evidence: exerciseOnlyFiles.slice(0, 6).flatMap((file) => {
      const witness = file.routeWitnesses.find((candidate) => candidate.routeClass === 'exercise');
      return [
        `${file.filePath}: exerciseRoots=${file.exerciseRootIds.length}, declarations=${file.declarationCount}, exports=${file.exportCount}`,
        ...(witness ? [`witness: ${witness.summary}`] : []),
      ];
    }),
  };
}

function collectPublicSurfaceUnexercisedFinding(
  context: PackageAuditContext,
): AuditFinding | null {
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
    primaryRef: fileRef(primary.filePath, 'public surface without exercise route'),
    relatedRefs: unexercisedPublicFiles.slice(0, 8).map((file) => fileRef(file.filePath, 'public surface without exercise route')),
    evidence: unexercisedPublicFiles.slice(0, 6).flatMap((file) => {
      const productionWitness = file.routeWitnesses.find((candidate) => candidate.routeClass === 'production');
      return [
        `${file.filePath}: productionRoots=${file.productionRootIds.length}, groundedProductionRoots=${file.groundedProductionRootIds.length}, declarations=${file.declarationCount}, exports=${file.exportCount}`,
        ...(productionWitness ? [`production witness: ${productionWitness.summary}`] : []),
      ];
    }),
  };
}

function collectAnswerCoordinationFragmentationFinding(
  context: PackageAuditContext,
): AuditFinding | null {
  const surface = context.coordinationSurface;
  if (!surface || surface.answerBuilderFiles.length < 2) {
    return null;
  }

  const files = surface.answerBuilderFiles
    .slice()
    .sort((left, right) =>
      compareCoordinationAuditMetrics(context.policy.auditMetricOrders.coordination, left, right)
      || compareStringsAscending(left.filePath, right.filePath),
    );
  const primary = files[0]!;
  const totalBuilders = files.reduce((count, file) => count + file.envelopeBuilderFunctions.length, 0);
  const totalWrappers = files.reduce((count, file) => count + file.envelopeWrapperFunctions.length, 0);
  const totalSummarySites = files.reduce((count, file) => count + file.summaryLineSites.length, 0);

  return {
    code: 'answer-coordination-fragmentation',
    kind: 'surface-drift',
    severity: 'warning',
    confidence: 'grounded',
    title: 'Answer construction is coordinated by repeated local builders',
    summary: `${files.length} file${pluralize(files.length)} under ${context.pkg.package_name} independently build answer envelopes with ${totalBuilders} direct envelope builder${pluralize(totalBuilders)} and ${totalWrappers} local answer specializer${pluralize(totalWrappers)}. That usually means the query/result contract is still coordinated by repeated object assembly rather than one shared answer coordinator.`,
    primaryRef: fileRef(primary.filePath, 'answer coordination hotspot'),
    relatedRefs: files.slice(0, 8).map((file) => fileRef(file.filePath, 'answer coordination hotspot')),
    evidence: files.slice(0, 6).flatMap((file) => [
      `${file.filePath}: builders=${renderNamedSurfaceMembers(file.envelopeBuilderFunctions)}, specializers=${renderNamedSurfaceMembers(file.envelopeWrapperFunctions)}`,
      `card literals=${file.cardObjectLiteralLines.length}, summary-line sites=${file.summaryLineSites.length}`,
    ]),
  };
}

function collectPresentationFragmentationFinding(
  context: PackageAuditContext,
): AuditFinding | null {
  const surface = context.coordinationSurface;
  if (!surface || surface.presentationCarrierFiles.length < 2) {
    return null;
  }

  const files = surface.presentationCarrierFiles
    .slice()
    .sort((left, right) =>
      compareCoordinationAuditMetrics(context.policy.auditMetricOrders.presentation, left, right)
      || compareStringsAscending(left.filePath, right.filePath),
    );
  const primary = files[0]!;
  const totalRefInterfaces = files.reduce((count, file) => count + file.refLikeInterfaces.length, 0);
  const totalCardInterfaces = files.reduce((count, file) => count + file.cardLikeInterfaces.length, 0);

  return {
    code: 'answer-presentation-fragmentation',
    kind: 'surface-drift',
    severity: 'info',
    confidence: 'grounded',
    title: 'Presentation carriers are repeated across multiple answer modules',
    summary: `${files.length} file${pluralize(files.length)} under ${context.pkg.package_name} each declare local ref/value answer carriers and inline card-like object literals. That suggests the package still lacks a shared intermediate presentation model or renderer seam for answer cards and consumer-specific output styles.`,
    primaryRef: fileRef(primary.filePath, 'presentation model hotspot'),
    relatedRefs: files.slice(0, 8).map((file) => fileRef(file.filePath, 'presentation model hotspot')),
    evidence: files.slice(0, 6).map((file) =>
      `${file.filePath}: ref-like interfaces=${renderNamedSurfaceMembers(file.refLikeInterfaces)}, card-like interfaces=${renderNamedSurfaceMembers(file.cardLikeInterfaces)}, card literals=${file.cardObjectLiteralLines.length}`,
    ).concat([
      `total ref-like interfaces=${totalRefInterfaces}, total card-like interfaces=${totalCardInterfaces}`,
    ]),
  };
}

function collectUnanchoredCandidateRootsFinding(
  context: PackageAuditContext,
): AuditFinding | null {
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
    primaryRef: fileRef(primary.root.filePath, 'candidate entry root'),
    relatedRefs: topCandidates.map(({ root }) => fileRef(root.filePath, root.kind)),
    evidence: topCandidates.map(({ root, file }) =>
      `${root.filePath}: outbound=${file.outboundFiles.length}, declarations=${file.declarationCount}, publicSurface=${file.publicSurface ? 'yes' : 'no'}`,
    ),
  };
}

function isDormantCandidate(
  context: PackageAuditContext,
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
  context: PackageAuditContext,
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
  context: PackageAuditContext,
  file: PackageFileReachability,
): boolean {
  if (!file.publicSurface) return false;
  if (file.exerciseRootIds.length > 0) return false;
  if (file.productionRootIds.length === 0) return false;
  if (file.filePath === context.pkg.analysis_entrypoint) return false;
  return true;
}

function createAuditDocument(
  summaryLines: readonly string[],
  findings: readonly AuditFinding[],
  relatedRefs: readonly AuditRef[],
  counts: {
    readonly blindspotCount: number;
    readonly dormantCount: number;
    readonly driftCount: number;
    readonly regimeFacts?: readonly { readonly label: string; readonly value: string }[];
  },
) {
  return createAnswerDocument<AuditRef>([
    {
      kind: 'paragraph',
      importance: 'primary',
      lines: summaryLines,
    },
    {
      kind: 'key-fact-list',
      importance: 'supporting',
      facts: [
        { label: 'blindspots', value: String(counts.blindspotCount) },
        { label: 'under-integrated files', value: String(counts.dormantCount) },
        { label: 'surface drift findings', value: String(counts.driftCount) },
        ...(counts.regimeFacts ?? []),
      ],
    },
    ...(findings.length > 0
      ? [{
        kind: 'finding-list' as const,
        importance: 'primary' as const,
        findings: findings.map((finding) => ({
          code: finding.code,
          title: finding.title,
          summary: finding.summary,
          severity: finding.severity,
          trust: finding.confidence,
          primaryRef: finding.primaryRef,
          relatedRefs: finding.relatedRefs,
          evidence: finding.evidence,
        })),
      }]
      : []),
    ...(relatedRefs.length > 0
      ? [{
        kind: 'ref-list' as const,
        importance: 'detail' as const,
        refs: relatedRefs,
      }]
      : []),
  ]);
}

function compareFileAuditMetrics(
  metrics: readonly AuditMetric[],
  left: PackageFileReachability,
  right: PackageFileReachability,
): number {
  return compareMetricSequence(metrics, left, right, fileAuditMetricValue);
}

function compareCoordinationAuditMetrics(
  metrics: readonly AuditMetric[],
  left: PackageCoordinationSurface['files'][number],
  right: PackageCoordinationSurface['files'][number],
): number {
  return compareMetricSequence(metrics, left, right, coordinationAuditMetricValue);
}

function compareMetricSequence<T>(
  metrics: readonly AuditMetric[],
  left: T,
  right: T,
  valueForMetric: (metric: AuditMetric, item: T) => number,
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
  metric: AuditMetric,
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

function coordinationAuditMetricValue(
  metric: AuditMetric,
  file: PackageCoordinationSurface['files'][number],
): number {
  switch (metric) {
    case 'builder-count':
      return file.envelopeBuilderFunctions.length;
    case 'wrapper-count':
      return file.envelopeWrapperFunctions.length;
    case 'card-literal-count':
      return file.cardObjectLiteralLines.length;
    case 'summary-site-count':
      return file.summaryLineSites.length;
    case 'ref-interface-count':
      return file.refLikeInterfaces.length;
    case 'card-interface-count':
      return file.cardLikeInterfaces.length;
    default:
      return 0;
  }
}

function trustForFindings(
  findings: readonly AuditFinding[],
  analysisFreshness: WorldFrame['freshness'],
): TrustProfile {
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
    summary: `The audit findings are grounded in the current ${analysisSurfaceEvidenceLabel(analysisFreshness)}.`,
  };
}

function closureBasisForPackageAudit(
  context: PackageAuditContext,
  findings: readonly AuditFinding[],
): readonly ClosureBasis[] {
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
      summary: context.analysisFreshness === 'live'
        ? `The audit is grounded in live deps, typerefs, and exports analysis views refreshed at ${context.analysis.deps.generated_at}, ${context.analysis.typeRefs.generated_at}, and ${context.analysis.exports.generated_at}.`
        : `The audit is grounded in materialized analysis views generated at ${context.analysis.deps.generated_at}, ${context.analysis.typeRefs.generated_at}, and ${context.analysis.exports.generated_at}.`,
      provenanceRefs: [
        context.analysis.deps.generated_at,
        context.analysis.typeRefs.generated_at,
        context.analysis.exports.generated_at,
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
  findings: readonly AuditFinding[],
): readonly Issue[] {
  return findings.slice(0, 6).map((finding) => ({
    code: finding.code,
    message: finding.summary,
    severity: finding.severity,
    origin: originForFinding(finding.kind),
  }));
}

function provenanceForPackageAudit(
  context: PackageAuditContext,
  findings: readonly AuditFinding[],
): readonly InquiryProvenanceEntry[] {
  return [
    analysisProvenanceEntry('deps', context.analysis.deps.generated_at, context.analysis.deps.source_commit, context.analysisFreshness),
    analysisProvenanceEntry('typerefs', context.analysis.typeRefs.generated_at, context.analysis.typeRefs.source_commit, context.analysisFreshness),
    analysisProvenanceEntry('exports', context.analysis.exports.generated_at, context.analysis.exports.source_commit, context.analysisFreshness),
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
  findings: readonly AuditFinding[],
): readonly Continuation[] {
  return dedupeContinuations([
    continuation('join', 'Inspect the package entrypoint', pkg.analysis_entrypoint, 'package entrypoint'),
    ...findings.slice(0, 4).map((finding) =>
      continuation('join', `Inspect ${finding.primaryRef.label}`, finding.primaryRef.value, finding.title),
    ),
  ]);
}

function createAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  policy: InquiryPolicy,
  focusRef: FocusRef,
  tag: InquiryAnswer<AuditValue>['outcome']['tag'],
  value: AuditValue,
  trust: TrustProfile,
  closureBasis: readonly ClosureBasis[],
  issues: readonly Issue[],
  continuations: readonly Continuation[],
  provenance: readonly InquiryProvenanceEntry[],
): InquiryAnswer<AuditValue> {
  const worldFrame = defaultWorldFrame(analysis, query.worldFrame);
  return createAnswerEnvelope({
    query,
    focusRef,
    inquiryEpisode: policy.inquiryEpisode,
    readMode: policy.readMode,
    worldFrame,
    tag,
    value,
    trust,
    closureBasis,
    issues,
    continuations: continuations.slice(0, policy.limits.continuationCount),
    provenance,
  });
}

function createMissAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly AuditRef[],
): InquiryAnswer<AuditValue> {
  const policy = resolveInquiryPolicy(query, {
    focusKind: focusRef.kind,
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });
  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    'miss-unknown-shape',
    createStructuredAnswerCard({
      title: 'Package audit miss',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      document: createAnswerDocument([
        {
          kind: 'paragraph',
          importance: 'primary',
          lines: [message],
        },
        ...(relatedRefs.length > 0
          ? [{
            kind: 'ref-list' as const,
            importance: 'supporting' as const,
            refs: relatedRefs,
          }]
          : []),
      ]),
      policy,
      extra: {
        findings: [],
      },
    }),
    {
      kind: 'unavailable',
      summary: 'No package-level audit target closed for this focus in the current analysis.',
    },
    [{
      kind: 'route',
      summary: 'No package in the current analysis matched the requested focus.',
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

function createExcludedFrontierAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  packageQuery: string,
  regimeContext: ReturnType<typeof inspectFocusedAnalyzabilityContext>,
): InquiryAnswer<AuditValue> {
  const policy = resolveInquiryPolicy(query, {
    focusKind: 'package',
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });
  const frontier = regimeContext.directlyExcludedFrontier;
  const message = frontier
    ? `${packageQuery} falls under excluded frontier ${frontier.prefix}, so the current package audit cannot close on it inside this profile.`
    : `${packageQuery} is outside the current included regime.`;

  return createAnswer(
    query,
    analysis,
    policy,
    { kind: 'package', value: packageQuery, label: packageQuery },
    'open-boundary',
    createStructuredAnswerCard({
      title: 'Package audit boundary',
      primaryRef: {
        kind: 'package',
        value: packageQuery,
        label: packageQuery,
      },
      relatedRefs: [],
      document: createAnswerDocument([
        {
          kind: 'paragraph',
          importance: 'primary',
          lines: [message, ...regimeContext.lines.slice(1)],
        },
        ...(regimeContext.facts.length > 0
          ? [{
            kind: 'key-fact-list' as const,
            importance: 'supporting' as const,
            facts: regimeContext.facts,
          }]
          : []),
      ]),
      policy,
      extra: {
        findings: [],
      },
    }),
    regimeContext.trust ?? {
      kind: 'frontier',
      summary: 'The requested package sits outside the included regime.',
    },
    regimeContext.closureBasis,
    regimeContext.issues,
    regimeContext.continuations,
    regimeContext.provenance,
  );
}

function createAmbiguousAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly AuditRef[],
): InquiryAnswer<AuditValue> {
  const policy = resolveInquiryPolicy(query, {
    focusKind: focusRef.kind,
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });
  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    'ambiguous',
    createStructuredAnswerCard({
      title: 'Package audit ambiguity',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      document: createAnswerDocument([
        {
          kind: 'paragraph',
          importance: 'primary',
          lines: [message],
        },
        {
          kind: 'ref-list',
          importance: 'supporting',
          refs: relatedRefs,
        },
      ]),
      policy,
      extra: {
        findings: [],
      },
    }),
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
  query: Inquiry,
  analysis: AnalysisViews,
  message: string,
): InquiryAnswer<AuditValue> {
  const policy = resolveInquiryPolicy(query, {
    focusKind: query.focusRef.kind,
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });
  return createAnswer(
    query,
    analysis,
    policy,
    query.focusRef,
    'unsupported',
    createStructuredAnswerCard({
      title: 'Package audit unsupported',
      primaryRef: {
        kind: query.focusRef.kind,
        value: query.focusRef.value,
        label: query.focusRef.label ?? query.focusRef.value,
      },
      relatedRefs: [],
      document: createAnswerDocument([
        {
          kind: 'paragraph',
          importance: 'primary',
          lines: [message],
        },
      ]),
      policy,
      extra: {
        findings: [],
      },
    }),
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
  analysis: AnalysisViews,
  query: string,
): readonly PackageExportsSummary[] {
  const normalized = trimTrailingFocusPunctuation(query).toLowerCase();
  const exact = analysis.exports.packages.filter((pkg) =>
    pkg.package_name.toLowerCase() === normalized
    || pkg.package_dir.toLowerCase() === normalized,
  );
  if (exact.length > 0) return exact;

  const shortMatches = analysis.exports.packages.filter((pkg) =>
    pkg.package_name.split('/').at(-1)?.toLowerCase() === normalized
    || pkg.package_dir.split('/').at(-1)?.toLowerCase() === normalized,
  );
  if (shortMatches.length > 0) return shortMatches;

  return analysis.exports.packages.filter((pkg) =>
    pkg.package_name.toLowerCase().includes(normalized)
    || pkg.package_dir.toLowerCase().includes(normalized),
  );
}

function packageRef(pkg: PackageExportsSummary): AuditRef {
  return {
    kind: 'package',
    value: pkg.package_name,
    label: pkg.package_name,
    ...(pkg.package_dir.length > 0 ? { detail: pkg.package_dir } : {}),
  };
}

function fileRef(filePath: string, detail?: string): AuditRef {
  return {
    kind: 'file',
    value: filePath,
    label: basename(filePath),
    ...(detail ? { detail } : {}),
  };
}

function typeRef(declaration: TypeDecl): AuditRef {
  return {
    kind: 'type',
    value: declaration.name,
    label: declaration.name,
    detail: `${declaration.file}:${declaration.line}`,
  };
}

function defaultWorldFrame(
  analysis: AnalysisViews,
  worldFrame: WorldFrame | undefined,
): WorldFrame {
  return {
    repoPath: worldFrame?.repoPath ?? analysis.root,
    target: worldFrame?.target ?? 'current',
    regimeAnchor: worldFrame?.regimeAnchor ?? 'hosted',
    partiality: worldFrame?.partiality ?? 'complete',
    freshness: worldFrame?.freshness ?? (analysis.source === 'hosted-analysis' ? 'live' : 'snapshot'),
  };
}

function defaultReadMode(
  questionRoute: Inquiry['questionRoute'],
): ReadMode {
  return questionRoute === 'inventory' ? 'summary-card' : 'focus-card';
}

function continuation(
  targetQuestionRoute: Inquiry['questionRoute'],
  label: string,
  targetFocusRef: string,
  detail: string,
): Continuation {
  return {
    kind: targetQuestionRoute === 'route' ? 'reroute' : 'inspect-support',
    label,
    description: detail,
    targetQuestionRoute,
    targetFocusRef,
  };
}

function analysisProvenanceEntry(
  kind: 'deps' | 'typerefs' | 'exports',
  generatedAt: string,
  sourceCommit: string,
  freshness: WorldFrame['freshness'],
): InquiryProvenanceEntry {
  if (freshness === 'live') {
    return {
      kind: 'host',
      label: `${kind} analysis view`,
      ref: generatedAt,
      detail: `source_commit=${sourceCommit}`,
    };
  }

  return {
    kind: 'snapshot',
    label: `${kind} snapshot`,
    ref: generatedAt,
    detail: `source_commit=${sourceCommit}`,
  };
}

function analysisSurfaceLabel(
  worldFrame: WorldFrame | undefined,
): string {
  return worldFrame?.freshness === 'live' ? 'current analysis' : 'current materialized analysis';
}

function analysisSurfaceEvidenceLabel(
  freshness: WorldFrame['freshness'],
): string {
  return freshness === 'live'
    ? 'deps, typerefs, and exports analysis views'
    : 'materialized deps, typerefs, and exports analysis views';
}

function mergeTrustProfiles(
  base: TrustProfile,
  regime: TrustProfile | null,
): TrustProfile {
  if (!regime) {
    return base;
  }

  if (regime.kind === 'frontier') {
    return regime;
  }

  if (base.kind === 'grounded' && regime.kind === 'qualified') {
    return regime;
  }

  return base;
}

function originForFinding(
  kind: AuditFindingKind,
): IssueOrigin {
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

function resolveAuditRepoPath(repoPath?: string): string {
  return repoPath && repoPath.length > 0 ? repoPath : process.cwd();
}

function createSafeCoordinationSurface(
  repoPath: string,
  packageFiles: readonly string[],
): PackageCoordinationSurface | null {
  try {
    return createPackageCoordinationSurface(repoPath, packageFiles);
  } catch {
    return null;
  }
}

function renderNamedSurfaceMembers(
  members: readonly { name: string; line: number }[],
): string {
  if (members.length === 0) {
    return 'none';
  }

  return members
    .slice(0, 4)
    .map((member) => `${member.name}@${member.line}`)
    .join(', ');
}

function dedupeRefs(
  refs: readonly AuditRef[],
): readonly AuditRef[] {
  const seen = new Set<string>();
  const deduped: AuditRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}\0${ref.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }
  return deduped;
}

function dedupeContinuations(
  continuations: readonly Continuation[],
): readonly Continuation[] {
  const seen = new Set<string>();
  const deduped: Continuation[] = [];
  for (const continuation of continuations) {
    const key = `${continuation.targetQuestionRoute ?? ''}\0${continuation.targetFocusRef ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(continuation);
  }
  return deduped;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled source-analysis audit case: ${String(value)}`);
}
