import { join } from 'node:path';

import { collectSnapshotFrontierEvidence } from './frontier-evidence.js';
import type { AnalysisProfile } from './analysis-profile.js';
import type { LoadedCurrentSnapshotSet } from './current-snapshots.js';
import type { WorldFrame, InquiryProvenanceEntry } from './inquiry-model.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
  IssueSeverity,
  OutcomeTag,
  TrustProfile,
} from './outcome-algebra.js';
import { inspectProfileSnapshotSupport, isUsableSnapshotArtifact, type ProfileSnapshotSupport, type SnapshotArtifactSupport, type SnapshotRegimeStatus, type SnapshotSupportStatus } from './profile-support.js';
import { createRepoSession } from './repo-session.js';
import type { SnapshotPaths } from './snapshot-config.js';
import {
  loadJsonSnapshot,
  type SnapshotExcludedBoundaryReference,
  type SnapshotExcludedFrontierEvidence,
  type SnapshotFrontierEvidence,
  type SnapshotKind,
  type SnapshotProfileProvenance,
} from './snapshots.js';

export const ANALYZABILITY_BAND_IDS = [
  'closed-direct-carrier-truth',
  'closed-opaque-carried-truth',
  'bounded-deeper-deterministic-interpretation',
  'regime-qualified-deterministic-truth',
  'deterministic-predictive-companion-spend',
  'ai-assisted-external-closure',
  'explicit-open-named-fronts',
] as const;

export type AnalyzabilityBandId =
  typeof ANALYZABILITY_BAND_IDS[number];

export interface AnalyzabilityBand {
  readonly id: AnalyzabilityBandId;
  readonly rank: number;
  readonly label: string;
}

export const ANALYZABILITY_OPEN_FRONT_ORIGINS = [
  'snapshot-support',
  'excluded-frontier',
  'infrastructure',
] as const;

export type AnalyzabilityOpenFrontOrigin =
  typeof ANALYZABILITY_OPEN_FRONT_ORIGINS[number];

export const ANALYZABILITY_FRONTIER_EVIDENCE_SOURCES = [
  'snapshot-contract',
  'profile-law',
  'live-scan',
] as const;

export type AnalyzabilityFrontierEvidenceSource =
  typeof ANALYZABILITY_FRONTIER_EVIDENCE_SOURCES[number];

export const EXCLUDED_BOUNDARY_EDGE_KINDS = [
  'import',
  'reexport',
  'dynamic-import',
] as const;

export type ExcludedBoundaryEdgeKind =
  typeof EXCLUDED_BOUNDARY_EDGE_KINDS[number];

export interface ExcludedBoundaryReference {
  readonly source: string;
  readonly target: string;
  readonly specifier: string;
  readonly line: number;
  readonly edgeKind: ExcludedBoundaryEdgeKind;
  readonly typeOnly: boolean;
  readonly excludedPrefix: string;
}

export interface ExcludedFrontierEvidence {
  readonly prefix: string;
  readonly sourceFileCount: number;
  readonly packageCount: number;
  readonly inboundBoundaryCount: number;
  readonly boundaryReferences: readonly ExcludedBoundaryReference[];
}

export interface AnalyzabilityOpenFront {
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly severity: IssueSeverity;
  readonly origin: AnalyzabilityOpenFrontOrigin;
  readonly snapshotKind?: SnapshotKind;
  readonly snapshotStatus?: SnapshotSupportStatus;
  readonly regimeStatus?: SnapshotRegimeStatus;
  readonly prefix?: string;
  readonly evidence: readonly string[];
}

export interface AnalyzabilityPosture {
  readonly profileId: string;
  readonly target: string;
  readonly currentBand: AnalyzabilityBand;
  readonly deterministicCeilingBand: AnalyzabilityBand;
  readonly frontierEvidenceSource: AnalyzabilityFrontierEvidenceSource;
  readonly summaryLines: readonly string[];
  readonly snapshotSupport: ProfileSnapshotSupport;
  readonly excludedFrontiers: readonly ExcludedFrontierEvidence[];
  readonly openFronts: readonly AnalyzabilityOpenFront[];
  readonly warnings: readonly string[];
}

export interface AnalyzabilityPostureSummary {
  readonly facts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly lines: readonly string[];
  readonly tag: OutcomeTag;
  readonly trust: TrustProfile;
  readonly closureBasis: readonly ClosureBasis[];
  readonly issues: readonly Issue[];
  readonly continuations: readonly Continuation[];
  readonly provenance: readonly InquiryProvenanceEntry[];
  readonly worldFrame: WorldFrame;
}

