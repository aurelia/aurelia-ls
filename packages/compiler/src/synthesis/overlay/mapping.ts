import type { BindingSourceIR, ExprId, ExprTableEntry, IrModule, SourceSpan, TextSpan } from "../../model/ir.js";
import type { FrameId, FrameOrigin } from "../../model/symbols.js";
import type { OverlayEmitMappingEntry } from "./emit.js";
import {
  buildExprSpanIndex,
  collectExprMemberSegments,
  type ExprSpanIndex,
  type HtmlMemberSegment,
} from "../../shared/expr-utils.js";
import { normalizeSpan, spanLength } from "../../model/span.js";
import { resolveSourceSpan, type SourceFile } from "../../model/source.js";
import { exprIdMapGet, type ExprIdMap, type ExprIdMapLike } from "../../model/identity.js";
import { isInterpolation } from "../../shared/expr-utils.js";

export interface TemplateMappingEntry {
  exprId: ExprId;
  htmlSpan: SourceSpan;
  overlaySpan: TextSpan;
  /** Span of the full __au$access call in the overlay. Probe here for the
   *  expression result type (the call's return type per TS). */
  callSpan?: TextSpan | undefined;
  frameId?: FrameId | undefined;
  frameOrigin?: FrameOrigin | undefined;
  segments?: readonly TemplateMappingSegment[] | undefined;
}

export interface TemplateMappingArtifact {
  kind: "mapping";
  entries: readonly TemplateMappingEntry[];
}

export interface TemplateMappingSegment {
  kind: "member";
  path: string;
  htmlSpan: SourceSpan;
  overlaySpan: TextSpan;
  degradation?: TemplateMappingDegradation | undefined;
}

export interface TemplateMappingDegradation {
  readonly reason: "missing-html-member-span";
  readonly projection: "proportional";
}

export interface BuildMappingInputs {
  overlayMapping: readonly OverlayEmitMappingEntry[];
  ir: IrModule;
  exprTable?: readonly ExprTableEntry[];
  fallbackFile: SourceFile;
  overlayFile?: SourceFile | null;
  exprToFrame?: ExprIdMapLike<FrameId> | null;
  frameOrigins?: ReadonlyMap<FrameId, FrameOrigin> | null;
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
  const interpolationGroups = collectInterpolationGroups(inputs.ir);

  type OwnedSegment = TemplateMappingSegment & { exprId: ExprId };
  type OverlayEntry = {
    exprId: ExprId;
    htmlSpan: SourceSpan;
    overlaySpan: TextSpan;
    callSpan?: TextSpan;
    frameId?: FrameId;
    frameOrigin?: FrameOrigin;
    segments: OwnedSegment[];
  };

  const overlayEntries: OverlayEntry[] = inputs.overlayMapping.map((m) => {
    const htmlSpan = exprSpanIndex.ensure(m.exprId, inputs.fallbackFile);
    const overlaySpan = inputs.overlayFile
      ? resolveSourceSpan(m.span as SourceSpan, inputs.overlayFile)
      : normalizeSpan(m.span);
    const callSpan = m.callSpan
      ? (inputs.overlayFile ? resolveSourceSpan(m.callSpan as SourceSpan, inputs.overlayFile) : normalizeSpan(m.callSpan))
      : undefined;
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];
    const frameId = exprIdMapGet(inputs.exprToFrame ?? null, m.exprId) ?? undefined;
    const frameOrigin = frameId !== undefined ? inputs.frameOrigins?.get(frameId) : undefined;

    const segments = buildSegmentPairs(
      m.segments ?? [],
      htmlSegments,
      htmlSpan,
      overlaySpan,
      inputs.overlayFile ?? null,
    ).map((seg) => ({ ...seg, exprId: m.exprId }));

    return {
      exprId: m.exprId,
      htmlSpan,
      overlaySpan,
      ...(callSpan ? { callSpan } : {}),
      ...(frameId !== undefined ? { frameId } : {}),
      ...(frameOrigin !== undefined ? { frameOrigin } : {}),
      segments,
    };
  });

  const segmentsByExpr = new Map<ExprId, OwnedSegment[]>(overlayEntries.map((e) => [e.exprId, e.segments]));
  const aggregatedSegments = new Map<ExprId, TemplateMappingSegment[] | undefined>();

  for (const entry of overlayEntries) {
    const groupedSegments = mergeGroupSegments(entry.exprId, interpolationGroups, segmentsByExpr);
    aggregatedSegments.set(entry.exprId, groupedSegments);
  }

  const entries: TemplateMappingEntry[] = overlayEntries.map((entry) =>
    normalizeMappingEntry({
      exprId: entry.exprId,
      htmlSpan: entry.htmlSpan,
      overlaySpan: entry.overlaySpan,
      ...(entry.callSpan ? { callSpan: entry.callSpan } : {}),
      ...(entry.frameId !== undefined ? { frameId: entry.frameId } : {}),
      ...(entry.frameOrigin !== undefined ? { frameOrigin: entry.frameOrigin } : {}),
      ...(aggregatedSegments.get(entry.exprId)?.length ? { segments: aggregatedSegments.get(entry.exprId) } : {}),
    }),
  );

  return { mapping: { kind: "mapping", entries }, exprSpans, spanIndex: exprSpanIndex };
}

