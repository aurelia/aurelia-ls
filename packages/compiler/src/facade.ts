// Pipeline imports (via barrel)
import { createDefaultEngine } from "./pipeline/index.js";

// Model imports (via barrel)
import type { ExprTableEntry, SourceSpan, ExprIdMap } from "./model/index.js";

// Language imports (via barrel)
import type {
  FeatureUsageSet,
  LocalImportDef,
  ResourceCatalog,
  ResourceGraph,
  ResourceScopeId,
  Semantics,
  ProjectSnapshot,
  TemplateContext,
  TemplateSyntaxRegistry,
} from "./language/index.js";
import { buildProjectSnapshot } from "./language/index.js";

// Parsing imports (via barrel)
import type { AttributeParser, IExpressionParser } from "./parsing/index.js";

// Shared imports (via barrel)
import type { VmReflection, CompilerDiagnostic, ModuleResolver } from "./shared/index.js";

// Pipeline imports (via barrel)
import type { StageOutputs, PipelineOptions, CacheOptions, FingerprintHints, StageArtifactMeta, StageKey, PipelineSession } from "./pipeline/index.js";

// Synthesis imports (via barrel)
import {
  buildOverlayProduct,
  computeOverlayBaseName,
  type OverlayProductResult,
  type TemplateMappingArtifact,
  type TemplateQueryFacade,
} from "./synthesis/index.js";

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  /** Optional precomputed project snapshot (preferred). */
  project?: ProjectSnapshot;
  /** Base semantics (used when project snapshot is not provided). */
  semantics?: Semantics;
  catalog?: ResourceCatalog;
  syntax?: TemplateSyntaxRegistry;
  resourceGraph?: ResourceGraph;
  resourceScope?: ResourceScopeId | null;
  localImports?: readonly LocalImportDef[];
  /** Optional per-template context override. */
  templateContext?: TemplateContext;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  moduleResolver: ModuleResolver;
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
  linked: StageOutputs["20-resolve"];
  scope: StageOutputs["30-bind"];
  typecheck: StageOutputs["40-typecheck"];
  usage: FeatureUsageSet;
  overlayPlan: StageOutputs["overlay:plan"];
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
  /** Authored expression table + spans for tooling (hover/refs). */
  exprTable: readonly ExprTableEntry[];
  exprSpans: ExprIdMap<SourceSpan>;
  diagnostics: TemplateDiagnostics;
  meta: StageMetaSnapshot;
}

function resolveProjectSnapshot(opts: CompileOptions): ProjectSnapshot {
  if (opts.project) return opts.project;
  if (!opts.semantics) {
    throw new Error("compileTemplate requires either 'project' or 'semantics'.");
  }
  return buildProjectSnapshot(opts.semantics, {
    catalog: opts.catalog,
    syntax: opts.syntax,
    resourceGraph: opts.resourceGraph,
    ...(opts.resourceScope !== undefined ? { defaultScope: opts.resourceScope } : {}),
  });
}

function resolveTemplateContext(opts: CompileOptions): TemplateContext | undefined {
  if (opts.templateContext) return opts.templateContext;
  if (opts.resourceScope === undefined && !opts.localImports) return undefined;
  return {
    ...(opts.resourceScope !== undefined ? { scopeId: opts.resourceScope ?? null } : {}),
    ...(opts.localImports ? { localImports: opts.localImports } : {}),
  };
}

function buildPipelineOptions(opts: CompileOptions, overlayBaseName: string): PipelineOptions {
  const base: PipelineOptions = {
    html: opts.html,
    templateFilePath: opts.templateFilePath,
    vm: opts.vm,
    project: resolveProjectSnapshot(opts),
    moduleResolver: opts.moduleResolver,
    overlay: {
      isJs: opts.isJs,
      filename: overlayBaseName,
      syntheticPrefix: opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
    },
  };
  const templateContext = resolveTemplateContext(opts);
  if (templateContext) base.templateContext = templateContext;
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
  const linked = session.run("20-resolve");
  const scope = session.run("30-bind");
  const typecheck = session.run("40-typecheck");
  const usage = session.run("50-usage");
  const overlayPlan = overlayArtifacts.plan;

  return {
    ir,
    linked,
    scope,
    typecheck,
    usage,
    overlayPlan,
    overlay: overlayArtifacts.overlay,
    mapping: overlayArtifacts.mapping,
    query: overlayArtifacts.query,
    exprTable: overlayArtifacts.exprTable,
    exprSpans: overlayArtifacts.exprSpans,
    diagnostics: buildDiagnostics(session.diagnostics.all),
    meta: collectStageMeta(session, [
      "10-lower",
      "20-resolve",
      "30-bind",
      "40-typecheck",
      "50-usage",
      "overlay:plan",
      "overlay:emit",
    ]),
  };
}

/* --------------------------
 * Helpers
 * ------------------------ */

function buildDiagnostics(
  diagnostics: readonly CompilerDiagnostic[],
): TemplateDiagnostics {
  const bySource: Partial<Record<CompilerDiagnostic["source"], CompilerDiagnostic[]>> = {};
  for (const d of diagnostics) {
    if (!bySource[d.source]) bySource[d.source] = [];
    bySource[d.source]!.push(d);
  }
  return { all: [...diagnostics], bySource };
}

function collectStageMeta(session: PipelineSession, keys: StageKey[]): StageMetaSnapshot {
  const meta: StageMetaSnapshot = {};
  for (const k of keys) {
    const m = session.meta(k);
    if (m) meta[k] = m;
  }
  return meta;
}