export interface FocusedAnalyzabilityContext {
  readonly focusLabel: string;
  readonly directlyExcludedFrontier: ExcludedFrontierEvidence | null;
  readonly matchingFrontiers: readonly ExcludedFrontierEvidence[];
  readonly matchingBoundaryReferences: readonly ExcludedBoundaryReference[];
  readonly facts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly lines: readonly string[];
  readonly tag: OutcomeTag | null;
  readonly trust: TrustProfile | null;
  readonly closureBasis: readonly ClosureBasis[];
  readonly issues: readonly Issue[];
  readonly continuations: readonly Continuation[];
  readonly provenance: readonly InquiryProvenanceEntry[];
}

interface ExcludedFrontierInspection {
  readonly frontiers: readonly ExcludedFrontierEvidence[];
  readonly warnings: readonly string[];
  readonly source: AnalyzabilityFrontierEvidenceSource;
}

const BAND_BY_ID: Record<AnalyzabilityBandId, AnalyzabilityBand> = {
  'closed-direct-carrier-truth': {
    id: 'closed-direct-carrier-truth',
    rank: 1,
    label: 'closed direct carrier truth',
  },
  'closed-opaque-carried-truth': {
    id: 'closed-opaque-carried-truth',
    rank: 2,
    label: 'closed opaque-carried truth',
  },
  'bounded-deeper-deterministic-interpretation': {
    id: 'bounded-deeper-deterministic-interpretation',
    rank: 3,
    label: 'bounded deeper deterministic interpretation',
  },
  'regime-qualified-deterministic-truth': {
    id: 'regime-qualified-deterministic-truth',
    rank: 4,
    label: 'regime-qualified deterministic truth',
  },
  'deterministic-predictive-companion-spend': {
    id: 'deterministic-predictive-companion-spend',
    rank: 5,
    label: 'deterministic predictive companion spend',
  },
  'ai-assisted-external-closure': {
    id: 'ai-assisted-external-closure',
    rank: 6,
    label: 'AI-assisted external closure',
  },
  'explicit-open-named-fronts': {
    id: 'explicit-open-named-fronts',
    rank: 7,
    label: 'explicit-open named fronts',
  },
};

export function inspectAnalyzabilityPosture(
  paths: SnapshotPaths,
  profile: AnalysisProfile,
  waitMs = 0,
): AnalyzabilityPosture {
  const snapshotSupport = inspectProfileSnapshotSupport(paths, profile, waitMs);
  const excluded = inspectExcludedFrontiers(profile, snapshotSupport, waitMs);
  return createAnalyzabilityPosture(profile, snapshotSupport, excluded);
}

export function inspectAnalyzabilityPostureFromSnapshots(
  snapshots: LoadedCurrentSnapshotSet,
): AnalyzabilityPosture {
  const profile = profileFromSnapshotContract(
    selectSnapshotProfile(snapshots),
    snapshots.deps.root,
  );
  const excluded = inspectExcludedFrontiersFromLoadedSnapshots(snapshots, profile);
  return createAnalyzabilityPosture(
    profile,
    snapshots.support ?? createSyntheticSnapshotSupport(snapshots),
    excluded,
  );
}

