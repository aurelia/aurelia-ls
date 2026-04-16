import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { AnalysisProfile } from './analysis-profile.js';
import {
  createRefreshCommand,
  type SnapshotPaths,
  resolveSnapshotRootPath,
} from './snapshot-config.js';
import {
  SNAPSHOT_KINDS,
  type SnapshotKind,
  type SnapshotProfileProvenance,
  waitIfLocked,
} from './snapshots.js';

export const SNAPSHOT_SUPPORT_STATUSES = [
  'available',
  'missing',
  'invalid',
  'locked',
] as const;

export const SNAPSHOT_REGIME_STATUSES = [
  'aligned',
  'mismatch',
  'unknown',
] as const;

export type SnapshotSupportStatus =
  typeof SNAPSHOT_SUPPORT_STATUSES[number];

export type SnapshotRegimeStatus =
  typeof SNAPSHOT_REGIME_STATUSES[number];

export interface SnapshotArtifactSupport {
  readonly kind: SnapshotKind;
  readonly path: string;
  readonly refreshCommand: string;
  readonly status: SnapshotSupportStatus;
  readonly regimeStatus: SnapshotRegimeStatus;
  readonly sizeBytes: number | null;
  readonly generatedAt: string | null;
  readonly sourceCommit: string | null;
  readonly analyzerCommit: string | null;
  readonly profile: SnapshotProfileProvenance | null;
  readonly issues: readonly string[];
}

export interface ProfileSnapshotSupport {
  readonly target: string;
  readonly snapshotRootPath: string;
  readonly usableKinds: readonly SnapshotKind[];
  readonly missingKinds: readonly SnapshotKind[];
  readonly invalidKinds: readonly SnapshotKind[];
  readonly lockedKinds: readonly SnapshotKind[];
  readonly mismatchedKinds: readonly SnapshotKind[];
  readonly snapshots: readonly SnapshotArtifactSupport[];
}

interface SnapshotEnvelopeShape {
  readonly generated_at?: unknown;
  readonly source_commit?: unknown;
  readonly analyzer_commit?: unknown;
  readonly profile?: unknown;
}

export function inspectSnapshotArtifactSupport(
  paths: SnapshotPaths,
  profile: AnalysisProfile,
  kind: SnapshotKind,
  waitMs = 0,
): SnapshotArtifactSupport {
  const path = join(
    resolveSnapshotRootPath(paths, profile.repoPath),
    `${profile.snapshotTarget}-${kind}.json`,
  );
  const refreshCommand = createRefreshCommand(kind, {
    target: profile.snapshotTarget,
    repoPath: profile.repoPath,
    profilePath: profile.profilePath,
  });

  if (!existsSync(path)) {
    return {
      kind,
      path,
      refreshCommand,
      status: 'missing',
      regimeStatus: 'unknown',
      sizeBytes: null,
      generatedAt: null,
      sourceCommit: null,
      analyzerCommit: null,
      profile: null,
      issues: [
        `Current ${kind} snapshot is missing.`,
        `Run: ${refreshCommand}`,
      ],
    };
  }

  try {
    waitIfLocked(path, waitMs);
  } catch (error) {
    return {
      kind,
      path,
      refreshCommand,
      status: 'locked',
      regimeStatus: 'unknown',
      sizeBytes: safeFileSize(path),
      generatedAt: null,
      sourceCommit: null,
      analyzerCommit: null,
      profile: null,
      issues: [(error as Error).message],
    };
  }

  const sizeBytes = safeFileSize(path);
  let parsed: SnapshotEnvelopeShape;
  try {
    const raw = readFileSync(path, 'utf-8');
    if (!raw.trim()) {
      throw new Error('file is empty');
    }
    parsed = JSON.parse(raw) as SnapshotEnvelopeShape;
  } catch (error) {
    return {
      kind,
      path,
      refreshCommand,
      status: 'invalid',
      regimeStatus: 'unknown',
      sizeBytes,
      generatedAt: null,
      sourceCommit: null,
      analyzerCommit: null,
      profile: null,
      issues: [
        `Current ${kind} snapshot is unreadable: ${(error as Error).message}`,
        `Run: ${refreshCommand}`,
      ],
    };
  }

  const snapshotProfile = parseSnapshotProfile(parsed.profile);
  const regimeIssues = snapshotProfile
    ? compareSnapshotProfile(profile, snapshotProfile)
    : ['Snapshot does not record profile provenance. Refresh to materialize current regime metadata.'];

  return {
    kind,
    path,
    refreshCommand,
    status: 'available',
    regimeStatus: snapshotProfile
      ? regimeIssues.length === 0 ? 'aligned' : 'mismatch'
      : 'unknown',
    sizeBytes,
    generatedAt: asOptionalString(parsed.generated_at),
    sourceCommit: asOptionalString(parsed.source_commit),
    analyzerCommit: asOptionalString(parsed.analyzer_commit),
    profile: snapshotProfile,
    issues: regimeIssues,
  };
}

