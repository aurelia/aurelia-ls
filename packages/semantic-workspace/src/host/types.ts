import type { DocumentUri } from "@aurelia-ls/compiler/program/primitives.js";
import type {
  SourcePosition,
  WorkspaceCodeAction,
  WorkspaceCodeActionRequest,
  WorkspaceCompletionItem,
  WorkspaceDiagnostic,
  WorkspaceHover,
  WorkspaceLocation,
  WorkspaceRefactorResult,
  WorkspaceRenameRequest,
  WorkspaceSnapshot,
  WorkspaceToken,
} from "../types.js";

export const SEMANTIC_AUTHORITY_SCHEMA_VERSION = "v1alpha1" as const;

export type SemanticAuthorityPolicyProfile =
  | "ai.app"
  | "ai.product"
  | "tooling"
  | "testing";

export type SemanticAuthorityConfidence =
  | "exact"
  | "high"
  | "partial"
  | "low"
  | "unknown";

export type SemanticAuthorityUnknownReason =
  | "non-symbol-position"
  | "unresolved-authority";

export interface SemanticAuthorityGap {
  readonly what: string;
  readonly why: string;
  readonly howToClose: string | null;
}

export interface SemanticAuthorityEpistemic {
  readonly confidence: SemanticAuthorityConfidence;
  readonly gaps: readonly SemanticAuthorityGap[];
  readonly provenanceRefs: readonly string[];
  readonly unknownReason?: SemanticAuthorityUnknownReason;
}

export interface HostCacheMeta {
  readonly hit: boolean;
  readonly tier: "warm" | "cold";
}

export interface HostInvalidationMeta {
  readonly kind: "none" | "local" | "project";
  readonly count: number;
}

export interface HostMemoryMeta {
  readonly rssMb: number;
  readonly heapUsedMb: number;
  readonly heapTotalMb: number;
}

export interface SemanticAuthorityError {
  readonly code: string;
  readonly message: string;
  readonly retryable?: boolean;
}

export interface SemanticAuthorityEnvelopeMeta {
  readonly sessionId?: string;
  readonly commandId: string;
  readonly workspaceFingerprint?: string;
  readonly durationMs: number;
  readonly memory: HostMemoryMeta;
  readonly cache: HostCacheMeta;
  readonly invalidation: HostInvalidationMeta;
  readonly touchedDocumentCount: number;
  readonly replayRecordId?: string;
}

export type SemanticAuthorityCommandStatus = "ok" | "degraded" | "error";

export interface SemanticAuthorityEnvelope<TResult> {
  readonly schemaVersion: typeof SEMANTIC_AUTHORITY_SCHEMA_VERSION;
  readonly command: SemanticAuthorityCommandName;
  readonly status: SemanticAuthorityCommandStatus;
  readonly result: TResult;
  readonly policy: {
    readonly profile: SemanticAuthorityPolicyProfile;
  };
  readonly epistemic: SemanticAuthorityEpistemic;
  readonly meta: SemanticAuthorityEnvelopeMeta;
  readonly errors: readonly SemanticAuthorityError[];
}

export interface SessionOpenArgs {
  readonly sessionId?: string;
  /** Absolute path to the project root. Required — no CWD fallback. */
  readonly workspaceRoot: string;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
  readonly policy?: {
    readonly profile?: SemanticAuthorityPolicyProfile;
  };
}

export interface SessionRefreshArgs {
  readonly sessionId: string;
  readonly force?: boolean;
}

export interface SessionCloseArgs {
  readonly sessionId: string;
}

export interface SessionStatusArgs {
  readonly sessionId?: string;
}

export interface SessionStatusEntry {
  readonly sessionId: string;
  readonly profile: SemanticAuthorityPolicyProfile;
  readonly workspaceRoot: string;
  readonly tsconfigPath: string | null;
  readonly configFileName: string | null;
  readonly workspaceFingerprint: string | null;
  readonly openDocumentCount: number;
}

export interface SessionOpenResult {
  readonly sessionId: string;
  readonly workspaceRoot: string;
  readonly workspaceFingerprint: string | null;
  readonly profile: SemanticAuthorityPolicyProfile;
  readonly openDocumentCount: number;
}

export interface SessionRefreshResult {
  readonly sessionId: string;
  readonly refreshed: boolean;
  readonly workspaceFingerprint: string | null;
}

export interface SessionCloseResult {
  readonly sessionId: string;
  readonly closed: boolean;
}

export interface SessionStatusResult {
  readonly sessions: readonly SessionStatusEntry[];
}

export interface HostTextEdit {
  readonly start: number;
  readonly end: number;
  readonly newText: string;
}

