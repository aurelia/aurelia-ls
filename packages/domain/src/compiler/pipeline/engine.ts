import type { AnalyzeOptions, OverlayPlanModule } from "../phases/50-plan/overlay/types.js";
import type { AotPlanModule } from "../phases/50-plan/aot/types.js";
import type { EmitResult as OverlayEmitResult } from "../phases/60-emit/overlay/emit.js";
import type { EmitResult as AotEmitResult } from "../phases/60-emit/aot/emit.js";
import type { SsrPlanModule } from "../phases/50-plan/ssr/types.js";
import type { SsrEmitResult } from "../phases/60-emit/ssr/emit.js";
import type { VmReflection } from "../phases/50-plan/overlay/types.js";
import type { IrModule } from "../model/ir.js";
import type { LinkedSemanticsModule } from "../phases/20-resolve-host/types.js";
import type { ScopeModule } from "../model/symbols.js";
import type { TypecheckModule } from "../phases/40-typecheck/typecheck.js";
import type { Semantics } from "../language/registry.js";
import type { ResourceGraph, ResourceScopeId } from "../language/resource-graph.js";
import type { AttributeParser } from "../parsing/attribute-parser.js";
import type { IExpressionParser } from "../parsing/lsp-expression-parser.js";
import { stableHash } from "./hash.js";
import { FileStageCache, type StageCache, type StageCacheEntry, createDefaultCacheDir } from "./cache.js";

/**
 * Stage keys (loosely aligned to the original phases, with product-specific planning/emit steps).
 */
export type StageKey =
  | "10-lower"
  | "20-resolve-host"
  | "30-bind"
  | "40-typecheck"
  | "50-plan-overlay"
  | "60-emit-overlay"
  | "50-plan-aot"
  | "60-emit-aot"
  | "50-plan-ssr"
  | "60-emit-ssr";

/**
 * Output types per stage. Strong typing keeps products honest about dependencies.
 */
export interface StageOutputs {
  "10-lower": IrModule;
  "20-resolve-host": LinkedSemanticsModule;
  "30-bind": ScopeModule;
  "40-typecheck": TypecheckModule;
  "50-plan-overlay": OverlayPlanModule;
  "60-emit-overlay": OverlayEmitResult;
  "50-plan-aot": AotPlanModule;
  "60-emit-aot": AotEmitResult;
  "50-plan-ssr": SsrPlanModule;
  "60-emit-ssr": SsrEmitResult;
}

/**
 * Pipeline-wide options shared by all stages; product-specific knobs hang off
 * sub-objects to avoid leaking overlay/SSR concerns into the core.
 */
export interface PipelineOptions {
  html: string;
  templateFilePath: string;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  semantics?: Semantics;
  resourceGraph?: ResourceGraph;
  resourceScope?: ResourceScopeId | null;
  vm?: VmReflection;
  /** Pipeline-wide cache knobs. */
  cache?: CacheOptions;
  /**
   * Opaque hints for fingerprinting non-serializable inputs (parsers, registry adapters, vm reflection).
   * If unset, fall back to coarse tokens like 'default' | 'custom'.
   */
  fingerprints?: FingerprintHints;
  overlay?: {
    isJs: boolean;
    filename?: string;
    banner?: string;
    eol?: "\n" | "\r\n";
    syntheticPrefix?: string;
  };
  aot?: {
    isJs?: boolean;
    filename?: string;
    banner?: string;
    eol?: "\n" | "\r\n";
  };
  ssr?: {
    eol?: "\n" | "\r\n";
  };
  analyze?: AnalyzeOptions;
  // TODO(productize): optional typecheck-only product settings (diagnostics gating, severity levels).
}

export interface CacheOptions {
  /** Disable all persistence (in-memory per session still applies). */
  enabled?: boolean;
  /** Persist artifacts to disk (default: true). */
  persist?: boolean;
  /** Override cache directory. Defaults to `<cwd>/.aurelia-cache`. */
  dir?: string;
}

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
  semantics?: FingerprintToken;
  vm?: FingerprintToken;
  overlay?: FingerprintToken;
  aot?: FingerprintToken;
  ssr?: FingerprintToken;
  analyze?: FingerprintToken;
  [extra: string]: FingerprintToken | undefined;
}

export interface StageDefinition<TKey extends StageKey> {
  key: TKey;
  version: string;
  deps: readonly StageKey[];
  /**
   * Pure fingerprint of authored inputs to the stage (deps are already resolved).
   * The final cache key is derived from this fingerprint + dep artifact hashes.
   */
  fingerprint: (ctx: StageContext) => unknown;
  run: (ctx: StageContext) => StageOutputs[TKey];
}

export class StageContext {
  #options: PipelineOptions;
  #fetch: <K extends StageKey>(key: K) => StageOutputs[K];
  #meta: <K extends StageKey>(key: K) => StageArtifactMeta | undefined;

  constructor(
    options: PipelineOptions,
    fetch: <K extends StageKey>(key: K) => StageOutputs[K],
    meta: <K extends StageKey>(key: K) => StageArtifactMeta | undefined,
  ) {
    this.#options = options;
    this.#fetch = fetch;
    this.#meta = meta;
  }

  get options(): PipelineOptions {
    return this.#options;
  }

  require<K extends StageKey>(key: K): StageOutputs[K] {
    return this.#fetch(key);
  }

