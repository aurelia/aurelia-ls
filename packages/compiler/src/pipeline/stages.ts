import path from "node:path";

// Model imports (via barrel)
import { resolveSourceFile } from "../model/index.js";

// Language imports (via barrel)
import {
  buildSemanticsSnapshotFromProject,
  type ProjectSnapshot,
  type TemplateContext,
} from "../schema/index.js";

// Parsing imports (via barrel)
import { createAttributeParserFromRegistry, getExpressionParser, type AttributeParser, type IExpressionParser } from "../parsing/index.js";

// Shared imports (via barrel)
import type { VmReflection, SynthesisOptions } from "../shared/index.js";

// Analysis imports (via barrel)
import { lowerDocument, linkTemplateSemantics, bindScopes, typecheck, collectFeatureUsage } from "../analysis/index.js";

// Dependency graph imports
import { createDepRecorder, NOOP_DEP_RECORDER } from "../schema/dependency-graph.js";

// Synthesis imports (via barrel)
import { planOverlay, emitOverlayFile, type OverlayEmitOptions, planAot, type AotPlanOptions } from "../synthesis/index.js";

// Local imports
import { PipelineEngine } from "./engine.js";
import type { StageDefinition, StageKey, StageOutputs, PipelineOptions, CacheOptions, FingerprintHints, ModuleResolver } from "./engine.js";
import { stableHash, stableHashSemantics } from "./hash.js";

/* =======================================================================================
 * CORE PIPELINE TYPES & FACTORIES
 * ======================================================================================= */

export interface CoreCompileOptions {
  html: string;
  templateFilePath: string;
  /** L2 semantic authority. */
  query?: import("../schema/model.js").SemanticModelQuery;
  /** Legacy semantic authority. */
  project?: ProjectSnapshot;
  templateContext?: TemplateContext;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  vm: VmReflection;
  moduleResolver: ModuleResolver;
  cache?: CacheOptions;
  fingerprints?: FingerprintHints;
}

export interface CorePipelineResult {
  ir: StageOutputs["10-lower"];
  linked: StageOutputs["20-link"];
  scope: StageOutputs["30-bind"];
  typecheck: StageOutputs["40-typecheck"];
}

/**
 * Create a pipeline engine with the default stage graph.
 */
export function createDefaultEngine(): PipelineEngine {
  return new PipelineEngine(createDefaultStageDefinitions());
}

/**
 * Run the pure pipeline up to typecheck (10 -> 40).
 */
export function runCorePipeline(opts: CoreCompileOptions): CorePipelineResult {
  const engine = createDefaultEngine();
  const pipelineOpts: PipelineOptions = {
    html: opts.html,
    templateFilePath: opts.templateFilePath,
    vm: opts.vm,
    ...(opts.query ? { query: opts.query } : { project: opts.project }),
    moduleResolver: opts.moduleResolver,
  };
  if (opts.templateContext) pipelineOpts.templateContext = opts.templateContext;
  if (opts.cache) pipelineOpts.cache = opts.cache;
  if (opts.fingerprints) pipelineOpts.fingerprints = opts.fingerprints;
  if (opts.attrParser) pipelineOpts.attrParser = opts.attrParser;
  if (opts.exprParser) pipelineOpts.exprParser = opts.exprParser;
  const session = engine.createSession(pipelineOpts);
  return {
    ir: session.run("10-lower"),
    linked: session.run("20-link"),
    scope: session.run("30-bind"),
    typecheck: session.run("40-typecheck"),
  };
}

