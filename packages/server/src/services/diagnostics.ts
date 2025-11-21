import { DiagnosticSeverity, type Diagnostic, type Position } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  mapOverlayOffsetToHtml,
  type TemplateCompilation,
  type TemplateMappingArtifact,
  type CompilerDiagnostic,
} from "@aurelia-ls/domain";

function spanToRange(doc: TextDocument, start: number, end: number) {
  return { start: doc.positionAt(start), end: doc.positionAt(end) };
}

export function mapCompilerDiagnosticsToLsp(compilation: TemplateCompilation, doc: TextDocument): Diagnostic[] {
  const diags = compilation.diagnostics.all ?? [];
  return diags
    .filter((d) => d.span?.start != null && d.span?.end != null)
    .map((d) => {
      const shrunk = shrinkSpanWithMapping(d.span!, compilation.mapping);
      return {
        range: spanToRange(doc, shrunk.start, shrunk.end),
        message: d.message,
        severity: compilerSeverityToLsp(d),
        code: d.code,
        source: d.source,
      };
    });
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
      range: spanToRange(doc, htmlSpan.start, htmlSpan.end),
      message: flattenTsMessage(d.messageText),
      severity: tsSeverityToLsp(d.category),
      source: "aurelia-ttc",
    });
  }
  return htmlDiags;
}

export function collectBadExpressionDiagnostics(compilation: TemplateCompilation, doc: TextDocument): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const entriesByExpr = new Map<string, TemplateMappingArtifact["entries"][number]>();
  for (const entry of compilation.mapping.entries) entriesByExpr.set(entry.exprId as string, entry);

  for (const entry of compilation.exprTable ?? []) {
    const ast: any = (entry as any).ast;
    if (!ast || ast.$kind !== "BadExpression") continue;
    const mapping = entriesByExpr.get(entry.id as string);
    const span = mapping?.htmlSpan ?? compilation.exprSpans.get(entry.id) ?? null;
    if (!span) continue;
    const message = ast.message ? String(ast.message) : "Malformed expression";
    diags.push({
      range: spanToRange(doc, span.start, span.end),
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

function shrinkSpanWithMapping(span: { start: number; end: number }, mapping: TemplateMappingArtifact): { start: number; end: number } {
  const hit = mapping.entries.find((m) => intersects(span, m.htmlSpan));
  if (!hit) return span;
  let best: { start: number; end: number } = hit.htmlSpan;
  for (const seg of hit.segments ?? []) {
    if (!intersects(span, seg.htmlSpan)) continue;
    if (spanSize(seg.htmlSpan) < spanSize(best)) best = seg.htmlSpan;
  }
  return spanSize(best) < spanSize(span) ? best : span;
}

function intersects(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function spanSize(span: { start: number; end: number }): number {
  return span.end - span.start;
}