function buildSegmentPairs(
  overlaySegments: readonly { path: string; span: TextSpan }[],
  htmlSegments: readonly HtmlMemberSegment[],
  exprHtmlSpan: SourceSpan,
  exprOverlaySpan: TextSpan,
  overlayFile: SourceFile | null,
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
    let degradation: TemplateMappingDegradation | undefined;

    if (candidates && candidates.length > 0) {
      // Prefer the first unused HTML segment for this path; fall back to the last one.
      const htmlSeg = candidates.find((h) => !usedHtml.has(h)) ?? candidates[candidates.length - 1]!;
      usedHtml.add(htmlSeg);
      htmlSpan = normalizeSpan(htmlSeg.span);
    } else {
      // No AST-derived HTML span for this path; synthesize one by projecting
      // the overlay slice proportionally into the full expression HTML span.
      htmlSpan = projectOverlayMemberSegmentToHtml(overlaySeg.span, exprOverlaySpan, exprHtmlSpan);
      degradation = {
        reason: "missing-html-member-span",
        projection: "proportional",
      };
    }

    out.push({
      kind: "member",
      path: overlaySeg.path,
      htmlSpan,
      overlaySpan: overlayFile ? resolveSourceSpan(overlaySeg.span as SourceSpan, overlayFile) : normalizeSpan(overlaySeg.span),
      ...(degradation ? { degradation } : {}),
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
    ...(seg.degradation ? { degradation: seg.degradation } : {}),
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

function collectInterpolationGroups(ir: IrModule): Map<ExprId, ExprId[]> {
  const groups = new Map<ExprId, ExprId[]>();
  const record = (exprs: readonly { id: ExprId }[] | undefined) => {
    if (!exprs || exprs.length === 0) return;
    const ids = exprs.map((e) => e.id);
    for (const id of ids) {
      if (!groups.has(id)) groups.set(id, ids);
    }
  };
  const recordSource = (src: BindingSourceIR | undefined) => {
    if (!src) return;
    if (isInterpolation(src)) record(src.exprs);
  };

  for (const t of ir.templates) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        switch (ins.type) {
          case "propertyBinding":
          case "attributeBinding":
          case "stylePropertyBinding":
          case "textBinding":
            recordSource(ins.from);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding") recordSource(p.from);
            }
            if (ins.branch?.kind === "case") {
              recordSource(ins.branch.expr);
            }
            break;
          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) recordSource(lb.from);
            break;
          default:
            break;
        }
      }
    }
  }

  return groups;
}

function mergeGroupSegments(
  exprId: ExprId,
  groups: Map<ExprId, ExprId[]>,
  segmentsByExpr: Map<ExprId, (TemplateMappingSegment & { exprId: ExprId })[]>,
): TemplateMappingSegment[] | undefined {
  const group = groups.get(exprId) ?? [exprId];
  const combined: (TemplateMappingSegment & { exprId: ExprId })[] = [];
  for (const id of group) {
    const segs = segmentsByExpr.get(id);
    if (segs) combined.push(...segs);
  }
  if (combined.length === 0) return undefined;

  // For multi-expression interpolations, keep only the deepest paths to avoid
  // duplicating shared roots (e.g., "person" alongside "person.name"/"person.age").
  const paths = new Map<string, (TemplateMappingSegment & { exprId: ExprId })[]>();
  for (const seg of combined) {
    const bucket = paths.get(seg.path);
    if (bucket) bucket.push(seg);
    else paths.set(seg.path, [seg]);
  }

  const isLeaf = (path: string): boolean => {
    for (const other of paths.keys()) {
      if (other === path) continue;
      if (isPathPrefix(path, other)) return false;
    }
    return true;
  };

  const pickBest = (candidates: (TemplateMappingSegment & { exprId: ExprId })[]): TemplateMappingSegment & { exprId: ExprId } => {
    let best = candidates[0]!;
    for (let i = 1; i < candidates.length; i += 1) {
      const current = candidates[i]!;
      // Prefer exact mappings over degraded projections for the same path.
      if (!current.degradation && best.degradation) {
        best = current;
        continue;
      }
      if (!best.degradation && current.degradation) continue;
      // Prefer segments that belong to the current expression.
      if (current.exprId === exprId && best.exprId !== exprId) {
        best = current;
        continue;
      }
      if (best.exprId === exprId && current.exprId !== exprId) continue;
      const bestHtml = spanLength(best.htmlSpan);
      const curHtml = spanLength(current.htmlSpan);
      if (curHtml < bestHtml) {
        best = current;
        continue;
      }
      const bestOverlay = spanLength(best.overlaySpan);
      const curOverlay = spanLength(current.overlaySpan);
      if (curOverlay < bestOverlay) best = current;
    }
    return best;
  };

  const leavesOnly = group.length > 1;
  const results: TemplateMappingSegment[] = [];
  for (const [path, segs] of paths.entries()) {
    if (leavesOnly && !isLeaf(path)) continue;
    const chosen = pickBest(segs);
    results.push({
      kind: "member",
      path,
      htmlSpan: chosen.htmlSpan,
      overlaySpan: chosen.overlaySpan,
      ...(chosen.degradation ? { degradation: chosen.degradation } : {}),
    });
  }

  return results;
}

function isPathPrefix(path: string, other: string): boolean {
  if (path.length >= other.length) return false;
  if (!other.startsWith(path)) return false;
  const boundary = other.charAt(path.length);
  return boundary === "." || boundary === "[";
}
