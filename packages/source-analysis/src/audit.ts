import {
  type AnalysisViews,
} from './analysis-views.js';
import {
  defaultWorldFrameForAnalysis,
  describeAnalysisSurface,
  describeAnalysisSurfaceEvidence,
} from './analysis-surface.js';
import {
  analysisGeneratedAtRefs,
  createAnalysisProvenanceEntriesForKinds,
  describeAnalysisMaterializationTiming,
} from './analysis-metadata-support.js';
import {
  type DependencySurface,
} from './dependency-surface.js';
import {
  loadCurrentAnalysisViews,
} from './snapshot-analysis-views.js';
import type { LoadedCurrentSnapshotSet } from './snapshot-contract.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { TypeDecl } from './typerefs/schema.js';
import {
  type FocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import type { AnswerCard } from './answer-card.js';
import type { AnswerRef } from './answer-ref.js';
import {
  createStructuredAnswerCard,
} from './answer-card.js';
import {
  createAnswerRef,
  createFileAnswerRef,
  createPackageSummaryAnswerRef,
  createTypeDeclarationAnswerRef,
} from './answer-refs.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import {
  executionPostureFromFrame,
  worldTargetingFromFrame,
} from './inquiry-model.js';
import {
  createPresentationPolicyInput,
  resolveInquiryPolicy,
  type AuditMetric,
  type InquiryPolicy,
} from './inquiry-policy.js';
import {
  compareByPrecedence,
  compareNumbersDescending,
  compareStringsAscending,
} from './ordering.js';
import {
  PACKAGE_AUDIT_SIGNAL_KINDS,
  collectSharedPackageAuditSignals,
  type PackageAuditEvaluatorContext,
  type PackageAuditSignal,
  type PackageAuditSignalKind,
  type PackageAuditSignalSubject,
} from './package-audit-evaluator.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
  IssueOrigin,
  IssueSeverity,
  TrustKind,
  TrustProfile,
} from './outcome-algebra.js';
import {
  continuationTargetRoute,
  resolveContinuationTargetQuestionRoute,
} from './outcome-algebra.js';
import type {
  InquiryAnswer,
  InquiryEvidenceProvenanceEntry,
  InquiryProvenanceEntry,
  FocusRef,
  Inquiry,
  PolicyFocusKind,
  PresentationReadMode,
  WorldFrame,
} from './inquiry-model.js';
import type { PackageReachability } from './reachability.js';
import {
  describeMissingStructuralPackageSurface,
} from './structural-source-file-surface.js';
import type { PackageCoordinationSurface } from './coordination-surface.js';
import { createPackageCoordinationSurface } from './coordination-surface.js';
import {
  coerceWorkspaceAuthority,
  createLegacyProjectionWorkspaceAuthority,
  type WorkspaceAuthority,
} from './authority/workspace-authority.js';
import type { Locator } from './authority/contracts.js';

export const AUDIT_FINDING_KINDS = PACKAGE_AUDIT_SIGNAL_KINDS;

export type AuditFindingKind =
  PackageAuditSignalKind;

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

export interface PackageAuditInspection {
  readonly normalizedPackageQuery: string;
  readonly requestedRegimeContext: FocusedAnalyzabilityContext;
  readonly packageOutcome: ReturnType<WorkspaceAuthority['resolvePackage']>;
  readonly pkg: PackageExportsSummary | null;
  readonly regimeContext: FocusedAnalyzabilityContext | null;
  readonly packageSurface: NonNullable<ReturnType<WorkspaceAuthority['getStructuralPackageSurface']>> | null;
  readonly reachability: PackageReachability | null;
  readonly sharedSignals: readonly PackageAuditSignal[] | null;
}

interface PackageAuditContext {
  readonly analysis: AnalysisViews;
  readonly analysisFreshness: WorldFrame['freshness'];
  readonly pkg: PackageExportsSummary;
  readonly packageFiles: readonly string[];
  readonly uncoveredFiles: readonly string[];
  readonly unresolvedImports: readonly AnalysisViews['deps']['unresolved_imports'][number][];
  readonly declarationsByFile: ReadonlyMap<string, readonly TypeDecl[]>;
  readonly dependencySurface: DependencySurface;
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
    createLegacyProjectionWorkspaceAuthority(loadCurrentAnalysisViews(target, waitMs)),
  );
}

