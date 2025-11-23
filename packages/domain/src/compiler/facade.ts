import { createDefaultEngine } from "./pipeline.js";
import type { StageOutputs, PipelineOptions, CacheOptions, FingerprintHints } from "./pipeline/engine.js";
import type { AttributeParser } from "./language/syntax.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { Semantics } from "./language/registry.js";
import type { ResourceGraph, ResourceScopeId } from "./language/resource-graph.js";
import type { VmReflection } from "./phases/50-plan/overlay/types.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../contracts.js";
import { buildOverlayProduct, type OverlayProductResult } from "./products/overlay.js";
import { buildSsrProduct, type SsrProductResult } from "./products/ssr.js";
import type { CompilerDiagnostic } from "./diagnostics.js";
import type { StageArtifactMeta, StageKey, PipelineSession } from "./pipeline/engine.js";
import type { ExprId, ExprTableEntry, SourceSpan } from "./model/ir.js";
import { htmlOffsetToOverlay, overlayOffsetToHtml, type MappingHit } from "./mapping.js";
import type { ExprIdMap } from "./model/identity.js";
import { computeOverlayBaseName, computeSsrBaseName } from "./path-conventions.js";

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  semantics?: Semantics;
  resourceGraph?: ResourceGraph;
  resourceScope?: ResourceScopeId | null;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  overlayBaseName?: string;
  cache?: CacheOptions;
  fingerprints?: FingerprintHints;
}

export type CompileOverlayResult = OverlayProductResult;

export interface TemplateDiagnostics {
  /** Flat list of all diagnostics from the pipeline. */
  all: CompilerDiagnostic[];
  /** Per-stage view keyed by diagnostic source. */
  bySource: Partial<Record<CompilerDiagnostic["source"], CompilerDiagnostic[]>>;
}

export type StageMetaSnapshot = Partial<Record<StageKey, StageArtifactMeta>>;

export interface TemplateCompilation {
  ir: StageOutputs["10-lower"];
  linked: StageOutputs["20-resolve-host"];
  scope: StageOutputs["30-bind"];
  typecheck: StageOutputs["40-typecheck"];
  overlayPlan: StageOutputs["50-plan-overlay"];
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
  /** Authored expression table + spans for tooling (hover/refs). */
  exprTable: readonly ExprTableEntry[];
  exprSpans: ExprIdMap<SourceSpan>;
  diagnostics: TemplateDiagnostics;
  meta: StageMetaSnapshot;
}

function buildPipelineOptions(opts: CompileOptions, overlayBaseName: string): PipelineOptions {
  const base: PipelineOptions = {
    html: opts.html,
    templateFilePath: opts.templateFilePath,
    vm: opts.vm,
    overlay: {
      isJs: opts.isJs,
      filename: overlayBaseName,
      syntheticPrefix: opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
    },
  };
  if (opts.semantics) base.semantics = opts.semantics;
  if (opts.resourceGraph) base.resourceGraph = opts.resourceGraph;
  if (opts.resourceScope !== undefined) base.resourceScope = opts.resourceScope;
  if (opts.cache) base.cache = opts.cache;
  if (opts.fingerprints) base.fingerprints = opts.fingerprints;
  if (opts.attrParser) base.attrParser = opts.attrParser;
  if (opts.exprParser) base.exprParser = opts.exprParser;
  return base;
}