export function inspectFocusedAnalyzabilityContext(
  posture: AnalyzabilityPosture,
  focus: {
    readonly focusLabel: string;
    readonly pathPrefixes?: readonly string[];
    readonly queryHints?: readonly string[];
  },
): FocusedAnalyzabilityContext {
  if (posture.openFronts.length === 0) {
    return {
      focusLabel: focus.focusLabel,
      directlyExcludedFrontier: null,
      matchingFrontiers: [],
      matchingBoundaryReferences: [],
      facts: [],
      lines: [],
      tag: null,
      trust: null,
      closureBasis: [],
      issues: [],
      continuations: [],
      provenance: [],
    };
  }

  const pathPrefixes = (focus.pathPrefixes ?? [])
    .map(normalizeComparableFocusHint)
    .filter((value) => value.length > 0);
  const queryHints = (focus.queryHints ?? [])
    .map(normalizeComparableFocusHint)
    .filter((value) => value.length > 0);
  const directlyExcludedFrontier = posture.excludedFrontiers.find((frontier) =>
    focusMatchesExcludedFrontier(frontier, pathPrefixes, queryHints),
  ) ?? null;
  const matchingBoundaryReferences = posture.excludedFrontiers
    .flatMap((frontier) => frontier.boundaryReferences)
    .filter((reference) =>
      focusTouchesBoundaryReference(reference, pathPrefixes),
    );
  const matchingPrefixes = new Set(
    matchingBoundaryReferences.map((reference) => reference.excludedPrefix),
  );
  const matchingFrontiers = posture.excludedFrontiers.filter((frontier) =>
    frontier === directlyExcludedFrontier || matchingPrefixes.has(frontier.prefix),
  );

  const facts = [
    { label: 'regime band', value: posture.currentBand.label },
    { label: 'named open fronts', value: `${posture.openFronts.length}` },
    { label: 'focus-adjacent frontiers', value: `${matchingFrontiers.length + (directlyExcludedFrontier && !matchingFrontiers.includes(directlyExcludedFrontier) ? 1 : 0)}` },
    { label: 'focus-adjacent excluded seams', value: `${matchingBoundaryReferences.length}` },
  ];
  const lines = focusedAnalyzabilityLines(
    posture,
    focus.focusLabel,
    directlyExcludedFrontier,
    matchingBoundaryReferences,
  );
  const tag = directlyExcludedFrontier || matchingBoundaryReferences.length > 0
    ? 'open-boundary'
    : null;
  const trust = directlyExcludedFrontier
    ? {
      kind: 'frontier' as const,
      summary: `${focus.focusLabel} is outside the included regime because it falls under an excluded frontier.`,
    }
    : matchingBoundaryReferences.length > 0
      ? {
        kind: 'qualified' as const,
        summary: `${focus.focusLabel} is modeled inside the included regime, but observed seams into excluded frontiers still keep boundary closure open.`,
      }
      : null;
  const closureBasis = posture.openFronts.length > 0
    ? [{
      kind: 'boundary' as const,
      summary: directlyExcludedFrontier
        ? `${focus.focusLabel} falls under excluded frontier ${directlyExcludedFrontier.prefix}, which the current profile law leaves outside the included regime.`
        : matchingBoundaryReferences.length > 0
          ? `${focus.focusLabel} touches ${matchingBoundaryReferences.length} observed seam${pluralize(matchingBoundaryReferences.length)} into excluded frontier${pluralize(matchingFrontiers.length)}.`
          : `${posture.openFronts.length} named open frontier${pluralize(posture.openFronts.length)} remain under profile ${posture.profileId}, even though no observed seam from ${focus.focusLabel} reaches them in the current snapshot contract.`,
      provenanceRefs: dedupeStrings([
        posture.profileId,
        ...matchingFrontiers.map((frontier) => frontier.prefix),
        ...(directlyExcludedFrontier ? [directlyExcludedFrontier.prefix] : []),
      ]),
    }]
    : [];
  const issues = posture.openFronts.length > 0
    ? [{
      code: directlyExcludedFrontier
        ? `focus-excluded-${sanitizeCode(directlyExcludedFrontier.prefix)}`
        : matchingBoundaryReferences.length > 0
          ? 'focus-excluded-boundary-seams'
          : 'regime-open-fronts',
      message: lines[0] ?? `Named open fronts remain under profile ${posture.profileId}.`,
      severity: directlyExcludedFrontier || matchingBoundaryReferences.length > 0 ? 'warning' as const : 'info' as const,
      origin: 'boundary' as const,
    }]
    : [];
  const primaryFrontier = directlyExcludedFrontier ?? matchingFrontiers[0] ?? posture.excludedFrontiers[0] ?? null;
  const continuations = primaryFrontier
    ? [{
      kind: 'inspect-support' as const,
      label: `Inspect excluded frontier ${primaryFrontier.prefix}`,
      description: primaryFrontier.boundaryReferences[0]
        ? `${primaryFrontier.boundaryReferences[0].source}:${primaryFrontier.boundaryReferences[0].line} reaches into ${primaryFrontier.prefix}.`
        : `${primaryFrontier.prefix} remains outside the included regime under the current profile.`,
      targetQuestionRoute: 'join',
      targetFocusRef: primaryFrontier.prefix,
    }]
    : [];
  const provenance = posture.openFronts.length > 0
    ? [{
      kind: 'host' as const,
      label: 'Regime posture carried into query answer',
      ref: posture.profileId,
      detail: directlyExcludedFrontier
        ? `excluded=${directlyExcludedFrontier.prefix}`
        : matchingBoundaryReferences.length > 0
          ? `boundary-seams=${matchingBoundaryReferences.length}`
          : `open-fronts=${posture.openFronts.length}`,
    }]
    : [];

  return {
    focusLabel: focus.focusLabel,
    directlyExcludedFrontier,
    matchingFrontiers,
    matchingBoundaryReferences,
    facts,
    lines,
    tag,
    trust,
    closureBasis,
    issues,
    continuations,
    provenance,
  };
}