export function createAuditAnswer(
  query: Inquiry,
  authorityInput: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
): InquiryAnswer<AuditValue> {
  const authority = coerceWorkspaceAuthority(authorityInput);
  switch (query.focusRef.kind) {
    case 'package':
      return buildPackageAuditAnswer(query, authority, query.focusRef.value);
    default:
      return createUnsupportedAnswer(
        query,
        authority.analysis,
        `Audit for focus kind "${query.focusRef.kind}" is not implemented yet.`,
      );
  }
}

export function inspectPackageAudit(
  authorityInput: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
  packageQuery: string,
  options: {
    readonly policy: InquiryPolicy;
    readonly locatorKind?: 'package-name' | 'package-dir';
    readonly spendThreshold?: Parameters<WorkspaceAuthority['resolvePackage']>[1];
  },
): PackageAuditInspection {
  const authority = coerceWorkspaceAuthority(authorityInput);
  const normalizedPackageQuery = options.locatorKind === 'package-dir'
    ? packageQuery
    : trimTrailingFocusPunctuation(packageQuery);
  const requestedRegimeContext = authority.inspectFocusedAnalyzability({
    focusLabel: normalizedPackageQuery,
    queryHints: [normalizedPackageQuery],
  });
  const packageOutcome = authority.resolvePackage(
    locator(options.locatorKind ?? 'package-name', normalizedPackageQuery, 'package'),
    options.spendThreshold,
  );

  if (packageOutcome.kind !== 'claim') {
    return {
      normalizedPackageQuery,
      requestedRegimeContext,
      packageOutcome,
      pkg: null,
      regimeContext: null,
      packageSurface: null,
      reachability: null,
      sharedSignals: null,
    };
  }

  const pkg = packageOutcome.value;
  const regimeContext = authority.inspectFocusedAnalyzability({
    focusLabel: pkg.package_name,
    pathPrefixes: [pkg.package_dir],
    queryHints: [pkg.package_name, pkg.package_dir, normalizedPackageQuery],
  });
  const packageSurface = authority.getStructuralPackageSurface(pkg.package_dir);
  const reachability = authority.getPackageReachability(pkg.package_dir, options.policy.ordering);
  const sharedSignals = packageSurface && reachability
    ? collectSharedPackageAuditSignals({
      analysis: authority.analysis,
      pkg,
      packageFiles: packageSurface.files,
      uncoveredFiles: packageSurface.uncoveredFiles,
      unresolvedImports: packageSurface.unresolvedImports,
      declarationsByFile: packageSurface.declarationsByFile,
      dependencySurface: authority.getDependencySurface(),
      reachability,
      policy: options.policy,
    })
    : null;

  return {
    normalizedPackageQuery,
    requestedRegimeContext,
    packageOutcome,
    pkg,
    regimeContext,
    packageSurface,
    reachability,
    sharedSignals,
  };
}