/** Full pipeline (lower -> link -> bind -> plan -> emit) plus mapping/query scaffolding. */
export function compileTemplate(
  opts: CompileOptions,
  seed?: Partial<Record<StageKey, StageOutputs[StageKey]>>,
): TemplateCompilation {
  const overlayBase = computeOverlayBaseName(opts.templateFilePath, opts.overlayBaseName);
  const engine = createDefaultEngine();
  const session = engine.createSession(buildPipelineOptions(opts, overlayBase), seed);

  const overlayArtifacts = buildOverlayProduct(session, { templateFilePath: opts.templateFilePath });

  const ir = session.run("10-lower");
  const linked = session.run("20-resolve-host");
  const scope = session.run("30-bind");
  const typecheck = session.run("40-typecheck");
  const overlayPlan = overlayArtifacts.plan;

  return {
    ir,
    linked,
    scope,
    typecheck,
    overlayPlan,
    overlay: overlayArtifacts.overlay,
    mapping: overlayArtifacts.mapping,
    query: overlayArtifacts.query,
    exprTable: overlayArtifacts.exprTable,
    exprSpans: overlayArtifacts.exprSpans,
    diagnostics: buildDiagnostics(linked, scope, typecheck),
    meta: collectStageMeta(session, [
      "10-lower",
      "20-resolve-host",
      "30-bind",
      "40-typecheck",
      "50-plan-overlay",
      "60-emit-overlay",
    ]),
  };
}

export function compileTemplateToOverlay(opts: CompileOptions): CompileOverlayResult {
  const compilation = compileTemplate(opts);
  return compilation.overlay;
}

export interface CompileSsrResult extends SsrProductResult {
  core: Pick<StageOutputs, "10-lower" | "20-resolve-host" | "30-bind" | "40-typecheck">;
  meta: StageMetaSnapshot;
}

/** Build SSR "server emits" (HTML skeleton + JSON manifest) from a template. */
export function compileTemplateToSSR(
  opts: CompileOptions,
  seed?: Partial<Record<StageKey, StageOutputs[StageKey]>>,
): CompileSsrResult {
  const baseName = computeSsrBaseName(opts.templateFilePath, opts.overlayBaseName);
  const overlayBase = computeOverlayBaseName(opts.templateFilePath, opts.overlayBaseName);
  const engine = createDefaultEngine();
  const pipelineOpts = buildPipelineOptions(opts, overlayBase);
  pipelineOpts.ssr = { eol: "\n" };
  const session = engine.createSession(pipelineOpts, seed);

  const product = buildSsrProduct(session, {
    templateFilePath: opts.templateFilePath,
    baseName,
  });

  const core: Pick<StageOutputs, "10-lower" | "20-resolve-host" | "30-bind" | "40-typecheck"> = {
    "10-lower": session.run("10-lower"),
    "20-resolve-host": session.run("20-resolve-host"),
    "30-bind": session.run("30-bind"),
    "40-typecheck": session.run("40-typecheck"),
  };

  return {
    ...product,
    core,
    meta: collectStageMeta(session, [
      "10-lower",
      "20-resolve-host",
      "30-bind",
      "40-typecheck",
      "50-plan-ssr",
      "60-emit-ssr",
    ]),
  };
}

/* --------------------------
 * Helpers
 * ------------------------ */

function buildDiagnostics(
  linked: StageOutputs["20-resolve-host"],
  scope: StageOutputs["30-bind"],
  typecheck: StageOutputs["40-typecheck"],
): TemplateDiagnostics {
  const flat = [
    ...(linked?.diags ?? []),
    ...(scope?.diags ?? []),
    ...(typecheck?.diags ?? []),
  ];

  const bySource: Partial<Record<CompilerDiagnostic["source"], CompilerDiagnostic[]>> = {};
  for (const d of flat) {
    if (!bySource[d.source]) bySource[d.source] = [];
    bySource[d.source]!.push(d);
  }
  return { all: flat, bySource };
}

function collectStageMeta(session: PipelineSession, keys: StageKey[]): StageMetaSnapshot {
  const meta: StageMetaSnapshot = {};
  for (const k of keys) {
    const m = session.meta(k);
    if (m) meta[k] = m;
  }
  return meta;
}

export function mapOverlayOffsetToHtml(mapping: TemplateMappingArtifact, overlayOffset: number): MappingHit | null {
  return overlayOffsetToHtml(mapping, overlayOffset);
}

export function mapHtmlOffsetToOverlay(mapping: TemplateMappingArtifact, htmlOffset: number): MappingHit | null {
  return htmlOffsetToOverlay(mapping, htmlOffset);
}
