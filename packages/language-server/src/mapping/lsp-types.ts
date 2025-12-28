/**
 * Type mapping utilities: Template types → LSP types
 */
import {
  DiagnosticSeverity as LspDiagnosticSeverity,
  DiagnosticTag,
  type CompletionItem,
  type Hover,
  type Location,
  type WorkspaceEdit,
  type Diagnostic,
  type Range,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { pathToFileURL } from "node:url";
import {
  canonicalDocumentUri,
  type DocumentSpan,
  type DocumentUri,
  type TemplateLanguageDiagnostic,
  type TemplateLanguageDiagnostics,
  type TemplateLanguageService,
  type Location as TemplateLocation,
  type TextEdit as TemplateTextEdit,
  type TextRange as TemplateTextRange,
  type HoverInfo,
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

export function toRange(range: TemplateTextRange): Range {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

export function spanToRange(loc: DocumentSpan, lookupText: LookupTextFn): Range | null {
  const text = lookupText(loc.uri);
  if (!text) return null;
  const doc = TextDocument.create(toLspUri(loc.uri), guessLanguage(loc.uri), 0, text);
  return { start: doc.positionAt(loc.span.start), end: doc.positionAt(loc.span.end) };
}

function toLspSeverity(sev: TemplateLanguageDiagnostic["severity"]): LspDiagnosticSeverity {
  switch (sev) {
    case "warning":
      return LspDiagnosticSeverity.Warning;
    case "info":
      return LspDiagnosticSeverity.Information;
    default:
      return LspDiagnosticSeverity.Error;
  }
}

function toLspTags(tags: readonly string[] | undefined): DiagnosticTag[] | undefined {
  if (!tags?.length) return undefined;
  const mapped: DiagnosticTag[] = [];
  for (const tag of tags) {
    if (tag === "unnecessary") mapped.push(DiagnosticTag.Unnecessary);
    if (tag === "deprecated") mapped.push(DiagnosticTag.Deprecated);
  }
  return mapped.length ? mapped : undefined;
}

export function mapDiagnostics(diags: TemplateLanguageDiagnostics, lookupText: LookupTextFn): Diagnostic[] {
  const mapped: Diagnostic[] = [];
  for (const diag of diags.all) {
    const range = diag.location ? spanToRange(diag.location, lookupText) : null;
    if (!range) continue;
    const tags = diag.tags ? toLspTags(diag.tags) : undefined;
    const related = diag.related
      ?.map((rel) => {
        if (!rel.location) return null;
        const relRange = spanToRange(rel.location, lookupText);
        return relRange ? { message: rel.message, location: { uri: toLspUri(rel.location.uri), range: relRange } } : null;
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    const base: Diagnostic = {
      range,
      message: diag.message,
      severity: toLspSeverity(diag.severity),
      code: diag.code,
      source: diag.source,
    };

    if (related?.length) base.relatedInformation = related;
    if (tags) base.tags = tags;

    mapped.push(base);
  }
  return mapped;
}

export function mapCompletions(items: ReturnType<TemplateLanguageService["getCompletions"]>): CompletionItem[] {
  return items.map((item) => {
    const completion: CompletionItem = { label: item.label };
    if (item.detail) completion.detail = item.detail;
    if (item.documentation) completion.documentation = item.documentation;
    if (item.sortText) completion.sortText = item.sortText;
    if (item.insertText) completion.insertText = item.insertText;
    if (item.range) {
      completion.textEdit = { range: toRange(item.range), newText: item.insertText ?? item.label };
    }
    return completion;
  });
}

export function mapHover(hover: HoverInfo | null): Hover | null {
  if (!hover) return null;
  return {
    contents: { kind: "markdown", value: hover.contents },
    range: toRange(hover.range),
  };
}

export function mapLocations(locs: readonly TemplateLocation[] | null | undefined): Location[] {
  return (locs ?? []).map((loc) => ({ uri: toLspUri(loc.uri), range: toRange(loc.range) }));
}

export function mapWorkspaceEdit(edits: readonly TemplateTextEdit[]): WorkspaceEdit | null {
  if (!edits.length) return null;
  const changes: Record<string, { range: Range; newText: string }[]> = {};
  for (const edit of edits) {
    const uri = toLspUri(edit.uri);
    const lspEdit = { range: toRange(edit.range), newText: edit.newText };
    if (!changes[uri]) changes[uri] = [];
    changes[uri].push(lspEdit);
  }
  return { changes };
}
