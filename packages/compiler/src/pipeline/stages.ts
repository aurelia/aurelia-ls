// Template Pipeline Stages — L2 Architecture
//
// Pure sequential functions matching the L2 template pipeline contract:
//   lower → link → bind → typecheck → usage → overlay
//
// Each stage is a stateless function called with explicit inputs.
// No engine, no session, no stage graph, no per-stage caching.
// Caching is the responsibility of the caller (TemplateProgram).

import path from "node:path";
import type { NormalizedPath } from "../model/identity.js";
import type { IrModule } from "../model/ir.js";
import type { ScopeModule } from "../model/symbols.js";
import type { TemplateContext } from "../schema/snapshot.js";
import type { SemanticModelQuery } from "../schema/model.js";
import type { DepRecorder } from "../schema/dependency-graph.js";
import { createDepRecorder, NOOP_DEP_RECORDER } from "../schema/dependency-graph.js";
import { createAttributeParserFromRegistry, type AttributeParser } from "../parsing/attribute-parser.js";
import { getExpressionParser, type IExpressionParser } from "../parsing/expression-parser.js";
import type { ModuleResolver } from "../shared/module-resolver.js";
import type { SynthesisOptions, VmReflection } from "../shared/vm-reflection.js";
import { NOOP_TRACE } from "../shared/trace.js";
import { lowerDocument } from "../analysis/10-lower/lower.js";
import { linkTemplateSemantics } from "../analysis/20-link/resolve.js";
import { bindScopes } from "../analysis/30-bind/bind.js";
import { typecheck } from "../analysis/40-typecheck/typecheck.js";
import { collectFeatureUsage } from "../analysis/50-usage/usage.js";
import { emitOverlayFile, type OverlayEmitOptions } from "../synthesis/overlay/emit.js";
import { planOverlay } from "../synthesis/overlay/plan.js";
import { DiagnosticsRuntime } from "../diagnostics/runtime.js";
import type { LinkModule } from "../analysis/20-link/types.js";
import type { TypecheckModule } from "../analysis/40-typecheck/typecheck.js";
import type { FeatureUsageSet } from "../schema/types.js";
import type { OverlayEmitResult } from "../synthesis/overlay/emit.js";
import type { OverlayPlanModule } from "../synthesis/overlay/types.js";
import type { PipelineOptions, StageKey, StageArtifactMeta } from "./engine.js";

// ============================================================================
// Core Pipeline Options (simplified)
// ============================================================================

export interface CoreCompileOptions {
  html: string;
  templateFilePath: string;
  query: SemanticModelQuery;
  templateContext?: TemplateContext;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  vm: VmReflection;
  moduleResolver: ModuleResolver;
}

export interface CorePipelineResult {
  ir: IrModule;
  linked: LinkModule;
  scope: ScopeModule;
  typecheck: TypecheckModule;
}

// ============================================================================
// Pure Pipeline Functions
// ============================================================================

/**
 * Run the core analysis pipeline: lower → link → bind → typecheck.
 *
 * Pure function. No caching, no engine. Same inputs → same outputs.
 */
export function runCorePipeline(opts: CoreCompileOptions): CorePipelineResult {
  const diag = new DiagnosticsRuntime();
  const query = opts.query;
  const exprParser = opts.exprParser ?? getExpressionParser();
  const attrParser = opts.attrParser ?? createAttributeParserFromRegistry(query.syntax);

  // Stage 1: Lower — HTML → instruction IR
  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
    catalog: query.model.catalog,
    diagnostics: diag.forSource("lower"),
  });

  // Stage 2: Link — resolve resource references
  const linked = linkTemplateSemantics(ir, null, {
    moduleResolver: opts.moduleResolver,
    templateFilePath: opts.templateFilePath,
    diagnostics: diag.forSource("link"),
    lookup: query,
    graph: query.graph,
  });

  // Stage 3: Bind — validate bindings
  const scope = bindScopes(linked, { diagnostics: diag.forSource("bind") });

  // Stage 4: Typecheck — extract binding contracts
  const vm = opts.vm;
  const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
  const tc = typecheck({
    linked,
    scope,
    rootVmType: rootVm,
  });

  return { ir, linked, scope, typecheck: tc };
}

