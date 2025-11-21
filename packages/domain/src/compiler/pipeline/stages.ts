import path from "node:path";
import { lowerDocument } from "../phases/10-lower/lower.js";
import { resolveHost } from "../phases/20-resolve-host/resolve.js";
import { bindScopes } from "../phases/30-bind/bind.js";
import { typecheck } from "../phases/40-typecheck/typecheck.js";
import { plan as planOverlay } from "../phases/50-plan/plan.js";
import { emitOverlayFile } from "../phases/60-emit/overlay.js";
import { planSsr } from "../phases/50-plan/ssr-plan.js";
import { emitSsr } from "../phases/60-emit/ssr.js";
import { DEFAULT as SEM_DEFAULT } from "../language/registry.js";
import { DEFAULT_SYNTAX } from "../language/syntax.js";
import { getExpressionParser } from "../../parsers/expression-parser.js";
import { PipelineEngine } from "./engine.js";
import type { StageDefinition, StageKey, StageOutputs, PipelineOptions } from "./engine.js";
import type { AnalyzeOptions } from "../phases/50-plan/types.js";
import type { EmitOptions as OverlayEmitOptions } from "../phases/60-emit/overlay.js";

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

  definitions.push({
    key: "10-lower",
    deps: [],
    run(ctx) {
      const options = ctx.options;
      const exprParser = options.exprParser ?? getExpressionParser();
      const attrParser = options.attrParser ?? DEFAULT_SYNTAX;
      return lowerDocument(options.html, {
        file: options.templateFilePath,
        name: path.basename(options.templateFilePath),
        attrParser,
        exprParser,
        sem: options.semantics ?? SEM_DEFAULT,
      });
    },
  });

  definitions.push({
    key: "20-link",
    deps: ["10-lower"],
    run(ctx) {
      const sem = ctx.options.semantics ?? SEM_DEFAULT;
      const ir = ctx.require("10-lower");
      return resolveHost(ir, sem);
    },
  });

  definitions.push({
    key: "30-scope",
    deps: ["20-link"],
    run(ctx) {
      const linked = ctx.require("20-link");
      return bindScopes(linked);
    },
  });

  definitions.push({
    key: "40-typecheck",
    deps: ["20-link"],
    run(ctx) {
      const linked = ctx.require("20-link");
      return typecheck(linked);
    },
  });

  definitions.push({
    key: "50-plan-overlay",
    deps: ["20-link", "30-scope"],
    run(ctx) {
      const linked = ctx.require("20-link");
      const scope = ctx.require("30-scope");
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
    deps: ["50-plan-overlay"],
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
    deps: ["20-link", "30-scope"],
    run(ctx) {
      const linked = ctx.require("20-link");
      const scope = ctx.require("30-scope");
      return planSsr(linked, scope);
    },
  });

  definitions.push({
    key: "60-emit-ssr",
    deps: ["50-plan-ssr", "20-link"],
    run(ctx) {
      const plan = ctx.require("50-plan-ssr");
      const linked = ctx.require("20-link");
      const { html, manifest } = emitSsr(plan, linked, { eol: ctx.options.ssr?.eol ?? "\n" });
      return { html, manifest };
    },
  });

  return definitions;
}

/**
 * Shape used by tests/clients that only need the pure pipeline (up to typecheck).
 */
export function runCoreStages(options: PipelineOptions): Pick<StageOutputs, "10-lower" | "20-link" | "30-scope" | "40-typecheck"> {
  const engine = new PipelineEngine(createDefaultStageDefinitions());
  const session = engine.createSession(options);
  return {
    "10-lower": session.run("10-lower"),
    "20-link": session.run("20-link"),
    "30-scope": session.run("30-scope"),
    "40-typecheck": session.run("40-typecheck"),
  };
}
