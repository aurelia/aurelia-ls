import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { AnalysisProfile } from './analysis-profile.js';
import type { SnapshotPaths } from './snapshot-config.js';
import { resolveSnapshotRootPath } from './snapshot-config.js';

export const SNAPSHOT_KINDS = ['deps', 'typerefs', 'exports'] as const;
export const SNAPSHOT_EXCLUDED_BOUNDARY_EDGE_KINDS = [
  'import',
  'reexport',
  'dynamic-import',
] as const;

export type SnapshotKind = typeof SNAPSHOT_KINDS[number];
export type SnapshotExcludedBoundaryEdgeKind =
  typeof SNAPSHOT_EXCLUDED_BOUNDARY_EDGE_KINDS[number];

export interface SnapshotOptions {
  target: string;
  kind: SnapshotKind;
  waitMs: number;
  refreshCommand: string;
  repoPath?: string;
}

export interface SnapshotProfileProvenance {
  readonly target: string;
  readonly profileId: string;
  readonly profilePath: string | null;
  readonly excludedRepoRelativePrefixes: readonly string[];
  readonly packageDiscoveryRoots: readonly {
    readonly root: string;
    readonly mode: 'children-with-package-json';
  }[];
  readonly includeRepoRootPackage: boolean;
  readonly pathMappings: readonly {
    readonly id: string;
    readonly from: string;
    readonly to: string;
  }[];
  readonly exercisePatterns: readonly string[];
  readonly partitionSchemes: readonly {
    readonly id: string;
    readonly summary: string;
    readonly rules: readonly {
      readonly pattern: string;
      readonly partitionTemplate: string;
      readonly labelTemplate: string | null;
    }[];
  }[];
}

export interface SnapshotExcludedBoundaryReference {
  readonly source: string;
  readonly target: string;
  readonly specifier: string;
  readonly line: number;
  readonly edge_kind: SnapshotExcludedBoundaryEdgeKind;
  readonly type_only: boolean;
  readonly excluded_prefix: string;
}

export interface SnapshotExcludedFrontierEvidence {
  readonly prefix: string;
  readonly source_file_count: number;
  readonly package_count: number;
  readonly inbound_boundary_count: number;
  readonly boundary_references: readonly SnapshotExcludedBoundaryReference[];
}

export interface SnapshotFrontierEvidence {
  readonly excluded_frontiers: readonly SnapshotExcludedFrontierEvidence[];
  readonly warnings: readonly string[];
}

export function describeSnapshotProfile(
  profile: AnalysisProfile,
): SnapshotProfileProvenance {
  return {
    target: profile.snapshotTarget,
    profileId: profile.profileId,
    profilePath: profile.profilePath,
    excludedRepoRelativePrefixes: profile.excludedRepoRelativePrefixes,
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
        labelTemplate: rule.labelTemplate ?? null,
      })),
    })),
  };
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForLockRelease(lockPath: string, waitMs: number): boolean {
  const deadline = Date.now() + waitMs;
  while (existsSync(lockPath)) {
    if (Date.now() >= deadline) return false;
    sleep(100);
  }
  return true;
}

export function waitIfLocked(path: string, waitMs: number): void {
  const lockPath = `${path}.lock`;
  if (!existsSync(lockPath)) return;
  if (!waitForLockRelease(lockPath, waitMs)) {
    throw new Error(
      `LOCK_TIMEOUT: ${lockPath} remained locked for ${waitMs}ms. ` +
      'Stop and escalate to user; do not fallback to stale dated snapshots.',
    );
  }
}

export function resolveCurrentSnapshotPath(
  paths: SnapshotPaths,
  options: SnapshotOptions,
): string {
  const filename = `${options.target}-${options.kind}.json`;
  const currentCandidate = join(resolveSnapshotRootPath(paths, options.repoPath), filename);
  waitIfLocked(currentCandidate, options.waitMs);

  try {
    const stats = statSync(currentCandidate);
    if (stats.size <= 0) {
      throw new Error('file is empty');
    }
    return currentCandidate;
  } catch (error) {
    const reason = (error as Error).message || 'missing or unreadable file';
    throw new Error(
      `CURRENT_SNAPSHOT_UNAVAILABLE: ${currentCandidate} (${reason}).\n` +
      `Run: ${options.refreshCommand}\n` +
      'Then rerun your query. If this persists, stop and escalate to user.',
    );
  }
}

export function loadJsonSnapshot<T>(path: string, waitMs: number): T {
  waitIfLocked(path, waitMs);
  const raw = readFileSync(path, 'utf-8');
  if (!raw.trim()) throw new Error('file is empty');
  return JSON.parse(raw) as T;
}
