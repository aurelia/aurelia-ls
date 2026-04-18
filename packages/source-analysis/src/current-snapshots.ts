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
} from './profile-support.js';
import { loadJsonSnapshot, type SnapshotKind } from './snapshots.js';
import type { DepsOutput } from './deps/schema.js';
import type { ExportsOutput } from './exports/schema.js';
import type {
  CurrentSnapshotSet,
  LoadedCurrentSnapshotSet,
} from './snapshot-contract.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

const PATHS = createSnapshotPaths(import.meta.url);

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
  target: string | undefined = undefined,
  waitMs = 0,
  repoPath?: string,
  profilePath?: string,
): LoadedCurrentSnapshotSet {
  // TODO: This loader still hardcodes the three historical projection kinds as
  // if they were the natural public shape of the system. Replace it with a
  // projection/materialization registry over shared authority so "load current
  // answers" does not require naming deps/typerefs/exports explicitly.
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
  target: string | undefined = undefined,
  waitMs = 0,
  repoPath?: string,
  profilePath?: string,
): CurrentSnapshotSet {
  // TODO: Keep this as a compatibility shim only. New consumers should prefer
  // loading named shared surfaces or evaluators rather than a fixed triple of
  // legacy snapshots.
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
