import path from "node:path";
import { lowerDocument } from "../phases/10-lower/lower.js";
import { resolveHost } from "../phases/20-resolve-host/resolve.js";
import { bindScopes } from "../phases/30-bind/bind.js";
import { typecheck } from "../phases/40-typecheck/typecheck.js";
import { plan as planOverlay } from "../phases/50-plan/overlay/plan.js";
import { emitOverlayFile } from "../phases/60-emit/overlay/emit.js";
import { planSsr } from "../phases/50-plan/ssr/plan.js";
import { emitSsr } from "../phases/60-emit/ssr/emit.js";
import { DEFAULT as SEM_DEFAULT } from "../language/registry.js";
import { materializeResourcesForScope } from "../language/resource-graph.js";
import { DEFAULT_SYNTAX } from "../parsing/attribute-parser.js";
import { getExpressionParser } from "../parsing/expression-parser.js";
import { PipelineEngine } from "./engine.js";
import type { StageDefinition, StageKey, StageOutputs, PipelineOptions } from "./engine.js";
import type { AnalyzeOptions } from "../phases/50-plan/overlay/types.js";
import type { EmitOptions as OverlayEmitOptions } from "../phases/60-emit/overlay/emit.js";
import { stableHash } from "./hash.js";
import { resolveSourceFile } from "../model/source.js";

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
    key: "20-resolve-host",
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
    deps: ["20-resolve-host"],
    fingerprint() {
      return "scope@1";
    },
    run(ctx) {
      const linked = ctx.require("20-resolve-host");
      return bindScopes(linked);
    },
  });

  definitions.push({
    key: "40-typecheck",
    version: "1",
    deps: ["10-lower", "20-resolve-host", "30-bind"],
    fingerprint(ctx) {
      const vm = assertOption(ctx.options.vm, "vm");
      const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
      const vmToken = ctx.options.fingerprints?.vm ?? rootVm;
      return { vm: vmToken, root: rootVm };
    },
    run(ctx) {
      const linked = ctx.require("20-resolve-host");
      const scope = ctx.require("30-bind");
      const ir = ctx.require("10-lower");
      const vm = assertOption(ctx.options.vm, "vm");
      // TODO(productize): expose a diagnostics-only typecheck product/DAG once editor flows need it.
      const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
      return typecheck({ linked, scope, ir, rootVmType: rootVm });
    },
  });

  definitions.push({
    key: "50-plan-overlay",
    version: "1",
    deps: ["20-resolve-host", "30-bind"],
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
      const linked = ctx.require("20-resolve-host");
      const scope = ctx.require("30-bind");
      const vm = assertOption(ctx.options.vm, "vm");
      const overlayOpts: AnalyzeOptions = {
        isJs: ctx.options.overlay?.isJs ?? false,
        vm,
        syntheticPrefix: ctx.options.overlay?.syntheticPrefix ?? vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
      };
      return planOverlay(linked, scope, overlayOpts);
    },
  });

  definitions.push({
    key: "60-emit-overlay",
    version: "1",
    deps: ["50-plan-overlay"],
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
      const plan = ctx.require("50-plan-overlay");
      const overlayOpts = ctx.options.overlay ?? { isJs: false };
      const emitOpts: OverlayEmitOptions & { isJs: boolean } = { isJs: overlayOpts.isJs };
      if (overlayOpts.eol) emitOpts.eol = overlayOpts.eol;
      if (overlayOpts.banner) emitOpts.banner = overlayOpts.banner;
      if (overlayOpts.filename) emitOpts.filename = overlayOpts.filename;
      return emitOverlayFile(plan, emitOpts);
    },
  });

  definitions.push({
    key: "50-plan-ssr",
    version: "1",
    deps: ["20-resolve-host", "30-bind"],
    fingerprint() {
      return "ssr-plan@1";
    },
    run(ctx) {
      const linked = ctx.require("20-resolve-host");
      const scope = ctx.require("30-bind");
      return planSsr(linked, scope);
    },
  });

  definitions.push({
    key: "60-emit-ssr",
    version: "1",
    deps: ["50-plan-ssr", "20-resolve-host"],
    fingerprint(ctx) {
      return ctx.options.fingerprints?.ssr ?? { eol: ctx.options.ssr?.eol ?? "\n" };
    },
    run(ctx) {
      const plan = ctx.require("50-plan-ssr");
      const linked = ctx.require("20-resolve-host");
      return emitSsr(plan, linked, { eol: ctx.options.ssr?.eol ?? "\n" });
    },
  });

  return definitions;
}

/**
 * Shape used by tests/clients that only need the pure pipeline (up to typecheck).
 */
export function runCoreStages(options: PipelineOptions): Pick<StageOutputs, "10-lower" | "20-resolve-host" | "30-bind" | "40-typecheck"> {
  const engine = new PipelineEngine(createDefaultStageDefinitions());
  const session = engine.createSession(options);
  return {
    "10-lower": session.run("10-lower"),
    "20-resolve-host": session.run("20-resolve-host"),
    "30-bind": session.run("30-bind"),
    "40-typecheck": session.run("40-typecheck"),
  };
}

function hasQualifiedVm(vm: AnalyzeOptions["vm"]): vm is AnalyzeOptions["vm"] & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}
