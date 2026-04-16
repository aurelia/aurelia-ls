export type { DepsOutput } from './deps/schema.js';
export type { ExportsOutput } from './exports/schema.js';
export type { TypeRefsOutput } from './typerefs/schema.js';

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
