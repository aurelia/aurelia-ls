export type { DepsOutput } from './deps/schema.js';
export type { ExportsOutput } from './exports/schema.js';
export type { TypeRefsOutput } from './typerefs/schema.js';
export type { SourceAnalysisAnalysisOptions } from './analysis-options.js';
export {
  createCurrentSourceAnalysisAuditAnswer,
  createSourceAnalysisAuditAnswer,
  SOURCE_ANALYSIS_AUDIT_FINDING_KINDS,
} from './audit.js';
export type {
  SourceAnalysisAnswerCard,
  SourceAnalysisAnswerRef,
} from './answer-card.js';
export { createSourceAnalysisAnswerCard } from './answer-card.js';
export type { CreateSourceAnalysisAnswerEnvelopeOptions } from './answer-envelope.js';
export { createSourceAnalysisAnswerEnvelope } from './answer-envelope.js';
export type {
  SourceAnalysisAuditFinding,
  SourceAnalysisAuditFindingKind,
  SourceAnalysisAuditRef,
  SourceAnalysisAuditValue,
} from './audit.js';
export {
  createCurrentSourceAnalysisNavigationEpisode,
  createSourceAnalysisNavigationEpisode,
} from './navigation.js';
export type {
  SourceAnalysisNavigationEpisode,
  SourceAnalysisNavigationRef,
  SourceAnalysisNavigationValue,
} from './navigation.js';
export {
  createCurrentSourceAnalysisRouteWitnessAnswer,
  createSourceAnalysisRouteWitnessAnswer,
} from './route-witness.js';
export type {
  SourceAnalysisRouteWitnessRef,
  SourceAnalysisRouteWitnessValue,
} from './route-witness.js';
export type {
  SourceAnalysisClaimEdge,
  SourceAnalysisClaimEdgeKind,
  SourceAnalysisClaimHome,
  SourceAnalysisClaimHomeId,
  SourceAnalysisClaimHomeKind,
  SourceAnalysisClaimId,
  SourceAnalysisClaimLattice,
  SourceAnalysisClaimNode,
  SourceAnalysisClaimNodeKind,
  SourceAnalysisClaimSupport,
} from './claim-lattice.js';
export {
  SOURCE_ANALYSIS_CLAIM_EDGE_KINDS,
  SOURCE_ANALYSIS_CLAIM_HOME_KINDS,
  SOURCE_ANALYSIS_CLAIM_LATTICE_SCHEMA_VERSION,
  SOURCE_ANALYSIS_CLAIM_NODE_KINDS,
} from './claim-lattice.js';
export type {
  SourceAnalysisClosureBasis,
  SourceAnalysisClosureBasisKind,
  SourceAnalysisContinuation,
  SourceAnalysisContinuationKind,
  SourceAnalysisIssue,
  SourceAnalysisIssueOrigin,
  SourceAnalysisIssueSeverity,
  SourceAnalysisOutcome,
  SourceAnalysisOutcomeTag,
  SourceAnalysisTrustKind,
  SourceAnalysisTrustProfile,
} from './outcome-algebra.js';
export {
  SOURCE_ANALYSIS_CLOSURE_BASIS_KINDS,
  SOURCE_ANALYSIS_CONTINUATION_KINDS,
  SOURCE_ANALYSIS_ISSUE_ORIGINS,
  SOURCE_ANALYSIS_ISSUE_SEVERITIES,
  SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION,
  SOURCE_ANALYSIS_OUTCOME_TAGS,
  SOURCE_ANALYSIS_TRUST_KINDS,
} from './outcome-algebra.js';
export type {
  SourceAnalysisAnswer,
  SourceAnalysisAnswerProvenanceEntry,
  SourceAnalysisAnswerProvenanceEntryKind,
  SourceAnalysisAnswerSlots,
  SourceAnalysisContinuationBasis,
  SourceAnalysisDeltaDescriptor,
  SourceAnalysisFocusKind,
  SourceAnalysisFocusRef,
  SourceAnalysisFreshnessMode,
  SourceAnalysisInquiryEpisode,
  SourceAnalysisPartialityMode,
  SourceAnalysisProvenanceEntryKind,
  SourceAnalysisQuery,
  SourceAnalysisQuerySlotId,
  SourceAnalysisQuestionRoute,
  SourceAnalysisReadMode,
  SourceAnalysisRegimeAnchor,
  SourceAnalysisWorldFrame,
} from './query-model.js';
export {
  SOURCE_ANALYSIS_FOCUS_KINDS,
  SOURCE_ANALYSIS_FRESHNESS_MODES,
  SOURCE_ANALYSIS_INQUIRY_EPISODES,
  SOURCE_ANALYSIS_PARTIALITY_MODES,
  SOURCE_ANALYSIS_PROVENANCE_ENTRY_KINDS,
  SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION,
  SOURCE_ANALYSIS_QUERY_SLOT_IDS,
  SOURCE_ANALYSIS_QUESTION_ROUTES,
  SOURCE_ANALYSIS_READ_MODES,
  SOURCE_ANALYSIS_REGIME_ANCHORS,
} from './query-model.js';
export type {
  SourceAnalysisLocationPoint,
  SourceAnalysisLocationRange,
  SourceAnalysisObservationProvenance,
  SourceAnalysisProvenanceKind,
  SourceAnalysisSubstrateAttributes,
  SourceAnalysisSubstrateEdge,
  SourceAnalysisSubstrateEdgeId,
  SourceAnalysisSubstrateEdgeKind,
  SourceAnalysisSubstrateFact,
  SourceAnalysisSubstrateGraph,
  SourceAnalysisSubstrateNode,
  SourceAnalysisSubstrateNodeId,
  SourceAnalysisSubstrateNodeKind,
} from './substrate.js';
export {
  SOURCE_ANALYSIS_PROVENANCE_KINDS,
  SOURCE_ANALYSIS_SUBSTRATE_EDGE_KINDS,
  SOURCE_ANALYSIS_SUBSTRATE_NODE_KINDS,
  SOURCE_ANALYSIS_SUBSTRATE_SCHEMA_VERSION,
} from './substrate.js';
export type {
  SourceAnalysisPackageFileReachability,
  SourceAnalysisPackageReachability,
  SourceAnalysisPackageRouteClass,
  SourceAnalysisPackageRouteEdge,
  SourceAnalysisPackageRouteKind,
  SourceAnalysisPackageRouteStep,
  SourceAnalysisPackageRouteWitness,
  SourceAnalysisPackageRoot,
  SourceAnalysisPackageRootKind,
} from './reachability.js';
export {
  createSourceAnalysisPackageReachability,
  getSourceAnalysisPackageRouteWitnesses,
  SOURCE_ANALYSIS_PACKAGE_ROUTE_CLASSES,
  SOURCE_ANALYSIS_PACKAGE_ROUTE_KINDS,
  SOURCE_ANALYSIS_PACKAGE_ROOT_KINDS,
} from './reachability.js';
export type {
  SourceAnalysisCoordinationFunctionSurface,
  SourceAnalysisCoordinationInterfaceSurface,
  SourceAnalysisFileCoordinationSurface,
  SourceAnalysisPackageCoordinationSurface,
} from './coordination-surface.js';
export { createSourceAnalysisPackageCoordinationSurface } from './coordination-surface.js';

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
  QueryRouteWitnessArgs,
  QueryRouteWitnessResult,
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
