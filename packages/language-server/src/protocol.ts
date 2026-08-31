import { createHash } from "node:crypto";
import type {
  ApplicationFileRole,
  SemanticAttributeInterpretationExplanation,
  SemanticAttributeInterpretationExplanationContender,
  SemanticBindingDataFlowRow,
  SemanticBindingDataFlowValueConverterWritebackStageRow,
  SemanticBindingUncertaintyExplanation,
  SemanticBindingUncertaintyExplanationContender,
  FrameworkRegistrationCapability,
  SemanticAnalysisLimitationRow,
  SemanticAnalysisLimitationsResult,
  SemanticAppQuery,
  SemanticFrameworkCapabilityExplanation,
  SemanticFrameworkCapabilityExplanationContender,
  SemanticRuntimeContinuationRow,
  SemanticProjectFindingEffectivePolicy,
  SemanticProjectAnalysisCount,
  SemanticResourceDeclarationMode,
  SemanticProjectCandidateSummary,
  SemanticResourceInventoryCatalogOwnerKind,
  SemanticResourceInventoryCompleteness,
  SemanticResourceInventoryKind,
  SemanticResourceInventoryLocalityKind,
  SemanticResourceInventoryMetadataState,
  SemanticResourceInventoryOrigin,
  SemanticResourceAvailabilityExplanation,
  SemanticResourceAvailabilityExplanationContender,
  SemanticResourceNavigationUnavailableReason,
  SemanticRuntimeAnswer,
  SourceFileRole,
  SemanticTemplateResourceAvailabilityState,
  SemanticTemplateResourceAvailabilityRow,
  SemanticTemplateReferenceCandidateReason,
} from "@aurelia-ls/semantic-runtime";
import type { Position, Range, WorkspaceEdit } from "vscode-languageserver/node";

export const AureliaProtocolRequest = {
  SupportSnapshot: "aurelia/supportSnapshot",
  SourceOwnership: "aurelia/sourceOwnership",
  AnalysisLimitations: "aurelia/analysisLimitations",
  FrameworkCapabilityExplanation: "aurelia/frameworkCapabilityExplanation",
  BindingUncertaintyExplanation: "aurelia/bindingUncertaintyExplanation",
  AttributeInterpretationExplanation: "aurelia/attributeInterpretationExplanation",
  ResourceInventory: "aurelia/resourceInventory",
  TemplateResourceAvailability: "aurelia/templateResourceAvailability",
  ResourceAvailabilityExplanation: "aurelia/resourceAvailabilityExplanation",
  RelatedFiles: "aurelia/getRelatedFiles",
  WorkspaceStatus: "aurelia/workspaceStatus",
  RenameFromTypeScript: "aurelia/renameFromTs",
} as const;

export const AURELIA_SUPPORT_SNAPSHOT_SCHEMA = "aurelia-support-snapshot/1" as const;

export interface AureliaSupportSnapshotParams {
  /** Canonical base64url encoding of 32 random bytes. The salt is used locally and is never echoed. */
  readonly identitySalt: string;
}

export type AureliaSupportRequestOutcome =
  | "succeeded"
  | "client-cancelled"
  | "stale"
  | "failed";

export interface AureliaSupportRequestStaleFacts {
  readonly origin: "managed-operation" | "analysis-currentness" | "request-generation";
  readonly currentnessKind: string | null;
  readonly reason: string | null;
  readonly answerLeaseKind: string | null;
}

export interface AureliaSupportRequestAggregate {
  readonly feature: string;
  readonly started: number;
  readonly succeeded: number;
  readonly clientCancelled: number;
  readonly stale: number;
  readonly failed: number;
  readonly clientCancelledWithUnderlyingStale: number;
  readonly totalDurationMilliseconds: number;
  readonly maximumDurationMilliseconds: number;
}

export interface AureliaSupportRequestTerminalEvent {
  readonly sequence: number;
  readonly feature: string;
  readonly outcome: AureliaSupportRequestOutcome;
  readonly durationMilliseconds: number;
  /** Per-report HMAC id using the client convention `document:<20 lowercase hex>`. */
  readonly documentId: string | null;
  readonly clientCancellationRequested: boolean;
  readonly underlyingStale: boolean;
  readonly staleFacts: AureliaSupportRequestStaleFacts | null;
}

export interface AureliaSupportInFlightRequest {
  readonly sequence: number;
  readonly feature: string;
  readonly ageMilliseconds: number;
  readonly documentId: string | null;
}

export interface AureliaSupportRequestSnapshot {
  readonly aggregateCount: number;
  readonly aggregates: readonly AureliaSupportRequestAggregate[];
  readonly omittedAggregateCount: number;
  readonly recentTerminalCount: number;
  readonly recentTerminals: readonly AureliaSupportRequestTerminalEvent[];
  readonly omittedRecentTerminalCount: number;
  readonly inFlightCount: number;
  readonly oldestInFlightAgeMilliseconds: number | null;
  readonly inFlight: readonly AureliaSupportInFlightRequest[];
  readonly omittedInFlightCount: number;
}

export interface AureliaSupportLifecycleSnapshot {
  readonly registered: boolean;
  readonly shuttingDown: boolean;
  readonly trackedTaskCount: number;
  readonly trackedOpenDocumentCount: number;
  readonly pendingAnalysisRefresh: boolean;
  readonly pendingAnalysisChangeKind: "source-text" | "topology" | null;
  readonly pendingChangedSourceCount: number;
  readonly counters: {
    readonly initialize: number;
    readonly shutdown: number;
    readonly documentOpen: number;
    /** TextDocuments synchronization events; includes didOpen's initial synchronized content. */
    readonly documentSynchronizations: number;
    readonly documentClose: number;
    readonly watchedFileBatches: number;
    readonly topologyInvalidations: number;
    readonly topologyInvalidatedFileCount: number;
    readonly sourceTextInvalidations: number;
    readonly sourceTextInvalidatedFileCount: number;
    readonly configurationInvalidations: number;
    readonly configurationInvalidatedFileCount: number;
    readonly requestCurrentnessRefreshes: number;
    readonly analysisRefreshSchedules: number;
    readonly analysisRefreshCoalesces: number;
    readonly analysisWavesStarted: number;
    readonly analysisWavesPublished: number;
    readonly analysisWaveStaleRetries: number;
    readonly backgroundTaskFailures: number;
    readonly diagnosticRefreshRequests: number;
    readonly inlayHintRefreshRequests: number;
    readonly semanticTokenRefreshRequests: number;
  };
}

export interface AureliaSupportSemanticSessionSnapshot {
  readonly workspaceConfigured: boolean;
  readonly workspaceGeneration: number;
  readonly requestEpoch: number;
  readonly diagnosticCacheEntries: number;
  readonly retiringWorkspaceCount: number;
  readonly retirementFailureCount: number;
  readonly closing: boolean;
  readonly disposalStarted: boolean;
}

export interface AureliaSupportMemorySnapshot {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly heapLimitBytes: number;
  readonly externalBytes: number;
  readonly arrayBuffersBytes: number;
  readonly rssOtherBytes: number;
  readonly v8HeapPhysicalBytes: number;
  readonly v8HeapAvailableBytes: number;
  readonly v8MallocedMemoryBytes: number;
  readonly v8PeakMallocedMemoryBytes: number;
  readonly v8ExternalMemoryBytes: number;
  readonly v8NativeContextCount: number;
  readonly v8DetachedContextCount: number;
}

