import path from "node:path";

// Phases
import { lowerDocument } from "./phases/10-lower/lower.js";
import { resolveHost } from "./phases/20-resolve-host/resolve.js";
import { bindScopes } from "./phases/30-bind/bind.js";
import { plan } from "./phases/50-plan/plan.js";
import { emitOverlayFile } from "./phases/60-emit/overlay.js";

// Types
import type { SourceSpan, ExprId } from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { VmReflection, OverlayPlanModule } from "./phases/50-plan/types.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../contracts.js";
import { buildTemplateMapping } from "./mapping.js";
import { buildTemplateQuery } from "./query.js";

// Parsers
import { getExpressionParser } from "../parsers/expression-parser.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { BuildIrOptions } from "./phases/10-lower/lower.js";

import { DEFAULT as SEM_DEFAULT } from "./language/registry.js";
import { DEFAULT_SYNTAX, type AttributeParser } from "./language/syntax.js";
import { typecheck } from "./phases/40-typecheck/typecheck.js";

// SSR
import { planSsr } from "./phases/50-plan/ssr-plan.js";
import { emitSsr } from "./phases/60-emit/ssr.js";
import type { SsrPlanModule } from "./phases/50-plan/ssr-types.js";

/* =======================================================================================
 * Public façade
 * ======================================================================================= */

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  overlayBaseName?: string;
}

export interface CompileOverlayResult {
  overlayPath: string;
  text: string;
  calls: Array<{ exprId: ExprId; overlayStart: number; overlayEnd: number; htmlSpan: SourceSpan }>;
  /** First-class mapping scaffold (currently mirrors ad-hoc call mapping). */
  mapping?: TemplateMappingArtifact;
}

export interface TemplateCompilation {
  ir: ReturnType<typeof lowerDocument>;
  linked: ReturnType<typeof resolveHost>;
  scope: ReturnType<typeof bindScopes>;
  typecheck: ReturnType<typeof typecheck>;
  overlayPlan: OverlayPlanModule;
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
}

/** Full pipeline (lower -> link -> bind -> plan -> emit) plus mapping/query scaffolding. */
export function compileTemplate(opts: CompileOptions): TemplateCompilation {
  const exprParser = opts.exprParser ? opts.exprParser : getExpressionParser();
  const attrParser = opts.attrParser ? opts.attrParser : DEFAULT_SYNTAX;

  // 1) HTML -> IR
  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
  } as BuildIrOptions); // lowerer reads both contracts.

  // 2) IR -> Linked
  const linked = resolveHost(ir, SEM_DEFAULT);

  // 3) Linked -> ScopeGraph
  const scope = bindScopes(linked);

  // 4) Type hints (phase 40)
  const typecheckOut = typecheck(linked);

  // 4) ScopeGraph -> Overlay plan
  const overlayBase = opts.overlayBaseName ?? `${path.basename(opts.templateFilePath, path.extname(opts.templateFilePath))}.__au.ttc.overlay`;
  const syntheticPrefix = opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_";
  const planOut: OverlayPlanModule = plan(linked, scope, { isJs: opts.isJs, vm: opts.vm, syntheticPrefix });

  // 5) Plan -> overlay text
  const overlayPath = path.join(path.dirname(opts.templateFilePath), `${overlayBase}${opts.isJs ? ".js" : ".ts"}`);
  const { text, mapping: overlayMapping } = emitOverlayFile(planOut, { isJs: !!opts.isJs, filename: overlayBase });

  // 6) Mapping
  const exprToFrame = scope.templates?.[0]?.exprToFrame as ExprToFrameMap | undefined;
  const { mapping, exprSpans } = buildTemplateMapping({
    overlayMapping,
    ir,
    exprTable: ir.exprTable ?? [],
    fallbackFile: opts.templateFilePath,
    exprToFrame: exprToFrame ?? null,
  });
  const calls = overlayMapping.map((m) => ({
    exprId: m.exprId,
    overlayStart: m.start,
    overlayEnd: m.end,
    htmlSpan: exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: opts.templateFilePath },
  }));
  const query = buildTemplateQuery(ir, linked, mapping, typecheckOut);

  return {
    ir,
    linked,
    scope,
    typecheck: typecheckOut,
    overlayPlan: planOut,
    overlay: { overlayPath, text, calls, mapping },
    mapping,
    query,
  };
}

export function compileTemplateToOverlay(opts: CompileOptions): CompileOverlayResult {
  const compilation = compileTemplate(opts);
  return compilation.overlay;
}

type ExprToFrameMap = Record<ExprId, FrameId>;

export interface CompileSsrResult {
  htmlPath: string;
  htmlText: string;
  manifestPath: string;
  manifestText: string;
  plan: SsrPlanModule; // handy for debugging/tests
}

/** Build SSR “server emits” (HTML skeleton + JSON manifest) from a template. */
export function compileTemplateToSSR(opts: CompileOptions): CompileSsrResult {
  const exprParser = opts.exprParser ? opts.exprParser : getExpressionParser();
  const attrParser = opts.attrParser ? opts.attrParser : DEFAULT_SYNTAX;

  // 1) HTML → IR
  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
  } as BuildIrOptions);

  // 2) IR → Linked
  const linked = resolveHost(ir, SEM_DEFAULT);

  // 3) Linked → ScopeGraph
  const scope = bindScopes(linked);

  // 4) Linked+Scoped → SSR plan
  const plan = planSsr(linked, scope);

  // 5) Emit SSR artifacts
  const { html, manifest } = emitSsr(plan, linked, { eol: "\n" });

  // 6) Paths
  const base = opts.overlayBaseName ?? `${path.basename(opts.templateFilePath, path.extname(opts.templateFilePath))}.__au.ssr`;
  const dir = path.dirname(opts.templateFilePath);
  const htmlPath = path.join(dir, `${base}.html`);
  const manifestPath = path.join(dir, `${base}.json`);

  return { htmlPath, htmlText: html, manifestPath, manifestText: manifest, plan };
}


