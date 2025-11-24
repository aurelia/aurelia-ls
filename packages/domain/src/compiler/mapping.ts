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
import { normalizeSpan } from "./model/span.js";
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
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];
    const segments = buildSegmentPairs(m.segments ?? [], htmlSegments);
    return normalizeMappingEntry({
      exprId: m.exprId,
      htmlSpan,
      overlaySpan: normalizeSpan(m.span),
      frameId: exprIdMapGet(inputs.exprToFrame ?? null, m.exprId) ?? undefined,
      segments: segments.length > 0 ? segments : undefined,
    });
  });

  return { mapping: { kind: "mapping", entries }, exprSpans, spanIndex: exprSpanIndex };
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
    out.push({
      kind: "member",
      path: seg.path,
      htmlSpan: normalizeSpan(h.span),
      overlaySpan: normalizeSpan(seg.span),
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
