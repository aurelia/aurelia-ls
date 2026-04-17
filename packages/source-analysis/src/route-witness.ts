import { loadCurrentSnapshots, type LoadedCurrentSnapshotSet } from './current-snapshots.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { AnswerCard, AnswerRef } from './answer-card.js';
import { createStructuredAnswerCard } from './answer-card.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import {
  inspectAnalyzabilityPostureFromSnapshots,
  inspectFocusedAnalyzabilityContext,
} from './analyzability-posture.js';
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
    loadCurrentSnapshots(target, waitMs),
  );
}

export function createRouteWitnessAnswer(
  query: Inquiry,
  snapshots: LoadedCurrentSnapshotSet,
): InquiryAnswer<RouteWitnessValue> {
  switch (query.focusRef.kind) {
    case 'file':
      return buildFileRouteWitnessAnswer(query, snapshots, query.focusRef.value);
    case 'type':
      return buildTypeRouteWitnessAnswer(query, snapshots, query.focusRef.value);
    default:
      return createUnsupportedAnswer(
        query,
        snapshots,
        `Route witnesses for focus kind "${query.focusRef.kind}" are not implemented yet.`,
      );
  }
}

function buildFileRouteWitnessAnswer(
  query: Inquiry,
  snapshots: LoadedCurrentSnapshotSet,
  fileQuery: string,
): InquiryAnswer<RouteWitnessValue> {
  const normalizedFileQuery = trimTrailingFocusPunctuation(fileQuery);
  const posture = inspectAnalyzabilityPostureFromSnapshots(snapshots);
  const requestedRegimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: normalizedFileQuery,
    pathPrefixes: [normalizedFileQuery],
    queryHints: [normalizedFileQuery],
  });
  const fileMatches = resolveFiles(snapshots, normalizedFileQuery);
  if (fileMatches.length === 0) {
    if (requestedRegimeContext.directlyExcludedFrontier) {
      return createOpenBoundaryAnswer(
        query,
        snapshots,
        { kind: 'file', value: normalizedFileQuery, label: basename(normalizedFileQuery) },
        `${normalizedFileQuery} falls under excluded frontier ${requestedRegimeContext.directlyExcludedFrontier.prefix}, so the current route model cannot close on it inside this profile.`,
        [],
        requestedRegimeContext.continuations,
        requestedRegimeContext,
      );
    }
    return createMissAnswer(
      query,
      snapshots,
      `No file matches "${normalizedFileQuery}".`,
      { kind: 'file', value: normalizedFileQuery },
      [],
    );
  }

  if (fileMatches.length > 1) {
    return createAmbiguousAnswer(
      query,
      snapshots,
      `File query "${fileQuery}" is ambiguous.`,
      { kind: 'file', value: fileQuery },
      fileMatches.slice(0, 8).map((filePath) => fileRef(filePath, filePath)),
    );
  }

  const filePath = fileMatches[0]!;
  const pkg = resolveOwningPackage(snapshots, filePath);
  if (!pkg) {
    return createOpenBoundaryAnswer(
      query,
      snapshots,
      { kind: 'file', value: filePath, label: basename(filePath) },
      `No owning package route surface is modeled for ${filePath}.`,
      [],
      [],
    );
  }

  const policy = policyForRouteWitness(query, 'file');
  const reachability = createPackageReachability(snapshots, pkg, {
    ordering: policy.ordering,
  });
  const witnesses = getPackageRouteWitnesses(reachability, filePath);
  const regimeContext = inspectFocusedAnalyzabilityContext(posture, {
    focusLabel: filePath,
    pathPrefixes: [filePath],
    queryHints: [normalizedFileQuery, filePath],
  });
  return createHitRouteWitnessAnswer(
    query,
    snapshots,
    pkg,
    { kind: 'file', value: filePath, label: basename(filePath) },
    fileRef(filePath, filePath),
    witnesses,
    [],
    regimeContext,
  );
}

