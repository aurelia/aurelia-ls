import path from "node:path";
import { createDefaultEngine } from "./pipeline.js";
import type { StageOutputs, PipelineOptions, CacheOptions, FingerprintHints } from "./pipeline/engine.js";
import type { AttributeParser } from "./language/syntax.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { VmReflection } from "./phases/50-plan/overlay-types.js";
import type { TemplateMappingArtifact, TemplateQueryFacade } from "../contracts.js";
import { buildOverlayProduct, type OverlayProductResult } from "./products/overlay.js";
import { buildSsrProduct, type SsrProductResult } from "./products/ssr.js";

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  overlayBaseName?: string;
  cache?: CacheOptions;
  fingerprints?: FingerprintHints;
}

export type CompileOverlayResult = OverlayProductResult;

export interface TemplateCompilation {
  ir: StageOutputs["10-lower"];
  linked: StageOutputs["20-link"];
  scope: StageOutputs["30-scope"];
  typecheck: StageOutputs["40-typecheck"];
  overlayPlan: StageOutputs["50-plan-overlay"];
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
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
  if (opts.cache) base.cache = opts.cache;
  if (opts.fingerprints) base.fingerprints = opts.fingerprints;
  if (opts.attrParser) base.attrParser = opts.attrParser;
  if (opts.exprParser) base.exprParser = opts.exprParser;
  return base;
}

function computeOverlayBaseName(templatePath: string, override?: string): string {
  if (override) return override;
  const base = path.basename(templatePath, path.extname(templatePath));
  return `${base}.__au.ttc.overlay`;
}

function computeSsrBaseName(templatePath: string, override?: string): string {
  if (override) return override.replace(/\.ssr$/, "");
  const base = path.basename(templatePath, path.extname(templatePath));
  return `${base}.__au.ssr`;
}

/** Full pipeline (lower -> link -> bind -> plan -> emit) plus mapping/query scaffolding. */
export function compileTemplate(opts: CompileOptions): TemplateCompilation {
  const overlayBase = computeOverlayBaseName(opts.templateFilePath, opts.overlayBaseName);
  const engine = createDefaultEngine();
  const session = engine.createSession(buildPipelineOptions(opts, overlayBase));

  const overlayArtifacts = buildOverlayProduct(session, { templateFilePath: opts.templateFilePath });

  const ir = session.run("10-lower");
  const linked = session.run("20-link");
  const scope = session.run("30-scope");
  const typecheck = session.run("40-typecheck");

  return {
    ir,
    linked,
    scope,
    typecheck,
    overlayPlan: overlayArtifacts.plan,
    overlay: overlayArtifacts.overlay,
    mapping: overlayArtifacts.mapping,
    query: overlayArtifacts.query,
  };
}

export function compileTemplateToOverlay(opts: CompileOptions): CompileOverlayResult {
  const compilation = compileTemplate(opts);
  return compilation.overlay;
}

export interface CompileSsrResult extends SsrProductResult {}

/** Build SSR "server emits" (HTML skeleton + JSON manifest) from a template. */
export function compileTemplateToSSR(opts: CompileOptions): CompileSsrResult {
  const baseName = computeSsrBaseName(opts.templateFilePath, opts.overlayBaseName);
  const engine = createDefaultEngine();
  const pipelineOpts: PipelineOptions = {
    html: opts.html,
    templateFilePath: opts.templateFilePath,
    vm: opts.vm,
    ssr: { eol: "\n" },
  };
  if (opts.attrParser) pipelineOpts.attrParser = opts.attrParser;
  if (opts.exprParser) pipelineOpts.exprParser = opts.exprParser;
  const session = engine.createSession(pipelineOpts);

  return buildSsrProduct(session, {
    templateFilePath: opts.templateFilePath,
    baseName,
  });
}