/**
 * Run the full template compilation pipeline including overlay synthesis.
 *
 * This is the L2 `compileTemplate` — a pure function that produces the
 * complete TemplateCompilation from a template path and semantic query.
 */
export function runFullPipeline(opts: PipelineOptions): {
  ir: IrModule;
  linked: LinkModule;
  scope: ScopeModule;
  typecheck: TypecheckModule;
  usage: FeatureUsageSet;
  overlayPlan: OverlayPlanModule;
  overlayEmit: OverlayEmitResult;
  diagnostics: DiagnosticsRuntime;
  recorder: DepRecorder;
} {
  const diag = new DiagnosticsRuntime();
  // Create scope-parameterized query if templateContext provides a scope.
  // This ensures the link stage resolves resources visible in the template's
  // scope (e.g., local imports from <import> tags) rather than only the default scope.
  const ctx = opts.templateContext;
  const query = (ctx?.scopeId || ctx?.localImports?.length)
    ? opts.query.model.query({ scope: ctx.scopeId, localImports: ctx.localImports })
    : opts.query;
  const depGraph = opts.depGraph;
  const recorder = depGraph
    ? createDepRecorder(depGraph, depGraph.addNode('template-compilation', opts.templateFilePath))
    : NOOP_DEP_RECORDER;

  const trace = opts.trace ?? NOOP_TRACE;

  const { exprParser, attrParser } = trace.span("pipeline:setup", () => {
    const ep = opts.exprParser ?? getExpressionParser();
    const ap = opts.attrParser ?? createAttributeParserFromRegistry(query.syntax);
    recorder.readFile(opts.templateFilePath as NormalizedPath);
    recorder.readVocabulary();
    if (ctx?.scopeId) recorder.readScope(ctx.scopeId);
    return { exprParser: ep, attrParser: ap };
  });

  const ir = opts.seededIr ?? trace.span("stage:lower", () => lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
    catalog: query.model.catalog,
    diagnostics: diag.forSource("lower"),
    trace,
  }));

  const linked = trace.span("stage:link", () => linkTemplateSemantics(ir, null, {
    moduleResolver: opts.moduleResolver,
    templateFilePath: opts.templateFilePath,
    diagnostics: diag.forSource("link"),
    trace,
    deps: recorder,
    lookup: query,
    graph: query.graph,
  }));

  const scope = trace.span("stage:bind", () => bindScopes(linked, {
    trace,
    diagnostics: diag.forSource("bind"),
    model: query,
    deps: recorder,
  }));

  const vm = opts.vm;
  const rootVm = vm ? (hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr()) : "unknown";
  const tc = trace.span("stage:typecheck", () => typecheck({
    linked,
    scope,
    rootVmType: rootVm,
    trace,
    deps: recorder,
    model: query,
    templateFilePath: opts.templateFilePath as NormalizedPath,
  }));

  const usage = trace.span("stage:usage", () => collectFeatureUsage(linked, { syntax: query.syntax, attrParser }));

  const overlayOpts: SynthesisOptions = {
    isJs: opts.overlay?.isJs ?? false,
    vm: vm!,
    syntheticPrefix: opts.overlay?.syntheticPrefix ?? vm?.getSyntheticPrefix?.() ?? "__AU_TTC_",
  };
  const overlayPlan = trace.span("stage:overlay-plan", () => planOverlay(linked, scope, overlayOpts));

  const emitOpts: OverlayEmitOptions & { isJs: boolean } = { isJs: opts.overlay?.isJs ?? false };
  if (opts.overlay?.eol) emitOpts.eol = opts.overlay.eol;
  if (opts.overlay?.banner) emitOpts.banner = opts.overlay.banner;
  if (opts.overlay?.filename) emitOpts.filename = opts.overlay.filename;
  const overlayEmit = trace.span("stage:overlay-emit", () => emitOverlayFile(overlayPlan, emitOpts));

  return { ir, linked, scope, typecheck: tc, usage, overlayPlan, overlayEmit, diagnostics: diag, recorder };
}

function hasQualifiedVm(vm: VmReflection): vm is VmReflection & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}

// Re-exports for backward compatibility during migration
export type { PipelineOptions, StageKey, StageArtifactMeta };