function buildPackageAuditAnswer(
  query: Inquiry,
  authority: WorkspaceAuthority,
  packageQuery: string,
): InquiryAnswer<AuditValue> {
  // TODO: Package audit now spends shared package evaluators for
  // route/reachability findings, but coordination-surface heuristics still
  // live here as audit-local self-pressure checks. Revisit that seam once a
  // broader answer/runtime coordinator exists.
  const analysis = authority.analysis;
  const policy = resolveInquiryPolicy(createPresentationPolicyInput(query, defaultReadMode(query.questionRoute)), {
    focusKind: 'package',
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });
  const inspection = inspectPackageAudit(authority, packageQuery, { policy });
  if (inspection.packageOutcome.kind === 'no-claim') {
    if (inspection.requestedRegimeContext.directlyExcludedFrontier) {
      return createExcludedFrontierAnswer(
        query,
        analysis,
        inspection.normalizedPackageQuery,
        inspection.requestedRegimeContext,
      );
    }
    return createMissAnswer(
      query,
      analysis,
      `No package matches "${inspection.normalizedPackageQuery}".`,
      { kind: 'package', value: inspection.normalizedPackageQuery },
      [],
    );
  }

  if (inspection.packageOutcome.kind === 'ambiguity') {
    return createAmbiguousAnswer(
      query,
      analysis,
      `Package query "${inspection.normalizedPackageQuery}" is ambiguous.`,
      { kind: 'package', value: inspection.normalizedPackageQuery },
      inspection.packageOutcome.ambiguity.candidates.map((pkg) => packageRef(pkg)),
    );
  }

  const pkg = inspection.pkg!;
  const regimeContext = inspection.regimeContext!;
  const packageSurface = inspection.packageSurface;
  const reachability = inspection.reachability;
  if (!packageSurface || !reachability) {
    return createStructuralPackageBoundaryAnswer(
      query,
      analysis,
      pkg,
      describeMissingStructuralPackageSurface(),
      regimeContext,
    );
  }
  const context = createPackageAuditContext(
    analysis,
    pkg,
    resolveAuditRepoPath(worldTargetingFromFrame(query.worldFrame).repoPath),
    executionPostureFromFrame(query.worldFrame).freshness,
    policy,
    packageSurface,
    reachability,
    authority.getDependencySurface(),
  );
  const findings = collectPackageAuditFindings(context, inspection.sharedSignals ?? undefined);

  const blindspotCount = findings.filter((finding) => finding.kind === 'blindspot').length;
  const dormantCount = findings.filter((finding) => finding.kind === 'under-integrated-file').length;
  const cycleCount = findings.filter((finding) => finding.kind === 'layer-cycle').length;
  const driftCount = findings.filter((finding) => finding.kind === 'surface-drift').length;
  const strongestCycleFinding = findings.find((finding) => finding.kind === 'layer-cycle');
  const cycleSummaryLines = strongestCycleFinding
    ? strongestCycleFinding.evidence
      .filter((line) => line.includes('->'))
      .slice(0, 2)
      .map((line) => `Top cycle seam: ${line}`)
    : [];

  const summaryLines = findings.length === 0
    ? [`No strong integration red flags closed for ${pkg.package_name} in the ${describeAnalysisSurface(executionPostureFromFrame(query.worldFrame).freshness)}.`]
    : [
      `${pkg.package_name} shows ${findings.length} likely integration red flag${pluralize(findings.length)} in the ${describeAnalysisSurface(executionPostureFromFrame(query.worldFrame).freshness)}.`,
      ...(blindspotCount > 0
        ? [`${blindspotCount} blind spot${pluralize(blindspotCount)} keep the exercise/dead-code picture open.`]
        : []),
      ...(dormantCount > 0
        ? [`${dormantCount} file${pluralize(dormantCount)} look${dormantCount === 1 ? 's' : ''} parked rather than integrated.`]
        : []),
      ...(cycleCount > 0
        ? [`${cycleCount} finding${pluralize(cycleCount)} shows package-internal layer cycles that still defeat the intended source-area DAG.`]
        : []),
      ...cycleSummaryLines,
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
    cycleCount,
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
  packageSurface: NonNullable<ReturnType<WorkspaceAuthority['getStructuralPackageSurface']>>,
  reachability: PackageReachability,
  dependencySurface: DependencySurface,
): PackageAuditContext {
  const coordinationSurface = createSafeCoordinationSurface(repoPath, packageSurface.files);

  return {
    analysis,
    analysisFreshness,
    pkg,
    packageFiles: packageSurface.files,
    uncoveredFiles: packageSurface.uncoveredFiles,
    unresolvedImports: packageSurface.unresolvedImports,
    declarationsByFile: packageSurface.declarationsByFile,
    dependencySurface,
    reachability,
    coordinationSurface,
    policy,
  };
}

function collectPackageAuditFindings(
  context: PackageAuditContext,
  sharedSignals = collectSharedPackageAuditSignals(toPackageAuditEvaluatorContext(context)),
): readonly AuditFinding[] {
  // Keep route/reachability/blindspot findings behind the shared package audit
  // evaluator seam. Coordination and presentation fragmentation stay local here
  // because they are still audit-shaped judgments about this package's own
  // self-pressure rather than shared program meaning.
  const signals = [
    ...sharedSignals,
    collectAnswerCoordinationFragmentationSignal(context),
    collectPresentationFragmentationSignal(context),
  ].filter((signal): signal is PackageAuditSignal => Boolean(signal));

  return signals
    .sort((left, right) =>
      compareByPrecedence(context.policy.ordering.issueSeverity, left.severity, right.severity)
      || compareByPrecedence(context.policy.ordering.trust, left.confidence, right.confidence)
      || compareStringsAscending(left.title, right.title),
    )
    .map((signal) => toAuditFinding(signal));
}

function collectAnswerCoordinationFragmentationSignal(
  context: PackageAuditContext,
): PackageAuditSignal | null {
  // TODO: If a broader answer/runtime authority emerges, this audit-local
  // fragmentation heuristic should either move there or disappear behind a
  // stronger shared coordinator instead of remaining a permanent local smell.
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
    primarySubject: {
      kind: 'file',
      filePath: primary.filePath,
      detail: 'answer coordination hotspot',
    },
    relatedSubjects: files.slice(0, 8).map((file) => ({
      kind: 'file' as const,
      filePath: file.filePath,
      detail: 'answer coordination hotspot',
    })),
    evidence: files.slice(0, 6).flatMap((file) => [
      `${file.filePath}: builders=${renderNamedSurfaceMembers(file.envelopeBuilderFunctions)}, specializers=${renderNamedSurfaceMembers(file.envelopeWrapperFunctions)}`,
      `card literals=${file.cardObjectLiteralLines.length}, summary-line sites=${file.summaryLineSites.length}`,
    ]),
  };
}

