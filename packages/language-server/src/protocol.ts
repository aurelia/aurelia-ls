import type {
  SemanticAppDiagnosticRow,
  SemanticDiagnosticPresentationRelation,
  SemanticDiagnosticRelatedInformation,
  SemanticRuntimeAnswer,
  SemanticRuntimeSummary,
} from "@aurelia-ls/semantic-runtime";
import type { Position, Range, WorkspaceEdit } from "vscode-languageserver/node";

export const AureliaProtocolRequest = {
  Diagnostics: "aurelia/getDiagnostics",
  Resources: "aurelia/getResources",
  InspectEntity: "aurelia/inspectEntity",
  ScopeResources: "aurelia/getScopeResources",
  RelatedFile: "aurelia/getRelatedFile",
  WorkspaceStatus: "aurelia/workspaceStatus",
  RenameFromTypeScript: "aurelia/renameFromTs",
} as const;

export const AureliaProtocolNotification = {
  AnalysisReady: "aurelia/analysisReady",
  WorkspaceChanged: "aurelia/workspaceChanged",
} as const;

export const AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA = "aurelia.template-code-action-resolve/1" as const;

/** Exact semantic-runtime project-shape answer used to confirm one LSP workspace ownership root. */
export type WorkspaceStatusResponse = SemanticRuntimeAnswer<SemanticRuntimeSummary>;

/** Current-document diagnostics publication acknowledged by the semantic-runtime generation that produced it. */
export interface AnalysisReadyPayload {
  readonly uri: string;
  readonly version: number;
  readonly diags: number;
  readonly fingerprint: string;
}

/** Workspace semantic products invalidated by one observed source/topology event. */
export interface WorkspaceChangedPayload {
  readonly fingerprint: string;
  readonly domains: readonly string[];
  readonly reason?: string;
}

export type TemplateCodeActionResolveData = {
  readonly schema: typeof AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA;
  readonly textDocument: { readonly uri: string };
  readonly position: { readonly line: number; readonly character: number };
  /** Stable repair-plan identity; exact edit coordinates are deliberately re-planned at resolve time. */
  readonly actionIdentity: string;
};

/** Wire vocabulary shared by the custom diagnostics server handler and the bundled VS Code client. */
export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";
export type DiagnosticImpact = "blocking" | "degraded" | "informational";
export type DiagnosticActionability = "guided" | "manual" | "none";
export type DiagnosticCategory =
  | "expression"
  | "template-syntax"
  | "resource-resolution"
  | "bindable-validation"
  | "project";
export type DiagnosticStatus = "canonical" | "primary" | "contextual";
export type DiagnosticStage = NonNullable<SemanticAppDiagnosticRow["phase"]>;
export type DiagnosticSourceRole = NonNullable<SemanticAppDiagnosticRow["sourceRole"]>;
export type DiagnosticRelatedRelation = NonNullable<SemanticDiagnosticRelatedInformation["relationKind"]>;
export type DiagnosticPresentationRelation = SemanticDiagnosticPresentationRelation;
export type DiagnosticSurface = "lsp" | "vscode-panel";
export type SourceSpan = { start: number; end: number };

export type DiagnosticsSnapshotRelated = {
  code?: string;
  message: string;
  uri?: string;
  span?: SourceSpan;
  sourceRole?: DiagnosticSourceRole;
  relationKind?: DiagnosticRelatedRelation;
};

export type DiagnosticsSnapshotIssue = {
  kind: SemanticAppDiagnosticRow["diagnosticKind"];
  message: string;
  code?: string;
  rawCode?: string;
  field?: string;
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
  span?: SourceSpan;
  data?: Readonly<Record<string, unknown>>;
  related?: readonly DiagnosticsSnapshotRelated[];
  surfaces?: readonly DiagnosticSurface[];
  issues?: readonly DiagnosticsSnapshotIssue[];
};

export type DiagnosticsSnapshotPresentationItem = {
  rowId: string;
  role: "primary" | "contextual";
  relation?: DiagnosticPresentationRelation;
  diagnostic: DiagnosticsSnapshotItem | null;
};

export type DiagnosticsSnapshotPresentationGroup = {
  groupKey: string;
  subject?: {
    subjectKind: NonNullable<SemanticAppDiagnosticRow["subject"]>["subjectKind"];
    subjectName: string | null;
    uri?: string;
    span?: SourceSpan;
  };
  primary: DiagnosticsSnapshotPresentationItem;
  related: readonly DiagnosticsSnapshotPresentationItem[];
  rawRowCount: number;
  primarySeverity: DiagnosticSeverity;
  maxRawSeverity: DiagnosticSeverity;
};

export type DiagnosticsSnapshotPresentation = {
  rawRowCount: number;
  primaryCount: number;
  contextualCount: number;
  complete: boolean;
  groups: readonly DiagnosticsSnapshotPresentationGroup[];
};

export type DiagnosticsSnapshotBundle = {
  bySurface: Record<string, readonly DiagnosticsSnapshotItem[]>;
  raw: readonly DiagnosticsSnapshotItem[];
  presentation?: DiagnosticsSnapshotPresentation;
};

export type DiagnosticsSnapshotAnswer = Pick<
  SemanticRuntimeAnswer<unknown>,
  "schemaVersion" | "result" | "selection" | "coverage" | "summary" | "page" | "analysisDepth" | "continuations"
>;

export type DiagnosticsSnapshotResponse = {
  uri: string;
  answer: DiagnosticsSnapshotAnswer;
  diagnostics: DiagnosticsSnapshotBundle;
};

export type ProtocolWorkspaceEdit = WorkspaceEdit;
export type ProtocolRange = Range;

export type DocumentUriParams = { uri: string };

export type ResourceExplorerBindable = {
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
  type?: string;
};

export type ResourceScope = "global" | "local" | "orphan";

export type ResourceExplorerItem = {
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
};

export type ResourceExplorerResponse = {
  fingerprint: string;
  resources: ResourceExplorerItem[];
  templateCount: number;
  inlineTemplateCount: number;
};

export type InspectEntityParams = {
  uri: string;
  position: Position;
};

export type InspectEntityResponse = {
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
} | null;

export type ScopeResourceItem = {
  name: string;
  kind: string;
  origin?: string;
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
} | null;

export type RelatedFileResponse = {
  uri: string;
  kind: "template" | "component";
} | null;

export type RenameFromTsParams = {
  uri: string;
  position: Position;
  newName?: string;
};

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
