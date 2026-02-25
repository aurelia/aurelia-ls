/**
 * Type mapping utilities: workspace/compiler types -> LSP types
 *
 * This is the Boundary 5 conversion layer. All workspace types are
 * converted to LSP wire format here. The FeatureResponse unwrapping
 * happens in the handler layer (handlers/features.ts); this module
 * handles the T → LSP mapping for successful results.
 */
import {
  CompletionItemKind,
  DiagnosticSeverity as LspDiagnosticSeverity,
  DiagnosticTag as LspDiagnosticTag,
  type CompletionItem,
  type CompletionList,
  type Hover,
  type Location,
  type LocationLink,
  type WorkspaceEdit,
  type Diagnostic,
  type DiagnosticRelatedInformation,
  type Range,
  type TextDocumentEdit,
  type CreateFile,
  type RenameFile,
  type ChangeAnnotation,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { pathToFileURL } from "node:url";
import type {
  PrepareRenameResult,
  RenameAnnotation,
  RenameEdit,
  RenameResult,
  WorkspaceCompletionItem,
  WorkspaceDiagnostic,
  WorkspaceDiagnostics,
  WorkspaceEdit as SemanticWorkspaceEdit,
  WorkspaceHover,
  WorkspaceLocation,
} from "@aurelia-ls/semantic-workspace";
import {
  canonicalDocumentUri,
  type DiagnosticActionability,
  type DiagnosticCategory,
  type DiagnosticConfidence,
  type DiagnosticImpact,
  type DiagnosticSurface,
  type DocumentSpan,
  type DocumentUri,
} from "@aurelia-ls/compiler";

export type LookupTextFn = (uri: DocumentUri) => string | null;
export const AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY = "__aurelia" as const;
export const AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA = "diagnostics-taxonomy/1" as const;

type AureliaLspDiagnosticTaxonomy = {
  schema: typeof AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA;
  impact?: DiagnosticImpact;
  actionability?: DiagnosticActionability;
  category?: DiagnosticCategory;
  confidence?: DiagnosticConfidence;
};

type RecordValue = Readonly<Record<string, unknown>>;

// ============================================================================
// URI and Span Conversion
// ============================================================================

export function toLspUri(uri: DocumentUri): string {
  const canonical = canonicalDocumentUri(uri);
  const pathOrUri = canonical.path;
  if (pathOrUri.startsWith("file://")) return pathOrUri;
  return pathToFileURL(pathOrUri).toString();
}

export function guessLanguage(uri: DocumentUri): string {
  if (uri.endsWith(".ts") || uri.endsWith(".js")) return "typescript";
  if (uri.endsWith(".json")) return "json";
  return "html";
}

export function spanToRange(loc: DocumentSpan, lookupText: LookupTextFn): Range | null {
  const text = lookupText(loc.uri);
  if (!text) return null;
  const doc = TextDocument.create(toLspUri(loc.uri), guessLanguage(loc.uri), 0, text);
  return { start: doc.positionAt(loc.span.start), end: doc.positionAt(loc.span.end) };
}

// ============================================================================
// Severity Mapping — L2 demotion table produces 4 severity levels
// ============================================================================

function toLspSeverity(sev?: "error" | "warning" | "info" | "hint"): LspDiagnosticSeverity | undefined {
  if (!sev) return undefined;
  switch (sev) {
    case "error": return LspDiagnosticSeverity.Error;
    case "warning": return LspDiagnosticSeverity.Warning;
    case "info": return LspDiagnosticSeverity.Information;
    case "hint": return LspDiagnosticSeverity.Hint;
    default: return LspDiagnosticSeverity.Error;
  }
}

// ============================================================================
// Diagnostic Tag Mapping
// ============================================================================

function mapDiagnosticTags(diag: WorkspaceDiagnostic): LspDiagnosticTag[] | undefined {
  const tags: LspDiagnosticTag[] = [];
  const data = diag.data;
  if (data?.unnecessary === true) tags.push(LspDiagnosticTag.Unnecessary);
  if (data?.deprecated === true) tags.push(LspDiagnosticTag.Deprecated);
  return tags.length > 0 ? tags : undefined;
}

// ============================================================================
// Diagnostic Taxonomy (extended with confidence)
// ============================================================================

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RecordValue;
}

