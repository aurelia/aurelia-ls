import path from "node:path";
import { buildAotMapping, type AotMappingArtifact } from "../aot-mapping.js";
import type { PipelineSession } from "../pipeline/engine.js";
import type { AotPlanModule } from "../phases/50-plan/aot/types.js";
import type { ExprTableEntry, SourceSpan } from "../model/ir.js";
import { resolveSourceFile } from "../model/source.js";
import type { ExprSpanIndex } from "../expr-utils.js";
import { normalizePathForId, type ExprIdMap } from "../model/identity.js";
import type { EmitResult as AotEmitResult } from "../phases/60-emit/aot/emit.js";

export interface AotProductArtifacts {
  plan: AotPlanModule;
  aot: AotProductResult;
  mapping: AotMappingArtifact;
  /** Expression spans keyed by exprId (HTML source). */
  exprSpans: ExprIdMap<SourceSpan>;
  /** Raw expr table for consumers that need authored ASTs. */
  exprTable: readonly ExprTableEntry[];
  spanIndex: ExprSpanIndex;
}

export interface AotProductOptions {
  templateFilePath: string;
  isJs: boolean;
  baseName?: string;
}

export interface AotProductResult {
  aotPath: string;
  text: string;
  mapping?: AotMappingArtifact;
}

export function buildAotProduct(session: PipelineSession, opts: AotProductOptions): AotProductArtifacts {
  const sourceFile = resolveSourceFile(opts.templateFilePath);
  const ir = session.run("10-lower");
  const scope = session.run("30-bind");

  const planOut = session.run("50-plan-aot");
  const aotEmit: AotEmitResult = session.run("60-emit-aot");

  const dir = path.dirname(opts.templateFilePath);
  const filename = opts.baseName ? `${opts.baseName}${opts.isJs ? ".js" : ".ts"}` : aotEmit.filename;
  const aotPath = normalizePathForId(path.join(dir, filename));
  const aotFile = resolveSourceFile(aotPath);
  const exprToFrame = scope.templates?.[0]?.exprToFrame;

  const { mapping, exprSpans, spanIndex } = buildAotMapping({
    aotMapping: aotEmit.mapping,
    ir,
    exprTable: ir.exprTable ?? [],
    fallbackFile: sourceFile,
    aotFile,
    exprToFrame: exprToFrame ?? null,
  });

  const aot: AotProductResult = {
    aotPath,
    text: aotEmit.text,
    mapping,
  };

  return { plan: planOut, aot, mapping, exprSpans, exprTable: ir.exprTable ?? [], spanIndex };
}
