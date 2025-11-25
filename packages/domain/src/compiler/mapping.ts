import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment } from "../contracts.js";
import type { ExprTableEntry, IrModule, SourceSpan, TextSpan } from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { OverlayEmitMappingEntry } from "./phases/60-emit/overlay/emit.js";
import {
  buildExprSpanIndex,
  collectExprMemberSegments,
  type ExprSpanIndex,
  type HtmlMemberSegment,
} from "./expr-utils.js";
import { normalizeSpan, spanLength } from "./model/span.js";
import type { SourceFile } from "./model/source.js";
import { exprIdMapGet, type ExprIdMap, type ExprIdMapLike } from "./model/identity.js";

export interface BuildMappingInputs {
  overlayMapping: readonly OverlayEmitMappingEntry[];
  ir: IrModule;
  exprTable?: readonly ExprTableEntry[];
  fallbackFile: SourceFile;
  exprToFrame?: ExprIdMapLike<FrameId> | null;
}

export interface BuildMappingResult {
  mapping: TemplateMappingArtifact;
  exprSpans: ExprIdMap<SourceSpan>;
  spanIndex: ExprSpanIndex;
}

export function buildTemplateMapping(inputs: BuildMappingInputs): BuildMappingResult {
  const exprSpanIndex = buildExprSpanIndex(inputs.ir, inputs.fallbackFile);
  const exprSpans = exprSpanIndex.spans;
  const memberHtmlSegments = collectExprMemberSegments(inputs.exprTable ?? [], exprSpans);

  const entries: TemplateMappingEntry[] = inputs.overlayMapping.map((m) => {
    const htmlSpan = exprSpanIndex.ensure(m.exprId, inputs.fallbackFile);
    const overlaySpan = normalizeSpan(m.span);
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];

    const segments = buildSegmentPairs(
      m.segments ?? [],
      htmlSegments,
      htmlSpan,
      overlaySpan,
    );

    return normalizeMappingEntry({
      exprId: m.exprId,
      htmlSpan,
      overlaySpan,
      frameId: exprIdMapGet(inputs.exprToFrame ?? null, m.exprId) ?? undefined,
      segments: segments.length > 0 ? segments : undefined,
    });
  });

  return { mapping: { kind: "mapping", entries }, exprSpans, spanIndex: exprSpanIndex };
}

function buildSegmentPairs(
  overlaySegments: readonly { path: string; span: TextSpan }[],
  htmlSegments: readonly HtmlMemberSegment[],
  exprHtmlSpan: SourceSpan,
  exprOverlaySpan: TextSpan,
): TemplateMappingSegment[] {
  if (overlaySegments.length === 0) return [];

  // Index HTML member segments by path so we can pair them when possible.
  const htmlByPath = new Map<string, HtmlMemberSegment[]>();
  for (const seg of htmlSegments) {
    const list = htmlByPath.get(seg.path);
    if (list) list.push(seg);
    else htmlByPath.set(seg.path, [seg]);
  }

  const usedHtml = new Set<HtmlMemberSegment>();
  const out: TemplateMappingSegment[] = [];

  for (const overlaySeg of overlaySegments) {
    const candidates = htmlByPath.get(overlaySeg.path);
    let htmlSpan: SourceSpan;

    if (candidates && candidates.length > 0) {
      // Prefer the first unused HTML segment for this path; fall back to the last one.
      const htmlSeg = candidates.find((h) => !usedHtml.has(h)) ?? candidates[candidates.length - 1]!;
      usedHtml.add(htmlSeg);
      htmlSpan = normalizeSpan(htmlSeg.span);
    } else {
      // No AST-derived HTML span for this path; synthesize one by projecting
      // the overlay slice proportionally into the full expression HTML span.
      htmlSpan = projectOverlayMemberSegmentToHtml(overlaySeg.span, exprOverlaySpan, exprHtmlSpan);
    }

    out.push({
      kind: "member",
      path: overlaySeg.path,
      htmlSpan,
      overlaySpan: normalizeSpan(overlaySeg.span),
    });
  }

  return out;
}

function normalizeMappingEntry(entry: TemplateMappingEntry): TemplateMappingEntry {
  const htmlSpan = normalizeSpan(entry.htmlSpan);
  const overlaySpan = normalizeSpan(entry.overlaySpan);
  if (!entry.segments || entry.segments.length === 0) {
    return { ...entry, htmlSpan, overlaySpan };
  }
  const segments = entry.segments.map((seg) => ({
    kind: "member" as const,
    path: seg.path,
    htmlSpan: normalizeSpan(seg.htmlSpan),
    overlaySpan: normalizeSpan(seg.overlaySpan),
  }));
  return { ...entry, htmlSpan, overlaySpan, segments };
}

/**
 * Fallback projection when we have an overlay member segment but no
 * HTML member span from the AST. We treat the segment as a slice of the
 * full overlay expression span and map it proportionally into the full
 * HTML expression span.
 */
function projectOverlayMemberSegmentToHtml(
  overlaySlice: TextSpan,
  exprOverlaySpan: TextSpan,
  exprHtmlSpan: SourceSpan,
): SourceSpan {
  const from = normalizeSpan(exprOverlaySpan);
  const to = normalizeSpan(exprHtmlSpan);

  const fromLen = Math.max(1, spanLength(from));
  const toLen = Math.max(0, spanLength(to));

  const sliceStart = clamp(overlaySlice.start, from.start, from.end);
  const sliceEnd = clamp(overlaySlice.end, from.start, from.end);

  // If the slice covers the whole expression, just return the full HTML span.
  if (sliceStart === from.start && sliceEnd === from.end) {
    return exprHtmlSpan.file !== undefined
      ? { start: to.start, end: to.end, file: exprHtmlSpan.file }
      : { start: to.start, end: to.end };
  }

  const startRatio = (sliceStart - from.start) / fromLen;
  const endRatio = (sliceEnd - from.start) / fromLen;

  const rawStart = to.start + startRatio * toLen;
  const rawEnd = to.start + endRatio * toLen;

  const clampedStart = clamp(rawStart, to.start, to.end);
  const clampedEnd = clamp(rawEnd, to.start, to.end);

  const start = Math.round(Math.min(clampedStart, clampedEnd));
  const end = Math.round(Math.max(clampedStart, clampedEnd));

  if (exprHtmlSpan.file !== undefined) {
    return { start, end, file: exprHtmlSpan.file };
  }
  return { start, end };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
