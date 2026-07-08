export type DiagnosticActionability = "guided" | "manual" | "none";
export type DiagnosticCategory =
  | "expression"
  | "template-syntax"
  | "resource-resolution"
  | "bindable-validation"
  | "project";
export type DiagnosticImpact = "blocking" | "degraded" | "informational";
export type DiagnosticStage = string;
export type DiagnosticStatus = "canonical" | "suppressed" | "experimental";
export type DiagnosticSurface = "lsp" | "vscode-panel" | "ci" | string;
export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";
export type SourceSpan = { start: number; end: number };

export type AnalysisReadyPayload = {
  uri?: string;
  diags?: number;
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

export type DiagnosticsSnapshotIssue = {
  kind: string;
  message: string;
  code?: string;
  rawCode?: string;
  field?: string;
};

export type DiagnosticsSnapshotRelated = {
  code?: string;
  message: string;
  span?: DiagnosticsSpan;
};

export type DiagnosticsSnapshotItem = {
  code: string;
  message: string;
  severity?: DiagnosticSeverity;
  impact?: DiagnosticImpact;
  actionability?: DiagnosticActionability;
  category?: DiagnosticCategory;
  status?: DiagnosticStatus;
  stage?: DiagnosticStage;
  source?: string;
  uri?: string;
  span?: DiagnosticsSpan;
  data?: Readonly<Record<string, unknown>>;
  related?: readonly DiagnosticsSnapshotRelated[];
  surfaces?: readonly DiagnosticSurface[];
  suppressed?: boolean;
  suppressionReason?: string;
  issues?: readonly DiagnosticsSnapshotIssue[];
};

export type DiagnosticsSnapshotBundle = {
  bySurface: Record<string, readonly DiagnosticsSnapshotItem[]>;
  suppressed: readonly DiagnosticsSnapshotItem[];
};

export type DiagnosticsSnapshotResponse = {
  uri?: string;
  fingerprint?: string;
  diagnostics: DiagnosticsSnapshotBundle;
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
  status: "success";
  changes: Record<string, { range: ProtocolRange; newText: string }[]>;
  message: string;
  templateReferenceCount: number;
  candidateCount: number;
} | {
  status: "not-applicable";
  reason: string;
  message: string;
  templateReferenceCount: number;
  candidateCount: number;
} | {
  status: "refused";
  reason: string;
  message: string;
  templateReferenceCount: number;
  candidateCount: number;
} | {
  status: "blocked";
  reason: string;
  message: string;
  failures?: readonly string[];
  templateReferenceCount?: number;
  candidateCount?: number;
};