function assertOption<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing required pipeline option '${name}'`);
  }
  return value;
}

/**
 * Default stage implementations wired to the current phases.
 */
export function createDefaultStageDefinitions(): StageDefinition<StageKey>[] {
  const definitions: StageDefinition<StageKey>[] = [];

  // Resolve semantic authority: prefer L2 query path, fall back to legacy ProjectSnapshot.
  const resolveProject = (options: PipelineOptions): ProjectSnapshot => {
    if (options.query) {
      // L2 path: derive ProjectSnapshot-equivalent from SemanticModelQuery
      return options.query.snapshot();
    }
    return assertOption(options.project, "project or query");
  };
  const resolveTemplateSnapshot = (options: PipelineOptions) => {
    if (options.query) {
      // L2 path: the query is already scope-resolved. Build snapshot from its model.
      const q = options.query;
      return buildSemanticsSnapshotFromProject(q.snapshot(), options.templateContext);
    }
    const project = resolveProject(options);
    return buildSemanticsSnapshotFromProject(project, options.templateContext);
  };

  const scopeFingerprint = (options: PipelineOptions) => {
    const query = options.query;
    const graph = query ? query.graph : (resolveProject(options).resourceGraph ?? null);
    if (!graph) return null;
    const defaultScope = query ? query.model.defaultScope : (resolveProject(options).defaultScope ?? null);
    const scope = options.templateContext?.scopeId ?? defaultScope ?? graph.root ?? null;
    return { graph: stableHash(graph), scope };
  };

  definitions.push({
    key: "10-lower",
    version: "2",
    deps: [],
    fingerprint(ctx) {
      const options = ctx.options;
      const query = options.query;
      const source = resolveSourceFile(options.templateFilePath);
      const syntax = query ? query.syntax : resolveProject(options).syntax;
      const catalog = query ? query.model.catalog : resolveProject(options).catalog;
      const attrParserFingerprint = options.fingerprints?.attrParser
        ?? options.fingerprints?.syntax
        ?? (options.attrParser ? "custom" : stableHash(syntax.attributePatterns));
      return {
        html: stableHash(options.html),
        file: source.hashKey,
        catalog: options.fingerprints?.catalog ?? stableHash(catalog),
        attrParser: attrParserFingerprint,
        exprParser: options.fingerprints?.exprParser ?? (options.exprParser ? "custom" : "default"),
      };
    },
    run(ctx) {
      const options = ctx.options;
      const query = options.query;
      const exprParser = options.exprParser ?? getExpressionParser();
      const syntax = query ? query.syntax : resolveProject(options).syntax;
      const catalog = query ? query.model.catalog : resolveProject(options).catalog;
      const attrParser = options.attrParser ?? createAttributeParserFromRegistry(syntax);
      return lowerDocument(options.html, {
        file: options.templateFilePath,
        name: path.basename(options.templateFilePath),
        attrParser,
        exprParser,
        catalog,
        diagnostics: ctx.diag,
        trace: options.trace,
      });
    },
  });

  definitions.push({
    key: "20-link",
    version: "3",
    deps: ["10-lower"],
    fingerprint(ctx) {
      const query = ctx.options.query;
      const semantics = query ? query.model.semantics : resolveTemplateSnapshot(ctx.options).semantics;
      const moduleResolverFingerprint = ctx.options.fingerprints?.moduleResolver ?? "custom";
      return {
        sem: ctx.options.fingerprints?.semantics ?? stableHashSemantics(semantics),
        resourceGraph: scopeFingerprint(ctx.options),
        localImports: ctx.options.templateContext?.localImports ? stableHash(ctx.options.templateContext.localImports) : null,
        moduleResolver: moduleResolverFingerprint,
      };
    },
    run(ctx) {
      const ir = ctx.require("10-lower");
      const depGraph = ctx.options.depGraph;
      const deps = depGraph
        ? createDepRecorder(depGraph, depGraph.addNode('template-compilation', ctx.options.templateFilePath))
        : NOOP_DEP_RECORDER;
      const query = ctx.options.query;
      // L2 path: pass query directly as pre-resolved lookup + graph.
      // Legacy path: build SemanticsSnapshot from ProjectSnapshot.
      const scoped = resolveTemplateSnapshot(ctx.options);
      const resolveOpts: Parameters<typeof linkTemplateSemantics>[2] = {
        moduleResolver: ctx.options.moduleResolver,
        templateFilePath: ctx.options.templateFilePath,
        diagnostics: ctx.diag,
        trace: ctx.options.trace,
        deps,
        ...(query ? { lookup: query, graph: query.graph } : {}),
      };
      return linkTemplateSemantics(ir, scoped, resolveOpts);
    },
  });

  definitions.push({
    key: "30-bind",
    version: "1",
    deps: ["20-link"],
    fingerprint() {
      return "scope@1";
    },
    run(ctx) {
      const linked = ctx.require("20-link");
      return bindScopes(linked, { trace: ctx.options.trace, diagnostics: ctx.diag });
    },
  });

  definitions.push({
    key: "40-typecheck",
    version: "1",
    deps: ["10-lower", "20-link", "30-bind"],
    fingerprint(ctx) {
      const vm = assertOption(ctx.options.vm, "vm");
      const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
      const vmToken = ctx.options.fingerprints?.vm ?? rootVm;
      return { vm: vmToken, root: rootVm };
    },
    run(ctx) {
      const linked = ctx.require("20-link");
      const scope = ctx.require("30-bind");
      const ir = ctx.require("10-lower");
      const vm = assertOption(ctx.options.vm, "vm");
      const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
      // Create a DepRecorder if a dependency graph is available.
      const depGraph = ctx.options.depGraph;
      const deps = depGraph
        ? createDepRecorder(depGraph, depGraph.addNode('template-compilation', ctx.options.templateFilePath))
        : NOOP_DEP_RECORDER;
      return typecheck({ linked, scope, ir, rootVmType: rootVm, diagnostics: ctx.diag, trace: ctx.options.trace, deps });
    },
  });

  definitions.push({
    key: "50-usage",
    version: "1",
    deps: ["20-link"],
    fingerprint(ctx) {
      const query = ctx.options.query;
      const syntax = query ? query.syntax : resolveTemplateSnapshot(ctx.options).syntax;
      const attrParserFingerprint = ctx.options.fingerprints?.attrParser
        ?? ctx.options.fingerprints?.syntax
        ?? (ctx.options.attrParser ? "custom" : stableHash(syntax.attributePatterns));
      return { attrParser: attrParserFingerprint };
    },
    run(ctx) {
      const query = ctx.options.query;
      const syntax = query ? query.syntax : resolveTemplateSnapshot(ctx.options).syntax;
      const attrParser = ctx.options.attrParser ?? createAttributeParserFromRegistry(syntax);
      const linked = ctx.require("20-link");
      return collectFeatureUsage(linked, { syntax, attrParser });
    },
  });

  definitions.push({
    key: "overlay:plan",
    version: "1",
    deps: ["20-link", "30-bind"],
    fingerprint(ctx) {
      const vm = assertOption(ctx.options.vm, "vm");
      const overlayOpts = ctx.options.overlay ?? { isJs: false };
      const vmToken = ctx.options.fingerprints?.vm ?? (hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr());
      return {
        vm: vmToken,
        overlay: ctx.options.fingerprints?.overlay ?? {
          isJs: overlayOpts.isJs ?? false,
          syntheticPrefix: overlayOpts.syntheticPrefix ?? vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
        },
      };
    },
    run(ctx) {
      const linked = ctx.require("20-link");
      const scope = ctx.require("30-bind");
      const vm = assertOption(ctx.options.vm, "vm");
      const overlayOpts: SynthesisOptions = {
        isJs: ctx.options.overlay?.isJs ?? false,
        vm,
        syntheticPrefix: ctx.options.overlay?.syntheticPrefix ?? vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
      };
      return planOverlay(linked, scope, overlayOpts);
    },
  });

  definitions.push({
    key: "overlay:emit",
    version: "1",
    deps: ["overlay:plan"],
    fingerprint(ctx) {
      const overlayOpts = ctx.options.overlay ?? { isJs: false };
      return {
        isJs: overlayOpts.isJs ?? false,
        banner: overlayOpts.banner ?? null,
        eol: overlayOpts.eol ?? "\n",
        filename: overlayOpts.filename ?? null,
      };
    },
    run(ctx) {
      const plan = ctx.require("overlay:plan");
      const overlayOpts = ctx.options.overlay ?? { isJs: false };
      const emitOpts: OverlayEmitOptions & { isJs: boolean } = { isJs: overlayOpts.isJs };
      if (overlayOpts.eol) emitOpts.eol = overlayOpts.eol;
      if (overlayOpts.banner) emitOpts.banner = overlayOpts.banner;
      if (overlayOpts.filename) emitOpts.filename = overlayOpts.filename;
      return emitOverlayFile(plan, emitOpts);
    },
  });

  /* ===========================================================================
   * AOT synthesis stages
   * =========================================================================== */

  definitions.push({
    key: "aot:plan",
    version: "1",
    deps: ["20-link", "30-bind"],
    fingerprint(ctx) {
      const aotOpts = ctx.options.aot ?? {};
      return {
        includeLocations: aotOpts.includeLocations ?? false,
      };
    },
    run(ctx) {
      const linked = ctx.require("20-link");
      const scope = ctx.require("30-bind");
      const { syntax } = resolveTemplateSnapshot(ctx.options);
      const attrParser = ctx.options.attrParser ?? createAttributeParserFromRegistry(syntax);
      const aotOpts: AotPlanOptions = {
        templateFilePath: ctx.options.templateFilePath,
        includeLocations: ctx.options.aot?.includeLocations ?? false,
        syntax,
        attrParser,
      };
      return planAot(linked, scope, aotOpts);
    },
  });

  return definitions;
}

/**
 * Shape used by tests/clients that only need the pure pipeline (up to typecheck).
 */
export function runCoreStages(options: PipelineOptions): Pick<StageOutputs, "10-lower" | "20-link" | "30-bind" | "40-typecheck"> {
  const engine = new PipelineEngine(createDefaultStageDefinitions());
  const session = engine.createSession(options);
  return {
    "10-lower": session.run("10-lower"),
    "20-link": session.run("20-link"),
    "30-bind": session.run("30-bind"),
    "40-typecheck": session.run("40-typecheck"),
  };
}

function hasQualifiedVm(vm: VmReflection): vm is VmReflection & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}