export interface AureliaSupportTypeSystemCacheSnapshot {
  readonly entries: number;
  readonly entryLimit: number;
  readonly sourceTextCharacters: number;
  readonly sourceTextCharacterLimit: number;
  readonly distinctCanonicalPaths: number;
  readonly duplicateCanonicalPathEntries: number;
  readonly nodeModuleEntries: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationEntries: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibraryEntries: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalDeclarationEntries: number;
  readonly externalDeclarationSourceTextCharacters: number;
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly writeSourceTextCharacters: number;
  readonly supersededRevisionEvictions: number;
  readonly capacityEvictions: number;
  readonly bypasses: number;
  readonly clearOperations: number;
  readonly clearedEntries: number;
  readonly clearedSourceTextCharacters: number;
  readonly dominantSourceTextBucket: string;
  readonly suggestedClearPolicy: string;
  readonly suggestedClearSourceTextCharacters: number;
}

export interface AureliaSupportCountRow {
  readonly key: string;
  readonly count: number;
}

export interface AureliaSupportKernelSnapshot {
  readonly totalRecords: number;
  readonly addresses: number;
  readonly identities: number;
  readonly evidence: number;
  readonly provenance: number;
  readonly claims: number;
  readonly openSeams: number;
  readonly products: number;
  readonly materializations: number;
  readonly productDetails: number;
  readonly hotDetails: number;
  readonly handleCharacters: number;
  readonly recordKinds: readonly AureliaSupportCountRow[];
  readonly productKinds: readonly AureliaSupportCountRow[];
  readonly productDetailKinds: readonly AureliaSupportCountRow[];
  readonly hotDetailKinds: readonly AureliaSupportCountRow[];
  readonly openSeamKinds: readonly AureliaSupportCountRow[];
}

export interface AureliaSupportQueryClaimSnapshot {
  readonly profile: string;
  readonly retentionKind: string;
  readonly answerLocalKernelPolicy: string;
  readonly createdRecords: number;
  readonly retainedRecords: number;
  readonly rootRecords: number;
  readonly childRecords: number;
  readonly maxDepth: number;
  readonly pending: number;
  readonly answered: number;
  readonly failed: number;
  readonly disposed: number;
  readonly projectionOnly: number;
  readonly queryTypeProjection: number;
  readonly staticCatalog: number;
  readonly approximatePayloadBytes: number;
  readonly retainedAnswerBytes: number;
  readonly retainedAnswerValues: number;
  readonly retainedAnswerHits: number;
  readonly retainedRecordLimit: number | null;
  readonly budgetDisposedRecords: number;
  readonly disposedKernelRecords: number;
  readonly disposedProductDetails: number;
  readonly disposedHotDetails: number;
  readonly disposedKernelHandleCharacters: number;
  readonly clearedTypeSystemDependencySourceFiles: number;
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly netKernelRecordDelta: number;
  readonly netProductDetailDelta: number;
  readonly netHotDetailDelta: number;
  readonly netKernelHandleCharacterDelta: number;
}

export interface AureliaSupportPhaseSnapshot {
  readonly name: string;
  readonly milliseconds: number;
  readonly itemCount: number | null;
}

export interface AureliaSupportCachedAppSnapshot {
  /** Per-report HMAC id using the same kind/NUL/value convention as client support identities. */
  readonly projectId: string;
  readonly analysisDepth: string;
  readonly templateAnalysisBreadth: string;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFileCount: number;
  readonly authoringTemplateLimit: number | null;
  readonly profile: {
    readonly inquiryProfile: string;
    readonly totalMilliseconds: number;
    readonly phaseCount: number;
    readonly topPhases: readonly AureliaSupportPhaseSnapshot[];
    readonly typeSystemAcquisitionKind: string;
    readonly typeSystemAcquisitionMilliseconds: number;
    readonly typeSystemConstructionMilliseconds: number;
    readonly programSourceFileCount: number;
    readonly programProjectSourceFileCount: number;
    readonly programNodeModuleSourceFileCount: number;
    readonly programDeclarationSourceFileCount: number;
    readonly programDefaultLibrarySourceFileCount: number;
    readonly programSourceTextCharacters: number;
  };
  readonly queryClaims: AureliaSupportQueryClaimSnapshot;
}

export type AureliaSupportAnalysisCacheSnapshot =
  | {
      readonly status: "available";
      readonly cachedAppCount: number;
      readonly typeSystemProjectCount: number;
      readonly cachedApps: readonly AureliaSupportCachedAppSnapshot[];
      readonly omittedCachedAppCount: number;
      readonly runtimeQueryClaims: readonly AureliaSupportQueryClaimSnapshot[];
      readonly workspaceKernel: AureliaSupportKernelSnapshot;
    }
  | { readonly status: "unavailable" };

export interface AureliaSupportSnapshotResponse {
  readonly schemaVersion: typeof AURELIA_SUPPORT_SNAPSHOT_SCHEMA;
  readonly capturedAt: string;
  readonly process: {
    readonly uptimeMilliseconds: number;
    readonly nodeVersion: string;
    readonly platform: string;
    readonly architecture: string;
    readonly memory: AureliaSupportMemorySnapshot;
    readonly typeSystemDependencyCache: AureliaSupportTypeSystemCacheSnapshot;
  };
  readonly requests: AureliaSupportRequestSnapshot;
  readonly lifecycle: AureliaSupportLifecycleSnapshot;
  readonly semanticSession: AureliaSupportSemanticSessionSnapshot;
  readonly analysisCache: AureliaSupportAnalysisCacheSnapshot;
  readonly bounds: {
    readonly maximumFeatureAggregates: number;
    readonly maximumRecentTerminals: number;
    readonly maximumInFlightRows: number;
    readonly maximumCachedApps: number;
    readonly maximumBreakdownRows: number;
    readonly maximumSerializedBytes: number;
  };
}

/** Client-owned commands surfaced by protocol features. */
export const AureliaProtocolCommand = {
  ExplainFrameworkCapability: "aurelia.explainFrameworkCapability",
  ExplainBindingUncertainty: "aurelia.explainBindingUncertainty",
  ExplainAttributeInterpretation: "aurelia.explainAttributeInterpretation",
  ExplainResourceAvailability: "aurelia.explainResourceAvailability",
} as const;

export const AureliaProtocolNotification = {
  AnalysisChanged: "aurelia/analysisChanged",
} as const;

export const AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA = "aurelia.template-code-action-resolve/1" as const;
export const AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA = "aurelia.workspace-edit-transaction/1" as const;

/** Exact source snapshot that must still be current immediately before a client returns an edit for application. */
export interface AureliaWorkspaceEditTransactionDocument {
  readonly uri: string;
  readonly version: number | null;
  readonly contentRevision: string;
  /** Canonical real path when the source exists on the host filesystem; null is allowed only for versioned buffers. */
  readonly physicalPath: string | null;
}

/** Client-verifiable all-or-nothing snapshot for one semantic workspace edit. */
export interface AureliaWorkspaceEditTransaction {
  readonly schema: typeof AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA;
  readonly documents: readonly AureliaWorkspaceEditTransactionDocument[];
}

