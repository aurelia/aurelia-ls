/**
 * Type mapping utilities: workspace/compiler types -> LSP types
 */
import {
  DiagnosticSeverity as LspDiagnosticSeverity,
  type CompletionItem,
  type Hover,
  type Location,
  type WorkspaceEdit,
  type Diagnostic,
  type Range,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { pathToFileURL } from "node:url";
import type {
  WorkspaceCompletionItem,
  WorkspaceDiagnostic,
  WorkspaceEdit as SemanticWorkspaceEdit,
  WorkspaceHover,
  WorkspaceLocation,
} from "@aurelia-ls/semantic-workspace";
import {
  canonicalDocumentUri,
  type DocumentSpan,
  type DocumentUri,
} from "@aurelia-ls/compiler";

export type LookupTextFn = (uri: DocumentUri) => string | null;

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

function toLspSeverity(sev: "error" | "warning" | "info"): LspDiagnosticSeverity {
  switch (sev) {
    case "warning":
      return LspDiagnosticSeverity.Warning;
    case "info":
      return LspDiagnosticSeverity.Information;
    default:
      return LspDiagnosticSeverity.Error;
  }
}

export function mapWorkspaceDiagnostics(
  uri: DocumentUri,
  diags: readonly WorkspaceDiagnostic[],
  lookupText: LookupTextFn,
): Diagnostic[] {
  const mapped: Diagnostic[] = [];
  for (const diag of diags) {
    if (!diag.span) continue;
    const range = spanToRange({ uri, span: diag.span }, lookupText);
    if (!range) continue;
    const base: Diagnostic = {
      range,
      message: diag.message,
      severity: toLspSeverity(diag.severity),
      code: diag.code,
      source: diag.source ?? "aurelia",
    };
    if (diag.data) base.data = diag.data;
    mapped.push(base);
  }
  return mapped;
}

export function mapWorkspaceCompletions(items: readonly WorkspaceCompletionItem[]): CompletionItem[] {
  return items.map((item) => {
    const completion: CompletionItem = { label: item.label };
    if (item.detail) completion.detail = item.detail;
    if (item.documentation) completion.documentation = item.documentation;
    if (item.sortText) completion.sortText = item.sortText;
    if (item.insertText) completion.insertText = item.insertText;
    return completion;
  });
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