export function summarizeAnalyzabilityPosture(
  posture: AnalyzabilityPosture,
  worldFrame: WorldFrame,
): AnalyzabilityPostureSummary {
  const usableKinds = posture.snapshotSupport.usableKinds.length;
  const blockedKinds = posture.snapshotSupport.snapshots.length - usableKinds;
  const frontierCount = posture.excludedFrontiers.length;
  const seamCount = posture.excludedFrontiers.reduce(
    (count, frontier) => count + frontier.inboundBoundaryCount,
    0,
  );
  const snapshotProvenanceRefs = posture.snapshotSupport.snapshots
    .flatMap((snapshot) => snapshot.generatedAt ? [snapshot.generatedAt] : [])
    .slice(0, 8);
  const facts = [
    { label: 'current band', value: posture.currentBand.label },
    { label: 'deterministic ceiling', value: posture.deterministicCeilingBand.label },
    { label: 'usable snapshot kinds', value: `${usableKinds}/${posture.snapshotSupport.snapshots.length}` },
    { label: 'frontier evidence source', value: posture.frontierEvidenceSource },
    { label: 'named open fronts', value: `${posture.openFronts.length}` },
    { label: 'excluded frontiers', value: `${frontierCount}` },
    { label: 'observed excluded seams', value: `${seamCount}` },
  ];
  const continuations: Continuation[] = [];

  if (posture.snapshotSupport.snapshots.some((snapshot) =>
    snapshot.status !== 'available' || snapshot.regimeStatus !== 'aligned',
  )) {
    continuations.push({
      kind: 'refresh',
      label: 'Refresh current snapshots',
      description: posture.snapshotSupport.snapshots.find((snapshot) =>
        snapshot.status !== 'available' || snapshot.regimeStatus !== 'aligned',
      )?.issues[0] ?? 'Refresh the current snapshots so regime posture can close more honestly.',
      targetQuestionRoute: 'refresh',
    });
  }

  if (posture.frontierEvidenceSource === 'live-scan' || posture.frontierEvidenceSource === 'profile-law') {
    continuations.push({
      kind: 'refresh',
      label: 'Materialize frontier evidence into snapshots',
      description: posture.frontierEvidenceSource === 'live-scan'
        ? 'Refresh aligned snapshots so excluded-frontier evidence can travel through the snapshot contract instead of a live fallback scan.'
        : 'Refresh aligned snapshots so excluded-frontier evidence is carried by the snapshot contract instead of profile-law fallback only.',
      targetQuestionRoute: 'refresh',
    });
  }

  if (posture.excludedFrontiers.some((frontier) => frontier.inboundBoundaryCount > 0)) {
    const frontier = posture.excludedFrontiers.find((candidate) => candidate.inboundBoundaryCount > 0)!;
    continuations.push({
      kind: 'inspect-support',
      label: `Inspect excluded frontier ${frontier.prefix}`,
      description: frontier.boundaryReferences[0]
        ? `${frontier.boundaryReferences[0].source}:${frontier.boundaryReferences[0].line} reaches into ${frontier.prefix}.`
        : `Inspect the named open frontier ${frontier.prefix}.`,
      targetQuestionRoute: 'join',
      targetFocusRef: frontier.prefix,
    });
  }

  return {
    facts,
    lines: posture.summaryLines,
    tag: posture.openFronts.length > 0 ? 'open-boundary' : 'hit',
    trust: {
      kind: 'grounded',
      summary: posture.frontierEvidenceSource === 'snapshot-contract'
        ? 'This posture answer is derived directly from resolved profile law plus frontier evidence already carried by the current snapshot contract.'
        : posture.frontierEvidenceSource === 'profile-law'
          ? 'This posture answer is grounded in resolved profile law and current snapshot support, but the loaded snapshots do not yet carry frontier evidence beyond the declared excluded prefixes.'
          : 'This posture answer is grounded in resolved profile law and current snapshot support, but frontier evidence still required a live fallback scan.',
    },
    closureBasis: [
      {
        kind: 'route',
        summary: `The active regime is ${posture.profileId} targeting ${posture.target}.`,
        provenanceRefs: [posture.profileId, posture.target],
      },
      {
        kind: 'freshness',
        summary: usableKinds > 0
          ? `Current snapshot support has ${usableKinds} usable kind${pluralize(usableKinds)} under the resolved regime.`
          : 'No current snapshot kinds close as usable under the resolved regime yet.',
        provenanceRefs: snapshotProvenanceRefs,
      },
      ...(posture.excludedFrontiers.length > 0
        ? [{
          kind: 'boundary' as const,
          summary: `${posture.excludedFrontiers.length} excluded frontier${pluralize(posture.excludedFrontiers.length)} are declared by profile law, and ${seamCount} observed seam${pluralize(seamCount)} cross from included code into them.`,
          provenanceRefs: posture.excludedFrontiers.map((frontier) => frontier.prefix),
        }]
        : []),
    ],
    issues: posture.openFronts.map((front) => ({
      code: front.code,
      message: front.summary,
      severity: front.severity,
      origin: front.origin === 'infrastructure'
        ? 'infrastructure'
        : 'boundary',
    })),
    continuations: dedupeContinuations(continuations),
    provenance: [
      {
        kind: 'host',
        label: 'Resolved analysis profile',
        ref: posture.profileId,
        detail: `target=${posture.target}`,
      },
      ...posture.snapshotSupport.snapshots.flatMap((snapshot) =>
        snapshot.generatedAt
          ? [{
            kind: 'snapshot' as const,
            label: `${snapshot.kind} snapshot support`,
            ref: snapshot.generatedAt,
            detail: `${snapshot.status}/${snapshot.regimeStatus}`,
          }]
          : []
      ),
      ...(posture.excludedFrontiers.length > 0
        ? [{
          kind: posture.frontierEvidenceSource === 'snapshot-contract'
            ? 'snapshot' as const
            : 'route' as const,
          label: posture.frontierEvidenceSource === 'snapshot-contract'
            ? 'Excluded frontier snapshot contract'
            : posture.frontierEvidenceSource === 'profile-law'
              ? 'Excluded frontier profile-law fallback'
              : 'Excluded frontier live fallback',
          detail: posture.excludedFrontiers
            .map((frontier) => `${frontier.prefix}:${frontier.inboundBoundaryCount}`)
            .join(', '),
        }]
        : []),
    ],
    worldFrame: {
      repoPath: worldFrame.repoPath,
      target: worldFrame.target,
      ...(worldFrame.profilePath ? { profilePath: worldFrame.profilePath } : {}),
      regimeAnchor: worldFrame.regimeAnchor ?? 'hosted',
      partiality: worldFrame.partiality ?? 'complete',
      freshness: worldFrame.freshness ?? 'live',
    },
  };
}

