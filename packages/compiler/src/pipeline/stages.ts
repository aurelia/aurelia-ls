import path from "node:path";

// Model imports (via barrel)
import { resolveSourceFile } from "../model/index.js";

// Language imports (via barrel)
import {
  buildTemplateSyntaxRegistry,
  materializeSemanticsForScope,
  type ResourceCatalog,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
  type TemplateSyntaxRegistry,
} from "../language/index.js";

// Parsing imports (via barrel)
import { createAttributeParserFromRegistry, getExpressionParser, type AttributeParser, type IExpressionParser } from "../parsing/index.js";

// Shared imports (via barrel)
import type { VmReflection, SynthesisOptions } from "../shared/index.js";

// Analysis imports (via barrel)
import { lowerDocument, resolveHost, bindScopes, typecheck, collectFeatureUsage } from "../analysis/index.js";

// Synthesis imports (via barrel)
import { planOverlay, emitOverlayFile, type OverlayEmitOptions, planAot, type AotPlanOptions } from "../synthesis/index.js";

// Local imports
import { PipelineEngine } from "./engine.js";
import type { StageDefinition, StageKey, StageOutputs, PipelineOptions, CacheOptions, FingerprintHints } from "./engine.js";
import { stableHash, stableHashSemantics } from "./hash.js";

/* =======================================================================================
 * CORE PIPELINE TYPES & FACTORIES
 * ======================================================================================= */

export interface CoreCompileOptions {
  html: string;
  templateFilePath: string;
  semantics: Semantics;
  catalog?: ResourceCatalog;
  syntax?: TemplateSyntaxRegistry;
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
    semantics: opts.semantics,
  };
  if (opts.catalog) pipelineOpts.catalog = opts.catalog;
  if (opts.syntax) pipelineOpts.syntax = opts.syntax;
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

  const resolveSemanticsInputs = (options: PipelineOptions) => {
    const base = assertOption(options.semantics, "semantics");
    const graph = options.resourceGraph ?? base.resourceGraph ?? null;
    const scopeId = options.resourceScope ?? base.defaultScope ?? null;
    const sem = materializeSemanticsForScope(base, graph, scopeId);
    const catalog = options.catalog ?? sem.catalog;
    const semWithCatalog = options.catalog ? { ...sem, catalog } : sem;
    const syntax = options.syntax ?? buildTemplateSyntaxRegistry(semWithCatalog);
    return {
      sem: semWithCatalog,
      resources: sem.resources,
      catalog,
      syntax,
      scopeId: scopeId ?? null,
    };
  };

  const scopeFingerprint = (options: PipelineOptions) => {
    const graph = options.resourceGraph ?? options.semantics.resourceGraph ?? null;
    if (!graph) return null;
    const scope = options.resourceScope ?? options.semantics.defaultScope ?? graph.root ?? null;
    return { graph: stableHash(graph), scope };
  };

  definitions.push({
    key: "10-lower",
    version: "2",
    deps: [],
    fingerprint(ctx) {
      const options = ctx.options;
      const { catalog, syntax } = resolveSemanticsInputs(options);
      const source = resolveSourceFile(options.templateFilePath);
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
      const exprParser = options.exprParser ?? getExpressionParser();
      const { catalog, syntax } = resolveSemanticsInputs(options);
      const attrParser = options.attrParser ?? createAttributeParserFromRegistry(syntax);
      return lowerDocument(options.html, {
        file: options.templateFilePath,
        name: path.basename(options.templateFilePath),
        attrParser,
        exprParser,
        catalog,
        trace: options.trace,
      });
    },
  });

  definitions.push({
    key: "20-resolve",
    version: "2",
    deps: ["10-lower"],
    fingerprint(ctx) {
      const { sem } = resolveSemanticsInputs(ctx.options);
      return {
        sem: ctx.options.fingerprints?.semantics ?? stableHashSemantics(sem),
        resourceGraph: scopeFingerprint(ctx.options),
      };
    },
    run(ctx) {
      const scoped = resolveSemanticsInputs(ctx.options);
      const ir = ctx.require("10-lower");
      return resolveHost(ir, scoped.sem, {
        resources: scoped.resources,
        graph: ctx.options.resourceGraph ?? null,
        scope: scoped.scopeId,
        trace: ctx.options.trace,
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
      return bindScopes(linked, { trace: ctx.options.trace });
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
      return typecheck({ linked, scope, ir, rootVmType: rootVm, trace: ctx.options.trace });
    },
  });

  definitions.push({
    key: "50-usage",
    version: "1",
    deps: ["20-resolve"],
    fingerprint(ctx) {
      const { syntax } = resolveSemanticsInputs(ctx.options);
      const attrParserFingerprint = ctx.options.fingerprints?.attrParser
        ?? ctx.options.fingerprints?.syntax
        ?? (ctx.options.attrParser ? "custom" : stableHash(syntax.attributePatterns));
      return { attrParser: attrParserFingerprint };
    },
    run(ctx) {
      const scoped = resolveSemanticsInputs(ctx.options);
      const attrParser = ctx.options.attrParser ?? createAttributeParserFromRegistry(scoped.syntax);
      const linked = ctx.require("20-resolve");
      return collectFeatureUsage(linked, { syntax: scoped.syntax, attrParser });
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
      return planAot(linked, scope, aotOpts);
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
