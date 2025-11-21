import path from "node:path";
import { buildTemplateMapping } from "../mapping.js";
import { buildTemplateQuery } from "../query.js";
import type { PipelineSession } from "../pipeline/engine.js";
import type { OverlayPlanModule } from "../phases/50-plan/overlay-types.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../../contracts.js";
import type { ExprId, SourceSpan } from "../model/ir.js";
import type { FrameId } from "../model/symbols.js";

export interface OverlayProductArtifacts {
  plan: OverlayPlanModule;
  overlay: OverlayProductResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
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

export function buildOverlayProduct(session: PipelineSession, opts: OverlayProductOptions): OverlayProductArtifacts {
  const ir = session.run("10-lower");
  const linked = session.run("20-link");
  const scope = session.run("30-scope");
  const typecheck = session.run("40-typecheck");

  const planOut = session.run("50-plan-overlay");
  const overlayEmit = session.run("60-emit-overlay");

  const overlayPath = path.join(path.dirname(opts.templateFilePath), overlayEmit.filename);
  const exprToFrame = scope.templates?.[0]?.exprToFrame as ExprToFrameMap | undefined;

  const { mapping, exprSpans } = buildTemplateMapping({
    overlayMapping: overlayEmit.mapping,
    ir,
    exprTable: ir.exprTable ?? [],
    fallbackFile: opts.templateFilePath,
    exprToFrame: exprToFrame ?? null,
  });

  const calls = overlayEmit.mapping.map((m) => ({
    exprId: m.exprId,
    overlayStart: m.start,
    overlayEnd: m.end,
    htmlSpan: exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: opts.templateFilePath },
  }));

  const overlay: OverlayProductResult = {
    overlayPath,
    text: overlayEmit.text,
    calls,
    mapping,
  };

  const query = buildTemplateQuery(ir, linked, mapping, typecheck);

  return { plan: planOut, overlay, mapping, query };
}

type ExprToFrameMap = Record<ExprId, FrameId>;
