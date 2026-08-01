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
  AnalysisReadyPayload,
  SourceSpan,
  WorkspaceChangedPayload,
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
  AnalysisReadyPayload,
  SourceSpan,
  WorkspaceChangedPayload,
};

export interface AureliaWorkspaceIdentity {
  readonly key: string;
  readonly name: string;
  readonly uri: string;
}

export type WorkspaceNotificationPayload<T> = T & {
  readonly workspace: AureliaWorkspaceIdentity;
};

export type DiagnosticsSpan = SourceSpan;

export type ProtocolPosition = {
  line: number;
  character: number;
};

export type ProtocolRange = {
  start: ProtocolPosition;
  end: ProtocolPosition;
};

export type ProtocolTextEdit = {
  range: ProtocolRange;
  newText: string;
};

export type ProtocolTextDocumentEdit = {
  textDocument: {
    uri: string;
    version: number | null;
  };
  edits: ProtocolTextEdit[];
};

export type ProtocolWorkspaceEdit = {
  changes?: Record<string, ProtocolTextEdit[]>;
  documentChanges?: ProtocolTextDocumentEdit[];
};

export interface ResourceExplorerBindable {
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
  type?: string;
}

export type ResourceScope = "global" | "local" | "orphan";

export interface ResourceExplorerItem {
  name: string;
  kind: string;
  className?: string;
  file?: string;
  package?: string;
  bindableCount: number;
  bindables: ResourceExplorerBindable[];
  origin?: string;
  scope: ResourceScope;
  scopeOwner?: string;
  declarationForm?: string;
  workspace?: AureliaWorkspaceIdentity;
}

export interface InspectEntityResponse {
  uri: string;
  entityKind: string;
  confidence: {
    resource: string;
    type: string;
    scope: string;
    expression: string;
    composite: string;
  };
  expressionLabel?: string;
  exprId?: string | number;
  nodeId?: string | number;
  detail: Record<string, unknown>;
}

export interface ResourceExplorerResponse {
  fingerprint?: string;
  resources: ResourceExplorerItem[];
  templateCount: number;
  inlineTemplateCount: number;
  workspaces?: readonly (AureliaWorkspaceIdentity & {
    readonly resourceCount: number;
    readonly templateCount: number;
    readonly inlineTemplateCount: number;
  })[];
}

export interface CapabilitiesResponse {
  schema?: "aurelia.capabilities/1";
  server?: {
    version?: string;
    workspaceVersion?: string;
  };
  contracts?: {
    query?: { version?: string };
    refactor?: { version?: string };
    diagnostics?: { version?: string; taxonomy?: string };
    semanticTokens?: { version?: string; legendHash?: string };
    presentation?: { version?: string };
  };
  workspace?: {
    meta?: {
      fingerprint?: string;
      configHash?: string;
      docCount?: number;
    };
    artifacts?: {
      semantics?: boolean;
      catalog?: boolean;
      syntax?: boolean;
      resourceGraph?: boolean;
      provenance?: boolean;
      semanticSnapshot?: boolean;
      apiSurface?: boolean;
      featureUsage?: boolean;
      registrationPlan?: boolean;
    };
    indexes?: {
      resourceIndex?: boolean;
      symbolGraph?: boolean;
      usageIndex?: boolean;
      scopeIndex?: boolean;
      templateIndex?: boolean;
    };
  };
  lsp?: {
    optional?: {
      documentSymbol?: boolean;
      workspaceSymbol?: boolean;
      documentHighlight?: boolean;
      selectionRange?: boolean;
      linkedEditingRange?: boolean;
      foldingRange?: boolean;
      inlayHint?: boolean;
      codeLens?: boolean;
      documentLink?: boolean;
      callHierarchy?: boolean;
      documentColor?: boolean;
      semanticTokensDelta?: boolean;
    };
  };
  notifications?: {
    analysisReady?: boolean;
    workspaceChanged?: boolean;
  };
}

export type ScopeResourceItem = {
  name: string;
  kind: string;
  origin: string;
  className?: string;
  file?: string;
  package?: string;
  bindableCount: number;
  scope: "global" | "local";
};

export type ScopeResourcesResponse = {
  scopeId: string;
  scopeLabel?: string;
  resources: ScopeResourceItem[];
};

export type RelatedFileResponse = {
  uri: string;
  kind: "template" | "component";
} | null;

export type RenameFromTsResponse = {
  status: "available";
  range: ProtocolRange;
  placeholder: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "success";
  workspaceEdit: ProtocolWorkspaceEdit;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "not-applicable";
  reason: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "refused";
  reason: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "blocked";
  reason: string;
  message: string;
  failures?: readonly string[];
  templateReferenceCount?: number;
  typeScriptReferenceCount?: number;
  candidateCount?: number;
};