function collectPresentationFragmentationSignal(
  context: PackageAuditContext,
): PackageAuditSignal | null {
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
    primarySubject: {
      kind: 'file',
      filePath: primary.filePath,
      detail: 'presentation model hotspot',
    },
    relatedSubjects: files.slice(0, 8).map((file) => ({
      kind: 'file' as const,
      filePath: file.filePath,
      detail: 'presentation model hotspot',
    })),
    evidence: files.slice(0, 6).map((file) =>
      `${file.filePath}: ref-like interfaces=${renderNamedSurfaceMembers(file.refLikeInterfaces)}, card-like interfaces=${renderNamedSurfaceMembers(file.cardLikeInterfaces)}, card literals=${file.cardObjectLiteralLines.length}`,
    ).concat([
      `total ref-like interfaces=${totalRefInterfaces}, total card-like interfaces=${totalCardInterfaces}`,
    ]),
  };
}

function toPackageAuditEvaluatorContext(
  context: PackageAuditContext,
): PackageAuditEvaluatorContext {
  return {
    analysis: context.analysis,
    pkg: context.pkg,
    packageFiles: context.packageFiles,
    uncoveredFiles: context.uncoveredFiles,
    unresolvedImports: context.unresolvedImports,
    declarationsByFile: context.declarationsByFile,
    dependencySurface: context.dependencySurface,
    reachability: context.reachability,
    policy: context.policy,
  };
}

function toAuditFinding(
  signal: PackageAuditSignal,
): AuditFinding {
  return {
    code: signal.code,
    kind: signal.kind,
    severity: signal.severity,
    confidence: signal.confidence,
    title: signal.title,
    summary: signal.summary,
    primaryRef: toAuditRef(signal.primarySubject),
    relatedRefs: dedupeRefs(signal.relatedSubjects.map((subject) => toAuditRef(subject))),
    evidence: signal.evidence,
  };
}

function toAuditRef(
  subject: PackageAuditSignalSubject,
): AuditRef {
  switch (subject.kind) {
    case 'package':
      return createPackageSummaryAnswerRef(subject.pkg);
    case 'file':
      return createFileAnswerRef(subject.filePath, subject.detail);
    case 'type-declaration':
      return createTypeDeclarationAnswerRef(subject.declaration);
    default:
      return assertNever(subject);
  }
}

