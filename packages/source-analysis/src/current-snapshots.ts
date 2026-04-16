import {
  createRefreshCommand,
  createSnapshotPaths,
  resolveSnapshotTarget,
} from './snapshot-config.js';
import { resolveAnalysisProfile } from './analysis-profile.js';
import {
  inspectProfileSnapshotSupport,
  inspectSnapshotArtifactSupport,
  isUsableSnapshotArtifact,
  type ProfileSnapshotSupport,
} from './profile-support.js';
import { loadJsonSnapshot, type SnapshotKind } from './snapshots.js';
import type { DepsOutput } from './deps/schema.js';
import type { ExportsOutput } from './exports/schema.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

const PATHS = createSnapshotPaths(import.meta.url);

function defaultProfile(
  repoPath?: string,
  profilePath?: string,
) {
  return resolveAnalysisProfile({ repoPath, profilePath });
}

export interface CurrentSnapshotSet {
  deps: DepsOutput | null;
  typeRefs: TypeRefsOutput | null;
  exports: ExportsOutput | null;
  support?: ProfileSnapshotSupport;
  warnings: string[];
}

export interface LoadedCurrentSnapshotSet {
  deps: DepsOutput;
  typeRefs: TypeRefsOutput;
  exports: ExportsOutput;
  support?: ProfileSnapshotSupport;
  warnings: string[];
}

function tryLoadSnapshot<T>(
  resolvedProfile: ReturnType<typeof resolveAnalysisProfile>,
  kind: SnapshotKind,
  waitMs: number,
): { data: T | null; warning: string | null } {
  const support = inspectSnapshotArtifactSupport(PATHS, resolvedProfile, kind, waitMs);
  if (!isUsableSnapshotArtifact(support)) {
    return {
      data: null,
      warning: `Current ${kind} snapshot unavailable for ${resolvedProfile.snapshotTarget}: ${support.issues.join(' ')}`,
    };
  }

  try {
    return {
      data: loadJsonSnapshot<T>(support.path, waitMs),
      warning: null,
    };
  } catch (error) {
    const selection = resolveSnapshotTarget({
      target: resolvedProfile.snapshotTarget,
      repoPath: resolvedProfile.repoPath,
      profilePath: resolvedProfile.profilePath ?? undefined,
    });
    return {
      data: null,
      warning: `Current ${kind} snapshot unavailable for ${resolvedProfile.snapshotTarget}: ${(error as Error).message} Run: ${createRefreshCommand(kind, selection)}`,
    };
  }
}

export function loadCurrentSnapshots(
  target = defaultProfile().snapshotTarget,
  waitMs = 0,
  repoPath?: string,
  profilePath?: string,
): LoadedCurrentSnapshotSet {
  const profile = resolveAnalysisProfile({ repoPath, target, profilePath });
  const support = inspectProfileSnapshotSupport(PATHS, profile, waitMs);
  const deps = tryLoadSnapshot<DepsOutput>(profile, 'deps', waitMs);
  const typeRefs = tryLoadSnapshot<TypeRefsOutput>(profile, 'typerefs', waitMs);
  const exports = tryLoadSnapshot<ExportsOutput>(profile, 'exports', waitMs);
  const warnings = [deps.warning, typeRefs.warning, exports.warning].filter((value): value is string => Boolean(value));

  if (warnings.length > 0 || !deps.data || !typeRefs.data || !exports.data) {
    throw new Error(warnings.join('\n\n') || `Current source-analysis snapshots unavailable for ${profile.snapshotTarget}.`);
  }

  return {
    deps: deps.data,
    typeRefs: typeRefs.data,
    exports: exports.data,
    support,
    warnings: [],
  };
}

export function tryLoadCurrentSnapshots(
  target = defaultProfile().snapshotTarget,
  waitMs = 0,
  repoPath?: string,
  profilePath?: string,
): CurrentSnapshotSet {
  const profile = resolveAnalysisProfile({ repoPath, target, profilePath });
  const support = inspectProfileSnapshotSupport(PATHS, profile, waitMs);
  const deps = tryLoadSnapshot<DepsOutput>(profile, 'deps', waitMs);
  const typeRefs = tryLoadSnapshot<TypeRefsOutput>(profile, 'typerefs', waitMs);
  const exports = tryLoadSnapshot<ExportsOutput>(profile, 'exports', waitMs);

  return {
    deps: deps.data,
    typeRefs: typeRefs.data,
    exports: exports.data,
    support,
    warnings: [deps.warning, typeRefs.warning, exports.warning].filter((value): value is string => Boolean(value)),
  };
}