function buildTaxonomyPayload(diag: WorkspaceDiagnostic): AureliaLspDiagnosticTaxonomy {
  const taxonomy: AureliaLspDiagnosticTaxonomy = {
    schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
  };
  if (diag.impact) taxonomy.impact = diag.impact;
  if (diag.actionability) taxonomy.actionability = diag.actionability;
  if (diag.spec.category) taxonomy.category = diag.spec.category;
  const confidence = diag.data?.confidence;
  if (typeof confidence === "string") taxonomy.confidence = confidence as DiagnosticConfidence;
  return taxonomy;
}

function mergeDiagnosticData(diag: WorkspaceDiagnostic): Record<string, unknown> {
  const data = { ...(diag.data ?? {}) };
  const existingNamespace = asRecord(data[AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]);
  const existingDiagnostics = asRecord(existingNamespace?.diagnostics);
  data[AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY] = {
    ...(existingNamespace ?? {}),
    diagnostics: {
      ...(existingDiagnostics ?? {}),
      ...buildTaxonomyPayload(diag),
    },
  };
  return data;
}

// ============================================================================
// Diagnostics Mapping
// ============================================================================

export function mapWorkspaceDiagnostics(
  uri: DocumentUri,
  diags: WorkspaceDiagnostics,
  lookupText: LookupTextFn,
  options?: { surface?: DiagnosticSurface },
): Diagnostic[] {
  const mapped: Diagnostic[] = [];
  const surface = options?.surface ?? "lsp";
  const entries = diags.bySurface.get(surface) ?? [];
  for (const diag of entries) {
    if (!diag.span) continue;
    const targetUri = diag.uri ?? uri;
    const range = spanToRange({ uri: targetUri, span: diag.span }, lookupText);
    if (!range) continue;
    const severity = toLspSeverity(diag.severity);
    const related = mapRelatedDiagnostics(diag, targetUri, lookupText);
    const tags = mapDiagnosticTags(diag);
    const base: Diagnostic = {
      range,
      message: diag.message,
      code: diag.code,
      source: diag.source ?? "aurelia",
    };
    if (severity !== undefined) base.severity = severity;
    base.data = mergeDiagnosticData(diag);
    if (related.length > 0) base.relatedInformation = related;
    if (tags) base.tags = tags;
    mapped.push(base);
  }
  return mapped;
}

/**
 * Map suppressed diagnostics for the "Show Suppressed Diagnostics" command.
 * Emits suppressed diagnostics at Hint severity with [suppressed] prefix.
 */
export function mapSuppressedDiagnostics(
  uri: DocumentUri,
  diags: WorkspaceDiagnostics,
  lookupText: LookupTextFn,
): Diagnostic[] {
  const mapped: Diagnostic[] = [];
  for (const diag of diags.suppressed) {
    if (!diag.span) continue;
    const targetUri = diag.uri ?? uri;
    const range = spanToRange({ uri: targetUri, span: diag.span }, lookupText);
    if (!range) continue;
    const reason = diag.suppressionReason ? ` (${diag.suppressionReason})` : "";
    const base: Diagnostic = {
      range,
      message: `[suppressed] ${diag.message}${reason}`,
      code: diag.code,
      source: "aurelia",
      severity: LspDiagnosticSeverity.Hint,
    };
    base.data = mergeDiagnosticData(diag);
    mapped.push(base);
  }
  return mapped;
}

function mapRelatedDiagnostics(
  diag: WorkspaceDiagnostic,
  defaultUri: DocumentUri,
  lookupText: LookupTextFn,
): DiagnosticRelatedInformation[] {
  const related = diag.related ?? [];
  if (related.length === 0) return [];
  const results: DiagnosticRelatedInformation[] = [];
  for (const entry of related) {
    if (!entry.span) continue;
    const range = spanToRange({ uri: defaultUri, span: entry.span }, lookupText);
    if (!range) continue;
    results.push({
      message: entry.message,
      location: { uri: toLspUri(defaultUri), range },
    });
  }
  return results;
}

// ============================================================================
// Completions Mapping
// ============================================================================

