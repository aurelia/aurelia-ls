import { DiagnosticSeverity, type Diagnostic } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  diagnosticSpan,
  mapOverlayOffsetToHtml,
  shrinkSpanToMapping,
  type TemplateCompilation,
  type CompilerDiagnostic,
  type TemplateMappingEntry,
} from "@aurelia-ls/domain";
import { spanToRange, spanToRangeOrNull } from "./spans.js";

export function mapCompilerDiagnosticsToLsp(compilation: TemplateCompilation, doc: TextDocument): Diagnostic[] {
  const diags = compilation.diagnostics.all ?? [];
  const mapped: Diagnostic[] = [];
  for (const diag of diags) {
    const baseSpan = diagnosticSpan(diag);
    if (!baseSpan) continue;
    const shrunk = shrinkSpanToMapping(baseSpan, compilation.mapping);
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
    const range = spanToRangeOrNull(doc, htmlSpan);
    if (!range) continue;
    htmlDiags.push({
      range,
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
    if (entry.ast.$kind !== "BadExpression") continue;
    const mapping = entriesByExpr.get(entry.id);
    const span = mapping?.htmlSpan ?? compilation.exprSpans.get(entry.id) ?? null;
    const range = spanToRangeOrNull(doc, span);
    if (!range) continue;
    const message = entry.ast.message ? String(entry.ast.message) : "Malformed expression";
    diags.push({
      range,
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
