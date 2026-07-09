import type { Range } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";

export interface SourceSpan {
  readonly start: number;
  readonly end: number;
}

export interface DiagnosticWithSpan {
  readonly span?: SourceSpan | null;
}

export function spanToDocumentRange(doc: TextDocument, span: SourceSpan): Range {
  const normalized = normalizeSpan(span);
  return { start: doc.positionAt(normalized.start), end: doc.positionAt(normalized.end) };
}

export function spanToRangeOrNull(doc: TextDocument, span: SourceSpan | null | undefined): Range | null {
  if (!span) return null;
  return spanToDocumentRange(doc, span);
}

export function diagnosticToRange(doc: TextDocument, diag: DiagnosticWithSpan): Range | null {
  return spanToRangeOrNull(doc, diag.span);
}

function normalizeSpan(span: SourceSpan): SourceSpan {
  return span.start <= span.end
    ? span
    : { start: span.end, end: span.start };
}
