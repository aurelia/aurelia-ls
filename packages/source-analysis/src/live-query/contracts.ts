import type { AnalysisViews } from '../analysis-views.js';
import type { DepsOutput } from '../deps/schema.js';
import type { ExportsOutput } from '../exports/schema.js';
import type {
  RepoSession,
  RepoSessionOptions,
} from '../repo-session.js';
import type { StructuralClaimGraphRuntime } from '../structural-claim-graph.js';
import type { ParsedTsconfigSourceFileScanResult } from '../tsconfig-source-files.js';
import type { TypeRefsOutput } from '../typerefs/schema.js';

export interface LiveQueryKernelOptions extends RepoSessionOptions {}

export interface LiveQueryKernelOutputs {
  readonly deps: DepsOutput;
  readonly typeRefs: TypeRefsOutput;
  readonly exports: ExportsOutput;
}

export interface LiveQueryKernel {
  readonly session: RepoSession;
  loadSourceFileScan(): ParsedTsconfigSourceFileScanResult;
  loadStructuralRuntime(): StructuralClaimGraphRuntime;
  loadOutputs(): LiveQueryKernelOutputs;
  loadAnalysisViews(): AnalysisViews;
}
