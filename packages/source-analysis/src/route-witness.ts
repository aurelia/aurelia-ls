import {
  type AnalysisViews,
} from './analysis-views.js';
import {
  defaultWorldFrameForAnalysis,
} from './analysis-surface.js';
import {
  analysisGeneratedAtRefs,
  createAnalysisProvenanceEntriesForKinds,
  describeAnalysisMaterializationTiming,
} from './analysis-metadata-support.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { AnswerCard } from './answer-card.js';
import type { AnswerRef } from './answer-ref.js';
import { createStructuredAnswerCard } from './answer-card.js';
import {
  createAnswerRef,
  createFileAnswerRef,
  createPackageSummaryAnswerRef,
  createTypeDeclarationAnswerRef,
} from './answer-refs.js';
import {
  loadCurrentAnalysisViews,
} from './snapshot-analysis-views.js';
import type { LoadedCurrentSnapshotSet } from './snapshot-contract.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import {
  type FocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import type { FocusedStructuralPathContext } from './focused-structural-path.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import { executionPostureFromFrame } from './inquiry-model.js';
import {
  createPresentationPolicyInput,
  resolveInquiryPolicy,
  type InquiryPolicy,
  DEFAULT_INQUIRY_ORDERING,
} from './inquiry-policy.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
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
  PolicyFocusKind,
  FocusRef,
  Inquiry,
  PresentationReadMode,
  WorldFrame,
} from './inquiry-model.js';
import type { PackageRouteWitness } from './reachability.js';
import type { TypeDecl } from './typerefs/schema.js';
import {
  coerceWorkspaceAuthority,
  createLegacyProjectionWorkspaceAuthority,
  type WorkspaceAuthority,
} from './authority/workspace-authority.js';
import type { Locator } from './authority/contracts.js';

export type RouteWitnessRef = AnswerRef;

export type RouteWitnessValue = AnswerCard<RouteWitnessRef> & {
  readonly witnesses: readonly PackageRouteWitness[];
};

export interface FileRouteWitnessInspection {
  readonly normalizedFileQuery: string;
  readonly inspection: ReturnType<WorkspaceAuthority['inspectFocusedFile']>;
  readonly pkg: PackageExportsSummary | null;
  readonly witnesses: readonly PackageRouteWitness[] | null;
}

export interface TypeRouteWitnessInspection {
  readonly normalizedTypeQuery: string;
  readonly typeOutcome: ReturnType<WorkspaceAuthority['resolveTypeDeclaration']>;
  readonly pkg: PackageExportsSummary | null;
  readonly regimeContext: FocusedAnalyzabilityContext | null;
  readonly witnesses: readonly PackageRouteWitness[] | null;
}

export function createCurrentRouteWitnessAnswer(
  query: Inquiry,
  target?: string,
  waitMs = 0,
): InquiryAnswer<RouteWitnessValue> {
  return createRouteWitnessAnswer(
    query,
    createLegacyProjectionWorkspaceAuthority(loadCurrentAnalysisViews(target, waitMs)),
  );
}

export function createRouteWitnessAnswer(
  query: Inquiry,
  authorityInput: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
): InquiryAnswer<RouteWitnessValue> {
  const authority = coerceWorkspaceAuthority(authorityInput);
  switch (query.focusRef.kind) {
    case 'file':
      return buildFileRouteWitnessAnswer(query, authority, query.focusRef.value);
    case 'type':
      return buildTypeRouteWitnessAnswer(query, authority, query.focusRef.value);
    default:
      return createUnsupportedAnswer(
        query,
        authority.analysis,
        `Route witnesses for focus kind "${query.focusRef.kind}" are not implemented yet.`,
      );
  }
}

export function inspectFileRouteWitness(
  authorityInput: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
  fileQuery: string,
  ordering = DEFAULT_INQUIRY_ORDERING,
): FileRouteWitnessInspection {
  const authority = coerceWorkspaceAuthority(authorityInput);
  const inspection = authority.inspectFocusedFile(locator('file-path', fileQuery, 'file'));
  const pkg = inspection.matchedFilePath
    ? authority.resolveOwningPackage(inspection.matchedFilePath)
    : null;
  const witnesses = inspection.matchedFilePath && pkg
    ? authority.getPackageRouteWitnesses(
      pkg.package_dir,
      inspection.matchedFilePath,
      ordering,
    )
    : null;

  return {
    normalizedFileQuery: inspection.normalizedQuery,
    inspection,
    pkg,
    witnesses,
  };
}