/** Collision-resistant UTF-8 text revision shared by the language server and VS Code client. */
export function aureliaWorkspaceEditContentRevision(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export type ProjectConfigurationParserDiagnosticsOwner = "semantic-runtime" | "client";
export type TypeScriptProgramDiagnosticsOwner = "semantic-runtime" | "client";

/** Client-owned workspace topology supplied before the server admits documents or projects. */
export interface AureliaInitializeOptions {
  readonly excludedWorkspaceRootUris: readonly string[];
  /** Existing workspace project roots offered to semantic-runtime discovery as host evidence. */
  readonly projectRootHintUris: readonly string[];
  /** Parser-diagnostic owner; omitted clients retain semantic-runtime's complete configuration rows. */
  readonly projectConfigurationParserDiagnostics?: ProjectConfigurationParserDiagnosticsOwner;
  /** Ordinary Program diagnostic owner; omitted clients retain semantic-runtime's TypeScript rows. */
  readonly typeScriptProgramDiagnostics?: TypeScriptProgramDiagnosticsOwner;
}

export interface WorkspaceNativeProjectConfiguration {
  readonly projectKey: string;
  readonly projectRootUri: string;
  readonly sourceUri: string;
  readonly appliedExcludedSourceRootUris: readonly string[];
  readonly diagnosticCount: number;
}

/** Candidate native configurations whose exact semantic recognition should be projected into workspace status. */
export interface WorkspaceStatusParams {
  readonly nativeProjectConfigurationUris?: readonly string[];
}

/** URI-safe projection of the shared semantic workspace/configuration authority. */
export interface WorkspaceStatusResponse {
  readonly fingerprint: string;
  readonly answer: RuntimeAnswerTransport;
  readonly projectAnalysisCounts: readonly SemanticProjectAnalysisCount[];
  readonly nativeProjectConfigurations: {
    readonly answer: RuntimeAnswerTransport;
    readonly rows: readonly WorkspaceNativeProjectConfiguration[];
  };
}

/** A newer semantic-runtime generation has settled and should replace cached client views. */
export type AnalysisChangedPayload =
  | {
      readonly fingerprint: string;
      readonly changeKind: "source-text";
      /** Exact, deduplicated source documents whose effective text changed in this settled wave. */
      readonly changedSourceUris: readonly string[];
    }
  | {
      readonly fingerprint: string;
      /** Structural/configuration changes remain deliberately workspace-wide. */
      readonly changeKind: "topology";
    };

export type TemplateCodeActionResolveData = {
  readonly schema: typeof AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA;
  readonly textDocument: { readonly uri: string };
  readonly position: { readonly line: number; readonly character: number };
  /** Stable repair-plan identity; exact edit coordinates are deliberately re-planned at resolve time. */
  readonly actionIdentity: string;
  /** Expected late refusal from re-planning; generic clients may safely ignore it. */
  readonly refusal?: TemplateCodeActionResolveRefusal;
};

export const TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS = {
  sourceDocumentUnavailable: "the source document is no longer available",
  semanticPlanNoLongerMatches: "the current source no longer admits this repair",
  semanticPlanAmbiguous: "the current source admits multiple matching repairs",
  editMappingFailed: "the current repair could not be mapped safely",
} as const;

export type TemplateCodeActionResolveRefusalKind = keyof typeof TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS;

export type TemplateCodeActionResolveRefusal<
  Kind extends TemplateCodeActionResolveRefusalKind = TemplateCodeActionResolveRefusalKind,
> = {
  readonly [CurrentKind in Kind]: {
    readonly kind: CurrentKind;
    readonly reason: (typeof TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS)[CurrentKind];
  };
}[Kind];

export function templateCodeActionResolveRefusal(
  kind: TemplateCodeActionResolveRefusalKind,
): TemplateCodeActionResolveRefusal {
  switch (kind) {
    case "sourceDocumentUnavailable":
      return { kind, reason: TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.sourceDocumentUnavailable };
    case "semanticPlanNoLongerMatches":
      return { kind, reason: TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.semanticPlanNoLongerMatches };
    case "semanticPlanAmbiguous":
      return { kind, reason: TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.semanticPlanAmbiguous };
    case "editMappingFailed":
      return { kind, reason: TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.editMappingFailed };
  }
}

export function templateCodeActionResolveRefusalFromData(
  data: unknown,
): TemplateCodeActionResolveRefusal | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const semanticRuntime = (data as Record<string, unknown>)["semanticRuntime"];
  if (semanticRuntime == null || typeof semanticRuntime !== "object" || Array.isArray(semanticRuntime)) return null;
  const resolve = (semanticRuntime as Record<string, unknown>)["resolve"];
  if (resolve == null || typeof resolve !== "object" || Array.isArray(resolve)) return null;
  return templateCodeActionResolveRefusalFromValue((resolve as Record<string, unknown>)["refusal"]);
}

export function templateCodeActionResolveRefusalFromValue(
  refusal: unknown,
): TemplateCodeActionResolveRefusal | null {
  if (refusal == null || typeof refusal !== "object" || Array.isArray(refusal)) return null;
  const kind = (refusal as Record<string, unknown>)["kind"];
  const reason = (refusal as Record<string, unknown>)["reason"];
  switch (kind) {
    case "sourceDocumentUnavailable":
      return reason === TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.sourceDocumentUnavailable
        ? { kind, reason }
        : null;
    case "semanticPlanNoLongerMatches":
      return reason === TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.semanticPlanNoLongerMatches
        ? { kind, reason }
        : null;
    case "semanticPlanAmbiguous":
      return reason === TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.semanticPlanAmbiguous
        ? { kind, reason }
        : null;
    case "editMappingFailed":
      return reason === TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS.editMappingFailed
        ? { kind, reason }
        : null;
    default:
      return null;
  }
}

type RuntimeAnswerTransportFields = Pick<
  SemanticRuntimeAnswer<unknown>,
  "schemaVersion" | "result" | "selection" | "coverage" | "summary" | "analysisBasis" | "page" | "analysisDepth" | "templateAnalysisBreadth" | "continuations"
>;

/** JSON transport form of semantic-runtime's const-enum answer vocabulary. */
export type RuntimeAnswerTransport = Omit<
  RuntimeAnswerTransportFields,
  "result" | "selection" | "coverage"
> & {
  readonly result: `${RuntimeAnswerTransportFields["result"]}`;
  readonly selection: `${RuntimeAnswerTransportFields["selection"]}`;
  readonly coverage: `${RuntimeAnswerTransportFields["coverage"]}`;
};

export type ProtocolWorkspaceEdit = WorkspaceEdit & {
  /** Aurelia extension data ignored safely by generic LSP clients. */
  readonly aureliaWorkspaceEditTransaction?: AureliaWorkspaceEditTransaction;
};
export type ProtocolRange = Range;

/**
 * Exact diagnostic locus handed from a command-only quick fix to the explanation request.
 * The document version is part of the subject: callers must not silently retarget a stale
 * action to newer text or to the editor's current cursor.
 */
export interface FrameworkCapabilityExplanationParams {
  readonly uri: string;
  readonly position: Position;
  readonly range: Range;
  readonly documentVersion: number;
  readonly projectKey: string;
  readonly frameworkCapability: `${FrameworkRegistrationCapability}`;
}

export type FrameworkCapabilityExplanationSourceUnavailableReason =
  | "source-uri-unavailable"
  | "source-text-unavailable"
  | "source-range-unavailable";

/** URI-safe projection of one engine-owned source reference. */
export type FrameworkCapabilityExplanationSourceTarget =
  | {
      readonly state: "available";
      readonly location: {
        readonly uri: string;
        readonly range: Range;
        readonly label: string;
      };
    }
  | { readonly state: "absent" }
  | {
      readonly state: "unavailable";
      readonly reason: FrameworkCapabilityExplanationSourceUnavailableReason;
    };

export type FrameworkCapabilityExplanationFileTarget =
  | { readonly state: "available"; readonly uri: string }
  | { readonly state: "unavailable"; readonly reason: "source-uri-unavailable" };

export type FrameworkCapabilityExplanationAppQuery = Omit<
  SemanticAppQuery,
  "sourceFile" | "cursor" | "observedDependencyLocus"