export interface DocOpenArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
  readonly text?: string;
  readonly version?: number;
}

export interface DocUpdateArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
  readonly text: string;
  readonly version?: number;
}

export interface DocApplyEditsArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
  readonly edits: readonly HostTextEdit[];
  readonly version?: number;
}

export interface DocCloseArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
}

export interface DocMutationResult {
  readonly sessionId: string;
  readonly uri: DocumentUri;
  readonly openDocumentCount: number;
  readonly version: number | null;
  readonly opened?: boolean;
  readonly appliedEdits?: number;
}

export interface QuerySnapshotArgs {
  readonly sessionId: string;
}

export interface QueryCompletionsArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
  readonly position: SourcePosition;
}

export interface QueryHoverArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
  readonly position: SourcePosition;
}

export interface QueryDiagnosticsArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
}

export type QueryNavigationMode = "definition" | "references";

export interface QueryNavigationArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
  readonly position: SourcePosition;
  readonly mode: QueryNavigationMode;
}

export interface QuerySemanticTokensArgs {
  readonly sessionId: string;
  readonly uri: DocumentUri | string;
}

export interface QueryCompletionsResult {
  readonly items: readonly WorkspaceCompletionItem[];
  readonly isIncomplete: boolean;
}

export interface QueryHoverResult {
  readonly hover: WorkspaceHover | null;
}

export interface SerializableWorkspaceDiagnostics {
  readonly bySurface: Readonly<Record<string, readonly WorkspaceDiagnostic[]>>;
  readonly suppressed: readonly WorkspaceDiagnostic[];
}

export interface QueryNavigationResult {
  readonly mode: QueryNavigationMode;
  readonly locations: readonly WorkspaceLocation[];
}

export interface QuerySemanticTokensResult {
  readonly tokens: readonly WorkspaceToken[];
}

export interface RefactorRenameArgs {
  readonly sessionId: string;
  readonly request: WorkspaceRenameRequest;
}

export interface RefactorCodeActionsArgs {
  readonly sessionId: string;
  readonly request: WorkspaceCodeActionRequest;
}

export interface RefactorCodeActionsResult {
  readonly actions: readonly WorkspaceCodeAction[];
}

export type SessionCommandName =
  | "session.open"
  | "session.refresh"
  | "session.close"
  | "session.status";

export type DocCommandName =
  | "doc.open"
  | "doc.update"
  | "doc.applyEdits"
  | "doc.close";

export type QueryCommandName =
  | "query.snapshot"
  | "query.completions"
  | "query.hover"
  | "query.diagnostics"
  | "query.navigation"
  | "query.semanticTokens";

export type RefactorCommandName =
  | "refactor.rename"
  | "refactor.codeActions";

export type VerifyCommandName =
  | "verify.determinism"
  | "verify.parity"
  | "verify.gapConservation";

export type ReplayCommandName =
  | "replay.exportRun"
  | "replay.run";

export type PressureCommandName = "pressure.runScenario";

export type SemanticAuthorityCommandName =
  | SessionCommandName
  | DocCommandName
  | QueryCommandName
  | RefactorCommandName
  | VerifyCommandName
  | ReplayCommandName
  | PressureCommandName;

export type ReplayableCommandName = Exclude<
  SemanticAuthorityCommandName,
  VerifyCommandName | ReplayCommandName | PressureCommandName
>;

export interface ReplayableCommandInvocation {
  readonly command: ReplayableCommandName;
  readonly args: unknown;
}

export interface VerifyDeterminismArgs {
  readonly sessionId: string;
  readonly invocation: ReplayableCommandInvocation;
  readonly runs?: number;
}

export interface VerifyDeterminismResult {
  readonly deterministic: boolean;
  readonly runs: number;
  readonly baselineHash: string | null;
  readonly observedHashes: readonly string[];
  readonly divergenceIndexes: readonly number[];
}

export interface VerifyParityArgs {
  readonly sessionId: string;
  readonly invocation: ReplayableCommandInvocation;
}

export interface VerifyParityResult {
  readonly parity: boolean;
  readonly hostHash: string | null;
  readonly adapterHash: string | null;
  readonly adapterAvailable: boolean;
  readonly adapterName: string | null;
}

export interface VerifyGapConservationArgs {
  readonly sessionId: string;
  readonly envelope?: SemanticAuthorityEnvelope<unknown>;
  readonly invocation?: ReplayableCommandInvocation;
}

export interface VerifyGapConservationResult {
  readonly conserved: boolean;
  readonly examinedGapCount: number;
  readonly missingFields: readonly string[];
  readonly statusWasDegraded: boolean;
}