export function inspectProfileSnapshotSupport(
  paths: SnapshotPaths,
  profile: AnalysisProfile,
  waitMs = 0,
): ProfileSnapshotSupport {
  const snapshots = SNAPSHOT_KINDS.map((kind) =>
    inspectSnapshotArtifactSupport(paths, profile, kind, waitMs),
  );

  return {
    target: profile.snapshotTarget,
    snapshotRootPath: resolveSnapshotRootPath(paths, profile.repoPath),
    usableKinds: snapshots
      .filter((snapshot) => isUsableSnapshotArtifact(snapshot))
      .map((snapshot) => snapshot.kind),
    missingKinds: snapshots
      .filter((snapshot) => snapshot.status === 'missing')
      .map((snapshot) => snapshot.kind),
    invalidKinds: snapshots
      .filter((snapshot) => snapshot.status === 'invalid')
      .map((snapshot) => snapshot.kind),
    lockedKinds: snapshots
      .filter((snapshot) => snapshot.status === 'locked')
      .map((snapshot) => snapshot.kind),
    mismatchedKinds: snapshots
      .filter((snapshot) => snapshot.status === 'available' && snapshot.regimeStatus !== 'aligned')
      .map((snapshot) => snapshot.kind),
    snapshots,
  };
}

export function isUsableSnapshotArtifact(
  artifact: SnapshotArtifactSupport,
): boolean {
  return artifact.status === 'available' && artifact.regimeStatus === 'aligned';
}

function compareSnapshotProfile(
  expected: AnalysisProfile,
  actual: SnapshotProfileProvenance,
): readonly string[] {
  const issues: string[] = [];

  if (actual.target !== expected.snapshotTarget) {
    issues.push(
      `Snapshot target ${JSON.stringify(actual.target)} does not match resolved target ${JSON.stringify(expected.snapshotTarget)}.`,
    );
  }

  if (actual.profileId !== expected.profileId) {
    issues.push(
      `Snapshot profile ${JSON.stringify(actual.profileId)} does not match resolved profile ${JSON.stringify(expected.profileId)}.`,
    );
  }

  const expectedProfilePath = normalizeComparablePath(expected.profilePath);
  const actualProfilePath = normalizeComparablePath(actual.profilePath);
  if (expectedProfilePath !== actualProfilePath) {
    issues.push(
      `Snapshot profile path ${JSON.stringify(actual.profilePath)} does not match resolved profile path ${JSON.stringify(expected.profilePath ? expected.profilePath : null)}.`,
    );
  }

  const expectedPrefixes = normalizeComparablePrefixList(expected.excludedRepoRelativePrefixes);
  const actualPrefixes = normalizeComparablePrefixList(actual.excludedRepoRelativePrefixes);
  if (!sameStringList(expectedPrefixes, actualPrefixes)) {
    issues.push(
      `Snapshot excluded prefixes ${JSON.stringify(actualPrefixes)} do not match resolved excluded prefixes ${JSON.stringify(expectedPrefixes)}.`,
    );
  }

  return issues;
}

function parseSnapshotProfile(
  value: unknown,
): SnapshotProfileProvenance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const target = asOptionalString(record.target);
  const profileId = asOptionalString(record.profileId);
  const excludedRepoRelativePrefixes = Array.isArray(record.excludedRepoRelativePrefixes)
    ? record.excludedRepoRelativePrefixes
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      .map((entry) => entry.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    : [];
  if (!target || !profileId) {
    return null;
  }
  return {
    target,
    profileId,
    profilePath: asOptionalString(record.profilePath),
    excludedRepoRelativePrefixes,
  };
}

function normalizeComparablePath(
  value: string | null,
): string | null {
  return value
    ? resolve(value).replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase()
    : null;
}

function normalizeComparablePrefixList(
  values: readonly string[],
): readonly string[] {
  return values
    .map((value) => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .sort();
}

function sameStringList(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function safeFileSize(
  path: string,
): number | null {
  try {
    return statSync(path).size;
  } catch {
    return null;
  }
}

function asOptionalString(
  value: unknown,
): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}