> & {
  readonly sourceFile?: FrameworkCapabilityExplanationFileTarget | null;
  readonly cursor?: {
    readonly sourceFile: FrameworkCapabilityExplanationFileTarget;
    readonly line: number;
    readonly character: number;
    readonly offset?: number | null;
  } | null;
  readonly observedDependencyLocus?: (
    Omit<NonNullable<SemanticAppQuery["observedDependencyLocus"]>, "sourceFile">
    & { readonly sourceFile?: FrameworkCapabilityExplanationFileTarget }
  ) | null;
};

type SemanticFrameworkCapabilityExplanationSubject =
  SemanticFrameworkCapabilityExplanation["subject"];
type SemanticFrameworkCapabilityExplanationPackageEvidenceRow =
  SemanticFrameworkCapabilityExplanation["evidence"]["package"]["evidence"][number];
type SemanticFrameworkCapabilityExplanationBlocker =
  SemanticFrameworkCapabilityExplanation["evidence"]["blockers"][number];
type SemanticFrameworkCapabilityExplanationNextStep =
  SemanticFrameworkCapabilityExplanation["nextSteps"][number];

export type FrameworkCapabilityExplanationSubject = Omit<
  SemanticFrameworkCapabilityExplanationSubject,
  "source" | "templateSource"
> & {
  readonly source: FrameworkCapabilityExplanationSourceTarget;
  readonly templateSource: FrameworkCapabilityExplanationSourceTarget;
};

export type FrameworkCapabilityExplanation = Omit<
  SemanticFrameworkCapabilityExplanation,
  "subject" | "evidence" | "nextSteps"
> & {
  readonly subject: FrameworkCapabilityExplanationSubject;
  readonly evidence: {
    readonly admission: Omit<
      SemanticFrameworkCapabilityExplanation["evidence"]["admission"],
      "sources"
    > & { readonly sources: readonly FrameworkCapabilityExplanationSourceTarget[] };
    readonly configuration: Omit<
      SemanticFrameworkCapabilityExplanation["evidence"]["configuration"],
      "sources"
    > & { readonly sources: readonly FrameworkCapabilityExplanationSourceTarget[] };
    readonly package: Omit<
      SemanticFrameworkCapabilityExplanation["evidence"]["package"],
      "evidence"
    > & {
      readonly evidence: readonly (Omit<
        SemanticFrameworkCapabilityExplanationPackageEvidenceRow,
        "source" | "handles"
      > & { readonly source: FrameworkCapabilityExplanationSourceTarget })[];
    };
    readonly blockers: readonly (Omit<
      SemanticFrameworkCapabilityExplanationBlocker,
      "sources"
    > & { readonly sources: readonly FrameworkCapabilityExplanationSourceTarget[] })[];
  };
  readonly nextSteps: readonly (Omit<
    SemanticFrameworkCapabilityExplanationNextStep,
    "source" | "targetQuery"
  > & {
    readonly source: FrameworkCapabilityExplanationSourceTarget;
    readonly targetQuery: FrameworkCapabilityExplanationAppQuery | null;
  })[];
};

export type FrameworkCapabilityExplanationContender = Omit<
  SemanticFrameworkCapabilityExplanationContender,
  "subject"
> & { readonly subject: FrameworkCapabilityExplanationSubject };

type SemanticFrameworkCapabilityExplanationContinuationEvidence =
  NonNullable<SemanticRuntimeContinuationRow["evidence"]>;

export type FrameworkCapabilityExplanationContinuation = Omit<
  SemanticRuntimeContinuationRow,
  "targetQuery" | "evidence"
> & {
  readonly targetQuery?: FrameworkCapabilityExplanationAppQuery | null;
  readonly evidence: (Omit<
    SemanticFrameworkCapabilityExplanationContinuationEvidence,
    "sourceFacts"
  > & {
    readonly sourceFacts: readonly (Omit<
      SemanticFrameworkCapabilityExplanationContinuationEvidence["sourceFacts"][number],
      "source"
    > & { readonly source: FrameworkCapabilityExplanationSourceTarget })[];
  }) | null;
};

export type FrameworkCapabilityExplanationAnswerTransport = Omit<
  RuntimeAnswerTransport,
  "continuations"
> & { readonly continuations?: readonly FrameworkCapabilityExplanationContinuation[] };

export const FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS = {
  documentUnavailable: "the source document is no longer available",
  sourceNotAuthored: "the source document is not authored by the current Aurelia workspace",
  invalidFrameworkCapability: "the requested framework capability is not part of the engine vocabulary",
  documentVersionMismatch: "the source document version no longer matches the diagnostic",
  semanticAnswerUnavailable: "the semantic runtime did not answer the explanation query",
  subjectAbsent: "the current source no longer contains that framework capability demand",
  subjectAmbiguous: "the current source contains multiple matching framework capability demands",
  subjectMismatch: "the current explanation does not match the requested diagnostic subject",
  subjectSourceUnavailable: "the current diagnostic subject source could not be mapped safely",
} as const;

export type FrameworkCapabilityExplanationRefusalKind =
  keyof typeof FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS;

export type FrameworkCapabilityExplanationRefusal = {
  readonly [Kind in FrameworkCapabilityExplanationRefusalKind]: {
    readonly kind: Kind;
    readonly reason: (typeof FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS)[Kind];
  };
}[FrameworkCapabilityExplanationRefusalKind];

export function frameworkCapabilityExplanationRefusal(
  kind: FrameworkCapabilityExplanationRefusalKind,
): FrameworkCapabilityExplanationRefusal {
  switch (kind) {
    case "documentUnavailable":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.documentUnavailable };
    case "sourceNotAuthored":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.sourceNotAuthored };
    case "invalidFrameworkCapability":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.invalidFrameworkCapability };
    case "documentVersionMismatch":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.documentVersionMismatch };
    case "semanticAnswerUnavailable":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.semanticAnswerUnavailable };
    case "subjectAbsent":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.subjectAbsent };
    case "subjectAmbiguous":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.subjectAmbiguous };
    case "subjectMismatch":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.subjectMismatch };
    case "subjectSourceUnavailable":
      return { kind, reason: FRAMEWORK_CAPABILITY_EXPLANATION_REFUSAL_REASONS.subjectSourceUnavailable };
  }
}

export type FrameworkCapabilityExplanationResponse = {
  readonly fingerprint: string;
  readonly documentVersion: number | null;
  readonly answer: FrameworkCapabilityExplanationAnswerTransport | null;
  readonly result:
    | {
        readonly status: "explained";
        readonly explanation: FrameworkCapabilityExplanation;
        readonly contenders: readonly FrameworkCapabilityExplanationContender[];
      }
    | {
        readonly status: "refused";
        readonly refusal: FrameworkCapabilityExplanationRefusal;
        readonly contenders: readonly FrameworkCapabilityExplanationContender[];
      };
};

/**
 * Exact binding carrier handed from an invoked command-only quick fix to the
 * explanation request. The cursor may be anywhere inside `range`; the range
 * itself is the engine-authored binding-carrier source that must be re-proved.
 */
export interface BindingUncertaintyExplanationParams {
  readonly uri: string;
  readonly position: Position;
  readonly range: Range;
  readonly documentVersion: number;
  readonly projectKey: string;
}

export type BindingUncertaintyExplanationSourceTarget = FrameworkCapabilityExplanationSourceTarget;
export type BindingUncertaintyExplanationAppQuery = FrameworkCapabilityExplanationAppQuery;

export type BindingUncertaintyExplanationWritebackStage = Omit<
  SemanticBindingDataFlowValueConverterWritebackStageRow,
  "inputTypeSource" | "outputTypeSource" | "source" | "handles"
