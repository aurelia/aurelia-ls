import { DiagnosticSeverity, type Diagnostic } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  mapOverlayOffsetToHtml,
  provenanceSpan,
  spanLength,
  intersectSpans,
  normalizeSpan,
  type TemplateCompilation,
  type TemplateMappingArtifact,
  type TemplateMappingEntry,
  type CompilerDiagnostic,
  type SourceSpan,
} from "@aurelia-ls/domain";

function spanToRange(doc: TextDocument, span: SourceSpan) {
  const normalized = normalizeSpan(span);
  return { start: doc.positionAt(normalized.start), end: doc.positionAt(normalized.end) };
}

export function mapCompilerDiagnosticsToLsp(compilation: TemplateCompilation, doc: TextDocument): Diagnostic[] {
  const diags = compilation.diagnostics.all ?? [];
  const mapped: Diagnostic[] = [];
  for (const diag of diags) {
    const span = resolveDiagnosticSpan(diag);
    if (!span) continue;
    const shrunk = shrinkSpanWithMapping(span, compilation.mapping);
    mapped.push({
      range: spanToRange(doc, shrunk),
      message: diag.message,
      severity: compilerSeverityToLsp(diag),
      code: diag.code,
      source: diag.source,
    });
  }
  return mapped;
}

export function mapTsDiagnosticsToLsp(
  compilation: TemplateCompilation,
  tsDiags: readonly import("typescript").Diagnostic[],
  doc: TextDocument,
): Diagnostic[] {
  const htmlDiags: Diagnostic[] = [];
  for (const d of tsDiags) {
    if (d.start == null || d.length == null) continue;
    const hit = mapOverlayOffsetToHtml(compilation.mapping, d.start);
    if (!hit) continue;
    const htmlSpan = hit.segment ? hit.segment.htmlSpan : hit.entry.htmlSpan;
    htmlDiags.push({
      range: spanToRange(doc, htmlSpan),
      message: flattenTsMessage(d.messageText),
      severity: tsSeverityToLsp(d.category),
      source: "aurelia-ttc",
    });
  }
  return htmlDiags;
}

export function collectBadExpressionDiagnostics(compilation: TemplateCompilation, doc: TextDocument): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const entriesByExpr = new Map<TemplateMappingEntry["exprId"], TemplateMappingEntry>();
  for (const entry of compilation.mapping.entries) entriesByExpr.set(entry.exprId, entry);

  for (const entry of compilation.exprTable ?? []) {
    const ast: any = (entry as any).ast;
    if (!ast || ast.$kind !== "BadExpression") continue;
    const mapping = entriesByExpr.get(entry.id);
    const span = mapping?.htmlSpan ?? compilation.exprSpans.get(entry.id) ?? null;
    if (!span) continue;
    const normalized = normalizeSpan(span);
    const message = ast.message ? String(ast.message) : "Malformed expression";
    diags.push({
      range: spanToRange(doc, normalized),
      message,
      severity: DiagnosticSeverity.Error,
      code: "AU1000",
      source: "lower",
    });
  }
  return diags;
}

function tsSeverityToLsp(cat: import("typescript").DiagnosticCategory): DiagnosticSeverity {
  switch (cat) {
    case 0: return DiagnosticSeverity.Error;
    case 1: return DiagnosticSeverity.Warning;
    case 2: return DiagnosticSeverity.Hint;
    case 3: return DiagnosticSeverity.Information;
    default: return DiagnosticSeverity.Error;
  }
}

function compilerSeverityToLsp(diag: CompilerDiagnostic): DiagnosticSeverity {
  switch (diag.severity) {
    case "warning": return DiagnosticSeverity.Warning;
    case "info": return DiagnosticSeverity.Information;
    default: return DiagnosticSeverity.Error;
  }
}

function flattenTsMessage(msg: string | import("typescript").DiagnosticMessageChain): string {
  if (typeof msg === "string") return msg;
  const parts: string[] = [msg.messageText];
  let next = msg.next?.[0];
  while (next) { parts.push(next.messageText); next = next.next?.[0]; }
  return parts.join(" ");
}

function resolveDiagnosticSpan(diag: CompilerDiagnostic): SourceSpan | null {
  const span = provenanceSpan(diag.origin ?? null) ?? diag.span ?? null;
  if (!span) return null;
  return normalizeSpan(span);
}

function shrinkSpanWithMapping(span: SourceSpan, mapping: TemplateMappingArtifact): SourceSpan {
  const normalized = normalizeSpan(span);
  let best: SourceSpan | null = null;
  let entry: TemplateMappingEntry | null = null;

  for (const candidate of mapping.entries) {
    const overlap = intersectSpans(normalized, candidate.htmlSpan);
    if (!overlap) continue;
    best = overlap;
    entry = candidate;
    break;
  }

  if (!entry || !best) return normalized;

  for (const seg of entry.segments ?? []) {
    const overlap = intersectSpans(normalized, seg.htmlSpan);
    if (!overlap) continue;
    if (spanLength(overlap) < spanLength(best)) best = overlap;
  }

  return spanLength(best) < spanLength(normalized) ? best : normalized;
}
