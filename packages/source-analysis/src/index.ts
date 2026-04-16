export type { DepsOutput } from './deps/schema.js';
export type { ExportsOutput } from './exports/schema.js';
export type { TypeRefsOutput } from './typerefs/schema.js';
export type { SourceAnalysisAnalysisOptions } from './analysis-options.js';

export {
  loadCurrentSourceAnalysisSnapshots,
  tryLoadCurrentSourceAnalysisSnapshots,
} from './current-snapshots.js';
export type {
  CurrentSourceAnalysisSnapshots,
  LoadedCurrentSourceAnalysisSnapshots,
} from './current-snapshots.js';

export {
  createSourceAnalysisPaths,
  deriveTargetFromRepoPath,
  resolveSourceAnalysisTarget,
} from './config.js';
export type {
  SourceAnalysisPaths,
  SourceAnalysisTargetSelection,
} from './config.js';

export {
  createSourceAnalysisSession,
  parseExcludedRepoRelativePrefixes,
  SourceAnalysisSession,
} from './session.js';
export type {
  LoadTsconfigResult,
  LoadedTsconfigSnapshot,
  SourceAnalysisProgramOptions,
  SourceAnalysisProgramProfile,
  SourceAnalysisSessionOptions,
} from './session.js';

export { createSourceAnalysisHostRuntime, SourceAnalysisHostRuntime } from './host/runtime.js';
export type {
  MaterializeSnapshotsArgs,
  MaterializeSnapshotsResult,
  QueryArgs,
  QuerySnapshotResult,
  QuerySummaryResult,
  SessionCloseArgs,
  SessionCloseResult,
  SessionInvalidateArgs,
  SessionInvalidateResult,
  SessionOpenArgs,
  SessionOpenResult,
  SessionRefreshArgs,
  SessionRefreshResult,
  SessionStatusArgs,
  SessionStatusEntry,
  SessionStatusResult,
  SourceAnalysisHostCacheMeta,
  SourceAnalysisHostCommandArgsMap,
  SourceAnalysisHostCommandInvocation,
  SourceAnalysisHostCommandName,
  SourceAnalysisHostCommandResult,
  SourceAnalysisHostCommandResultMap,
  SourceAnalysisHostCommandStatus,
  SourceAnalysisHostEnvelope,
  SourceAnalysisHostEnvelopeMeta,
  SourceAnalysisHostError,
  SourceAnalysisHostInvalidationMeta,
  SourceAnalysisKind,
  SourceAnalysisOutputByKind,
  SourceAnalysisSummaryByKind,
} from './host/types.js';
export { SOURCE_ANALYSIS_HOST_SCHEMA_VERSION, SOURCE_ANALYSIS_KINDS } from './host/types.js';