> & {
  readonly inputTypeSource: BindingUncertaintyExplanationSourceTarget;
  readonly outputTypeSource: BindingUncertaintyExplanationSourceTarget;
  readonly source: BindingUncertaintyExplanationSourceTarget;
};

export type BindingUncertaintyExplanationLane = Omit<
  SemanticBindingDataFlowRow,
  | "sourceAssignmentOccurrenceSource"
  | "sourceAssignmentTargetSource"
  | "valueConverterWritebackStages"
  | "expressionSource"
  | "source"
  | "handles"
> & {
  readonly sourceAssignmentOccurrenceSource: BindingUncertaintyExplanationSourceTarget;
  readonly sourceAssignmentTargetSource: BindingUncertaintyExplanationSourceTarget;
  readonly valueConverterWritebackStages: readonly BindingUncertaintyExplanationWritebackStage[];
  readonly expressionSource: BindingUncertaintyExplanationSourceTarget;
  readonly source: BindingUncertaintyExplanationSourceTarget;
};

type SemanticBindingUncertaintyExplanationSubject =
  SemanticBindingUncertaintyExplanation["subject"];
type SemanticBindingUncertaintyExplanationBlocker =
  SemanticBindingUncertaintyExplanation["evidence"]["blockers"][number];
type SemanticBindingUncertaintyExplanationNextStep =
  SemanticBindingUncertaintyExplanation["nextSteps"][number];

export type BindingUncertaintyExplanationSubject = Omit<
  SemanticBindingUncertaintyExplanationSubject,
  "source" | "expressionSource" | "templateSource"
> & {
  readonly source: BindingUncertaintyExplanationSourceTarget;
  readonly expressionSource: BindingUncertaintyExplanationSourceTarget;
  readonly templateSource: BindingUncertaintyExplanationSourceTarget;
};

export type BindingUncertaintyExplanation = Omit<
  SemanticBindingUncertaintyExplanation,
  "subject" | "evidence" | "nextSteps"
> & {
  readonly subject: BindingUncertaintyExplanationSubject;
  readonly evidence: {
    readonly lanes: readonly BindingUncertaintyExplanationLane[];
    readonly blockers: readonly (Omit<
      SemanticBindingUncertaintyExplanationBlocker,
      "sources"
    > & { readonly sources: readonly BindingUncertaintyExplanationSourceTarget[] })[];
  };
  readonly nextSteps: readonly (Omit<
    SemanticBindingUncertaintyExplanationNextStep,
    "source" | "targetQuery"
  > & {
    readonly source: BindingUncertaintyExplanationSourceTarget;
    readonly targetQuery: BindingUncertaintyExplanationAppQuery | null;
  })[];
};

export type BindingUncertaintyExplanationContender = Omit<
  SemanticBindingUncertaintyExplanationContender,
  "subject"
> & { readonly subject: BindingUncertaintyExplanationSubject };

export type BindingUncertaintyExplanationAnswerTransport =
  FrameworkCapabilityExplanationAnswerTransport;

export const BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS = {
  documentUnavailable: "the source document is no longer available",
  sourceNotAuthored: "the source document is not authored by the current Aurelia workspace",
  documentVersionMismatch: "the source document version no longer matches the binding",
  semanticAnswerUnavailable: "the semantic runtime did not answer the binding explanation query",
  subjectAbsent: "the current source no longer contains that binding",
  subjectAmbiguous: "the current source contains multiple matching bindings",
  subjectMismatch: "the current explanation does not match the requested binding subject",
  subjectSourceUnavailable: "the current binding subject source could not be mapped safely",
} as const;

export type BindingUncertaintyExplanationRefusalKind =
  keyof typeof BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS;

export type BindingUncertaintyExplanationRefusal = {
  readonly [Kind in BindingUncertaintyExplanationRefusalKind]: {
    readonly kind: Kind;
    readonly reason: (typeof BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS)[Kind];
  };
}[BindingUncertaintyExplanationRefusalKind];

export function bindingUncertaintyExplanationRefusal(
  kind: BindingUncertaintyExplanationRefusalKind,
): BindingUncertaintyExplanationRefusal {
  switch (kind) {
    case "documentUnavailable":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.documentUnavailable };
    case "sourceNotAuthored":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.sourceNotAuthored };
    case "documentVersionMismatch":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.documentVersionMismatch };
    case "semanticAnswerUnavailable":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.semanticAnswerUnavailable };
    case "subjectAbsent":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.subjectAbsent };
    case "subjectAmbiguous":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.subjectAmbiguous };
    case "subjectMismatch":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.subjectMismatch };
    case "subjectSourceUnavailable":
      return { kind, reason: BINDING_UNCERTAINTY_EXPLANATION_REFUSAL_REASONS.subjectSourceUnavailable };
  }
}

export type BindingUncertaintyExplanationResponse = {
  readonly fingerprint: string;
  readonly documentVersion: number | null;
  readonly answer: BindingUncertaintyExplanationAnswerTransport | null;
  readonly result:
    | {
        readonly status: "explained";
        readonly explanation: BindingUncertaintyExplanation;
        readonly contenders: readonly BindingUncertaintyExplanationContender[];
      }
    | {
        readonly status: "refused";
        readonly refusal: BindingUncertaintyExplanationRefusal;
        readonly contenders: readonly BindingUncertaintyExplanationContender[];
      };
};

/**
 * Exact authored attribute-name carrier handed from an invoked command-only
 * quick fix to the explanation request. `position` is always `range.start`;
 * both are re-proved against the engine-owned subject `nameSource`.
 */
export interface AttributeInterpretationExplanationParams {
  readonly uri: string;
  readonly position: Position;
  readonly range: Range;
  readonly documentVersion: number;
  readonly projectKey: string;
}

export type AttributeInterpretationExplanationSourceTarget =
  FrameworkCapabilityExplanationSourceTarget;
export type AttributeInterpretationExplanationAppQuery =
  FrameworkCapabilityExplanationAppQuery;

type SemanticAttributeInterpretationExplanationSubject =
  SemanticAttributeInterpretationExplanation["subject"];
type SemanticAttributeInterpretationExplanationValueSite =
  SemanticAttributeInterpretationExplanation["evidence"]["valueSites"][number];
type SemanticAttributeInterpretationExplanationLowering =
  SemanticAttributeInterpretationExplanation["evidence"]["lowerings"][number];
type SemanticAttributeInterpretationExplanationEffect =
  SemanticAttributeInterpretationExplanation["evidence"]["effects"][number];
type SemanticAttributeInterpretationExplanationIssue =
  SemanticAttributeInterpretationExplanation["evidence"]["issues"][number];
type SemanticAttributeInterpretationExplanationBlocker =
  SemanticAttributeInterpretationExplanation["evidence"]["blockers"][number];
type SemanticAttributeInterpretationExplanationNextStep =
  SemanticAttributeInterpretationExplanation["nextSteps"][number];

export type AttributeInterpretationExplanationSubject = Omit<
  SemanticAttributeInterpretationExplanationSubject,
  "source" | "nameSource" | "valueSource" | "templateSource"
> & {
  readonly source: AttributeInterpretationExplanationSourceTarget;
  readonly nameSource: AttributeInterpretationExplanationSourceTarget;
  readonly valueSource: AttributeInterpretationExplanationSourceTarget;
  readonly templateSource: AttributeInterpretationExplanationSourceTarget;
};

export type AttributeInterpretationExplanation = Omit<
  SemanticAttributeInterpretationExplanation,
  "subject" | "evidence" | "nextSteps"
