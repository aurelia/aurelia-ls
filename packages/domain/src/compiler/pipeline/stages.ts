import path from "node:path";

// Model imports (via barrel)
import { resolveSourceFile } from "../model/index.js";

// Language imports (via barrel)
import { DEFAULT as SEM_DEFAULT, materializeResourcesForScope, type Semantics, type ResourceGraph, type ResourceScopeId } from "../language/index.js";

// Parsing imports (via barrel)
import { DEFAULT_SYNTAX, getExpressionParser, type AttributeParser, type IExpressionParser } from "../parsing/index.js";

// Shared imports (via barrel)
import type { VmReflection, SynthesisOptions } from "../shared/index.js";

// Analysis imports (via barrel)
import { lowerDocument, resolveHost, bindScopes, typecheck } from "../analysis/index.js";

// Synthesis imports (via barrel)
import { planOverlay, emitOverlayFile, type OverlayEmitOptions, buildAotPlan, type AotPlanOptions } from "../synthesis/index.js";

// Local imports
import { PipelineEngine } from "./engine.js";
import type { StageDefinition, StageKey, StageOutputs, PipelineOptions, CacheOptions, FingerprintHints } from "./engine.js";
import { stableHash } from "./hash.js";

/* =======================================================================================
 * CORE PIPELINE TYPES & FACTORIES
 * ======================================================================================= */

export interface CoreCompileOptions {
  html: string;
  templateFilePath: string;
  semantics?: Semantics;
  resourceGraph?: ResourceGraph;
  resourceScope?: ResourceScopeId | null;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  vm: VmReflection;
  cache?: CacheOptions;
  fingerprints?: FingerprintHints;
}

export interface CorePipelineResult {
  ir: StageOutputs["10-lower"];
  linked: StageOutputs["20-resolve"];
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
  };
  if (opts.semantics) pipelineOpts.semantics = opts.semantics;
  if (opts.resourceGraph) pipelineOpts.resourceGraph = opts.resourceGraph;
  if (opts.resourceScope !== undefined) pipelineOpts.resourceScope = opts.resourceScope;
  if (opts.cache) pipelineOpts.cache = opts.cache;
  if (opts.fingerprints) pipelineOpts.fingerprints = opts.fingerprints;
  if (opts.attrParser) pipelineOpts.attrParser = opts.attrParser;
  if (opts.exprParser) pipelineOpts.exprParser = opts.exprParser;
  const session = engine.createSession(pipelineOpts);
  return {
    ir: session.run("10-lower"),
    linked: session.run("20-resolve"),
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

  const scopedSemantics = (options: PipelineOptions) => {
    const base = options.semantics ?? SEM_DEFAULT;
    const graph = options.resourceGraph ?? base.resourceGraph ?? null;
    const scopeId = options.resourceScope ?? base.defaultScope ?? null;
    const scoped = materializeResourcesForScope(base, graph, scopeId);
    return {
      sem: { ...base, resources: scoped.resources, resourceGraph: graph ?? null, defaultScope: scopeId ?? null },
      resources: scoped.resources,
      scopeId: scoped.scope,
    };
  };

  const scopeFingerprint = (options: PipelineOptions) => {
    const graph = options.resourceGraph ?? options.semantics?.resourceGraph ?? null;
    if (!graph) return null;
    const scope = options.resourceScope ?? options.semantics?.defaultScope ?? graph.root ?? null;
    return { graph: stableHash(graph), scope };
  };

  definitions.push({
    key: "10-lower",
    version: "2",
    deps: [],
    fingerprint(ctx) {
      const options = ctx.options;
      const sem = options.semantics ?? SEM_DEFAULT;
      const source = resolveSourceFile(options.templateFilePath);
      return {
        html: stableHash(options.html),
        file: source.hashKey,
        sem: options.fingerprints?.semantics ?? stableHash(sem),
        resourceGraph: scopeFingerprint(options),
        attrParser: options.fingerprints?.attrParser ?? (options.attrParser ? "custom" : "default"),
        exprParser: options.fingerprints?.exprParser ?? (options.exprParser ? "custom" : "default"),
      };
    },
    run(ctx) {
      const options = ctx.options;
      const exprParser = options.exprParser ?? getExpressionParser();
      const attrParser = options.attrParser ?? DEFAULT_SYNTAX;
      const { sem } = scopedSemantics(options);
      return lowerDocument(options.html, {
        file: options.templateFilePath,
        name: path.basename(options.templateFilePath),
        attrParser,
        exprParser,
        sem,
      });
    },
  });

  definitions.push({
    key: "20-resolve",
    version: "2",
    deps: ["10-lower"],
    fingerprint(ctx) {
      const sem = ctx.options.semantics ?? SEM_DEFAULT;
      return {
        sem: ctx.options.fingerprints?.semantics ?? stableHash(sem),
        resourceGraph: scopeFingerprint(ctx.options),
      };
    },
    run(ctx) {
      const scoped = scopedSemantics(ctx.options);
      const ir = ctx.require("10-lower");
      return resolveHost(ir, scoped.sem, {
        resources: scoped.resources,
        graph: ctx.options.resourceGraph ?? null,
        scope: scoped.scopeId,
      });
    },
  });

  definitions.push({
    key: "30-bind",
    version: "1",
    deps: ["20-resolve"],
    fingerprint() {
      return "scope@1";
    },
    run(ctx) {
      const linked = ctx.require("20-resolve");
      return bindScopes(linked);
    },
  });

  definitions.push({
    key: "40-typecheck",
    version: "1",
    deps: ["10-lower", "20-resolve", "30-bind"],
    fingerprint(ctx) {
      const vm = assertOption(ctx.options.vm, "vm");
      const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
      const vmToken = ctx.options.fingerprints?.vm ?? rootVm;
      return { vm: vmToken, root: rootVm };
    },
    run(ctx) {
      const linked = ctx.require("20-resolve");
      const scope = ctx.require("30-bind");
      const ir = ctx.require("10-lower");
      const vm = assertOption(ctx.options.vm, "vm");
      // TODO(productize): expose a diagnostics-only typecheck product/DAG once editor flows need it.
      const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
      return typecheck({ linked, scope, ir, rootVmType: rootVm });
    },
  });

  definitions.push({
    key: "overlay:plan",
    version: "1",
    deps: ["20-resolve", "30-bind"],
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
      const linked = ctx.require("20-resolve");
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
    deps: ["20-resolve", "30-bind"],
    fingerprint(ctx) {
      const aotOpts = ctx.options.aot ?? {};
      return {
        includeLocations: aotOpts.includeLocations ?? false,
      };
    },
    run(ctx) {
      const linked = ctx.require("20-resolve");
      const scope = ctx.require("30-bind");
      const aotOpts: AotPlanOptions = {
        templateFilePath: ctx.options.templateFilePath,
        includeLocations: ctx.options.aot?.includeLocations ?? false,
      };
      return buildAotPlan(linked, scope, aotOpts);
    },
  });

  return definitions;
}

/**
 * Shape used by tests/clients that only need the pure pipeline (up to typecheck).
 */
export function runCoreStages(options: PipelineOptions): Pick<StageOutputs, "10-lower" | "20-resolve" | "30-bind" | "40-typecheck"> {
  const engine = new PipelineEngine(createDefaultStageDefinitions());
  const session = engine.createSession(options);
  return {
    "10-lower": session.run("10-lower"),
    "20-resolve": session.run("20-resolve"),
    "30-bind": session.run("30-bind"),
    "40-typecheck": session.run("40-typecheck"),
  };
}

function hasQualifiedVm(vm: VmReflection): vm is VmReflection & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}
