import { diagnosticSpan, normalizeSpan, type CompilerDiagnostic, type SourceSpan } from "@aurelia-ls/domain";
import type { Range } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";

export function spanToRange(doc: TextDocument, span: SourceSpan): Range {
  const normalized = normalizeSpan(span);
  return { start: doc.positionAt(normalized.start), end: doc.positionAt(normalized.end) };
}

export function spanToRangeOrNull(doc: TextDocument, span: SourceSpan | null | undefined): Range | null {
  if (!span) return null;
  return spanToRange(doc, span);
}

export function diagnosticToRange(doc: TextDocument, diag: CompilerDiagnostic): Range | null {
  return spanToRangeOrNull(doc, diagnosticSpan(diag));
}
