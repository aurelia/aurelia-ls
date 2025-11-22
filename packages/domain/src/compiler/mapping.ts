import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment } from "../contracts.js";
import type {
  ExprId,
  ExprRef,
  ExprTableEntry,
  IrModule,
  SourceSpan,
  TextSpan,
} from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { OverlayEmitMappingEntry } from "./phases/60-emit/overlay/emit.js";
import { collectExprMemberSegments, collectExprSpans, ensureExprSpan, resolveExprSpanIndex, type HtmlMemberSegment } from "./expr-utils.js";
import { pickNarrowestContaining, spanContainsOffset, type SpanLike } from "./model/span.js";
import type { SourceFile } from "./model/source.js";
import { exprIdMapGet, type ExprIdMapLike } from "./model/identity.js";

export interface BuildMappingInputs {
  overlayMapping: readonly OverlayEmitMappingEntry[];
  ir: IrModule;
  exprTable?: readonly ExprTableEntry[];
  fallbackFile: SourceFile;
  exprToFrame?: ExprIdMapLike<FrameId> | null;
}

export interface BuildMappingResult {
  mapping: TemplateMappingArtifact;
  exprSpans: Map<ExprId, SourceSpan>;
}

export interface MappingHit {
  entry: TemplateMappingEntry;
  segment?: TemplateMappingSegment | null;
}

export function buildTemplateMapping(inputs: BuildMappingInputs): BuildMappingResult {
  const exprSpans = resolveExprSpanIndex(collectExprSpans(inputs.ir), inputs.fallbackFile);
  const memberHtmlSegments = collectExprMemberSegments(inputs.exprTable ?? [], exprSpans);
  const entries: TemplateMappingEntry[] = inputs.overlayMapping.map((m) => {
    const htmlSpan = ensureExprSpan(exprSpans.get(m.exprId), inputs.fallbackFile);
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];
    const segments = buildSegmentPairs(m.segments ?? [], htmlSegments);
    return {
      exprId: m.exprId,
      htmlSpan,
      overlaySpan: m.span,
      frameId: exprIdMapGet(inputs.exprToFrame ?? null, m.exprId) ?? undefined,
      segments: segments.length > 0 ? segments : undefined,
    };
  });

  return { mapping: { kind: "mapping", entries }, exprSpans };
}

/** Map an overlay offset back to the best-matching HTML span. */
export function overlayOffsetToHtml(mapping: TemplateMappingArtifact, overlayOffset: number): MappingHit | null {
  const best = pickBestSegment(mapping.entries, overlayOffset, (seg) => seg.overlaySpan);
  if (best) return best;
  const fallback = mapping.entries.find((entry) => spanContainsOffset(entry.overlaySpan, overlayOffset));
  return fallback ? { entry: fallback, segment: null } : null;
}

/** Map an HTML offset to the best-matching overlay span. */
export function htmlOffsetToOverlay(mapping: TemplateMappingArtifact, htmlOffset: number): MappingHit | null {
  const best = pickBestSegment(mapping.entries, htmlOffset, (seg) => seg.htmlSpan);
  if (best) return best;
  const fallback = mapping.entries.find((entry) => spanContainsOffset(entry.htmlSpan, htmlOffset));
  return fallback ? { entry: fallback, segment: null } : null;
}

function buildSegmentPairs(
  overlaySegments: readonly { path: string; span: TextSpan }[],
  htmlSegments: readonly HtmlMemberSegment[],
): TemplateMappingSegment[] {
  if (overlaySegments.length === 0 || htmlSegments.length === 0) return [];
  const used = new Set<number>();
  const out: TemplateMappingSegment[] = [];
  for (const seg of overlaySegments) {
    const idx = htmlSegments.findIndex((h, i) => !used.has(i) && h.path === seg.path);
    if (idx === -1) continue;
    const h = htmlSegments[idx]!;
    used.add(idx);
    out.push({ kind: "member", path: seg.path, htmlSpan: h.span, overlaySpan: seg.span });
  }
  return out;
}

function pickBestSegment(
  entries: readonly TemplateMappingEntry[],
  offset: number,
  spanOf: (seg: TemplateMappingSegment) => SpanLike,
): MappingHit | null {
  const best = pickNarrowestContaining(segmentPairs(entries), offset, (pair) => spanOf(pair.segment));
  return best ? { entry: best.entry, segment: best.segment } : null;
}

function* segmentPairs(
  entries: readonly TemplateMappingEntry[],
): Iterable<{ entry: TemplateMappingEntry; segment: TemplateMappingSegment }> {
  for (const entry of entries) {
    for (const segment of entry.segments ?? []) {
      yield { entry, segment };
    }
  }
}