export interface HostReplayRecord {
  readonly recordId: string;
  readonly runId: string;
  readonly sessionId: string;
  readonly commandId: string;
  readonly command: ReplayableCommandName;
  readonly invocation: ReplayableCommandInvocation;
  readonly inputHash: string;
  readonly workspaceFingerprint: string | null;
  readonly resultHash: string;
  readonly status: SemanticAuthorityCommandStatus;
  readonly durationMs: number;
  readonly recordedAtUtc: string;
}

export interface HostReplayRunExport {
  readonly runId: string;
  readonly sessionId: string;
  readonly exportedAtUtc: string;
  readonly records: readonly HostReplayRecord[];
}

export interface ReplayExportArgs {
  readonly sessionId: string;
  readonly runId?: string;
}

export interface ReplayRunArgs {
  readonly sessionId: string;
  readonly run: HostReplayRunExport;
  readonly stopOnFirstDivergence?: boolean;
}

export interface ReplayRunDivergence {
  readonly index: number;
  readonly command: ReplayableCommandName;
  readonly expectedHash: string;
  readonly observedHash: string;
}

export interface ReplayRunResult {
  readonly runId: string;
  readonly totalRecords: number;
  readonly replayedRecords: number;
  readonly divergenceCount: number;
  readonly divergences: readonly ReplayRunDivergence[];
}

export type PressureScenarioCommandName = Exclude<
  ReplayableCommandName,
  SessionCommandName
>;

export interface PressureScenarioStep {
  readonly label?: string;
  readonly command: PressureScenarioCommandName;
  readonly args: unknown;
  readonly expectStatus?: SemanticAuthorityCommandStatus;
}

export type PressureSurfaceId =
  | "diagnostics"
  | "completions"
  | "hover"
  | "navigation"
  | "rename"
  | "semanticTokens";

export interface PressureSweepTraversalOptions {
  readonly includeExtensions?: readonly string[];
  readonly maxFiles?: number;
}

export interface PressureSweepSamplingOptions {
  readonly everyN?: number;
  readonly maxPositionsPerFile?: number;
  readonly renameMaxPositionsPerFile?: number;
}

export interface PressureSweepOutputOptions {
  readonly includeObservations?: boolean;
  readonly maxObservations?: number;
}

export interface PressureSweepConfig {
  readonly corpusId?: string;
  readonly mutatedCorpus?: boolean;
  readonly surfaces?: readonly PressureSurfaceId[];
  readonly traversal?: PressureSweepTraversalOptions;
  readonly sampling?: PressureSweepSamplingOptions;
  readonly output?: PressureSweepOutputOptions;
}

export interface PressureRunScenarioArgs {
  readonly sessionId: string;
  readonly steps?: readonly PressureScenarioStep[];
  readonly stopOnFailure?: boolean;
  readonly sweep?: PressureSweepConfig;
}

export interface PressureScenarioStepResult {
  readonly index: number;
  readonly label: string | null;
  readonly command: PressureScenarioCommandName;
  readonly status: SemanticAuthorityCommandStatus;
  readonly commandId: string;
  readonly durationMs: number;
  readonly expectationMatched: boolean;
  readonly expectedStatus?: SemanticAuthorityCommandStatus;
}

export interface PressureRunScenarioResult {
  readonly runId: string;
  readonly stoppedEarly: boolean;
  readonly steps: readonly PressureScenarioStepResult[];
  readonly sweep?: PressureSweepResult;
}

export interface PressureObservationAnchor {
  readonly uri: DocumentUri;
  readonly offset?: number;
  readonly line?: number;
  readonly character?: number;
}

export interface PressureObservationInputSummary {
  readonly uri: DocumentUri;
  readonly position?: SourcePosition;
  readonly mode?: QueryNavigationMode;
}

export interface PressureObservationEpistemicSummary {
  readonly confidence: SemanticAuthorityConfidence;
  readonly gapCount: number;
  readonly provenanceRefCount: number;
}

export interface PressureObservationReplayHandle {
  readonly sessionId: string;
  readonly runId: string;
  readonly commandId: string;
}

export interface PressureSweepObservation {
  readonly corpusId: string;
  readonly surface: PressureSurfaceId;
  readonly command: PressureScenarioCommandName;
  readonly anchor: PressureObservationAnchor;
  readonly input: PressureObservationInputSummary;
  readonly status: SemanticAuthorityCommandStatus;
  readonly epistemic: PressureObservationEpistemicSummary;
  readonly anomalyTags: readonly string[];
  readonly replay: PressureObservationReplayHandle;
}