  /**
   * Inspect cached metadata for a completed stage. Primarily used by facade
   * callers (LSP/diagnostics) to surface cache hits and artifact hashes.
   */
  meta<K extends StageKey>(key: K): StageArtifactMeta | undefined {
    return this.#meta(key);
  }
}

export interface StageArtifactMeta {
  key: StageKey;
  version: string;
  cacheKey: string;
  artifactHash: string;
  fromCache: boolean;
  /**
   * Where this artifact came from:
   * - "run": computed in this session
   * - "cache": loaded from persisted cache
   * - "seed": provided by the caller
   */
  source: "run" | "cache" | "seed";
}

/** Represents one execution window with memoized stage results. */
export class PipelineSession {
  #stages: Map<StageKey, StageDefinition<StageKey>>;
  #results: Map<StageKey, unknown>;
  #meta: Map<StageKey, StageArtifactMeta>;
  #cacheEnabled: boolean;
  #persistCache: StageCache | null;
  #options: PipelineOptions;

  constructor(
    stages: Map<StageKey, StageDefinition<StageKey>>,
    options: PipelineOptions,
    seed?: Partial<Record<StageKey, StageOutputs[StageKey]>>,
  ) {
    this.#stages = stages;
    this.#options = options;
    this.#results = new Map<StageKey, unknown>();
    this.#meta = new Map<StageKey, StageArtifactMeta>();
    this.#cacheEnabled = options.cache?.enabled ?? true;
    const persist = options.cache?.persist ?? false;
    this.#persistCache = this.#cacheEnabled && persist ? new FileStageCache(options.cache?.dir ?? createDefaultCacheDir()) : null;

    if (seed) {
      for (const key of Object.keys(seed) as StageKey[]) {
        const def = this.#stages.get(key);
        if (!def) continue;
        const output = seed[key] as StageOutputs[StageKey];
        const artifactHash = stableHash(output);
        const cacheKey = stableHash({ seed: key, artifactHash, version: def.version });
        this.#results.set(key, output);
        this.#meta.set(key, { key, version: def.version, cacheKey, artifactHash, fromCache: false, source: "seed" });
      }
    }
  }

  get options(): PipelineOptions {
    return this.#options;
  }

  peek<K extends StageKey>(key: K): StageOutputs[K] | undefined {
    return this.#results.get(key) as StageOutputs[K] | undefined;
  }

  /** Inspect metadata for a given stage if it has already been computed in this session. */
  meta<K extends StageKey>(key: K): StageArtifactMeta | undefined {
    return this.#meta.get(key);
  }

  run<K extends StageKey>(key: K): StageOutputs[K] {
    const memo = this.peek(key);
    if (memo) return memo;
    const def = this.#stages.get(key);
    if (!def) throw new Error(`Unknown stage '${key}'`);

    // Ensure deps are resolved before computing fingerprint.
    for (const dep of def.deps) this.run(dep);
    const ctx = new StageContext(
      this.#options,
      <S extends StageKey>(k: S) => this.run(k),
      <S extends StageKey>(k: S) => this.#meta.get(k),
    );

    const depMeta = def.deps.map((d) => {
      const m = this.#meta.get(d);
      if (!m) throw new Error(`Missing metadata for dependency '${d}' required by '${key}'`);
      return { key: m.key, version: m.version, artifactHash: m.artifactHash };
    });
    const fingerprint = def.fingerprint(ctx);
    const cacheKey = stableHash({ key, version: def.version, deps: depMeta, input: fingerprint });

    if (this.#cacheEnabled && this.#persistCache) {
      const cached = this.#persistCache.load<StageOutputs[K]>(cacheKey);
      if (cached && cached.meta.version === def.version) {
        const meta: StageArtifactMeta = {
          key,
          version: def.version,
          cacheKey,
          artifactHash: cached.meta.artifactHash,
          fromCache: true,
          source: "cache",
        };
        this.#meta.set(key, meta);
        this.#results.set(key, cached.artifact);
        return cached.artifact;
      }
    }

    const out = def.run(ctx) as StageOutputs[K];
    const artifactHash = stableHash(out);
    const meta: StageArtifactMeta = { key, version: def.version, cacheKey, artifactHash, fromCache: false, source: "run" };
    this.#meta.set(key, meta);
    this.#results.set(key, out);

    if (this.#cacheEnabled && this.#persistCache) {
      const entry: StageCacheEntry = { meta: { ...meta, fromCache: false }, artifact: out };
      this.#persistCache.store(cacheKey, entry);
    }

    return out;
  }
}

export class PipelineEngine {
  #stages: Map<StageKey, StageDefinition<StageKey>>;

  constructor(stages: Iterable<StageDefinition<StageKey>>) {
    this.#stages = new Map<StageKey, StageDefinition<StageKey>>();
    for (const s of stages) this.#stages.set(s.key, s);
  }

  createSession(options: PipelineOptions, seed?: Partial<Record<StageKey, StageOutputs[StageKey]>>): PipelineSession {
    return new PipelineSession(this.#stages, options, seed);
  }

  run<K extends StageKey>(key: K, options: PipelineOptions, seed?: Partial<Record<StageKey, StageOutputs[StageKey]>>): StageOutputs[K] {
    return this.createSession(options, seed).run(key);
  }
}
