// Template Pipeline — L2 Architecture
//
// Pure sequential pipeline: lower → link → bind → typecheck → usage → synthesis.
// Each stage is a stateless function. No caching engine — invalidation is handled
// by the dependency graph at the model level.
//
// Caching of compiled templates is the responsibility of TemplateProgram (program.ts),
// not the pipeline itself. The pipeline is a pure function: same inputs → same outputs.

import type { IrModule, ScopeModule } from "../model/index.js";
import type { TemplateContext } from "../schema/index.js";
import type { AttributeParser, IExpressionParser } from "../parsing/index.js";
import type { VmReflection, SynthesisOptions, CompileTrace, ModuleResolver } from "../shared/index.js";
import type { LinkModule, TypecheckModule } from "../analysis/index.js";
import type { OverlayPlanModule, OverlayEmitResult, AotPlanModule } from "../synthesis/index.js";
import type { FeatureUsageSet } from "../schema/index.js";
import type { SemanticModelQuery } from "../schema/model.js";
import type { DependencyGraph } from "../schema/dependency-graph.js";

export type { ModuleResolver } from "../shared/index.js";

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
}

// ============================================================================
// Stage Output Types (retained for downstream type compatibility)
// ============================================================================

/**
 * Stage keys for type-level output indexing.
 */
export type StageKey =
  | "10-lower"
  | "20-link"
  | "30-bind"
  | "40-typecheck"
  | "50-usage"
  | "overlay:plan"
  | "overlay:emit"
  | "aot:plan";

/**
 * Output types per stage.
 */
export interface StageOutputs {
  "10-lower": IrModule;
  "20-link": LinkModule;
  "30-bind": ScopeModule;
  "40-typecheck": TypecheckModule;
  "50-usage": FeatureUsageSet;
  "overlay:plan": OverlayPlanModule;
  "overlay:emit": OverlayEmitResult;
  "aot:plan": AotPlanModule;
}

// ============================================================================
// Fingerprint Types (retained for TemplateProgram cache compatibility)
// ============================================================================

export type FingerprintToken =
  | string
  | number
  | boolean
  | null
  | readonly FingerprintToken[]
  | { readonly [key: string]: FingerprintToken };

export interface FingerprintHints {
  attrParser?: FingerprintToken;
  exprParser?: FingerprintToken;
  catalog?: FingerprintToken;
  syntax?: FingerprintToken;
  semantics?: FingerprintToken;
  vm?: FingerprintToken;
  overlay?: FingerprintToken;
  analyze?: FingerprintToken;
  moduleResolver?: FingerprintToken;
  [extra: string]: FingerprintToken | undefined;
}

export interface CacheOptions {
  enabled?: boolean;
  persist?: boolean;
  dir?: string;
}

// ============================================================================
// Stage Meta (retained for facade/program compatibility during migration)
// ============================================================================

export interface StageArtifactMeta {
  key: StageKey;
  version: string;
  cacheKey: string;
  artifactHash: string;
  fromCache: boolean;
  source: "run" | "cache" | "seed";
}

export type StageMetaSnapshot = Partial<Record<StageKey, StageArtifactMeta>>;