export function inspectTypeRouteWitness(
  authorityInput: WorkspaceAuthority | AnalysisViews | LoadedCurrentSnapshotSet,
  typeQuery: string,
  ordering = DEFAULT_INQUIRY_ORDERING,
): TypeRouteWitnessInspection {
  const authority = coerceWorkspaceAuthority(authorityInput);
  const normalizedTypeQuery = trimTrailingFocusPunctuation(typeQuery);
  const typeOutcome = authority.resolveTypeDeclaration(locator('type-name', normalizedTypeQuery, 'type'));
  const pkg = typeOutcome.kind === 'claim'
    ? authority.resolveOwningPackage(typeOutcome.value.file)
    : null;
  const regimeContext = typeOutcome.kind === 'claim'
    ? authority.inspectFocusedAnalyzability({
      focusLabel: typeOutcome.value.name,
      pathPrefixes: [typeOutcome.value.file],
      queryHints: [normalizedTypeQuery, typeOutcome.value.name, typeOutcome.value.file],
    })
    : null;
  const witnesses = typeOutcome.kind === 'claim' && pkg
    ? authority.getPackageRouteWitnesses(
      pkg.package_dir,
      typeOutcome.value.file,
      ordering,
    )
    : null;

  return {
    normalizedTypeQuery,
    typeOutcome,
    pkg,
    regimeContext,
    witnesses,
  };
}

function buildFileRouteWitnessAnswer(
  query: Inquiry,
  authority: WorkspaceAuthority,
  fileQuery: string,
): InquiryAnswer<RouteWitnessValue> {
  const analysis = authority.analysis;
  const policy = policyForRouteWitness(query, 'file');
  const routeInspection = inspectFileRouteWitness(authority, fileQuery, policy.ordering);
  const fileInspection = routeInspection.inspection;
  if (fileInspection.matches.length === 0) {
    if (fileInspection.requestedRegimeContext.directlyExcludedFrontier) {
      return createOpenBoundaryAnswer(
        query,
        analysis,
        { kind: 'file', value: fileInspection.normalizedQuery, label: basename(fileInspection.normalizedQuery) },
        `${fileInspection.normalizedQuery} falls under excluded frontier ${fileInspection.requestedRegimeContext.directlyExcludedFrontier.prefix}, so the current route model cannot close on it inside this profile.`,
        [],
        fileInspection.requestedRegimeContext.continuations,
        fileInspection.requestedRegimeContext,
      );
    }
    if (fileInspection.catalogIssue || fileInspection.structuralPathContext?.tag === 'open-boundary') {
      return createOpenBoundaryAnswer(
        query,
        analysis,
        { kind: 'file', value: fileInspection.normalizedQuery, label: basename(fileInspection.normalizedQuery) },
        fileInspection.catalogIssue
          ?? `${fileInspection.normalizedQuery} is outside the live structural source-file catalog, so the current route model cannot close on it as a source-backed file.`,
        [],
        [],
        fileInspection.requestedRegimeContext,
        fileInspection.structuralPathContext,
      );
    }
    return createMissAnswer(
      query,
      analysis,
      `No file matches "${fileInspection.normalizedQuery}".`,
      { kind: 'file', value: fileInspection.normalizedQuery },
      [],
    );
  }

  if (fileInspection.matches.length > 1) {
    return createAmbiguousAnswer(
      query,
      analysis,
      `File query "${fileQuery}" is ambiguous.`,
      { kind: 'file', value: fileQuery },
      fileInspection.matches.slice(0, 8).map((filePath) => fileRef(filePath, filePath)),
    );
  }

  const filePath = fileInspection.matchedFilePath!;
  if (requiresSourceCatalogBoundary(fileInspection.structuralPathContext)) {
    const pkg = authority.resolveOwningPackage(filePath);
    return createOpenBoundaryAnswer(
      query,
      analysis,
      { kind: 'file', value: filePath, label: basename(filePath) },
      describeStructuralSourceBoundary(filePath, fileInspection.structuralPathContext),
      pkg ? [packageRef(pkg)] : [],
      [],
      fileInspection.matchedRegimeContext!,
      fileInspection.structuralPathContext,
    );
  }

  const pkg = routeInspection.pkg;
  if (!pkg) {
    return createOpenBoundaryAnswer(
      query,
      analysis,
      { kind: 'file', value: filePath, label: basename(filePath) },
      `No owning package route surface is modeled for ${filePath}.`,
      [],
      [],
    );
  }

  const witnesses = routeInspection.witnesses;
  if (!witnesses) {
    return createOpenBoundaryAnswer(
      query,
      analysis,
      { kind: 'file', value: filePath, label: basename(filePath) },
      `Route witnesses for ${filePath} still need a shared structural package surface before the current authority can close on them.`,
      [packageRef(pkg)],
      [],
      fileInspection.matchedRegimeContext!,
      fileInspection.structuralPathContext,
    );
  }
  return createHitRouteWitnessAnswer(
    query,
    analysis,
    pkg,
    { kind: 'file', value: filePath, label: basename(filePath) },
    fileRef(filePath, filePath),
    witnesses,
    [],
    fileInspection.matchedRegimeContext!,
    fileInspection.structuralPathContext,
  );
}