function createAnalyzabilityPosture(
  profile: AnalysisProfile,
  snapshotSupport: ProfileSnapshotSupport,
  excluded: ExcludedFrontierInspection,
): AnalyzabilityPosture {
  const openFronts = [
    ...snapshotSupportOpenFronts(snapshotSupport),
    ...excludedFrontierOpenFronts(excluded.frontiers),
  ];
  const currentBand = bandForId(
    openFronts.length > 0
      ? 'explicit-open-named-fronts'
      : 'regime-qualified-deterministic-truth',
  );

  return {
    profileId: profile.profileId,
    target: profile.snapshotTarget,
    currentBand,
    deterministicCeilingBand: bandForId('regime-qualified-deterministic-truth'),
    frontierEvidenceSource: excluded.source,
    summaryLines: postureSummaryLines(profile, snapshotSupport, excluded, openFronts),
    snapshotSupport,
    excludedFrontiers: excluded.frontiers,
    openFronts,
    warnings: excluded.warnings,
  };
}

function inspectExcludedFrontiers(
  profile: AnalysisProfile,
  snapshotSupport: ProfileSnapshotSupport,
  waitMs: number,
): ExcludedFrontierInspection {
  const usableSnapshot = snapshotSupport.snapshots
    .filter((snapshot) => isUsableSnapshotArtifact(snapshot))
    .sort((left, right) =>
      (right.generatedAt ?? '').localeCompare(left.generatedAt ?? '')
      || left.kind.localeCompare(right.kind)
    )[0];

  if (usableSnapshot) {
    try {
      const snapshot = loadJsonSnapshot<{ readonly frontiers?: unknown }>(usableSnapshot.path, waitMs);
      const parsed = parseSnapshotFrontierEvidence(snapshot.frontiers);
      if (parsed) {
        return {
          frontiers: parsed.excluded_frontiers.map(toExcludedFrontierEvidence),
          warnings: [...parsed.warnings],
          source: 'snapshot-contract',
        };
      }
    } catch {
      // Fall back to a live scan below.
    }
  }

  const live = collectSnapshotFrontierEvidence(
    createRepoSession({
      repoPath: profile.repoPath,
      target: profile.snapshotTarget,
      profilePath: profile.profilePath ?? undefined,
    }),
  );
  const warnings = usableSnapshot
    ? ['Current usable snapshot does not yet carry frontier evidence. Falling back to a live frontier scan.', ...live.warnings]
    : [...live.warnings];
  return {
    frontiers: live.excluded_frontiers.map(toExcludedFrontierEvidence),
    warnings,
    source: 'live-scan',
  };
}