function buildTypeRouteWitnessAnswer(
  query: Inquiry,
  snapshots: LoadedCurrentSnapshotSet,
  typeQuery: string,
): InquiryAnswer<RouteWitnessValue> {
  const normalizedTypeQuery = trimTrailingFocusPunctuation(typeQuery);
  const posture = inspectAnalyzabilityPostureFromSnapshots(snapshots);
  const declarationMatches = resolveTypeDeclarations(snapshots, normalizedTypeQuery);
  if (declarationMatches.length === 0) {
    return createMissAnswer(
      query,
      snapshots,
      `No type declaration matches "${normalizedTypeQuery}".`,
      { kind: 'type', value: normalizedTypeQuery },
      [],
    );
  }

  if (declarationMatches.length > 1) {
    return createAmbiguousAnswer(
      query,
      snapshots,
      `Type query "${normalizedTypeQuery}" matches multiple declarations.`,
      { kind: 'type', value: normalizedTypeQuery },
      declarationMatches.slice(0, 8).map((declaration) => typeRef(declaration)),
    );
  }

  const declaration = declarationMatches[0]!;
  const pkg = resolveOwningPackage(snapshots, declaration.file);
  if (!pkg) {
    return createOpenBoundaryAnswer(
      query,
      snapshots,
      { kind: 'type', value: declaration.name, label: declaration.name },
      `No owning package route surface is modeled for ${declaration.name}.`,
      [fileRef(declaration.file, 'declaring file')],
      [],
    );
  }

  const policy = policyForRouteWitness(query, 'type');
  const reachability = createPackageReachability(snapshots, pkg, {
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
    snapshots,
    pkg,
    { kind: 'type', value: declaration.name, label: declaration.name },
    typeRef(declaration),
    witnesses,
    [fileRef(declaration.file, 'declaring file')],
    regimeContext,
  );
}

function createHitRouteWitnessAnswer(
  query: Inquiry,
  snapshots: LoadedCurrentSnapshotSet,
  pkg: PackageExportsSummary,
  focusRef: FocusRef,
  primaryRef: RouteWitnessRef,
  witnesses: readonly PackageRouteWitness[],
  extraRelatedRefs: readonly RouteWitnessRef[],
  regimeContext: ReturnType<typeof inspectFocusedAnalyzabilityContext>,
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
      snapshots,
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
  ];
  const policy = policyForRouteWitness(query, focusRef.kind);
  const facts = [
    ...regimeContext.facts,
  ];

  return createAnswer(
    query,
    snapshots,
    policy,
    focusRef,
    regimeContext.tag === 'open-boundary' ? 'open-boundary' : 'hit',
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
    mergeTrustProfiles(trust, regimeContext.trust),
    [
      {
        kind: 'route',
        summary: `This answer closes on ${witnesses.length} modeled route witness${pluralize(witnesses.length)} inside ${pkg.package_name}.`,
        provenanceRefs: witnesses.slice(0, 6).map((witness) => `${witness.rootKind}:${witness.rootFilePath}`),
      },
      {
        kind: 'freshness',
        summary: query.worldFrame?.freshness === 'live'
          ? `The route witnesses are grounded in live deps, typerefs, and exports analysis views refreshed at ${snapshots.deps.generated_at}, ${snapshots.typeRefs.generated_at}, and ${snapshots.exports.generated_at}.`
          : `The route witnesses are grounded in snapshots generated at ${snapshots.deps.generated_at}, ${snapshots.typeRefs.generated_at}, and ${snapshots.exports.generated_at}.`,
        provenanceRefs: [
          snapshots.deps.generated_at,
          snapshots.typeRefs.generated_at,
          snapshots.exports.generated_at,
        ],
      },
      ...regimeContext.closureBasis,
    ],
    regimeContext.issues,
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
      analysisProvenanceEntry('deps', snapshots.deps.generated_at, snapshots.deps.source_commit, query.worldFrame?.freshness),
      analysisProvenanceEntry('typerefs', snapshots.typeRefs.generated_at, snapshots.typeRefs.source_commit, query.worldFrame?.freshness),
      analysisProvenanceEntry('exports', snapshots.exports.generated_at, snapshots.exports.source_commit, query.worldFrame?.freshness),
      {
        kind: 'route',
        label: `${primaryRef.label} route witness`,
        ref: primaryRef.value,
        detail: renderWitnessChain(bestWitness),
      },
      ...regimeContext.provenance,
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
  snapshots: LoadedCurrentSnapshotSet,
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
  const worldFrame = defaultWorldFrame(snapshots, query.worldFrame);
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
  snapshots: LoadedCurrentSnapshotSet,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly RouteWitnessRef[],
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  return createAnswer(
    query,
    snapshots,
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
  snapshots: LoadedCurrentSnapshotSet,
  message: string,
  focusRef: FocusRef,
  relatedRefs: readonly RouteWitnessRef[],
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  return createAnswer(
    query,
    snapshots,
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
  snapshots: LoadedCurrentSnapshotSet,
  focusRef: FocusRef,
  message: string,
  relatedRefs: readonly RouteWitnessRef[],
  continuations: readonly Continuation[],
  regimeContext?: ReturnType<typeof inspectFocusedAnalyzabilityContext>,
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, focusRef.kind);
  return createAnswer(
    query,
    snapshots,
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
  snapshots: LoadedCurrentSnapshotSet,
  message: string,
): InquiryAnswer<RouteWitnessValue> {
  const policy = policyForRouteWitness(query, query.focusRef.kind);
  return createAnswer(
    query,
    snapshots,
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

function resolveFiles(
  snapshots: LoadedCurrentSnapshotSet,
  query: string,
): readonly string[] {
  const normalized = trimTrailingFocusPunctuation(query).replace(/\\/g, '/');
  const allFiles = new Set<string>();
  for (const edge of snapshots.deps.edges) {
    allFiles.add(edge.source);
    allFiles.add(edge.target);
  }
  for (const filePath of snapshots.deps.uncovered_files) {
    allFiles.add(filePath);
  }
  for (const declaration of snapshots.typeRefs.declarations) {
    allFiles.add(declaration.file);
  }
  for (const record of snapshots.exports.exports) {
    if (record.declaration_file) allFiles.add(record.declaration_file);
    allFiles.add(record.analysis_entrypoint);
    for (const step of record.chain) {
      allFiles.add(step.file);
    }
  }

  if (allFiles.has(normalized)) {
    return [normalized];
  }

  const suffixMatches = [...allFiles].filter((filePath) => filePath.endsWith(normalized));
  if (suffixMatches.length > 0) {
    return suffixMatches.sort();
  }

  return [...allFiles].filter((filePath) =>
    filePath.toLowerCase().includes(normalized.toLowerCase()),
  ).sort();
}

function resolveTypeDeclarations(
  snapshots: LoadedCurrentSnapshotSet,
  query: string,
): readonly TypeDecl[] {
  const normalized = trimTrailingFocusPunctuation(query);
  const exact = snapshots.typeRefs.declarations.filter((declaration) => declaration.name === normalized);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = snapshots.typeRefs.declarations.filter((declaration) =>
    declaration.name.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return snapshots.typeRefs.declarations.filter((declaration) =>
    declaration.name.toLowerCase().includes(normalized.toLowerCase()),
  );
}

function resolveOwningPackage(
  snapshots: LoadedCurrentSnapshotSet,
  filePath: string,
): PackageExportsSummary | null {
  let bestMatch: PackageExportsSummary | null = null;
  for (const pkg of snapshots.exports.packages) {
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

function defaultWorldFrame(
  snapshots: LoadedCurrentSnapshotSet,
  worldFrame: WorldFrame | undefined,
): WorldFrame {
  return {
    repoPath: worldFrame?.repoPath ?? snapshots.deps.root,
    target: worldFrame?.target ?? 'current',
    regimeAnchor: worldFrame?.regimeAnchor ?? 'hosted',
    partiality: worldFrame?.partiality ?? 'complete',
    freshness: worldFrame?.freshness ?? 'snapshot',
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