function buildTypeRouteWitnessAnswer(
  query: Inquiry,
  authority: WorkspaceAuthority,
  typeQuery: string,
): InquiryAnswer<RouteWitnessValue> {
  const analysis = authority.analysis;
  const policy = policyForRouteWitness(query, 'type');
  const routeInspection = inspectTypeRouteWitness(authority, typeQuery, policy.ordering);
  const normalizedTypeQuery = routeInspection.normalizedTypeQuery;
  const typeResolution = routeInspection.typeOutcome;
  if (typeResolution.kind === 'no-claim') {
    return createMissAnswer(
      query,
      analysis,
      `No type declaration matches "${normalizedTypeQuery}".`,
      { kind: 'type', value: normalizedTypeQuery },
      [],
    );
  }

  if (typeResolution.kind === 'ambiguity') {
    return createAmbiguousAnswer(
      query,
      analysis,
      `Type query "${normalizedTypeQuery}" matches multiple declarations.`,
      { kind: 'type', value: normalizedTypeQuery },
      typeResolution.ambiguity.candidates.slice(0, 8).map((declaration) => typeRef(declaration)),
    );
  }

  const declaration = typeResolution.value;
  const pkg = routeInspection.pkg;
  if (!pkg) {
    return createOpenBoundaryAnswer(
      query,
      analysis,
      { kind: 'type', value: declaration.name, label: declaration.name },
      `No owning package route surface is modeled for ${declaration.name}.`,
      [fileRef(declaration.file, 'declaring file')],
      [],
    );
  }

  const regimeContext = routeInspection.regimeContext!;
  const witnesses = routeInspection.witnesses;
  if (!witnesses) {
    return createOpenBoundaryAnswer(
      query,
      analysis,
      { kind: 'type', value: declaration.name, label: declaration.name },
      `Route witnesses for ${declaration.name} still need a shared structural package surface before the current authority can close on them.`,
      [fileRef(declaration.file, 'declaring file'), packageRef(pkg)],
      [],
      regimeContext,
    );
  }
  return createHitRouteWitnessAnswer(
    query,
    analysis,
    pkg,
    { kind: 'type', value: declaration.name, label: declaration.name },
    typeRef(declaration),
    witnesses,
    [fileRef(declaration.file, 'declaring file')],
    regimeContext,
    null,
  );
}

function createHitRouteWitnessAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  pkg: PackageExportsSummary,
  focusRef: FocusRef,
  primaryRef: RouteWitnessRef,
  witnesses: readonly PackageRouteWitness[],
  extraRelatedRefs: readonly RouteWitnessRef[],
  regimeContext: FocusedAnalyzabilityContext,
  structuralPathContext: FocusedStructuralPathContext | null,
): InquiryAnswer<RouteWitnessValue> {
  const bestWitness = witnesses[0];
  const relatedRefs = dedupeRefs([
    packageRef(pkg),
    ...extraRelatedRefs,
    ...witnesses.slice(0, 4).flatMap((witness) => [
      fileRef(witness.rootFilePath, `${witness.rootKind} root`),
      ...witness.steps.slice(0, 4).flatMap((step) => [
        fileRef(step.fromFilePath, step.kind),
        fileRef(step.toFilePath, step.kind),
      ]),
    ]),
  ]).slice(0, 12);

  if (!bestWitness) {
    return createOpenBoundaryAnswer(
      query,
      analysis,
      focusRef,
      `${primaryRef.value} currently has no modeled route witness inside ${pkg.package_name}.`,
      relatedRefs,
      [
        continuation('inventory', `Audit ${pkg.package_name}`, pkg.package_name, 'package audit'),
      ],
    );
  }

  const trust: TrustProfile = bestWitness.trust === 'grounded'
    ? {
      kind: 'grounded',
      summary: 'At least one route witness closes on a grounded path.',
    }
    : {
      kind: 'qualified',
      summary: 'Route witnesses exist, but the best path still depends on qualified recovery rather than only grounded analysis edges.',
    };

  const summaryLines = [
    summarizeBestWitness(primaryRef, bestWitness),
    ...(witnesses.length > 1
      ? [`Additional route witnesses: ${witnesses.slice(1, 4).map((witness) => renderWitnessChain(witness)).join('; ')}.`]
      : []),
    ...regimeContext.lines,
    ...(structuralPathContext?.lines ?? []),
  ];
  const policy = policyForRouteWitness(query, focusRef.kind);
  const facts = [
    ...regimeContext.facts,
    ...(structuralPathContext?.facts ?? []),
  ];

  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    regimeContext.tag === 'open-boundary' || structuralPathContext?.tag === 'open-boundary'
      ? 'open-boundary'
      : 'hit',
    createStructuredAnswerCard({
      title: `${primaryRef.label} route witnesses`,
      primaryRef,
      relatedRefs,
      document: createRouteWitnessDocument(summaryLines, relatedRefs, witnesses, facts),
      policy,
      extra: {
        witnesses: witnesses.slice(0, 6),
      },
    }),
    mergeTrustProfiles(mergeTrustProfiles(trust, regimeContext.trust), structuralPathContext?.trust ?? null),
    [
      {
        kind: 'route',
        summary: `This answer closes on ${witnesses.length} modeled route witness${pluralize(witnesses.length)} inside ${pkg.package_name}.`,
        provenanceRefs: witnesses.slice(0, 6).map((witness) => `${witness.rootKind}:${witness.rootFilePath}`),
      },
      {
        kind: 'freshness',
        // TODO: This freshness explanation still names deps/typerefs/exports as
        // the grounding surfaces. Rephrase it around shared route/reachability
        // authority once those projections stop being the user-visible center.
        summary: `The route witnesses are grounded in ${describeAnalysisMaterializationTiming(
          analysis,
          executionPostureFromFrame(query.worldFrame).freshness,
          ['deps', 'typerefs', 'exports'],
        )}`,
        provenanceRefs: analysisGeneratedAtRefs(analysis, ['deps', 'typerefs', 'exports']),
      },
      ...regimeContext.closureBasis,
      ...(structuralPathContext?.closureBasis ?? []),
    ],
    [...regimeContext.issues, ...(structuralPathContext?.issues ?? [])],
    dedupeContinuations([
      continuation('join', 'Inspect the owning package', pkg.package_name, 'owning package'),
      continuation('inventory', `Audit ${pkg.package_name}`, pkg.package_name, 'package audit'),
      continuation('join', `Inspect ${basename(bestWitness.rootFilePath)}`, bestWitness.rootFilePath, `${bestWitness.rootKind} root`),
      ...bestWitness.steps.slice(0, 3).map((step) =>
        continuation('join', `Inspect ${basename(step.toFilePath)}`, step.toFilePath, step.summary),
      ),
      ...regimeContext.continuations,
    ]),
    [
      ...createAnalysisProvenanceEntriesForKinds(
        analysis,
        ['deps', 'typerefs', 'exports'],
        executionPostureFromFrame(query.worldFrame).freshness,
      ),
      ({
        kind: 'route',
        label: `${primaryRef.label} route witness`,
        ref: primaryRef.value,
        detail: renderWitnessChain(bestWitness),
      } satisfies InquiryEvidenceProvenanceEntry),
      ...regimeContext.provenance,
      ...(structuralPathContext?.provenance ?? []),
    ],
  );
}

