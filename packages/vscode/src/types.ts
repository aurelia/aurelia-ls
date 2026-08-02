import type {
  ProtocolRange,
  ProtocolWorkspaceEdit,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceExplorerItem as ProtocolResourceExplorerItem,
  ResourceExplorerResponse as ProtocolResourceExplorerResponse,
  ScopeResourcesResponse,
  AnalysisChangedPayload,
} from "@aurelia-ls/language-server/protocol";

export type {
  ProtocolRange,
  ProtocolWorkspaceEdit,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ScopeResourcesResponse,
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
