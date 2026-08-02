import type {
  DiagnosticActionability,
  DiagnosticCategory,
  DiagnosticImpact,
  DiagnosticPresentationRelation,
  DiagnosticRelatedRelation,
  DiagnosticSeverity,
  DiagnosticSourceRole,
  DiagnosticStage,
  DiagnosticStatus,
  DiagnosticSurface,
  DiagnosticsSnapshotBundle,
  DiagnosticsSnapshotIssue,
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotRelated,
  DiagnosticsSnapshotResponse,
  ProtocolRange,
  ProtocolWorkspaceEdit,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceExplorerItem as ProtocolResourceExplorerItem,
  ResourceExplorerResponse as ProtocolResourceExplorerResponse,
  ScopeResourcesResponse,
  SourceSpan,
  AnalysisChangedPayload,
} from "@aurelia-ls/language-server/protocol";

export type {
  DiagnosticActionability,
  DiagnosticCategory,
  DiagnosticImpact,
  DiagnosticPresentationRelation,
  DiagnosticRelatedRelation,
  DiagnosticSeverity,
  DiagnosticSourceRole,
  DiagnosticStage,
  DiagnosticStatus,
  DiagnosticSurface,
  DiagnosticsSnapshotBundle,
  DiagnosticsSnapshotIssue,
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotRelated,
  DiagnosticsSnapshotResponse,
  ProtocolRange,
  ProtocolWorkspaceEdit,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ScopeResourcesResponse,
  SourceSpan,
  AnalysisChangedPayload,
};

export interface AureliaWorkspaceIdentity {
  readonly key: string;
  readonly name: string;
  readonly uri: string;
}

/** Client-local enrichment added while routing a server notification. */
export type WorkspaceNotificationPayload<T> = T & {
  readonly workspace: AureliaWorkspaceIdentity;
};

export type DiagnosticsSpan = SourceSpan;

/** Client-local workspace ownership added while aggregating per-session resource answers. */
export type ResourceExplorerItem = ProtocolResourceExplorerItem & {
  readonly workspace: AureliaWorkspaceIdentity;
};

export type ResourceExplorerWorkspace = AureliaWorkspaceIdentity & ({
  readonly status: "ready";
  readonly resourceCount: number;
  readonly templateCount: number;
  readonly inlineTemplateCount: number;
  readonly evidence: ProtocolResourceExplorerResponse["evidence"];
} | {
  readonly status: "error";
  readonly error: string;
});

export type ResourceExplorerResponse = Omit<ProtocolResourceExplorerResponse, "resources" | "evidence"> & {
  readonly resources: readonly ResourceExplorerItem[];
  readonly workspaces: readonly ResourceExplorerWorkspace[];
};
