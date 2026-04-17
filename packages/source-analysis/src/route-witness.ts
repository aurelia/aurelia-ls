import {
  coerceAnalysisViews,
  loadCurrentAnalysisViews,
  type AnalysisViews,
} from './analysis-views.js';
import {
  createAnalysisProvenanceEntry,
  defaultWorldFrameForAnalysis,
} from './analysis-surface.js';
import type { LoadedCurrentSnapshotSet } from './current-snapshots.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { AnswerCard, AnswerRef } from './answer-card.js';
import { createStructuredAnswerCard } from './answer-card.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import {
  inspectAnalyzabilityPostureFromAnalysisViews,
  inspectFocusedAnalyzabilityContext,
} from './analyzability-posture.js';
import { inspectFocusedFileQuery } from './focused-file-query.js';
import type { FocusedStructuralPathContext } from './focused-structural-path.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import { resolveInquiryPolicy, type InquiryPolicy } from './inquiry-policy.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
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
import type { PackageRouteWitness } from './reachability.js';
import {
  createPackageReachability,
  getPackageRouteWitnesses,
} from './reachability.js';
import type { TypeDecl } from './typerefs/schema.js';

export type RouteWitnessRef = AnswerRef;

export type RouteWitnessValue = AnswerCard<RouteWitnessRef> & {
  readonly witnesses: readonly PackageRouteWitness[];
};

export function createCurrentRouteWitnessAnswer(
  query: Inquiry,
  target?: string,
  waitMs = 0,
): InquiryAnswer<RouteWitnessValue> {
  return createRouteWitnessAnswer(
    query,
    loadCurrentAnalysisViews(target, waitMs),
  );
}

export function createRouteWitnessAnswer(
  query: Inquiry,
  analysisInput: AnalysisViews | LoadedCurrentSnapshotSet,
): InquiryAnswer<RouteWitnessValue> {
  const analysis = coerceAnalysisViews(analysisInput);
  switch (query.focusRef.kind) {
    case 'file':
      return buildFileRouteWitnessAnswer(query, analysis, query.focusRef.value);
    case 'type':
      return buildTypeRouteWitnessAnswer(query, analysis, query.focusRef.value);
    default:
      return createUnsupportedAnswer(
        query,
        analysis,
        `Route witnesses for focus kind "${query.focusRef.kind}" are not implemented yet.`,
      );
  }
}