function createAuditDocument(
  summaryLines: readonly string[],
  findings: readonly AuditFinding[],
  relatedRefs: readonly AuditRef[],
  counts: {
    readonly blindspotCount: number;
    readonly dormantCount: number;
    readonly cycleCount: number;
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
        { label: 'layer-cycle findings', value: String(counts.cycleCount) },
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
    summary: `The audit findings are grounded in the current ${describeAnalysisSurfaceEvidence(analysisFreshness, ['deps', 'typerefs', 'exports'])}.`,
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
      summary: `The audit is grounded in ${describeAnalysisMaterializationTiming(
        context.analysis,
        context.analysisFreshness,
        ['deps', 'typerefs', 'exports'],
      )}`,
      provenanceRefs: analysisGeneratedAtRefs(context.analysis, ['deps', 'typerefs', 'exports']),
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
    ...createAnalysisProvenanceEntriesForKinds(
      context.analysis,
      ['deps', 'typerefs', 'exports'],
      context.analysisFreshness,
    ),
    ...(findings.length > 0
      ? [({
        kind: 'route' as const,
        label: `${context.pkg.package_name} package audit`,
        ref: context.pkg.package_name,
        detail: `findings=${findings.length}`,
      } satisfies InquiryEvidenceProvenanceEntry)]
      : []),
    ({
      kind: 'route',
      label: 'package reachability roots',
      ref: context.pkg.package_name,
      detail: context.reachability.roots
        .map((root) => `${root.kind}:${basename(root.filePath)}`)
        .slice(0, 8)
        .join(', '),
    } satisfies InquiryEvidenceProvenanceEntry),
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
  const worldFrame = defaultWorldFrameForAnalysis(analysis, query.worldFrame);
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
  const policy = resolveInquiryPolicy(createPresentationPolicyInput(query, defaultReadMode(query.questionRoute)), {
    focusKind: policyFocusKindForAnswerFocus(focusRef.kind),
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
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
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
  regimeContext: FocusedAnalyzabilityContext,
): InquiryAnswer<AuditValue> {
  const policy = resolveInquiryPolicy(createPresentationPolicyInput(query, defaultReadMode(query.questionRoute)), {
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
      primaryRef: createAnswerRef('package', packageQuery, packageQuery),
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

function createStructuralPackageBoundaryAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  pkg: PackageExportsSummary,
  message: string,
  regimeContext: FocusedAnalyzabilityContext,
): InquiryAnswer<AuditValue> {
  const policy = resolveInquiryPolicy(createPresentationPolicyInput(query, defaultReadMode(query.questionRoute)), {
    focusKind: 'package',
    inquiryEpisode: 'inventory-and-audit-sweep',
    readMode: defaultReadMode(query.questionRoute),
  });

  return createAnswer(
    query,
    analysis,
    policy,
    { kind: 'package', value: pkg.package_name, label: pkg.package_name },
    'open-boundary',
    createStructuredAnswerCard({
      title: 'Package audit boundary',
      primaryRef: packageRef(pkg),
      relatedRefs: [],
      document: createAnswerDocument([
        {
          kind: 'paragraph',
          importance: 'primary',
          lines: [message, ...regimeContext.lines],
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
      kind: 'qualified',
      summary: message,
    },
    [{
      kind: 'boundary',
      summary: message,
    }, ...regimeContext.closureBasis],
    [{
      code: 'audit-structural-package-boundary',
      message,
      severity: 'warning',
      origin: 'boundary',
    }, ...regimeContext.issues],
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
  const policy = resolveInquiryPolicy(createPresentationPolicyInput(query, defaultReadMode(query.questionRoute)), {
    focusKind: policyFocusKindForAnswerFocus(focusRef.kind),
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
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
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
  const policy = resolveInquiryPolicy(createPresentationPolicyInput(query, defaultReadMode(query.questionRoute)), {
    focusKind: policyFocusKindForAnswerFocus(query.focusRef.kind),
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
      primaryRef: createAnswerRef(
        query.focusRef.kind,
        query.focusRef.value,
        query.focusRef.label ?? query.focusRef.value,
      ),
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

function packageRef(pkg: PackageExportsSummary): AuditRef {
  return createPackageSummaryAnswerRef(pkg);
}

function fileRef(filePath: string, detail?: string): AuditRef {
  return createFileAnswerRef(filePath, detail);
}

function typeRef(declaration: TypeDecl): AuditRef {
  return createTypeDeclarationAnswerRef(declaration);
}

function defaultReadMode(
  questionRoute: Inquiry['questionRoute'],
): PresentationReadMode {
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
    ...continuationTargetRoute(targetQuestionRoute),
    targetFocusRef,
  };
}

function policyFocusKindForAnswerFocus(
  focusKind: FocusRef['kind'],
): PolicyFocusKind {
  return focusKind === 'claim'
    ? 'inquiry'
    : focusKind;
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
    case 'layer-cycle':
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

function locator(
  kind: Locator['kind'],
  value: string,
  label?: string,
): Locator {
  return {
    kind,
    value,
    ...(label ? { label } : {}),
  };
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
    const key = `${resolveContinuationTargetQuestionRoute(continuation) ?? ''}\0${continuation.targetFocusRef ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(continuation);
  }
  return deduped;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled source-analysis audit case: ${String(value)}`);
}