> & {
  readonly subject: AttributeInterpretationExplanationSubject;
  readonly evidence: {
    readonly syntax: Omit<
      SemanticAttributeInterpretationExplanation["evidence"]["syntax"],
      "nameSource" | "targetSource" | "commandSource"
    > & {
      readonly nameSource: AttributeInterpretationExplanationSourceTarget;
      readonly targetSource: AttributeInterpretationExplanationSourceTarget;
      readonly commandSource: AttributeInterpretationExplanationSourceTarget;
    };
    readonly classification:
      SemanticAttributeInterpretationExplanation["evidence"]["classification"];
    readonly valueSites: readonly (Omit<
      SemanticAttributeInterpretationExplanationValueSite,
      "source"
    > & { readonly source: AttributeInterpretationExplanationSourceTarget })[];
    readonly lowerings: readonly (Omit<
      SemanticAttributeInterpretationExplanationLowering,
      "source"
    > & { readonly source: AttributeInterpretationExplanationSourceTarget })[];
    readonly effects: readonly (Omit<
      SemanticAttributeInterpretationExplanationEffect,
      "source"
    > & { readonly source: AttributeInterpretationExplanationSourceTarget })[];
    readonly issues: readonly (Omit<
      SemanticAttributeInterpretationExplanationIssue,
      "source" | "relatedSources"
    > & {
      readonly source: AttributeInterpretationExplanationSourceTarget;
      readonly relatedSources: readonly AttributeInterpretationExplanationSourceTarget[];
    })[];
    readonly blockers: readonly (Omit<
      SemanticAttributeInterpretationExplanationBlocker,
      "sources"
    > & { readonly sources: readonly AttributeInterpretationExplanationSourceTarget[] })[];
  };
  readonly nextSteps: readonly (Omit<
    SemanticAttributeInterpretationExplanationNextStep,
    "source" | "targetQuery"
  > & {
    readonly source: AttributeInterpretationExplanationSourceTarget;
    readonly targetQuery: AttributeInterpretationExplanationAppQuery | null;
  })[];
};

export type AttributeInterpretationExplanationContender = Omit<
  SemanticAttributeInterpretationExplanationContender,
  "subject"
> & { readonly subject: AttributeInterpretationExplanationSubject };

export type AttributeInterpretationExplanationAnswerTransport =
  FrameworkCapabilityExplanationAnswerTransport;

export const ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS = {
  documentUnavailable: "the source document is no longer available",
  sourceNotAuthored: "the source document is not authored by the current Aurelia workspace",
  documentVersionMismatch: "the source document version no longer matches the attribute",
  semanticAnswerUnavailable: "the semantic runtime did not answer the attribute explanation query",
  subjectAbsent: "the current source no longer contains that attribute",
  subjectAmbiguous: "the current source contains multiple matching attributes",
  subjectMismatch: "the current explanation does not match the requested attribute subject",
  subjectSourceUnavailable: "the current attribute-name source could not be mapped safely",
} as const;

export type AttributeInterpretationExplanationRefusalKind =
  keyof typeof ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS;

export type AttributeInterpretationExplanationRefusal = {
  readonly [Kind in AttributeInterpretationExplanationRefusalKind]: {
    readonly kind: Kind;
    readonly reason: (typeof ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS)[Kind];
  };
}[AttributeInterpretationExplanationRefusalKind];

export function attributeInterpretationExplanationRefusal(
  kind: AttributeInterpretationExplanationRefusalKind,
): AttributeInterpretationExplanationRefusal {
  switch (kind) {
    case "documentUnavailable":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.documentUnavailable };
    case "sourceNotAuthored":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.sourceNotAuthored };
    case "documentVersionMismatch":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.documentVersionMismatch };
    case "semanticAnswerUnavailable":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.semanticAnswerUnavailable };
    case "subjectAbsent":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.subjectAbsent };
    case "subjectAmbiguous":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.subjectAmbiguous };
    case "subjectMismatch":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.subjectMismatch };
    case "subjectSourceUnavailable":
      return { kind, reason: ATTRIBUTE_INTERPRETATION_EXPLANATION_REFUSAL_REASONS.subjectSourceUnavailable };
  }
}

export type AttributeInterpretationExplanationResponse = {
  readonly fingerprint: string;
  readonly documentVersion: number | null;
  readonly answer: AttributeInterpretationExplanationAnswerTransport | null;
  readonly result:
    | {
        readonly status: "explained";
        readonly explanation: AttributeInterpretationExplanation;
        readonly contenders: readonly AttributeInterpretationExplanationContender[];
      }
    | {
        readonly status: "refused";
        readonly refusal: AttributeInterpretationExplanationRefusal;
        readonly contenders: readonly AttributeInterpretationExplanationContender[];
      };
};

export type DocumentUriParams = { uri: string };

export type AnalysisLimitationSourceUnavailableReason =
  | "source-uri-unavailable"
  | "source-text-unavailable"
  | "source-range-unavailable"
  | "source-range-mismatch";

export interface AnalysisLimitationSourceLocation {
  readonly uri: string;
  readonly range: Range;
}

/** Exact source mapping without host paths or guessed fallback locations. */
export type AnalysisLimitationSourceTarget =
  | { readonly state: "available"; readonly location: AnalysisLimitationSourceLocation }
  | { readonly state: "absent" }
  | { readonly state: "unavailable"; readonly reason: AnalysisLimitationSourceUnavailableReason };

export interface AnalysisLimitationEffectivePolicy {
  readonly ruleId: SemanticProjectFindingEffectivePolicy["ruleId"];
  readonly disposition: SemanticProjectFindingEffectivePolicy["disposition"];
  readonly authority: SemanticProjectFindingEffectivePolicy["authority"];
  readonly source: AnalysisLimitationSourceTarget;
}

export interface AnalysisLimitationProductEvidence {
  readonly productKey: SemanticAnalysisLimitationRow["evidence"]["products"][number]["productKey"];
  readonly productKindKey: SemanticAnalysisLimitationRow["evidence"]["products"][number]["productKindKey"];
  readonly source: AnalysisLimitationSourceTarget;
}

export interface AnalysisLimitationItem {
  readonly findingKey: SemanticAnalysisLimitationRow["findingKey"];
  readonly ruleId: SemanticAnalysisLimitationRow["ruleId"];
  readonly authority: SemanticAnalysisLimitationRow["authority"];
  readonly title: SemanticAnalysisLimitationRow["title"];
  readonly explanation: SemanticAnalysisLimitationRow["explanation"];
  readonly action: SemanticAnalysisLimitationRow["action"];
  readonly reason: SemanticAnalysisLimitationRow["reason"];
  readonly source: AnalysisLimitationSourceTarget;
  readonly currentCoverage: SemanticAnalysisLimitationRow["currentCoverage"];
  readonly evidence: {
    readonly openSeamSiteKey: SemanticAnalysisLimitationRow["evidence"]["openSeamSiteKey"];
    readonly seamKeys: SemanticAnalysisLimitationRow["evidence"]["seamKeys"];
    readonly materializations: SemanticAnalysisLimitationRow["evidence"]["materializations"];
    readonly products: readonly AnalysisLimitationProductEvidence[];
  };
  readonly effectivePolicy: AnalysisLimitationEffectivePolicy;
}

export type AnalysisLimitationsProjectResult =
  | {
      readonly status: "ready";
      readonly projectKey: string;
      readonly answer: RuntimeAnswerTransport;
      readonly policyFile: {
        readonly uri: string;
        readonly exists: boolean;
      };
      readonly effectivePolicies: readonly AnalysisLimitationEffectivePolicy[];
      readonly candidateCount: SemanticAnalysisLimitationsResult["candidateCount"];
      readonly suppressedCandidateCount: SemanticAnalysisLimitationsResult["suppressedCandidateCount"];
      readonly rows: readonly AnalysisLimitationItem[];
    }
  | {
      readonly status: "error";
      readonly projectKey: string;
      readonly message: string;
    };