export interface PressureSurfaceSummary {
  readonly surface: PressureSurfaceId;
  readonly observations: number;
  readonly ok: number;
  readonly degraded: number;
  readonly error: number;
  readonly anomalies: number;
}

export interface PressureSweepTraversalSummary {
  readonly workspaceRoot: string;
  readonly crawledFiles: number;
  readonly sampledFiles: number;
  readonly includeExtensions: readonly string[];
  readonly maxFiles: number | null;
}

export interface PressureSweepSamplingSummary {
  readonly everyN: number;
  readonly maxPositionsPerFile: number;
  readonly renameMaxPositionsPerFile: number;
}

export interface PressureSweepResult {
  readonly corpusId: string;
  readonly mutatedCorpus: boolean;
  readonly traversal: PressureSweepTraversalSummary;
  readonly sampling: PressureSweepSamplingSummary;
  readonly surfaces: readonly PressureSurfaceSummary[];
  readonly observationCount: number;
  readonly anomalyCount: number;
  readonly observationsTruncated: boolean;
  readonly observations: readonly PressureSweepObservation[];
}

export interface SemanticAuthorityCommandArgsMap {
  "session.open": SessionOpenArgs;
  "session.refresh": SessionRefreshArgs;
  "session.close": SessionCloseArgs;
  "session.status": SessionStatusArgs;
  "doc.open": DocOpenArgs;
  "doc.update": DocUpdateArgs;
  "doc.applyEdits": DocApplyEditsArgs;
  "doc.close": DocCloseArgs;
  "query.snapshot": QuerySnapshotArgs;
  "query.completions": QueryCompletionsArgs;
  "query.hover": QueryHoverArgs;
  "query.diagnostics": QueryDiagnosticsArgs;
  "query.navigation": QueryNavigationArgs;
  "query.semanticTokens": QuerySemanticTokensArgs;
  "refactor.rename": RefactorRenameArgs;
  "refactor.codeActions": RefactorCodeActionsArgs;
  "verify.determinism": VerifyDeterminismArgs;
  "verify.parity": VerifyParityArgs;
  "verify.gapConservation": VerifyGapConservationArgs;
  "replay.exportRun": ReplayExportArgs;
  "replay.run": ReplayRunArgs;
  "pressure.runScenario": PressureRunScenarioArgs;
}

export interface SemanticAuthorityCommandResultMap {
  "session.open": SessionOpenResult;
  "session.refresh": SessionRefreshResult;
  "session.close": SessionCloseResult;
  "session.status": SessionStatusResult;
  "doc.open": DocMutationResult;
  "doc.update": DocMutationResult;
  "doc.applyEdits": DocMutationResult;
  "doc.close": DocMutationResult;
  "query.snapshot": WorkspaceSnapshot;
  "query.completions": QueryCompletionsResult;
  "query.hover": QueryHoverResult;
  "query.diagnostics": SerializableWorkspaceDiagnostics;
  "query.navigation": QueryNavigationResult;
  "query.semanticTokens": QuerySemanticTokensResult;
  "refactor.rename": WorkspaceRefactorResult;
  "refactor.codeActions": RefactorCodeActionsResult;
  "verify.determinism": VerifyDeterminismResult;
  "verify.parity": VerifyParityResult;
  "verify.gapConservation": VerifyGapConservationResult;
  "replay.exportRun": HostReplayRunExport | null;
  "replay.run": ReplayRunResult;
  "pressure.runScenario": PressureRunScenarioResult;
}

export type SemanticAuthorityCommandArgs<TCommand extends SemanticAuthorityCommandName> =
  SemanticAuthorityCommandArgsMap[TCommand];

export type SemanticAuthorityCommandResult<TCommand extends SemanticAuthorityCommandName> =
  SemanticAuthorityCommandResultMap[TCommand];

export interface SemanticAuthorityCommandInvocation<TCommand extends SemanticAuthorityCommandName = SemanticAuthorityCommandName> {
  readonly command: TCommand;
  readonly args: SemanticAuthorityCommandArgs<TCommand>;
}

export interface SemanticAuthorityParityNormalizationInput {
  readonly invocation: ReplayableCommandInvocation;
  readonly hostResult: unknown;
  readonly adapterResult: unknown;
}

export interface SemanticAuthorityParityNormalizedResult {
  readonly host: unknown;
  readonly adapter: unknown;
}

export interface SemanticAuthorityParityAdapter {
  readonly name?: string;
  execute(invocation: ReplayableCommandInvocation): Promise<unknown> | unknown;
  normalize?(
    input: SemanticAuthorityParityNormalizationInput,
  ): SemanticAuthorityParityNormalizedResult | null | undefined;
}
