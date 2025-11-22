import path from "node:path";
import { buildTemplateMapping } from "../mapping.js";
import { buildTemplateQuery } from "../query.js";
import type { PipelineSession } from "../pipeline/engine.js";
import type { OverlayPlanModule } from "../phases/50-plan/overlay/types.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../../contracts.js";
import type { ExprId, ExprTableEntry, SourceSpan } from "../model/ir.js";
import { resolveSourceFile } from "../model/source.js";
import type { ExprSpanIndex } from "../expr-utils.js";
import type { ExprIdMap } from "../model/identity.js";

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

export function buildOverlayProduct(session: PipelineSession, opts: OverlayProductOptions): OverlayProductArtifacts {
  const sourceFile = resolveSourceFile(opts.templateFilePath);
  const ir = session.run("10-lower");
  const linked = session.run("20-link");
  const scope = session.run("30-scope");
  const typecheck = session.run("40-typecheck");

  const planOut = session.run("50-plan-overlay");
  const overlayEmit = session.run("60-emit-overlay");

  const overlayPath = path.join(path.dirname(opts.templateFilePath), overlayEmit.filename);
  const exprToFrame = scope.templates?.[0]?.exprToFrame;

  const { mapping, exprSpans, spanIndex } = buildTemplateMapping({
    overlayMapping: overlayEmit.mapping,
    ir,
    exprTable: ir.exprTable ?? [],
    fallbackFile: sourceFile,
    exprToFrame: exprToFrame ?? null,
  });

  const calls = overlayEmit.mapping.map((m) => ({
    exprId: m.exprId,
    overlayStart: m.span.start,
    overlayEnd: m.span.end,
    htmlSpan: spanIndex.ensure(m.exprId, sourceFile),
  }));

  const overlay: OverlayProductResult = {
    overlayPath,
    text: overlayEmit.text,
    calls,
    mapping,
  };

  const query = buildTemplateQuery(ir, linked, mapping, typecheck);

  return { plan: planOut, overlay, mapping, query, exprSpans, exprTable: ir.exprTable ?? [], spanIndex };
}