function buildFileRouteWitnessAnswer(
  query: Inquiry,
  analysis: AnalysisViews,
  fileQuery: string,
): InquiryAnswer<RouteWitnessValue> {
  const fileInspection = inspectFocusedFileQuery(analysis, fileQuery);
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
  const pkg = resolveOwningPackage(analysis, filePath);
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

  const policy = policyForRouteWitness(query, 'file');
  const reachability = createPackageReachability(analysis, pkg, {
    ordering: policy.ordering,
  });
  const witnesses = getPackageRouteWitnesses(reachability, filePath);
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
  analysis: AnalysisViews,
  typeQuery: string,
): InquiryAnswer<RouteWitnessValue> {
  const normalizedTypeQuery = trimTrailingFocusPunctuation(typeQuery);
  const posture = inspectAnalyzabilityPostureFromAnalysisViews(analysis);
  const declarationMatches = resolveTypeDeclarations(analysis, normalizedTypeQuery);
  if (declarationMatches.length === 0) {
    return createMissAnswer(
      query,
      analysis,
      `No type declaration matches "${normalizedTypeQuery}".`,
      { kind: 'type', value: normalizedTypeQuery },
      [],
    );
  }

  if (declarationMatches.length > 1) {
    return createAmbiguousAnswer(
      query,
      analysis,
      `Type query "${normalizedTypeQuery}" matches multiple declarations.`,
      { kind: 'type', value: normalizedTypeQuery },
      declarationMatches.slice(0, 8).map((declaration) => typeRef(declaration)),
    );
  }

  const declaration = declarationMatches[0]!;
  const pkg = resolveOwningPackage(analysis, declaration.file);
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

  const policy = policyForRouteWitness(query, 'type');
  const reachability = createPackageReachability(analysis, pkg, {
    ordering: policy.ordering,
  });
  const witnesses = getPackageRouteWitnesses(reachability, declaration.file);
  const regimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: declaration.name,
    pathPrefixes: [declaration.file],
    queryHints: [normalizedTypeQuery, declaration.name, declaration.file],
  });
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
  regimeContext: ReturnType<typeof inspectFocusedAnalyzabilityContext>,
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
        summary: query.worldFrame?.freshness === 'live'
          ? `The route witnesses are grounded in live deps, typerefs, and exports analysis views refreshed at ${analysis.deps.generated_at}, ${analysis.typeRefs.generated_at}, and ${analysis.exports.generated_at}.`
          : `The route witnesses are grounded in materialized analysis views generated at ${analysis.deps.generated_at}, ${analysis.typeRefs.generated_at}, and ${analysis.exports.generated_at}.`,
        provenanceRefs: [
          analysis.deps.generated_at,
          analysis.typeRefs.generated_at,
          analysis.exports.generated_at,
        ],
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
      createAnalysisProvenanceEntry('deps', analysis.deps.generated_at, analysis.deps.source_commit, query.worldFrame?.freshness),
      createAnalysisProvenanceEntry('typerefs', analysis.typeRefs.generated_at, analysis.typeRefs.source_commit, query.worldFrame?.freshness),
      createAnalysisProvenanceEntry('exports', analysis.exports.generated_at, analysis.exports.source_commit, query.worldFrame?.freshness),
      {
        kind: 'route',
        label: `${primaryRef.label} route witness`,
        ref: primaryRef.value,
        detail: renderWitnessChain(bestWitness),
      },
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
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
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
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
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
  regimeContext?: ReturnType<typeof inspectFocusedAnalyzabilityContext>,
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  return createAnswer(
    query,
    analysis,
    policy,
    focusRef,
    'open-boundary',
    createStructuredAnswerCard({
      title: 'Route witness boundary',
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      document: createRouteWitnessDocument(
        [message, ...(regimeContext?.lines.slice(1) ?? [])],
        relatedRefs,
        [],
        regimeContext?.facts ?? [],
      ),
      policy,
      extra: {
        witnesses: [],
      },
    }),
    regimeContext?.trust ?? {
      kind: 'qualified',
      summary: 'The current route model cannot yet close on a witness path for this focus.',
    },
    [
      {
        kind: 'boundary',
        summary: 'A missing or under-modeled route boundary is still open for this focus.',
      },
      ...(regimeContext?.closureBasis ?? []),
    ],
    [
      {
        code: 'route-witness-open-boundary',
        message,
        severity: 'warning',
        origin: 'boundary',
      },
      ...(regimeContext?.issues ?? []),
    ],
    [...continuations, ...(regimeContext?.continuations ?? [])],
    [...(regimeContext?.provenance ?? [])],
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
      primaryRef: {
        kind: query.focusRef.kind,
        value: query.focusRef.value,
        label: query.focusRef.label ?? query.focusRef.value,
      },
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

function resolveTypeDeclarations(
  analysis: AnalysisViews,
  query: string,
): readonly TypeDecl[] {
  const normalized = trimTrailingFocusPunctuation(query);
  const exact = analysis.typeRefs.declarations.filter((declaration) => declaration.name === normalized);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = analysis.typeRefs.declarations.filter((declaration) =>
    declaration.name.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return analysis.typeRefs.declarations.filter((declaration) =>
    declaration.name.toLowerCase().includes(normalized.toLowerCase()),
  );
}

function resolveOwningPackage(
  analysis: AnalysisViews,
  filePath: string,
): PackageExportsSummary | null {
  let bestMatch: PackageExportsSummary | null = null;
  for (const pkg of analysis.exports.packages) {
    const packagePrefix = pkg.package_dir.length > 0 ? `${pkg.package_dir}/` : '';
    const matches = pkg.package_dir.length === 0
      ? !filePath.startsWith('packages/')
      : filePath.startsWith(packagePrefix);
    if (!matches) continue;
    if (!bestMatch || pkg.package_dir.length > bestMatch.package_dir.length) {
      bestMatch = pkg;
    }
  }
  return bestMatch;
}

function fileRef(filePath: string, detail?: string): RouteWitnessRef {
  return {
    kind: 'file',
    value: filePath,
    label: basename(filePath),
    ...(detail ? { detail } : {}),
  };
}

function typeRef(declaration: TypeDecl): RouteWitnessRef {
  return {
    kind: 'type',
    value: declaration.name,
    label: declaration.name,
    detail: `${declaration.file}:${declaration.line}`,
  };
}

function packageRef(pkg: PackageExportsSummary): RouteWitnessRef {
  return {
    kind: 'package',
    value: pkg.package_name,
    label: pkg.package_name,
    detail: pkg.package_dir,
  };
}

function policyForRouteWitness(
  query: Inquiry,
  focusKind: FocusRef['kind'],
): InquiryPolicy {
  return resolveInquiryPolicy(query, {
    focusKind,
    inquiryEpisode: 'bounded-closure-explanation',
    readMode: defaultReadMode(),
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

function defaultReadMode(): ReadMode {
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
    targetQuestionRoute,
    targetFocusRef,
  };
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
    const key = `${continuation.targetQuestionRoute ?? ''}\0${continuation.targetFocusRef ?? ''}`;
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

function assertNever(value: never): never {
  throw new Error(`Unhandled route-witness case: ${String(value)}`);
}
