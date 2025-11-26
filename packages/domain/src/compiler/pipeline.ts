import { PipelineEngine, type PipelineOptions, type StageOutputs, type CacheOptions, type FingerprintHints } from "./pipeline/engine.js";
import { createDefaultStageDefinitions } from "./pipeline/stages.js";
import type { AttributeParser } from "./parsing/attribute-parser.js";
import type { Semantics } from "./language/registry.js";
import type { ResourceGraph, ResourceScopeId } from "./language/resource-graph.js";
import type { VmReflection } from "./phases/50-plan/overlay/types.js";
import type { IExpressionParser } from "./parsing/lsp-expression-parser.js";

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
  linked: StageOutputs["20-resolve-host"];
  scope: StageOutputs["30-bind"];
  typecheck: StageOutputs["40-typecheck"];
}

/**
  * Create a pipeline engine with the default stage graph.
  * Callers can supply a custom engine for experimentation or testing.
  */
export function createDefaultEngine(): PipelineEngine {
  return new PipelineEngine(createDefaultStageDefinitions());
}

/** Run the pure pipeline up to typecheck (10 -> 40). */
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
    linked: session.run("20-resolve-host"),
    scope: session.run("30-bind"),
    typecheck: session.run("40-typecheck"),
  };
}