const COMPLETION_KIND_BY_CANONICAL_CLASS_ID: Readonly<Record<string, CompletionItemKind>> = {
  "custom-element": CompletionItemKind.Class,
  "template-controller": CompletionItemKind.Struct,
  "custom-attribute": CompletionItemKind.Property,
  "bindable-property": CompletionItemKind.Field,
  "value-converter": CompletionItemKind.Function,
  "binding-behavior": CompletionItemKind.Function,
  "binding-command": CompletionItemKind.Keyword,
  "html-element": CompletionItemKind.Variable,
  "html-attribute": CompletionItemKind.Variable,
  "view-model-property": CompletionItemKind.Property,
  "view-model-method": CompletionItemKind.Method,
  "scope-variable": CompletionItemKind.Variable,
  "gap-marker": CompletionItemKind.Text,
};

export function mapWorkspaceCompletions(items: readonly WorkspaceCompletionItem[]): CompletionItem[] {
  return items.map((item) => {
    const completion: CompletionItem = { label: item.label };
    if (item.kind) {
      const mappedKind = COMPLETION_KIND_BY_CANONICAL_CLASS_ID[item.kind];
      if (mappedKind !== undefined) completion.kind = mappedKind;
    }
    if (item.detail) completion.detail = item.detail;
    if (item.documentation) completion.documentation = item.documentation;
    if (item.sortText) completion.sortText = item.sortText;
    if (item.insertText) completion.insertText = item.insertText;
    return completion;
  });
}

export const COMPLETION_GAP_MARKER_LABEL = "Aurelia analysis incomplete";
export const COMPLETION_GAP_MARKER_DETAIL = "Results may be partial";

export function createCompletionGapMarker(items: readonly CompletionItem[]): CompletionList {
  const alreadyPresent = items.some((item) => item.label === COMPLETION_GAP_MARKER_LABEL);
  if (alreadyPresent) {
    return { isIncomplete: true, items: [...items] };
  }
  return {
    isIncomplete: true,
    items: [
      ...items,
      {
        label: COMPLETION_GAP_MARKER_LABEL,
        kind: CompletionItemKind.Text,
        detail: COMPLETION_GAP_MARKER_DETAIL,
        sortText: "\uffff",
        insertText: "",
      },
    ],
  };
}

// ============================================================================
// Hover Mapping
// ============================================================================

export function mapWorkspaceHover(hover: WorkspaceHover | null, lookupText: LookupTextFn): Hover | null {
  if (!hover) return null;
  const range = hover.location ? spanToRange({ uri: hover.location.uri, span: hover.location.span }, lookupText) : null;
  return {
    contents: { kind: "markdown", value: hover.contents },
    ...(range ? { range } : {}),
  };
}

// ============================================================================
// Location Mapping — both Location[] and LocationLink[]
// ============================================================================

export function mapWorkspaceLocations(
  locs: readonly WorkspaceLocation[],
  lookupText: LookupTextFn,
): Location[] {
  const mapped: Location[] = [];
  for (const loc of locs) {
    const range = spanToRange({ uri: loc.uri, span: loc.span }, lookupText);
    if (!range) continue;
    mapped.push({ uri: toLspUri(loc.uri), range });
  }
  return mapped;
}

/**
 * Map workspace locations to LSP LocationLink for definition.
 * LocationLink provides richer navigation: origin selection range,
 * target range vs target selection range, enabling peek-definition.
 *
 * When the workspace evolves to return DefinitionResult with DefinitionLinks,
 * this function will be updated to use the richer fields (originSelectionRange,
 * targetSelectionRange, declarationForm). For now, range serves double duty.
 */
export function mapWorkspaceLocationsAsLinks(
  locs: readonly WorkspaceLocation[],
  lookupText: LookupTextFn,
  originRange?: Range,
): LocationLink[] {
  const mapped: LocationLink[] = [];
  for (const loc of locs) {
    const range = spanToRange({ uri: loc.uri, span: loc.span }, lookupText);
    if (!range) continue;
    // Use selectionSpan for precise name highlighting when available (BC-2)
    const selectionRange = loc.selectionSpan
      ? spanToRange({ uri: loc.uri, span: loc.selectionSpan }, lookupText) ?? range
      : range;
    const link: LocationLink = {
      targetUri: toLspUri(loc.uri),
      targetRange: range,
      targetSelectionRange: selectionRange,
    };
    if (originRange) link.originSelectionRange = originRange;
    mapped.push(link);
  }
  return mapped;
}

