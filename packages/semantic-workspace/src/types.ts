import type {
  ApiSurfaceSnapshot,
  DocumentUri,
  ExprId,
  FeatureUsageSet,
  NodeId,
  ProvenanceIndex,
  ResolvedDiagnostic,
  RoutedDiagnostics,
  RegistrationPlan,
  ResourceCatalog,
  ResourceGraph,
  SemanticSnapshot,
  ProjectSemantics,
  SourceSpan,
  SymbolId,
  TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import type { RefactorDecisionSet } from "./refactor-policy.js";

// Workspace contracts are headless and LSP-agnostic. These shapes intentionally
// mirror LSP concepts without importing LSP types to keep the core reusable.
// Core primitives (DocumentUri, SourceSpan, SymbolId, ExprId, NodeId) are
// reused from the compiler to enforce provenance and canonicalization rules.
export type WorkspaceFingerprint = string & { readonly __brand: "WorkspaceFingerprint" };

export interface WorkspaceSnapshotMeta {
  // Identical fingerprints imply identical query results and ordering.
  readonly fingerprint: WorkspaceFingerprint;
  // Hash of normalized config; input order must not affect the hash.
  readonly configHash: string;
  readonly docCount: number;
}

export interface WorkspaceSnapshot {
  // Snapshot fields are immutable views; do not mutate in adapters.
  readonly meta: WorkspaceSnapshotMeta;
  // These artifacts must be coherent as a set (same inputs + stages).
  readonly semantics: ProjectSemantics;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
  readonly resourceGraph: ResourceGraph;
  // Provenance is the only mapping authority between generated and source spans.
  readonly provenance: ProvenanceIndex;
  // Optional artifacts are feature-driven; absence means the stage was not run.
  readonly semanticSnapshot?: SemanticSnapshot;
  readonly apiSurface?: ApiSurfaceSnapshot;
  readonly featureUsage?: FeatureUsageSet;
  readonly registrationPlan?: RegistrationPlan;
}

// LSP-style position; line/character are zero-based.
export interface SourcePosition {
  readonly line: number;
  readonly character: number;
}

export interface WorkspaceLocation {
  // Location spans must be provenance-backed. Do not compute offsets manually.
  readonly uri: DocumentUri;
  readonly span: SourceSpan;
  readonly symbolId?: SymbolId;
  readonly exprId?: ExprId;
  readonly nodeId?: NodeId;
}

export interface WorkspaceHover {
  readonly contents: string;
  readonly location?: WorkspaceLocation;
  // Per-resource confidence derived from catalog gap state and provenance origin.
  // Only set when confidence is reduced (partial/low). Absent means high/exact.
  readonly confidence?: "exact" | "high" | "partial" | "low" | "manual";
  // Human-readable explanation of the confidence level (gap count, kinds, basis).
  // Only set when confidence is set.
  readonly confidenceReason?: string;
}

export interface WorkspaceCompletionItem {
  readonly label: string;
  readonly kind?: string;
  readonly detail?: string;
  readonly documentation?: string;
  readonly sortText?: string;
  // insertText overrides label when present (no snippet semantics assumed).
  readonly insertText?: string;
}

export interface WorkspaceToken {
  readonly type: string;
  readonly modifiers?: readonly string[];
  // Token ordering must be stable: span start, then span length.
  readonly span: SourceSpan;
}

export const WORKSPACE_TOKEN_MODIFIER_GAP_AWARE = "aureliaGapAware" as const;
export const WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE = "aureliaGapConservative" as const;

export type WorkspaceDiagnostic = ResolvedDiagnostic;
export type WorkspaceDiagnostics = RoutedDiagnostics;

export interface SemanticQuery {
  // Query results must be stable and ordered deterministically for identical snapshots.
  // Locations: uri, then span start. Completions: relevance, then label. Tokens: span start, then length.
  hover(pos: SourcePosition): WorkspaceHover | null;
  definition(pos: SourcePosition): readonly WorkspaceLocation[];
  references(pos: SourcePosition): readonly WorkspaceLocation[];
  completions(pos: SourcePosition): readonly WorkspaceCompletionItem[];
  diagnostics(): WorkspaceDiagnostics;
  semanticTokens(): readonly WorkspaceToken[];
}

export interface WorkspaceTextEdit {
  // Edits must be atomic and provenance-driven; no blind string replace.
  readonly uri: DocumentUri;
  readonly span: SourceSpan;
  readonly newText: string;
}

export interface WorkspaceEdit {
  // Edits are grouped by uri, sorted by span start descending, and must not overlap.
  readonly edits: readonly WorkspaceTextEdit[];
}

export interface WorkspaceRenameRequest {
  readonly uri: DocumentUri;
  readonly position: SourcePosition;
  // newName is raw input; workspace applies naming/alias conventions as needed.
  readonly newName: string;
  // Optional explicit decision values from adapters (future prepare/resolve flow).
  readonly refactorDecisions?: RefactorDecisionSet;
}

export interface WorkspaceCodeActionRequest {
  readonly uri: DocumentUri;
  readonly position?: SourcePosition;
  readonly range?: SourceSpan;
  readonly kinds?: readonly string[];
  // Optional explicit decision values from adapters (future prepare/resolve flow).
  readonly refactorDecisions?: RefactorDecisionSet;
}

export interface WorkspaceCodeAction {
  readonly id: string;
  readonly title: string;
  readonly kind?: string;
  // Code action edits are optional (commands may be handled out-of-band).
  readonly edit?: WorkspaceEdit;
}

export type WorkspaceErrorKind =
  | "config-invalid"
  | "document-missing"
  | "stale-version"
  | "pipeline-failure"
  | "overlay-failure"
  | "refactor-policy-denied"
  | "refactor-decision-required";

export interface WorkspaceError {
  // Workspace errors are internal; they should not be surfaced as user diagnostics.
  readonly kind: WorkspaceErrorKind;
  readonly message: string;
  readonly retryable?: boolean;
}

export type WorkspaceRefactorResult =
  | { readonly edit: WorkspaceEdit }
  | { readonly error: WorkspaceError };

export interface RefactorEngine {
  // Refactors return a single atomic edit set or a structured error.
  rename(request: WorkspaceRenameRequest): WorkspaceRefactorResult;
  codeActions(request: WorkspaceCodeActionRequest): readonly WorkspaceCodeAction[];
}

export interface SemanticWorkspace {
  // Workspace operations must be total and never throw into adapters.
  open(uri: DocumentUri, text?: string, version?: number): void;
  update(uri: DocumentUri, text: string, version?: number): void;
  close(uri: DocumentUri): void;
  snapshot(): WorkspaceSnapshot;
  diagnostics(uri: DocumentUri): WorkspaceDiagnostics;
  query(uri: DocumentUri): SemanticQuery;
  refactor(): RefactorEngine;
}

export function asWorkspaceFingerprint(value: string): WorkspaceFingerprint {
  return value as WorkspaceFingerprint;
}
