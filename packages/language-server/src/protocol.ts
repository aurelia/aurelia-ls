import type {
  SemanticAppDiagnosticRow,
  SemanticDiagnosticPresentationRelation,
  SemanticDiagnosticRelatedInformation,
} from "@aurelia-ls/semantic-runtime";

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

export type DiagnosticsSnapshotResponse = {
  uri: string;
  fingerprint: string;
  diagnostics: DiagnosticsSnapshotBundle;
};