function inspectExcludedFrontiersFromLoadedSnapshots(
  snapshots: LoadedCurrentSnapshotSet,
  profile: AnalysisProfile,
): ExcludedFrontierInspection {
  const parsed = selectSnapshotFrontierEvidenceFromLoadedSnapshots(snapshots);
  if (parsed) {
    return {
      frontiers: parsed.excluded_frontiers.map(toExcludedFrontierEvidence),
      warnings: [...parsed.warnings],
      source: 'snapshot-contract',
    };
  }

  return {
    frontiers: profile.excludedRepoRelativePrefixes.map((prefix) => ({
      prefix,
      sourceFileCount: 0,
      packageCount: 0,
      inboundBoundaryCount: 0,
      boundaryReferences: [],
    })),
    warnings: profile.excludedRepoRelativePrefixes.length > 0
      ? ['Loaded snapshots do not yet carry frontier evidence. Open fronts are derived from profile law only.']
      : [],
    source: 'profile-law',
  };
}

function parseSnapshotFrontierEvidence(
  value: unknown,
): SnapshotFrontierEvidence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.excluded_frontiers) || !Array.isArray(record.warnings)) {
    return null;
  }
  return value as unknown as SnapshotFrontierEvidence;
}

function selectSnapshotFrontierEvidenceFromLoadedSnapshots(
  snapshots: LoadedCurrentSnapshotSet,
): SnapshotFrontierEvidence | null {
  const candidates = [
    snapshots.deps.frontiers,
    snapshots.typeRefs.frontiers,
    snapshots.exports.frontiers,
  ].map((candidate) => parseSnapshotFrontierEvidence(candidate));
  const parsed = candidates
    .filter((candidate): candidate is SnapshotFrontierEvidence => candidate !== null)
    .sort((left, right) =>
      right.excluded_frontiers.length - left.excluded_frontiers.length
      || right.warnings.length - left.warnings.length
    );
  return parsed[0] ?? null;
}

function toExcludedFrontierEvidence(
  frontier: SnapshotExcludedFrontierEvidence,
): ExcludedFrontierEvidence {
  return {
    prefix: frontier.prefix,
    sourceFileCount: frontier.source_file_count,
    packageCount: frontier.package_count,
    inboundBoundaryCount: frontier.inbound_boundary_count,
    boundaryReferences: frontier.boundary_references.map(toExcludedBoundaryReference),
  };
}

function toExcludedBoundaryReference(
  reference: SnapshotExcludedBoundaryReference,
): ExcludedBoundaryReference {
  return {
    source: reference.source,
    target: reference.target,
    specifier: reference.specifier,
    line: reference.line,
    edgeKind: reference.edge_kind,
    typeOnly: reference.type_only,
    excludedPrefix: reference.excluded_prefix,
  };
}

function snapshotSupportOpenFronts(
  support: ProfileSnapshotSupport,
): readonly AnalyzabilityOpenFront[] {
  return support.snapshots.flatMap((snapshot) => {
    if (snapshot.status === 'available' && snapshot.regimeStatus === 'aligned') {
      return [];
    }

    const summary = snapshot.status === 'available' && snapshot.regimeStatus === 'mismatch'
      ? `${snapshot.kind} is present but regime-mismatched for the current profile law.`
      : `${snapshot.kind} is not currently usable under the resolved regime.`;
    return [{
      code: `snapshot-${snapshot.kind}-${snapshot.status}${snapshot.regimeStatus === 'aligned' ? '' : `-${snapshot.regimeStatus}`}`,
      title: `${snapshot.kind} snapshot is not posture-closed`,
      summary,
      severity: snapshot.status === 'invalid' || snapshot.status === 'locked' ? 'error' : 'warning',
      origin: 'snapshot-support' as const,
      snapshotKind: snapshot.kind,
      snapshotStatus: snapshot.status,
      regimeStatus: snapshot.regimeStatus,
      evidence: snapshot.issues.slice(0, 6),
    }];
  });
}

function excludedFrontierOpenFronts(
  frontiers: readonly ExcludedFrontierEvidence[],
): readonly AnalyzabilityOpenFront[] {
  return frontiers.map((frontier) => {
    const summary = frontier.inboundBoundaryCount > 0
      ? `${frontier.prefix} is excluded by profile law and ${frontier.inboundBoundaryCount} observed seam${pluralize(frontier.inboundBoundaryCount)} currently cross into it from included code.`
      : `${frontier.prefix} is excluded by profile law and remains a named open frontier outside the included regime.`;
    const evidence = [
      `${frontier.sourceFileCount} source file${pluralize(frontier.sourceFileCount)} under ${frontier.prefix}.`,
      `${frontier.packageCount} package${pluralize(frontier.packageCount)} under ${frontier.prefix}.`,
      ...frontier.boundaryReferences.slice(0, 4).map((reference) =>
        `${reference.source}:${reference.line} -> ${reference.specifier} (${reference.target})`,
      ),
    ];
    return {
      code: `excluded-frontier-${sanitizeCode(frontier.prefix)}`,
      title: `${frontier.prefix} remains an open frontier`,
      summary,
      severity: frontier.inboundBoundaryCount > 0 ? 'warning' : 'info',
      origin: 'excluded-frontier',
      prefix: frontier.prefix,
      evidence,
    };
  });
}

