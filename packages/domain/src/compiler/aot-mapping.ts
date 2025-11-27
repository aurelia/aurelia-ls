import type { BindingSourceIR, ExprId, ExprTableEntry, IrModule, SourceSpan, TextSpan } from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { AotEmitMappingEntry } from "./phases/60-emit/aot/emit.js";
import {
  buildExprSpanIndex,
  collectExprMemberSegments,
  type ExprSpanIndex,
  type HtmlMemberSegment,
} from "./expr-utils.js";
import { normalizeSpan, spanLength } from "./model/span.js";
import { resolveSourceSpan, type SourceFile } from "./model/source.js";
import { exprIdMapGet, type ExprIdMap, type ExprIdMapLike } from "./model/identity.js";
import { isInterpolation } from "./expr-utils.js";

export interface AotMappingEntry {
  exprId: ExprId;
  htmlSpan: SourceSpan;
  aotSpan: TextSpan;
  frameId?: FrameId | undefined;
  segments?: readonly AotMappingSegment[] | undefined;
}

export interface AotMappingArtifact {
  kind: "aot-mapping";
  entries: readonly AotMappingEntry[];
}

export interface AotMappingSegment {
  kind: "member";
  path: string;
  htmlSpan: SourceSpan;
  aotSpan: TextSpan;
}

export interface BuildAotMappingInputs {
  aotMapping: readonly AotEmitMappingEntry[];
  ir: IrModule;
  exprTable?: readonly ExprTableEntry[];
  fallbackFile: SourceFile;
  aotFile?: SourceFile | null;
  exprToFrame?: ExprIdMapLike<FrameId> | null;
}

export interface BuildAotMappingResult {
  mapping: AotMappingArtifact;
  exprSpans: ExprIdMap<SourceSpan>;
  spanIndex: ExprSpanIndex;
}

export function buildAotMapping(inputs: BuildAotMappingInputs): BuildAotMappingResult {
  const exprSpanIndex = buildExprSpanIndex(inputs.ir, inputs.fallbackFile);
  const exprSpans = exprSpanIndex.spans;
  const memberHtmlSegments = collectExprMemberSegments(inputs.exprTable ?? [], exprSpans);
  const interpolationGroups = collectInterpolationGroups(inputs.ir);

  type OwnedSegment = AotMappingSegment & { exprId: ExprId };
  type AotEntry = {
    exprId: ExprId;
    htmlSpan: SourceSpan;
    aotSpan: TextSpan;
    frameId?: FrameId;
    segments: OwnedSegment[];
  };

  const aotEntries: AotEntry[] = inputs.aotMapping.map((m) => {
    const htmlSpan = exprSpanIndex.ensure(m.exprId, inputs.fallbackFile);
    const aotSpan = inputs.aotFile
      ? resolveSourceSpan(m.span as SourceSpan, inputs.aotFile)
      : normalizeSpan(m.span);
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];
    const frameId = exprIdMapGet(inputs.exprToFrame ?? null, m.exprId) ?? undefined;

    const segments = buildSegmentPairs(
      m.segments ?? [],
      htmlSegments,
      htmlSpan,
      aotSpan,
      inputs.aotFile ?? null,
    ).map((seg) => ({ ...seg, exprId: m.exprId }));

    return {
      exprId: m.exprId,
      htmlSpan,
      aotSpan,
      ...(frameId !== undefined ? { frameId } : {}),
      segments,
    };
  });

  const segmentsByExpr = new Map<ExprId, OwnedSegment[]>(aotEntries.map((e) => [e.exprId, e.segments]));
  const aggregatedSegments = new Map<ExprId, AotMappingSegment[] | undefined>();

  for (const entry of aotEntries) {
    const groupedSegments = mergeGroupSegments(entry.exprId, interpolationGroups, segmentsByExpr);
    aggregatedSegments.set(entry.exprId, groupedSegments);
  }

  const entries: AotMappingEntry[] = aotEntries.map((entry) =>
    normalizeMappingEntry({
      exprId: entry.exprId,
      htmlSpan: entry.htmlSpan,
      aotSpan: entry.aotSpan,
      ...(entry.frameId !== undefined ? { frameId: entry.frameId } : {}),
      ...(aggregatedSegments.get(entry.exprId)?.length ? { segments: aggregatedSegments.get(entry.exprId) } : {}),
    }),
  );

  return { mapping: { kind: "aot-mapping", entries }, exprSpans, spanIndex: exprSpanIndex };
}

