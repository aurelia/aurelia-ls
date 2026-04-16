import { loadCurrentSourceAnalysisSnapshots, type LoadedCurrentSourceAnalysisSnapshots } from './current-snapshots.js';
import type { PackageExportsSummary } from './exports/schema.js';
import type { SourceAnalysisAnswerCard, SourceAnalysisAnswerRef } from './answer-card.js';
import { createSourceAnalysisAnswerCard } from './answer-card.js';
import { createSourceAnalysisAnswerEnvelope } from './answer-envelope.js';
import type {
  SourceAnalysisClosureBasis,
  SourceAnalysisContinuation,
  SourceAnalysisIssue,
  SourceAnalysisTrustProfile,
} from './outcome-algebra.js';
import type {
  SourceAnalysisAnswer,
  SourceAnalysisAnswerProvenanceEntry,
  SourceAnalysisFocusRef,
  SourceAnalysisQuery,
  SourceAnalysisReadMode,
  SourceAnalysisWorldFrame,
} from './query-model.js';
import type { SourceAnalysisPackageRouteWitness } from './reachability.js';
import {
  createSourceAnalysisPackageReachability,
  getSourceAnalysisPackageRouteWitnesses,
} from './reachability.js';
import type { TypeDecl } from './typerefs/schema.js';

export type SourceAnalysisRouteWitnessRef = SourceAnalysisAnswerRef;

export type SourceAnalysisRouteWitnessValue = SourceAnalysisAnswerCard<SourceAnalysisRouteWitnessRef> & {
  readonly witnesses: readonly SourceAnalysisPackageRouteWitness[];
};

export function createCurrentSourceAnalysisRouteWitnessAnswer(
  query: SourceAnalysisQuery,
  target?: string,
  waitMs = 0,
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  return createSourceAnalysisRouteWitnessAnswer(
    query,
    loadCurrentSourceAnalysisSnapshots(target, waitMs),
  );
}

export function createSourceAnalysisRouteWitnessAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
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
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  fileQuery: string,
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  const fileMatches = resolveFiles(snapshots, fileQuery);
  if (fileMatches.length === 0) {
    return createMissAnswer(
      query,
      snapshots,
      `No file matches "${fileQuery}".`,
      { kind: 'file', value: fileQuery },
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

  const reachability = createSourceAnalysisPackageReachability(snapshots, pkg);
  const witnesses = getSourceAnalysisPackageRouteWitnesses(reachability, filePath);
  return createRouteWitnessAnswer(
    query,
    snapshots,
    pkg,
    { kind: 'file', value: filePath, label: basename(filePath) },
    fileRef(filePath, filePath),
    witnesses,
    [],
  );
}

function buildTypeRouteWitnessAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  typeQuery: string,
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  const declarationMatches = resolveTypeDeclarations(snapshots, typeQuery);
  if (declarationMatches.length === 0) {
    return createMissAnswer(
      query,
      snapshots,
      `No type declaration matches "${typeQuery}".`,
      { kind: 'type', value: typeQuery },
      [],
    );
  }

  if (declarationMatches.length > 1) {
    return createAmbiguousAnswer(
      query,
      snapshots,
      `Type query "${typeQuery}" matches multiple declarations.`,
      { kind: 'type', value: typeQuery },
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

  const reachability = createSourceAnalysisPackageReachability(snapshots, pkg);
  const witnesses = getSourceAnalysisPackageRouteWitnesses(reachability, declaration.file);
  return createRouteWitnessAnswer(
    query,
    snapshots,
    pkg,
    { kind: 'type', value: declaration.name, label: declaration.name },
    typeRef(declaration),
    witnesses,
    [fileRef(declaration.file, 'declaring file')],
  );
}

function createRouteWitnessAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  pkg: PackageExportsSummary,
  focusRef: SourceAnalysisFocusRef,
  primaryRef: SourceAnalysisRouteWitnessRef,
  witnesses: readonly SourceAnalysisPackageRouteWitness[],
  extraRelatedRefs: readonly SourceAnalysisRouteWitnessRef[],
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
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

  const trust: SourceAnalysisTrustProfile = bestWitness.trust === 'grounded'
    ? {
      kind: 'grounded',
      summary: 'At least one route witness closes on a grounded path.',
    }
    : {
      kind: 'qualified',
      summary: 'Route witnesses exist, but the best path still depends on qualified recovery rather than only grounded snapshot edges.',
    };

  const summaryLines = [
    summarizeBestWitness(primaryRef, bestWitness),
    ...(witnesses.length > 1
      ? [`Additional route witnesses: ${witnesses.slice(1, 4).map((witness) => renderWitnessChain(witness)).join('; ')}.`]
      : []),
  ];

  return createAnswer(
    query,
    snapshots,
    focusRef,
    'hit',
    createSourceAnalysisAnswerCard({
      title: `${primaryRef.label} route witnesses`,
      summaryLines,
      primaryRef,
      relatedRefs,
      witnesses: witnesses.slice(0, 6),
    }),
    trust,
    [
      {
        kind: 'route',
        summary: `This answer closes on ${witnesses.length} modeled route witness${pluralize(witnesses.length)} inside ${pkg.package_name}.`,
        provenanceRefs: witnesses.slice(0, 6).map((witness) => `${witness.rootKind}:${witness.rootFilePath}`),
      },
      {
        kind: 'freshness',
        summary: `The route witnesses are grounded in snapshots generated at ${snapshots.deps.generated_at}, ${snapshots.typeRefs.generated_at}, and ${snapshots.exports.generated_at}.`,
        provenanceRefs: [
          snapshots.deps.generated_at,
          snapshots.typeRefs.generated_at,
          snapshots.exports.generated_at,
        ],
      },
    ],
    [],
    dedupeContinuations([
      continuation('join', 'Inspect the owning package', pkg.package_name, 'owning package'),
      continuation('inventory', `Audit ${pkg.package_name}`, pkg.package_name, 'package audit'),
      continuation('join', `Inspect ${basename(bestWitness.rootFilePath)}`, bestWitness.rootFilePath, `${bestWitness.rootKind} root`),
      ...bestWitness.steps.slice(0, 3).map((step) =>
        continuation('join', `Inspect ${basename(step.toFilePath)}`, step.toFilePath, step.summary),
      ),
    ]),
    [
      snapshotProvenanceEntry('deps', snapshots.deps.generated_at, snapshots.deps.source_commit),
      snapshotProvenanceEntry('typerefs', snapshots.typeRefs.generated_at, snapshots.typeRefs.source_commit),
      snapshotProvenanceEntry('exports', snapshots.exports.generated_at, snapshots.exports.source_commit),
      {
        kind: 'route',
        label: `${primaryRef.label} route witness`,
        ref: primaryRef.value,
        detail: renderWitnessChain(bestWitness),
      },
    ],
  );
}

function summarizeBestWitness(
  primaryRef: SourceAnalysisRouteWitnessRef,
  witness: SourceAnalysisPackageRouteWitness,
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

function renderWitnessChain(witness: SourceAnalysisPackageRouteWitness): string {
  const segments = [witness.rootFilePath, ...witness.steps.map((step) => step.toFilePath)]
    .map((filePath) => basename(filePath))
    .join(' -> ');
  return `${witness.rootKind}/${witness.trust}: ${segments}`;
}

function createAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  focusRef: SourceAnalysisFocusRef,
  tag: SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue>['outcome']['tag'],
  value: SourceAnalysisRouteWitnessValue,
  trust: SourceAnalysisTrustProfile,
  closureBasis: readonly SourceAnalysisClosureBasis[],
  issues: readonly SourceAnalysisIssue[],
  continuations: readonly SourceAnalysisContinuation[],
  provenance: readonly SourceAnalysisAnswerProvenanceEntry[],
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  const readMode = defaultReadMode();
  const worldFrame = defaultWorldFrame(snapshots, query.worldFrame);
  return createSourceAnalysisAnswerEnvelope({
    query,
    focusRef,
    inquiryEpisode: 'bounded-closure-explanation',
    readMode,
    worldFrame,
    tag,
    value,
    trust,
    closureBasis,
    issues,
    continuations,
    provenance,
  });
}

function createMissAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  message: string,
  focusRef: SourceAnalysisFocusRef,
  relatedRefs: readonly SourceAnalysisRouteWitnessRef[],
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  return createAnswer(
    query,
    snapshots,
    focusRef,
    'miss-unknown-shape',
    createSourceAnalysisAnswerCard({
      title: 'Route witness miss',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      witnesses: [],
    }),
    {
      kind: 'unavailable',
      summary: 'No route witness target closed for this focus.',
    },
    [{
      kind: 'route',
      summary: 'No file or type in the current snapshots matched the requested focus.',
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
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  message: string,
  focusRef: SourceAnalysisFocusRef,
  relatedRefs: readonly SourceAnalysisRouteWitnessRef[],
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  return createAnswer(
    query,
    snapshots,
    focusRef,
    'ambiguous',
    createSourceAnalysisAnswerCard({
      title: 'Route witness ambiguity',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      witnesses: [],
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
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  focusRef: SourceAnalysisFocusRef,
  message: string,
  relatedRefs: readonly SourceAnalysisRouteWitnessRef[],
  continuations: readonly SourceAnalysisContinuation[],
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  return createAnswer(
    query,
    snapshots,
    focusRef,
    'open-boundary',
    createSourceAnalysisAnswerCard({
      title: 'Route witness boundary',
      summaryLines: [message],
      primaryRef: {
        kind: focusRef.kind,
        value: focusRef.value,
        label: focusRef.label ?? focusRef.value,
      },
      relatedRefs,
      witnesses: [],
    }),
    {
      kind: 'qualified',
      summary: 'The current route model cannot yet close on a witness path for this focus.',
    },
    [{
      kind: 'boundary',
      summary: 'A missing or under-modeled route boundary is still open for this focus.',
    }],
    [{
      code: 'route-witness-open-boundary',
      message,
      severity: 'warning',
      origin: 'boundary',
    }],
    continuations,
    [],
  );
}

function createUnsupportedAnswer(
  query: SourceAnalysisQuery,
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  message: string,
): SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue> {
  return createAnswer(
    query,
    snapshots,
    query.focusRef,
    'unsupported',
    createSourceAnalysisAnswerCard({
      title: 'Route witness unsupported',
      summaryLines: [message],
      primaryRef: {
        kind: query.focusRef.kind,
        value: query.focusRef.value,
        label: query.focusRef.label ?? query.focusRef.value,
      },
      relatedRefs: [],
      witnesses: [],
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
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly string[] {
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

  if (allFiles.has(query)) {
    return [query];
  }

  const suffixMatches = [...allFiles].filter((filePath) => filePath.endsWith(query));
  if (suffixMatches.length > 0) {
    return suffixMatches.sort();
  }

  return [...allFiles].filter((filePath) =>
    filePath.toLowerCase().includes(query.toLowerCase()),
  ).sort();
}

function resolveTypeDeclarations(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
  query: string,
): readonly TypeDecl[] {
  const exact = snapshots.typeRefs.declarations.filter((declaration) => declaration.name === query);
  if (exact.length > 0) return exact;

  const exactCaseInsensitive = snapshots.typeRefs.declarations.filter((declaration) =>
    declaration.name.toLowerCase() === query.toLowerCase(),
  );
  if (exactCaseInsensitive.length > 0) return exactCaseInsensitive;

  return snapshots.typeRefs.declarations.filter((declaration) =>
    declaration.name.toLowerCase().includes(query.toLowerCase()),
  );
}

function resolveOwningPackage(
  snapshots: LoadedCurrentSourceAnalysisSnapshots,
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

function fileRef(filePath: string, detail?: string): SourceAnalysisRouteWitnessRef {
  return {
    kind: 'file',
    value: filePath,
    label: basename(filePath),
    ...(detail ? { detail } : {}),
  };
}

function typeRef(declaration: TypeDecl): SourceAnalysisRouteWitnessRef {
  return {
    kind: 'type',
    value: declaration.name,
    label: declaration.name,
    detail: `${declaration.file}:${declaration.line}`,
  };
}

function packageRef(pkg: PackageExportsSummary): SourceAnalysisRouteWitnessRef {
  return {
    kind: 'package',
    value: pkg.package_name,
    label: pkg.package_name,
    detail: pkg.package_dir,
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

function defaultReadMode(): SourceAnalysisReadMode {
  return 'focus-card';
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

function dedupeRefs(
  refs: readonly SourceAnalysisRouteWitnessRef[],
): readonly SourceAnalysisRouteWitnessRef[] {
  const seen = new Set<string>();
  const deduped: SourceAnalysisRouteWitnessRef[] = [];
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

function pluralize(count: number): string {
  return count === 1 ? '' : 's';
}

function basename(filePath: string): string {
  return filePath.split('/').at(-1) ?? filePath;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled route-witness case: ${String(value)}`);
}
