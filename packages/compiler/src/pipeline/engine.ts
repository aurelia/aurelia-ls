// Template Pipeline — L2 Architecture
//
// Pure sequential pipeline: lower → link → bind → typecheck → usage → synthesis.
// Each stage is a stateless function. No caching engine — invalidation is handled
// by the dependency graph at the model level.

import type { TemplateContext } from "../schema/index.js";
import type { AttributeParser, IExpressionParser } from "../parsing/index.js";
import type { VmReflection, CompileTrace, ModuleResolver } from "../shared/index.js";
import type { SemanticModelQuery } from "../schema/model.js";
import type { IrModule } from "../model/index.js";
import type { DependencyGraph } from "../schema/dependency-graph.js";

// ============================================================================
// Pipeline Options
// ============================================================================

/**
 * Everything the template pipeline needs to compile a single template.
 */
export interface PipelineOptions {
  /** Template HTML source. */
  html: string;
  /** Canonical path to the template file. */
  templateFilePath: string;
  /** Semantic authority — the query IS the model. */
  query: SemanticModelQuery;
  /** Module resolver for import validation. */
  moduleResolver: ModuleResolver;
  /** VM reflection for overlay synthesis. */
  vm?: VmReflection;
  /** Scope/local-import context for this template. */
  templateContext?: TemplateContext;
  /** Dependency graph for recording read edges during compilation. */
  depGraph?: DependencyGraph;
  /** Override attribute parser. */
  attrParser?: AttributeParser;
  /** Override expression parser. */
  exprParser?: IExpressionParser;
  /** Overlay synthesis options. */
  overlay?: {
    isJs: boolean;
    filename?: string;
    banner?: string;
    eol?: "\n" | "\r\n";
    syntheticPrefix?: string;
  };
  /** AOT synthesis options. */
  aot?: {
    includeLocations?: boolean;
  };
  /** Trace context for instrumentation. */
  trace?: CompileTrace;
  /** Pre-computed IR from a previous lower pass (skip re-lowering when provided). */
  seededIr?: IrModule;
}

// ============================================================================
// Stage Keys
// ============================================================================

export type StageKey =
  | "10-lower"
  | "20-link"
  | "30-bind"
  | "40-typecheck"
  | "50-usage"
  | "overlay:plan"
  | "overlay:emit"
  | "aot:plan";

// ============================================================================
// Stage Meta
// ============================================================================

export interface StageArtifactMeta {
  key: StageKey;
  version: string;
  cacheKey: string;
  artifactHash: string;
  fromCache: boolean;
  source: "run" | "cache" | "seed";
}