function buildSegmentPairs(
  aotSegments: readonly { path: string; span: TextSpan }[],
  htmlSegments: readonly HtmlMemberSegment[],
  exprHtmlSpan: SourceSpan,
  exprAotSpan: TextSpan,
  aotFile: SourceFile | null,
): AotMappingSegment[] {
  if (aotSegments.length === 0) return [];

  const htmlByPath = new Map<string, HtmlMemberSegment[]>();
  for (const seg of htmlSegments) {
    const list = htmlByPath.get(seg.path);
    if (list) list.push(seg);
    else htmlByPath.set(seg.path, [seg]);
  }

  const usedHtml = new Set<HtmlMemberSegment>();
  const out: AotMappingSegment[] = [];

  for (const aotSeg of aotSegments) {
    const candidates = htmlByPath.get(aotSeg.path);
    let htmlSpan: SourceSpan;

    if (candidates && candidates.length > 0) {
      const htmlSeg = candidates.find((h) => !usedHtml.has(h)) ?? candidates[candidates.length - 1]!;
      usedHtml.add(htmlSeg);
      htmlSpan = normalizeSpan(htmlSeg.span);
    } else {
      htmlSpan = projectAotMemberSegmentToHtml(aotSeg.span, exprAotSpan, exprHtmlSpan);
    }

    out.push({
      kind: "member",
      path: aotSeg.path,
      htmlSpan,
      aotSpan: aotFile ? resolveSourceSpan(aotSeg.span as SourceSpan, aotFile) : normalizeSpan(aotSeg.span),
    });
  }

  return out;
}

function normalizeMappingEntry(entry: AotMappingEntry): AotMappingEntry {
  const htmlSpan = normalizeSpan(entry.htmlSpan);
  const aotSpan = normalizeSpan(entry.aotSpan);
  if (!entry.segments || entry.segments.length === 0) {
    return { ...entry, htmlSpan, aotSpan };
  }
  const segments = entry.segments.map((seg) => ({
    kind: "member" as const,
    path: seg.path,
    htmlSpan: normalizeSpan(seg.htmlSpan),
    aotSpan: normalizeSpan(seg.aotSpan),
  }));
  return { ...entry, htmlSpan, aotSpan, segments };
}

function projectAotMemberSegmentToHtml(
  aotSlice: TextSpan,
  exprAotSpan: TextSpan,
  exprHtmlSpan: SourceSpan,
): SourceSpan {
  const from = normalizeSpan(exprAotSpan);
  const to = normalizeSpan(exprHtmlSpan);

  const fromLen = Math.max(1, spanLength(from));
  const toLen = Math.max(0, spanLength(to));

  const sliceStart = clamp(aotSlice.start, from.start, from.end);
  const sliceEnd = clamp(aotSlice.end, from.start, from.end);

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
  segmentsByExpr: Map<ExprId, (AotMappingSegment & { exprId: ExprId })[]>,
): AotMappingSegment[] | undefined {
  const group = groups.get(exprId) ?? [exprId];
  const combined: (AotMappingSegment & { exprId: ExprId })[] = [];
  for (const id of group) {
    const segs = segmentsByExpr.get(id);
    if (segs) combined.push(...segs);
  }
  if (combined.length === 0) return undefined;

  const paths = new Map<string, (AotMappingSegment & { exprId: ExprId })[]>();
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

  const pickBest = (candidates: (AotMappingSegment & { exprId: ExprId })[]): AotMappingSegment & { exprId: ExprId } => {
    let best = candidates[0]!;
    for (let i = 1; i < candidates.length; i += 1) {
      const current = candidates[i]!;
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
      const bestAot = spanLength(best.aotSpan);
      const curAot = spanLength(current.aotSpan);
      if (curAot < bestAot) best = current;
    }
    return best;
  };

  const leavesOnly = group.length > 1;
  const results: AotMappingSegment[] = [];
  for (const [path, segs] of paths.entries()) {
    if (leavesOnly && !isLeaf(path)) continue;
    const chosen = pickBest(segs);
    results.push({ kind: "member", path, htmlSpan: chosen.htmlSpan, aotSpan: chosen.aotSpan });
  }

  return results;
}

function isPathPrefix(path: string, other: string): boolean {
  if (path.length >= other.length) return false;
  if (!other.startsWith(path)) return false;
  const boundary = other.charAt(path.length);
  return boundary === "." || boundary === "[";
}
