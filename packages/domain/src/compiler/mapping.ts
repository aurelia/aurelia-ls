import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment } from "../contracts.js";
import type {
  ExprId,
  ExprRef,
  ExprTableEntry,
  IrModule,
  SourceSpan,
} from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { OverlayEmitMappingEntry } from "./phases/60-emit/overlay/emit.js";
import { collectExprMemberSegments, collectExprSpans, type HtmlMemberSegment } from "./expr-utils.js";
import { spanLength } from "./model/span.js";

export interface BuildMappingInputs {
  overlayMapping: readonly OverlayEmitMappingEntry[];
  ir: IrModule;
  exprTable?: readonly ExprTableEntry[];
  fallbackFile: string;
  exprToFrame?: Record<ExprId, FrameId> | null;
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
  const exprSpans = collectExprSpans(inputs.ir);
  const memberHtmlSegments = collectExprMemberSegments(inputs.exprTable ?? [], exprSpans);
  const entries: TemplateMappingEntry[] = inputs.overlayMapping.map((m) => {
    const htmlSpan = exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: inputs.fallbackFile };
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];
    const segments = buildSegmentPairs(m.segments ?? [], htmlSegments);
    return {
      exprId: m.exprId,
      htmlSpan,
      overlayRange: [m.start, m.end],
      frameId: inputs.exprToFrame?.[m.exprId] ?? undefined,
      segments: segments.length > 0 ? segments : undefined,
    };
  });

  return { mapping: { kind: "mapping", entries }, exprSpans };
}

/** Map an overlay offset back to the best-matching HTML span. */
export function overlayOffsetToHtml(mapping: TemplateMappingArtifact, overlayOffset: number): MappingHit | null {
  for (const entry of mapping.entries) {
    for (const seg of entry.segments ?? []) {
      if (overlayOffset >= seg.overlaySpan[0] && overlayOffset <= seg.overlaySpan[1]) {
        return { entry, segment: seg };
      }
    }
  }
  const fallback = mapping.entries.find((entry) => overlayOffset >= entry.overlayRange[0] && overlayOffset <= entry.overlayRange[1]);
  return fallback ? { entry: fallback, segment: null } : null;
}

/** Map an HTML offset to the best-matching overlay span. */
export function htmlOffsetToOverlay(mapping: TemplateMappingArtifact, htmlOffset: number): MappingHit | null {
  let bestSegment: MappingHit | null = null;
  for (const entry of mapping.entries) {
    for (const seg of entry.segments ?? []) {
      if (htmlOffset >= seg.htmlSpan.start && htmlOffset <= seg.htmlSpan.end) {
        if (!bestSegment || spanLength(seg.htmlSpan) < spanLength(bestSegment.segment!.htmlSpan)) {
          bestSegment = { entry, segment: seg };
        }
      }
    }
  }
  if (bestSegment) return bestSegment;
  const fallback = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
  return fallback ? { entry: fallback, segment: null } : null;
}

function buildSegmentPairs(
  overlaySegments: readonly { path: string; span: readonly [number, number] }[],
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
    out.push({ kind: "member", path: seg.path, htmlSpan: h.span, overlaySpan: [seg.span[0], seg.span[1]] });
  }
  return out;
}