function postureSummaryLines(
  profile: AnalysisProfile,
  snapshotSupport: ProfileSnapshotSupport,
  excluded: ExcludedFrontierInspection,
  openFronts: readonly AnalyzabilityOpenFront[],
): readonly string[] {
  const frontiers = excluded.frontiers;
  const usableKinds = snapshotSupport.usableKinds.length;
  const blockedKinds = snapshotSupport.snapshots.length - usableKinds;
  const seamCount = frontiers.reduce((count, frontier) => count + frontier.inboundBoundaryCount, 0);

  if (openFronts.length === 0) {
    return [
      `The current posture closes as regime-qualified deterministic truth under profile ${profile.profileId}.`,
      `All ${snapshotSupport.snapshots.length} snapshot kinds align with the resolved regime.`,
      frontiers.length === 0
        ? 'No named excluded frontiers are declared in the current profile.'
        : `Named excluded frontiers are declared, but no observed seam currently crosses from included code into them.`,
    ];
  }

  return [
    `The current posture sits at explicit-open named fronts because ${openFronts.length} open front${pluralize(openFronts.length)} remain under profile ${profile.profileId}.`,
    `Deterministic closure inside the included regime still tops out at regime-qualified deterministic truth.`,
    blockedKinds > 0
      ? `${blockedKinds} snapshot kind${pluralize(blockedKinds)} ${blockedKinds === 1 ? 'is' : 'are'} still unusable or regime-mismatched.`
      : `${frontiers.length} excluded frontier${pluralize(frontiers.length)} remain named open fronts, with ${seamCount} observed seam${pluralize(seamCount)} from included code.`,
    excluded.source === 'snapshot-contract'
      ? 'Excluded frontier evidence is now coming from the snapshot contract itself.'
      : excluded.source === 'profile-law'
        ? 'Excluded frontier evidence is currently derived from profile law only because the loaded snapshots do not yet carry that contract.'
        : 'Excluded frontier evidence still required a live fallback scan because the current usable snapshots do not yet carry that contract.',
  ];
}

function focusedAnalyzabilityLines(
  posture: AnalyzabilityPosture,
  focusLabel: string,
  directlyExcludedFrontier: ExcludedFrontierEvidence | null,
  matchingBoundaryReferences: readonly ExcludedBoundaryReference[],
): readonly string[] {
  if (directlyExcludedFrontier) {
    return [
      `${focusLabel} falls under excluded frontier ${directlyExcludedFrontier.prefix}, so this answer cannot close inside the current profile.`,
      directlyExcludedFrontier.inboundBoundaryCount > 0
        ? `${directlyExcludedFrontier.inboundBoundaryCount} observed seam${pluralize(directlyExcludedFrontier.inboundBoundaryCount)} currently cross from included code into ${directlyExcludedFrontier.prefix}.`
        : `${directlyExcludedFrontier.prefix} remains outside the included regime, and the current snapshot contract shows no included-to-excluded seam into it.`,
    ];
  }

  if (matchingBoundaryReferences.length > 0) {
    const first = matchingBoundaryReferences[0]!;
    return [
      `${focusLabel} touches ${matchingBoundaryReferences.length} observed seam${pluralize(matchingBoundaryReferences.length)} into excluded frontier${pluralize(matchingBoundaryReferences.length)} under profile ${posture.profileId}.`,
      `${first.source}:${first.line} reaches ${first.excludedPrefix} through ${first.specifier}.`,
    ];
  }

  return [
    `The active profile still leaves ${posture.openFronts.length} named open frontier${pluralize(posture.openFronts.length)} outside the included regime, but no observed seam from ${focusLabel} into them appears in the current snapshot contract.`,
  ];
}

function profileFromSnapshotContract(
  profile: SnapshotProfileProvenance,
  repoPath: string,
): AnalysisProfile {
  return {
    profileId: profile.profileId,
    profilePath: profile.profilePath,
    repoPath,
    snapshotTarget: profile.target,
    excludedRepoRelativePrefixes: [...profile.excludedRepoRelativePrefixes],
    packageDiscoveryRoots: profile.packageDiscoveryRoots.map((root) => ({
      root: root.root,
      mode: root.mode,
    })),
    includeRepoRootPackage: profile.includeRepoRootPackage,
    pathMappings: profile.pathMappings.map((mapping) => ({
      id: mapping.id,
      from: mapping.from,
      to: mapping.to,
    })),
    exercisePatterns: [...profile.exercisePatterns],
    partitionSchemes: profile.partitionSchemes.map((scheme) => ({
      id: scheme.id,
      summary: scheme.summary,
      rules: scheme.rules.map((rule) => ({
        pattern: rule.pattern,
        partitionTemplate: rule.partitionTemplate,
        ...(rule.labelTemplate ? { labelTemplate: rule.labelTemplate } : {}),
      })),
    })),
  };
}