// ============================================================================
// Workspace Edit Mapping — basic (changes) and rich (documentChanges)
// ============================================================================

export function mapSemanticWorkspaceEdit(
  edit: SemanticWorkspaceEdit | null,
  lookupText: LookupTextFn,
): WorkspaceEdit | null {
  if (!edit || !edit.edits.length) return null;
  const changes: Record<string, { range: Range; newText: string }[]> = {};
  for (const entry of edit.edits) {
    const range = spanToRange({ uri: entry.uri, span: entry.span }, lookupText);
    if (!range) continue;
    const uri = toLspUri(entry.uri);
    const lspEdit = { range, newText: entry.newText };
    if (!changes[uri]) changes[uri] = [];
    changes[uri].push(lspEdit);
  }
  return Object.keys(changes).length ? { changes } : null;
}

/**
 * Map a RenameResult to a rich LSP WorkspaceEdit with documentChanges
 * and change annotations. Supports:
 * - Text edits grouped by file (TextDocumentEdit)
 * - File rename operations (RenameFile)
 * - Change annotations with needsConfirmation for uncertain/file-ops groups
 *
 * This is the target mapping for when the workspace returns RenameResult
 * instead of basic WorkspaceEdit. Falls through to mapSemanticWorkspaceEdit
 * if the workspace hasn't evolved yet.
 */
export function mapRenameResult(
  result: RenameResult,
  lookupText: LookupTextFn,
): WorkspaceEdit | null {
  const documentChanges: (TextDocumentEdit | CreateFile | RenameFile)[] = [];
  const changeAnnotations: Record<string, ChangeAnnotation> = {};

  // Map annotations
  for (const annotation of result.annotations) {
    changeAnnotations[annotation.id] = {
      label: annotation.label,
      description: annotation.description,
      needsConfirmation: annotation.needsConfirmation,
    };
  }

  // Group text edits by URI
  const editsByUri = new Map<string, RenameEdit[]>();
  for (const edit of result.edits) {
    const lspUri = toLspUri(edit.uri);
    const group = editsByUri.get(lspUri);
    if (group) {
      group.push(edit);
    } else {
      editsByUri.set(lspUri, [edit]);
    }
  }

  // Create TextDocumentEdits
  for (const [lspUri, edits] of editsByUri) {
    const textEdits: ({ range: Range; newText: string; annotationId?: string })[] = [];
    for (const edit of edits) {
      const range = spanToRange({ uri: edit.uri, span: edit.span }, lookupText);
      if (!range) continue;
      const textEdit: { range: Range; newText: string; annotationId?: string } = { range, newText: edit.newText };
      if (edit.annotationId) {
        textEdit.annotationId = edit.annotationId;
      }
      textEdits.push(textEdit);
    }
    if (textEdits.length > 0) {
      documentChanges.push({
        textDocument: { uri: lspUri, version: null },
        edits: textEdits,
      });
    }
  }

  // Map file renames
  for (const fileRename of result.fileRenames) {
    documentChanges.push({
      kind: "rename",
      oldUri: toLspUri(fileRename.oldPath as DocumentUri),
      newUri: toLspUri(fileRename.newPath as DocumentUri),
    });
  }

  if (documentChanges.length === 0) return null;

  const edit: WorkspaceEdit = { documentChanges };
  if (Object.keys(changeAnnotations).length > 0) {
    edit.changeAnnotations = changeAnnotations;
  }
  return edit;
}

/**
 * Map a PrepareRenameResult to the LSP prepare rename response.
 */
export function mapPrepareRename(
  result: PrepareRenameResult,
  lookupText: LookupTextFn,
  uri: DocumentUri,
): { range: Range; placeholder: string } | null {
  const range = spanToRange({ uri, span: result.range }, lookupText);
  if (!range) return null;
  return { range, placeholder: result.placeholder };
}
