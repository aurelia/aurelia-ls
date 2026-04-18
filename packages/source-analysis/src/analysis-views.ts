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

// TODO: AnalysisViews still speaks the historical deps/typerefs/exports output
// contracts directly. If analysis-views.ts -> deps stays the top cycle seam,
// extract a neutral shared payload contract so this carrier stops inheriting
// projection-owned type identity.
// TODO: Treat deps/typerefs/exports here as legacy compatibility projections,
// not as the durable semantic axes of the package. The long-term replacement is
// a higher-order shared authority/runtime that can answer dependency, type, and
// export questions without those three ad-hoc tools remaining first-class peers.
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