function selectSnapshotProfile(
  snapshots: LoadedCurrentSnapshotSet,
): SnapshotProfileProvenance {
  return snapshots.deps.profile;
}

function createSyntheticSnapshotSupport(
  snapshots: LoadedCurrentSnapshotSet,
): ProfileSnapshotSupport {
  const profile = selectSnapshotProfile(snapshots);
  const snapshotRootPath = join(snapshots.deps.root, '.source-analysis', 'snapshots');
  const artifacts: SnapshotArtifactSupport[] = [
    createSyntheticSnapshotArtifactSupport('deps', snapshots.deps.generated_at, snapshots.deps.source_commit, snapshots.deps.analyzer_commit, profile, snapshotRootPath),
    createSyntheticSnapshotArtifactSupport('typerefs', snapshots.typeRefs.generated_at, snapshots.typeRefs.source_commit, snapshots.typeRefs.analyzer_commit, profile, snapshotRootPath),
    createSyntheticSnapshotArtifactSupport('exports', snapshots.exports.generated_at, snapshots.exports.source_commit, snapshots.exports.analyzer_commit, profile, snapshotRootPath),
  ];

  return {
    target: profile.target,
    snapshotRootPath,
    usableKinds: ['deps', 'typerefs', 'exports'],
    missingKinds: [],
    invalidKinds: [],
    lockedKinds: [],
    mismatchedKinds: [],
    snapshots: artifacts,
  };
}

function createSyntheticSnapshotArtifactSupport(
  kind: SnapshotKind,
  generatedAt: string,
  sourceCommit: string,
  analyzerCommit: string,
  profile: SnapshotProfileProvenance,
  snapshotRootPath: string,
): SnapshotArtifactSupport {
  return {
    kind,
    path: join(snapshotRootPath, `${profile.target}-${kind}.json`),
    refreshCommand: 'pnpm source-analysis refresh all',
    status: 'available',
    regimeStatus: 'aligned',
    sizeBytes: null,
    generatedAt,
    sourceCommit,
    analyzerCommit,
    profile,
    issues: [],
  };
}

function focusMatchesExcludedFrontier(
  frontier: ExcludedFrontierEvidence,
  pathPrefixes: readonly string[],
  queryHints: readonly string[],
): boolean {
  if (pathPrefixes.some((prefix) =>
    prefix === normalizeComparableFocusHint(frontier.prefix)
    || prefix.startsWith(`${normalizeComparableFocusHint(frontier.prefix)}/`)
    || normalizeComparableFocusHint(frontier.prefix).startsWith(`${prefix}/`)
  )) {
    return true;
  }

  const frontierSegments = normalizeComparableFocusHint(frontier.prefix).split('/');
  const frontierTail = frontierSegments.at(-1) ?? normalizeComparableFocusHint(frontier.prefix);
  return queryHints.some((hint) =>
    hint === normalizeComparableFocusHint(frontier.prefix)
    || hint === frontierTail
    || hint.endsWith(`/${frontierTail}`)
    || hint.includes(frontierTail),
  );
}

function focusTouchesBoundaryReference(
  reference: ExcludedBoundaryReference,
  pathPrefixes: readonly string[],
): boolean {
  return pathPrefixes.some((prefix) =>
    normalizeComparableFocusHint(reference.source) === prefix
    || normalizeComparableFocusHint(reference.target) === prefix
    || normalizeComparableFocusHint(reference.source).startsWith(`${prefix}/`)
    || normalizeComparableFocusHint(reference.target).startsWith(`${prefix}/`)
  );
}

function normalizeComparableFocusHint(
  value: string,
): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
}

function bandForId(
  id: AnalyzabilityBandId,
): AnalyzabilityBand {
  return BAND_BY_ID[id];
}

function sanitizeCode(
  value: string,
): string {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function pluralize(
  count: number,
): string {
  return count === 1 ? '' : 's';
}

function dedupeContinuations(
  continuations: readonly Continuation[],
): readonly Continuation[] {
  const seen = new Set<string>();
  const deduped: Continuation[] = [];
  for (const continuation of continuations) {
    const key = [
      continuation.kind,
      continuation.label,
      continuation.targetQuestionRoute ?? '',
      continuation.targetFocusRef ?? '',
    ].join('\0');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(continuation);
  }
  return deduped;
}

function dedupeStrings(
  values: readonly string[],
): readonly string[] {
  return [...new Set(values)];
}
