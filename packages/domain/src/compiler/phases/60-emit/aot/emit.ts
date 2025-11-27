import type { ExprId } from "../../../model/ir.js";
import { offsetSpan, spanFromBounds, type TextSpan } from "../../../model/span.js";
import type { AotPlanModule, AotPlanSegment } from "../../50-plan/aot/types.js";

export interface AotEmitSegment {
  kind: "member";
  path: string;
  span: TextSpan;
}

export interface AotEmitMappingEntry {
  exprId: ExprId;
  span: TextSpan;
  segments?: readonly AotEmitSegment[] | undefined;
}

export interface AotEmitResult {
  text: string;
  mapping: AotEmitMappingEntry[];
}

export function emitAot(plan: AotPlanModule): AotEmitResult {
  const out: string[] = [];
  const mapping: AotEmitMappingEntry[] = [];
  let offset = 0;

  const helper = "function __au$aot(expr) { return expr; }";
  out.push(helper);
  offset += helper.length + 1;

  for (const expr of plan.expressions) {
    const line = `__au$aot(${expr.code});`;
    const exprStart = line.indexOf("(") + 1;
    const start = offset + exprStart;
    const span = spanFromBounds(start, start + expr.code.length);
    mapping.push({
      exprId: expr.exprId,
      span,
      segments: mapSegments(expr.segments, start),
    });
    out.push(line);
    offset += line.length + 1;
  }

  const text = `${out.join("\n")}\n`;
  return { text, mapping };
}

function mapSegments(segments: readonly AotPlanSegment[] | undefined, offset: number): AotEmitSegment[] | undefined {
  if (!segments || segments.length === 0) return undefined;
  return segments.map((s) => ({ kind: "member", path: s.path, span: offsetSpan(s.span, offset) }));
}

/**
 * Options for file emission.
 * - eol: line ending to use in the output (default: '\n')
 * - banner: optional banner comment at the top of the file
 * - filename: suggested filename (auto-chosen when omitted)
 */
export interface EmitOptions {
  eol?: "\n" | "\r\n";
  banner?: string;
  filename?: string;
  isJs?: boolean;
}

export interface EmitResult {
  /** Suggested filename for the AOT artifact (purely informational). */
  filename: string;
  /** Full AOT text. */
  text: string;
  /** Mapping (exprId -> AOT range) for provenance. */
  mapping: AotEmitMappingEntry[];
}

export function emitAotFile(plan: AotPlanModule, opts: EmitOptions = {}): EmitResult {
  const eol = opts.eol ?? "\n";
  const { text, mapping } = emitAot(plan);
  const adjustedMapping = eol === "\n" ? mapping : adjustMappingForEol(mapping, text, eol);
  const body = text.replace(/\n/g, eol);
  const banner = opts.banner ? `${opts.banner}${eol}` : "";
  const ext = opts.isJs ? ".js" : ".ts";
  const filename = (opts.filename ?? "__au.aot") + ext;
  // TS variant: make the file a module to avoid collision with other overlays/AOT files.
  const moduleFooter = opts.isJs ? "" : `${eol}export {}${eol}`;
  const bannerShift = banner.length;
  const shiftedMapping = bannerShift === 0
    ? adjustedMapping
    : adjustedMapping.map((m) => ({
      exprId: m.exprId,
      span: offsetSpan(m.span, bannerShift),
      segments: m.segments?.map((seg) => ({ ...seg, span: offsetSpan(seg.span, bannerShift) })),
    }));

  return { filename, text: `${banner}${body}${moduleFooter}`, mapping: shiftedMapping };
}

function adjustMappingForEol(mapping: AotEmitMappingEntry[], text: string, eol: "\n" | "\r\n"): AotEmitMappingEntry[] {
  if (eol === "\n") return mapping;
  const prefixNewlines = new Array<number>(text.length + 1);
  let count = 0;
  prefixNewlines[0] = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* '\n' */) count++;
    prefixNewlines[i + 1] = count;
  }
  const adjust = (span: TextSpan): TextSpan => {
    const extraStart = prefixNewlines[span.start]!;
    const extraEnd = prefixNewlines[span.end]!;
    return spanFromBounds(span.start + extraStart, span.end + extraEnd);
  };
  return mapping.map((m) => ({
    exprId: m.exprId,
    span: adjust(m.span),
    segments: m.segments?.map((seg) => ({ ...seg, span: adjust(seg.span) })),
  }));
}
