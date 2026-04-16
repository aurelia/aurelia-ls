import {
  createRefreshCommand,
  createSnapshotPaths,
  resolveSnapshotTarget,
} from './snapshot-config.js';
import { loadJsonSnapshot, resolveCurrentSnapshotPath, type SnapshotKind } from './snapshots.js';
import type { DepsOutput } from './deps/schema.js';
import type { ExportsOutput } from './exports/schema.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

const PATHS = createSnapshotPaths(import.meta.url);

function defaultSelection(
  repoPath?: string,
  profilePath?: string,
) {
  return resolveSnapshotTarget({ repoPath, profilePath });
}

export interface CurrentSnapshotSet {
  deps: DepsOutput | null;
  typeRefs: TypeRefsOutput | null;
  exports: ExportsOutput | null;
  warnings: string[];
}

export interface LoadedCurrentSnapshotSet {
  deps: DepsOutput;
  typeRefs: TypeRefsOutput;
  exports: ExportsOutput;
  warnings: string[];
}

function tryLoadSnapshot<T>(
  target: string,
  kind: SnapshotKind,
  waitMs: number,
  repoPath?: string,
  profilePath?: string,
): { data: T | null; warning: string | null } {
  const selection = resolveSnapshotTarget({
    target,
    repoPath,
    profilePath,
  });
  try {
    const snapshotPath = resolveCurrentSnapshotPath(PATHS, {
      target: selection.target,
      kind,
      waitMs,
      refreshCommand: createRefreshCommand(kind, selection),
      repoPath: selection.repoPath,
    });

    return {
      data: loadJsonSnapshot<T>(snapshotPath, waitMs),
      warning: null,
    };
  } catch (error) {
    return {
      data: null,
      warning: `Current ${kind} snapshot unavailable for ${target}: ${(error as Error).message}`,
    };
  }
}

export function loadCurrentSnapshots(
  target = defaultSelection().target,
  waitMs = 0,
  repoPath?: string,
  profilePath?: string,
): LoadedCurrentSnapshotSet {
  const deps = tryLoadSnapshot<DepsOutput>(target, 'deps', waitMs, repoPath, profilePath);
  const typeRefs = tryLoadSnapshot<TypeRefsOutput>(target, 'typerefs', waitMs, repoPath, profilePath);
  const exports = tryLoadSnapshot<ExportsOutput>(target, 'exports', waitMs, repoPath, profilePath);
  const warnings = [deps.warning, typeRefs.warning, exports.warning].filter((value): value is string => Boolean(value));

  if (warnings.length > 0 || !deps.data || !typeRefs.data || !exports.data) {
    throw new Error(warnings.join('\n\n') || `Current source-analysis snapshots unavailable for ${target}.`);
  }

  return {
    deps: deps.data,
    typeRefs: typeRefs.data,
    exports: exports.data,
    warnings: [],
  };
}

export function tryLoadCurrentSnapshots(
  target = defaultSelection().target,
  waitMs = 0,
  repoPath?: string,
  profilePath?: string,
): CurrentSnapshotSet {
  const deps = tryLoadSnapshot<DepsOutput>(target, 'deps', waitMs, repoPath, profilePath);
  const typeRefs = tryLoadSnapshot<TypeRefsOutput>(target, 'typerefs', waitMs, repoPath, profilePath);
  const exports = tryLoadSnapshot<ExportsOutput>(target, 'exports', waitMs, repoPath, profilePath);

  return {
    deps: deps.data,
    typeRefs: typeRefs.data,
    exports: exports.data,
    warnings: [deps.warning, typeRefs.warning, exports.warning].filter((value): value is string => Boolean(value)),
  };
}