/** One workspace-generation answer with explicit results for every admitted app project. */
export interface AnalysisLimitationsResponse {
  readonly fingerprint: string;
  readonly projects: readonly AnalysisLimitationsProjectResult[];
}

export interface SourceOwnershipParams {
  readonly uri: string;
}

/** One exact boot-authored project admission, expressed only in URI-safe transport vocabulary. */
export interface SourceOwnershipOwner {
  readonly projectKey: string;
  readonly rootUri: string;
  readonly projectPath: string;
  readonly role: `${SourceFileRole}`;
}

export interface SourceOwnershipResponse {
  readonly fingerprint: string;
  readonly sourceUri: string;
  readonly answer: RuntimeAnswerTransport;
  /**
   * True only for an exact external/HTML template source retained by a converged custom-element definition.
   * Project membership or a generic HTML source role alone is insufficient; clients must not reclassify roles.
   */
  readonly templateOwned: boolean;
  readonly owners: readonly SourceOwnershipOwner[];
}

/** Optional projection policy for the shared semantic resource inventory. */
export interface ResourceInventoryParams {
  readonly includeTypeSurfaces?: boolean;
}

/** JSON transport form of semantic-runtime's author-facing resource taxonomy. */
export type ResourceInventoryKind = `${SemanticResourceInventoryKind}`;

/** Source roles are wire vocabulary, not labels inferred by the client. */
export const ResourceLocationRoles = {
  PublicName: "public-name",
  Declaration: "declaration",
  Implementation: "implementation",
  Alias: "alias",
  BindableName: "bindable-name",
  BindableAttribute: "bindable-attribute",
  BindableProperty: "bindable-property",
  BindableDeclaration: "bindable-declaration",
  LocalOwner: "local-owner",
  Availability: "availability",
  Template: "template",
} as const;

export type ResourceLocationRole = typeof ResourceLocationRoles[keyof typeof ResourceLocationRoles];

export interface ResourceSourceLocation {
  readonly uri: string;
  readonly range: Range;
  readonly role: ResourceLocationRole;
  readonly label: string;
}

export type ResourceSourceUnavailableReason =
  | `${SemanticResourceNavigationUnavailableReason}`
  | "source-uri-unavailable"
  | "source-text-unavailable"
  | "source-range-unavailable";

/** Lossless source mapping: semantic absence and transport failure are observably different. */
export type ResourceSourceTarget =
  | { readonly state: "available"; readonly location: ResourceSourceLocation }
  | { readonly state: "absent" }
  | { readonly state: "unavailable"; readonly reason: ResourceSourceUnavailableReason };

export type ResourceNavigationTarget =
  | { readonly state: "available"; readonly location: ResourceSourceLocation }
  | { readonly state: "unavailable"; readonly reason: ResourceSourceUnavailableReason };

export interface ResourceInventoryAlias {
  readonly identityKey: string;
  readonly registrationKey: string | null;
  readonly name: string;
  readonly source: ResourceSourceTarget;
  readonly navigation: ResourceNavigationTarget;
}

export interface ResourceInventoryBindable {
  readonly identityKey: string;
  readonly name: string;
  readonly attribute: string;
  readonly mode: string;
  readonly nullable: boolean | null;
  readonly valueType: string | null;
  readonly primary: boolean;
  readonly sources: {
    readonly name: ResourceSourceTarget;
    readonly attribute: ResourceSourceTarget;
    readonly property: ResourceSourceTarget;
    readonly declaration: ResourceSourceTarget;
  };
  readonly navigation: ResourceNavigationTarget;
}

export interface ResourceInventoryItem {
  /** Stable owner identity with deterministic variants for lower-authority collisions; kernel handles never cross. */
  readonly identityKey: string;
  readonly projectKey: string;
  readonly kind: ResourceInventoryKind;
  readonly name: string;
  readonly registrationKey: string | null;
  readonly aliases: readonly ResourceInventoryAlias[];
  readonly bindables: readonly ResourceInventoryBindable[];
  readonly declarationModes: readonly SemanticResourceDeclarationMode[];
  readonly metadataState: `${SemanticResourceInventoryMetadataState}`;
  readonly origin: Omit<SemanticResourceInventoryOrigin, "kind" | "catalogOwnerKind"> & {
    readonly kind: `${SemanticResourceInventoryOrigin["kind"]}`;
    readonly catalogOwnerKind: `${SemanticResourceInventoryCatalogOwnerKind}` | null;
  };
  readonly locality: {
    readonly kind: `${SemanticResourceInventoryLocalityKind}`;
    readonly ownerIdentityKey: string | null;
    readonly ownerName: string | null;
    readonly ownerSource: ResourceSourceTarget;
  };
  readonly sources: {
    readonly publicName: ResourceSourceTarget;
    readonly declaration: ResourceSourceTarget;
    readonly implementation: ResourceSourceTarget;
  };
  readonly navigation: ResourceNavigationTarget;
}

export interface ResourceProject {
  readonly projectKey: string;
  readonly rootUri: string;
  readonly sourceFiles: number;
  readonly shapeKind: `${SemanticProjectCandidateSummary["shapeKind"]}`;
  readonly analysisKind: `${SemanticProjectCandidateSummary["analysisKind"]}`;
}

export type ResourceInventoryProjectResult =
  | {
      readonly status: "ready";
      readonly project: ResourceProject;
      readonly answer: RuntimeAnswerTransport;
      readonly typeSurfacesIncluded: boolean;
      readonly resources: readonly ResourceInventoryItem[];
      readonly completeness: SemanticResourceInventoryCompleteness;
    }
  | {
      readonly status: "error";
      readonly project: ResourceProject;
      readonly message: string;
    };

export interface ResourceInventoryResponse {
  readonly fingerprint: string;
  readonly projects: readonly ResourceInventoryProjectResult[];
}

export interface TemplateResourceAvailabilityParams {
  readonly uri: string;
  readonly position: Position;
  readonly projectKey?: string;
  readonly templateResourceScopeIdentityKey?: string;
}

export interface TemplateResourceScopeCandidate {
  readonly templateIdentityKey: string;
  readonly scopeIdentityKey: string;
  readonly definitionName: string;
  readonly compilationLane: "app-runtime" | "authoring";
  readonly source: ResourceSourceTarget;
}

export interface TemplateResourceAvailabilityItem {
  readonly resource: ResourceInventoryItem;
  readonly state: `${SemanticTemplateResourceAvailabilityState}`;
  readonly visibilityKind: `${SemanticTemplateResourceAvailabilityRow["visibilityKind"]}`;
  readonly availabilitySource: ResourceSourceTarget;
}

export type TemplateResourceProjectSelection =
  | {
      readonly status: "absent";
      readonly candidates: readonly ResourceProject[];
    }
  | {
      readonly status: "ambiguous";
      readonly candidates: readonly ResourceProject[];
    }
  | {
      readonly status: "exact";
      readonly project: ResourceProject;
      readonly answer: RuntimeAnswerTransport;
      readonly selectedTemplate: TemplateResourceScopeCandidate | null;
      readonly templateCandidates: readonly TemplateResourceScopeCandidate[];
      readonly resources: readonly TemplateResourceAvailabilityItem[];
      readonly completeness: SemanticResourceInventoryCompleteness;
    };

