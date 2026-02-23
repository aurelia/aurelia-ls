/**
 * Type mapping utilities: workspace/compiler types -> LSP types
 */
import {
  CompletionItemKind,
  DiagnosticSeverity as LspDiagnosticSeverity,
  type CompletionItem,
  type CompletionList,
  type Hover,
  type Location,
  type WorkspaceEdit,
  type Diagnostic,
  type DiagnosticRelatedInformation,
  type Range,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { pathToFileURL } from "node:url";
import type {
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
};

type RecordValue = Readonly<Record<string, unknown>>;

export function toLspUri(uri: DocumentUri): string {
  const canonical = canonicalDocumentUri(uri);
  // canonical.path may be:
  // 1. A filesystem path (e.g., "c:/projects/file.ts") - needs conversion
  // 2. A file:// URI string (e.g., "file:///app/file.ts") - already valid
  const pathOrUri = canonical.path;

  // If it's already a file:// URI, return it directly
  if (pathOrUri.startsWith("file://")) {
    return pathOrUri;
  }

  // Otherwise, convert the filesystem path to a file:// URI
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

function toLspSeverity(sev?: "error" | "warning" | "info"): LspDiagnosticSeverity | undefined {
  if (!sev) return undefined;
  switch (sev) {
    case "warning":
      return LspDiagnosticSeverity.Warning;
    case "info":
      return LspDiagnosticSeverity.Information;
    default:
      return LspDiagnosticSeverity.Error;
  }
}

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
    const base: Diagnostic = {
      range,
      message: diag.message,
      code: diag.code,
      source: diag.source ?? "aurelia",
    };
    if (severity !== undefined) base.severity = severity;
    base.data = mergeDiagnosticData(diag);
    if (related.length > 0) base.relatedInformation = related;
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
      },
    ],
  };
}

export function mapWorkspaceHover(hover: WorkspaceHover | null, lookupText: LookupTextFn): Hover | null {
  if (!hover) return null;
  const range = hover.location ? spanToRange({ uri: hover.location.uri, span: hover.location.span }, lookupText) : null;
  return {
    contents: { kind: "markdown", value: hover.contents },
    ...(range ? { range } : {}),
  };
}

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