function summarizeBestWitness(
  primaryRef: RouteWitnessRef,
  witness: PackageRouteWitness,
): string {
  switch (witness.routeClass) {
    case 'production':
      return `${primaryRef.label} is routed from production surface via ${renderWitnessChain(witness)}.`;
    case 'exercise':
      return `${primaryRef.label} is currently justified only by exercise routes such as ${renderWitnessChain(witness)}.`;
    case 'candidate':
      return `${primaryRef.label} currently survives only through candidate route heads such as ${renderWitnessChain(witness)}.`;
    default:
      return assertNever(witness.routeClass);
  }
}

function renderWitnessChain(witness: PackageRouteWitness): string {
  const segments = [witness.rootFilePath, ...witness.steps.map((step) => step.toFilePath)]
    .map((filePath) => basename(filePath))
    .join(' -> ');
  return `${witness.rootKind}/${witness.trust}: ${segments}`;
}

function createAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  policy: InquiryPolicy,
  focusRef: FocusRef,
  tag: InquiryAnswer<RouteWitnessValue>['outcome']['tag'],
  value: RouteWitnessValue,
  trust: TrustProfile,
  closureBasis: readonly ClosureBasis[],
  issues: readonly Issue[],
  continuations: readonly Continuation[],
  provenance: readonly InquiryProvenanceEntry[],
): InquiryAnswer<RouteWitnessValue> {
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
  relatedRefs: readonly RouteWitnessRef[],
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    'miss-unknown-shape',
    createStructuredAnswerCard({
      title: 'Route witness miss',
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
      relatedRefs,
      document: createRouteWitnessDocument([message], relatedRefs, []),
      policy,
      extra: {
        witnesses: [],
      },
    }),
    {
      kind: 'unavailable',
      summary: 'No route witness target closed for this focus.',
    },
    [{
      kind: 'route',
      summary: 'No file or type in the current analysis matched the requested focus.',
    }],
    [{
      code: 'route-witness-miss',
      message,
      severity: 'info',
      origin: 'shape',
    }],
    [],
    [],
  );
}

function createAmbiguousAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly RouteWitnessRef[],
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    'ambiguous',
    createStructuredAnswerCard({
      title: 'Route witness ambiguity',
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
      relatedRefs,
      document: createRouteWitnessDocument([message], relatedRefs, []),
      policy,
      extra: {
        witnesses: [],
      },
    }),
    {
      kind: 'qualified',
      summary: 'Multiple targets match the current route witness focus.',
    },
    [{
      kind: 'route',
      summary: 'The current route witness query needs one more narrowing move before a single chain is honest.',
    }],
    [{
      code: 'route-witness-ambiguous',
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

function createOpenBoundaryAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  focusRef: FocusRef,
  message: string,
  relatedRefs: readonly RouteWitnessRef[],
  continuations: readonly Continuation[],
  regimeContext?: FocusedAnalyzabilityContext,
  structuralPathContext: FocusedStructuralPathContext | null = null,
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  const trust = regimeContext?.trust
    ? mergeTrustProfiles(regimeContext.trust, structuralPathContext?.trust ?? null)
    : structuralPathContext?.trust ?? {
      kind: 'qualified',
      summary: 'The current route model cannot yet close on a witness path for this focus.',
    };
  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    'open-boundary',
    createStructuredAnswerCard({
      title: 'Route witness boundary',
      primaryRef: createAnswerRef(
        focusRef.kind,
        focusRef.value,
        focusRef.label ?? focusRef.value,
      ),
      relatedRefs,
      document: createRouteWitnessDocument(
        [
          message,
          ...(regimeContext?.lines.slice(1) ?? []),
          ...(structuralPathContext?.lines ?? []),
        ],
        relatedRefs,
        [],
        [
          ...(regimeContext?.facts ?? []),
          ...(structuralPathContext?.facts ?? []),
        ],
      ),
      policy,
      extra: {
        witnesses: [],
      },
    }),
    trust,
    [
      {
        kind: 'boundary',
        summary: 'A missing or under-modeled route boundary is still open for this focus.',
      },
      ...(regimeContext?.closureBasis ?? []),
      ...(structuralPathContext?.closureBasis ?? []),
    ],
    [
      {
        code: 'route-witness-open-boundary',
        message,
        severity: 'warning',
        origin: 'boundary',
      },
      ...(regimeContext?.issues ?? []),
      ...(structuralPathContext?.issues ?? []),
    ],
    [...continuations, ...(regimeContext?.continuations ?? [])],
    [
      ...(regimeContext?.provenance ?? []),
      ...(structuralPathContext?.provenance ?? []),
    ],
  );
}

function createUnsupportedAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  message: string,
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, query.focusRef.kind);
  return createAnswer(
    query,
    analysis,
    policy,
    query.focusRef,
    'unsupported',
    createStructuredAnswerCard({
      title: 'Route witness unsupported',
      primaryRef: createAnswerRef(
        query.focusRef.kind,
        query.focusRef.value,
        query.focusRef.label ?? query.focusRef.value,
      ),
      relatedRefs: [],
      document: createRouteWitnessDocument([message], [], []),
      policy,
      extra: {
        witnesses: [],
      },
    }),
    {
      kind: 'unavailable',
      summary: 'The current route witness surface supports file and type focuses only.',
    },
    [{
      kind: 'route',
      summary: 'Route witnesses currently close on file and type focuses only.',
    }],
    [{
      code: 'route-witness-unsupported',
      message,
      severity: 'warning',
      origin: 'query',
    }],
    [],
    [],
  );
}

function fileRef(filePath: string, detail?: string): RouteWitnessRef {
  return createFileAnswerRef(filePath, detail);
}

function typeRef(declaration: TypeDecl): RouteWitnessRef {
  return createTypeDeclarationAnswerRef(declaration);
}

function packageRef(pkg: PackageExportsSummary): RouteWitnessRef {
  return createPackageSummaryAnswerRef(pkg);
}

function policyForRouteWitness(
  query: Inquiry,
  focusKind: FocusRef['kind'],
): InquiryPolicy {
  const readMode = defaultReadMode();
  return resolveInquiryPolicy(createPresentationPolicyInput(query, readMode), {
    focusKind: policyFocusKindForAnswerFocus(focusKind),
    inquiryEpisode: 'bounded-closure-explanation',
    readMode,
  });
}

function createRouteWitnessDocument(
  summaryLines: readonly string[],
  relatedRefs: readonly RouteWitnessRef[],
  witnesses: readonly PackageRouteWitness[],
  facts: readonly { readonly label: string; readonly value: string }[] = [],
) {
  return createAnswerDocument<RouteWitnessRef>([
    {
      kind: 'paragraph',
      importance: 'primary',
      lines: summaryLines,
    },
    ...(facts.length > 0
      ? [{
        kind: 'key-fact-list' as const,
        importance: 'supporting' as const,
        facts,
      }]
      : []),
    ...(witnesses.length > 0
      ? [{
        kind: 'witness-list' as const,
        importance: 'primary' as const,
        witnesses: witnesses.map((witness) => ({
          label: basename(witness.filePath),
          summary: renderWitnessChain(witness),
          trust: witness.trust,
          routeClass: witness.routeClass,
          refs: [
            fileRef(witness.rootFilePath, `${witness.rootKind} root`),
            ...witness.steps.slice(0, 3).map((step) => fileRef(step.toFilePath, step.summary)),
          ],
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

function defaultReadMode(): PresentationReadMode {
  return 'focus-card';
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

function dedupeRefs(
  refs: readonly RouteWitnessRef[],
): readonly RouteWitnessRef[] {
  const seen = new Set<string>();
  const deduped: RouteWitnessRef[] = [];
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

function requiresSourceCatalogBoundary(
  structuralPathContext: FocusedStructuralPathContext | null,
): boolean {
  return structuralPathContext?.evaluation.sourceCoverage === 'repo-blindspot'
    || structuralPathContext?.evaluation.sourceCoverage === 'not-in-repo-scan';
}

function describeStructuralSourceBoundary(
  filePath: string,
  structuralPathContext: FocusedStructuralPathContext | null,
): string {
  switch (structuralPathContext?.evaluation.sourceCoverage) {
    case 'repo-blindspot':
      return `${filePath} exists in the live repo source scan but is not admitted by any loaded tsconfig/project claim, so the current route model cannot close on it as a source-backed file.`;
    case 'not-in-repo-scan':
      return `${filePath} is outside the live structural source-file catalog, so the current route model cannot close on it as a source-backed file.`;
    default:
      return `${filePath} is outside the live structural source-file catalog, so the current route model cannot close on it as a source-backed file.`;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled route-witness case: ${String(value)}`);
}