export interface TemplateResourceAvailabilityResponse {
  readonly fingerprint: string;
  readonly projectSelection: TemplateResourceProjectSelection;
}

/** Exact Resource Explorer subject interpreted at one current template cursor. */
export interface ResourceAvailabilityExplanationParams {
  readonly uri: string;
  readonly position: Position;
  readonly documentVersion: number;
  readonly projectKey: string;
  readonly resourceIdentityKey: string;
  readonly templateResourceScopeIdentityKey?: string;
}

export type ResourceAvailabilityExplanationSourceTarget =
  FrameworkCapabilityExplanationSourceTarget;
export type ResourceAvailabilityExplanationAppQuery =
  FrameworkCapabilityExplanationAppQuery;

type SemanticResourceAvailabilityExplanationSubject =
  SemanticResourceAvailabilityExplanation["subject"];
type SemanticResourceAvailabilityExplanationExclusion =
  NonNullable<SemanticResourceAvailabilityExplanation["evidence"]["exclusion"]>;
type SemanticResourceAvailabilityExplanationBlocker =
  SemanticResourceAvailabilityExplanation["evidence"]["blockers"][number];
type SemanticResourceAvailabilityExplanationNextStep =
  SemanticResourceAvailabilityExplanation["nextSteps"][number];

export type ResourceAvailabilityExplanationSubject = Omit<
  SemanticResourceAvailabilityExplanationSubject,
  "resource" | "template" | "resourceKind"
> & {
  readonly resourceKind: `${SemanticResourceAvailabilityExplanationSubject["resourceKind"]}`;
  readonly resource: ResourceInventoryItem;
  readonly template: TemplateResourceScopeCandidate;
};

export type ResourceAvailabilityExplanation = Omit<
  SemanticResourceAvailabilityExplanation,
  "subject" | "evidence" | "nextSteps"
> & {
  readonly subject: ResourceAvailabilityExplanationSubject;
  readonly evidence: {
    readonly effectiveResource: ResourceInventoryItem | null;
    readonly availabilitySource: ResourceAvailabilityExplanationSourceTarget;
    readonly exclusion: (Omit<
      SemanticResourceAvailabilityExplanationExclusion,
      "contenderSource" | "winnerSource"
    > & {
      readonly contenderSource: ResourceAvailabilityExplanationSourceTarget;
      readonly winnerSource: ResourceAvailabilityExplanationSourceTarget;
    }) | null;
    readonly configuration: Omit<
      SemanticResourceAvailabilityExplanation["evidence"]["configuration"],
      "sources"
    > & { readonly sources: readonly ResourceAvailabilityExplanationSourceTarget[] };
    readonly blockers: readonly (Omit<
      SemanticResourceAvailabilityExplanationBlocker,
      "sources"
    > & { readonly sources: readonly ResourceAvailabilityExplanationSourceTarget[] })[];
  };
  readonly nextSteps: readonly (Omit<
    SemanticResourceAvailabilityExplanationNextStep,
    "source" | "targetQuery"
  > & {
    readonly source: ResourceAvailabilityExplanationSourceTarget;
    readonly targetQuery: ResourceAvailabilityExplanationAppQuery | null;
  })[];
};

export type ResourceAvailabilityExplanationContender = Omit<
  SemanticResourceAvailabilityExplanationContender,
  "subject"
> & { readonly subject: ResourceAvailabilityExplanationSubject };

export type ResourceAvailabilityExplanationAnswerTransport =
  FrameworkCapabilityExplanationAnswerTransport;

export const RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS = {
  documentUnavailable: "the source document is no longer available",
  sourceNotAuthored: "the source document is not authored by the current Aurelia workspace",
  documentVersionMismatch: "the source document version no longer matches the availability request",
  semanticAnswerUnavailable: "the semantic runtime did not answer the availability explanation query",
  subjectAbsent: "the selected resource or template scope is no longer present",
  subjectAmbiguous: "the current template belongs to more than one resource scope",
  subjectMismatch: "the current explanation does not match the requested resource and template scope",
  templateSourceUnavailable: "the current template source could not be mapped safely",
} as const;

export type ResourceAvailabilityExplanationRefusalKind =
  keyof typeof RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS;

export type ResourceAvailabilityExplanationRefusal = {
  readonly [Kind in ResourceAvailabilityExplanationRefusalKind]: {
    readonly kind: Kind;
    readonly reason: (typeof RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS)[Kind];
  };
}[ResourceAvailabilityExplanationRefusalKind];

export function resourceAvailabilityExplanationRefusal(
  kind: ResourceAvailabilityExplanationRefusalKind,
): ResourceAvailabilityExplanationRefusal {
  switch (kind) {
    case "documentUnavailable":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.documentUnavailable };
    case "sourceNotAuthored":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.sourceNotAuthored };
    case "documentVersionMismatch":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.documentVersionMismatch };
    case "semanticAnswerUnavailable":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.semanticAnswerUnavailable };
    case "subjectAbsent":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.subjectAbsent };
    case "subjectAmbiguous":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.subjectAmbiguous };
    case "subjectMismatch":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.subjectMismatch };
    case "templateSourceUnavailable":
      return { kind, reason: RESOURCE_AVAILABILITY_EXPLANATION_REFUSAL_REASONS.templateSourceUnavailable };
  }
}

export type ResourceAvailabilityExplanationResponse = {
  readonly fingerprint: string;
  readonly documentVersion: number | null;
  readonly answer: ResourceAvailabilityExplanationAnswerTransport | null;
  readonly result:
    | {
        readonly status: "explained";
        readonly explanation: ResourceAvailabilityExplanation;
        readonly contenders: readonly ResourceAvailabilityExplanationContender[];
      }
    | {
        readonly status: "refused";
        readonly refusal: ResourceAvailabilityExplanationRefusal;
        readonly contenders: readonly ResourceAvailabilityExplanationContender[];
      };
};

export type RelatedFileRole = Extract<ApplicationFileRole, "component-source" | "component-template">;

export interface RelatedFileCandidate {
  readonly uri: string;
  readonly role: RelatedFileRole;
  readonly elementName: string;
  readonly className: string | null;
}

export type RelatedFilesResponse = readonly RelatedFileCandidate[];

export type RenameFromTsParams = {
  uri: string;
  position: Position;
  newName?: string;
};

/** Exact authored same-name site whose rename identity remains unresolved. */
export interface RenameCandidateLocation {
  readonly uri: string;
  readonly range: ProtocolRange;
  readonly name: string;
  readonly reason: SemanticTemplateReferenceCandidateReason | `${SemanticTemplateReferenceCandidateReason}`;
}

/** RequestFailed data returned when standard LSP rename refuses unresolved authored candidates. */
export interface RenameCandidateRefusalData {
  readonly reason: string | null;
  readonly candidates: readonly RenameCandidateLocation[];
  readonly mappingFailures: readonly string[];
}

export type RenameFromTsResponse = {
  status: "available";
  range: ProtocolRange;
  placeholder: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
  candidates: readonly RenameCandidateLocation[];
} | {
  status: "success";
  workspaceEdit: ProtocolWorkspaceEdit;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
  candidates: readonly RenameCandidateLocation[];
} | {
  status: "not-applicable";
  reason: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
  candidates: readonly RenameCandidateLocation[];
} | {
  status: "refused";
  reason: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
  candidates: readonly RenameCandidateLocation[];
} | {
  status: "blocked";
  reason: string;
  message: string;
  failures?: readonly string[];
  templateReferenceCount?: number;
  typeScriptReferenceCount?: number;
  candidateCount?: number;
  candidates?: readonly RenameCandidateLocation[];
};
