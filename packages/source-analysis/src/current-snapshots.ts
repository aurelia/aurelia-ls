import { createSnapshotPaths, resolveSnapshotTarget } from './snapshot-config.js';
import { loadJsonSnapshot, resolveCurrentSnapshotPath, type SnapshotKind } from './snapshots.js';
import type { DepsOutput } from './deps/schema.js';
import type { ExportsOutput } from './exports/schema.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

const PATHS = createSnapshotPaths(import.meta.url);

function defaultTarget(): string {
  return resolveSnapshotTarget().target;
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
): { data: T | null; warning: string | null } {
  try {
    const snapshotPath = resolveCurrentSnapshotPath(PATHS, {
      target,
      kind,
      waitMs,
      refreshCommand: `pnpm source-analysis refresh ${kind} --target ${target}`,
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
  target = defaultTarget(),
  waitMs = 0,
): LoadedCurrentSnapshotSet {
  const deps = tryLoadSnapshot<DepsOutput>(target, 'deps', waitMs);
  const typeRefs = tryLoadSnapshot<TypeRefsOutput>(target, 'typerefs', waitMs);
  const exports = tryLoadSnapshot<ExportsOutput>(target, 'exports', waitMs);
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
  target = defaultTarget(),
  waitMs = 0,
): CurrentSnapshotSet {
  const deps = tryLoadSnapshot<DepsOutput>(target, 'deps', waitMs);
  const typeRefs = tryLoadSnapshot<TypeRefsOutput>(target, 'typerefs', waitMs);
  const exports = tryLoadSnapshot<ExportsOutput>(target, 'exports', waitMs);

  return {
    deps: deps.data,
    typeRefs: typeRefs.data,
    exports: exports.data,
    warnings: [deps.warning, typeRefs.warning, exports.warning].filter((value): value is string => Boolean(value)),
  };
}
