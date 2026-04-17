import type { LoadedCurrentSnapshotSet } from './current-snapshots.js';
import { loadCurrentSnapshots } from './current-snapshots.js';
import type { DepsOutput } from './deps/schema.js';
import type { ExportsOutput } from './exports/schema.js';
import type { ProfileSnapshotSupport } from './profile-support.js';
import type { RepoSession } from './repo-session.js';
import type { StructuralClaimGraphRuntime } from './structural-claim-graph.js';
import type { ParsedTsconfigSourceFileScanResult } from './tsconfig-source-files.js';
import type { TypeRefsOutput } from './typerefs/schema.js';

export const ANALYSIS_VIEW_SOURCE_IDS = [
  'snapshot-contract',
  'hosted-analysis',
] as const;

export type AnalysisViewSourceId =
  typeof ANALYSIS_VIEW_SOURCE_IDS[number];

export interface AnalysisViews {
  readonly source: AnalysisViewSourceId;
  readonly root: string;
  readonly deps: DepsOutput;
  readonly typeRefs: TypeRefsOutput;
  readonly exports: ExportsOutput;
  readonly support?: ProfileSnapshotSupport;
  readonly repoSession?: RepoSession;
  readonly structuralRuntime?: StructuralClaimGraphRuntime;
  readonly sourceFileScan?: ParsedTsconfigSourceFileScanResult;
  readonly repoSourceFiles?: readonly string[];
}

export interface AnalysisViewsOptions {
  readonly source: AnalysisViewSourceId;
  readonly deps: DepsOutput;
  readonly typeRefs: TypeRefsOutput;
  readonly exports: ExportsOutput;
  readonly support?: ProfileSnapshotSupport;
  readonly repoSession?: RepoSession;
  readonly structuralRuntime?: StructuralClaimGraphRuntime;
  readonly sourceFileScan?: ParsedTsconfigSourceFileScanResult;
  readonly repoSourceFiles?: readonly string[];
}

export function loadCurrentAnalysisViews(
  target?: string,
  waitMs = 0,
): AnalysisViews {
  return createAnalysisViewsFromSnapshots(loadCurrentSnapshots(target, waitMs));
}

export function createAnalysisViews(
  options: AnalysisViewsOptions,
): AnalysisViews {
  return {
    source: options.source,
    root: options.deps.root,
    deps: options.deps,
    typeRefs: options.typeRefs,
    exports: options.exports,
    ...(options.support ? { support: options.support } : {}),
    ...(options.repoSession ? { repoSession: options.repoSession } : {}),
    ...(options.structuralRuntime ? { structuralRuntime: options.structuralRuntime } : {}),
    ...(options.sourceFileScan ? { sourceFileScan: options.sourceFileScan } : {}),
    ...(options.repoSourceFiles ? { repoSourceFiles: options.repoSourceFiles } : {}),
  };
}

export function createAnalysisViewsFromSnapshots(
  snapshots: LoadedCurrentSnapshotSet,
): AnalysisViews {
  return createAnalysisViews({
    source: 'snapshot-contract',
    deps: snapshots.deps,
    typeRefs: snapshots.typeRefs,
    exports: snapshots.exports,
    ...(snapshots.support ? { support: snapshots.support } : {}),
  });
}

export function coerceAnalysisViews(
  views: AnalysisViews | LoadedCurrentSnapshotSet,
): AnalysisViews {
  return isAnalysisViews(views)
    ? views
    : createAnalysisViewsFromSnapshots(views);
}

function isAnalysisViews(
  value: AnalysisViews | LoadedCurrentSnapshotSet,
): value is AnalysisViews {
  return 'source' in value && 'root' in value;
}
