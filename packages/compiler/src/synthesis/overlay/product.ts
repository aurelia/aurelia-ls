import path from "node:path";
import { buildTemplateMapping } from "./mapping.js";
import { buildTemplateQuery } from "./query.js";
import type { FrameOverlayPlan, OverlayPlanModule } from "./types.js";
import type { EmitResult as OverlayEmitResult } from "./emit.js";
import type { TemplateQueryFacade } from "./query.js";
import type { TemplateMappingArtifact } from "./mapping.js";
import type { ExprId, ExprTableEntry, SourceSpan } from "../../model/ir.js";
import type { FrameId, FrameOrigin } from "../../model/symbols.js";
import { resolveSourceFile } from "../../model/source.js";
import type { ExprSpanIndex } from "../../shared/expr-utils.js";
import { normalizePathForId, type ExprIdMap } from "../../model/identity.js";

export interface OverlayProductArtifacts {
  plan: OverlayPlanModule;
  overlay: OverlayProductResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
  /** Expression spans keyed by exprId (HTML source). */
  exprSpans: ExprIdMap<SourceSpan>;
  /** Raw expr table for consumers that need authored ASTs. */
  exprTable: readonly ExprTableEntry[];
  spanIndex: ExprSpanIndex;
}

export interface OverlayProductOptions {
  templateFilePath: string;
}

export interface OverlayProductResult {
  overlayPath: string;
  text: string;
  calls: Array<{ exprId: ExprId; overlayStart: number; overlayEnd: number; htmlSpan: SourceSpan }>;
  mapping?: TemplateMappingArtifact;
}

// buildOverlayProduct removed — use buildOverlayProductFromStages instead.

/**
 * Build overlay product from pre-computed stage outputs (no PipelineSession needed).
 */
export function buildOverlayProductFromStages(
  ir: import("../../model/index.js").IrModule,
  linked: import("../../analysis/index.js").LinkModule,
  scope: import("../../model/index.js").ScopeModule,
  planOut: OverlayPlanModule,
  overlayEmit: OverlayEmitResult,
  opts: OverlayProductOptions,
): OverlayProductArtifacts {
  const sourceFile = resolveSourceFile(opts.templateFilePath);
  const overlayDir = path.dirname(opts.templateFilePath);
  const overlayPath = normalizePathForId(path.join(overlayDir, overlayEmit.filename));
  const overlayFile = resolveSourceFile(overlayPath);
  const exprToFrame = scope.templates?.[0]?.exprToFrame;
  const frameOrigins = collectFrameOrigins(planOut.templates[0]?.frames);

  const { mapping, exprSpans, spanIndex } = buildTemplateMapping({
    overlayMapping: overlayEmit.mapping,
    ir,
    exprTable: ir.exprTable ?? [],
    fallbackFile: sourceFile,
    overlayFile,
    exprToFrame: exprToFrame ?? null,
    frameOrigins,
  });

  const calls = overlayEmit.mapping.map((m: import("./emit.js").OverlayEmitMappingEntry) => ({
    exprId: m.exprId,
    overlayStart: m.span.start,
    overlayEnd: m.span.end,
    htmlSpan: spanIndex.ensure(m.exprId, sourceFile),
  }));

  const overlay: OverlayProductResult = { overlayPath, text: overlayEmit.text, calls, mapping };
  const query = buildTemplateQuery(ir, linked, mapping, null as any);
  return { plan: planOut, overlay, mapping, query, exprSpans, exprTable: ir.exprTable ?? [], spanIndex };
}

function collectFrameOrigins(frames: readonly FrameOverlayPlan[] | undefined): ReadonlyMap<FrameId, FrameOrigin> | null {
  if (!frames) return null;
  const map = new Map<FrameId, FrameOrigin>();
  for (const f of frames) {
    if (f.origin) map.set(f.frame, f.origin);
  }
  return map.size > 0 ? map : null;
}
