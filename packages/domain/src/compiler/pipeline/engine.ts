import type { AnalyzeOptions, OverlayPlanModule } from "../phases/50-plan/types.js";
import type { EmitResult as OverlayEmitResult } from "../phases/60-emit/overlay.js";
import type { SsrPlanModule } from "../phases/50-plan/ssr-types.js";
import type { VmReflection } from "../phases/50-plan/types.js";
import type { IrModule } from "../model/ir.js";
import type { LinkedSemanticsModule } from "../phases/20-resolve-host/types.js";
import type { ScopeModule } from "../model/symbols.js";
import type { TypecheckModule } from "../phases/40-typecheck/typecheck.js";
import type { Semantics } from "../language/registry.js";
import type { AttributeParser } from "../language/syntax.js";
import type { IExpressionParser } from "../../parsers/expression-api.js";

/**
 * Minimal in-memory stage executor.
 * - Caches results per session; start a new session when inputs change.
 * - No automatic change detection: callers decide when inputs changed.
 */

/**
 * Stage keys (loosely aligned to the original phases, with product-specific planning/emit steps).
 */
export type StageKey =
  | "10-lower"
  | "20-link"
  | "30-scope"
  | "40-typecheck"
  | "50-plan-overlay"
  | "60-emit-overlay"
  | "50-plan-ssr"
  | "60-emit-ssr";

/**
 * Output types per stage. Strong typing keeps products honest about dependencies.
 */
export interface StageOutputs {
  "10-lower": IrModule;
  "20-link": LinkedSemanticsModule;
  "30-scope": ScopeModule;
  "40-typecheck": TypecheckModule;
  "50-plan-overlay": OverlayPlanModule;
  "60-emit-overlay": OverlayEmitResult;
  "50-plan-ssr": SsrPlanModule;
  "60-emit-ssr": { html: string; manifest: string };
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
  vm?: VmReflection;
  overlay?: {
    isJs: boolean;
    filename?: string;
    banner?: string;
    eol?: "\n" | "\r\n";
    syntheticPrefix?: string;
  };
  ssr?: {
    eol?: "\n" | "\r\n";
  };
  analyze?: AnalyzeOptions;
}

export interface StageDefinition<TKey extends StageKey> {
  key: TKey;
  deps: readonly StageKey[];
  run: (ctx: StageContext) => StageOutputs[TKey];
}

export class StageContext {
  #options: PipelineOptions;
  #fetch: <K extends StageKey>(key: K) => StageOutputs[K];

  constructor(options: PipelineOptions, fetch: <K extends StageKey>(key: K) => StageOutputs[K]) {
    this.#options = options;
    this.#fetch = fetch;
  }

  get options(): PipelineOptions {
    return this.#options;
  }

  require<K extends StageKey>(key: K): StageOutputs[K] {
    return this.#fetch(key);
  }
}

/** Represents one execution window with memoized stage results. */
export class PipelineSession {
  #stages: Map<StageKey, StageDefinition<StageKey>>;
  #cache: Map<StageKey, unknown>;
  #options: PipelineOptions;

  constructor(stages: Map<StageKey, StageDefinition<StageKey>>, options: PipelineOptions, seed?: Partial<Record<StageKey, StageOutputs[StageKey]>>) {
    this.#stages = stages;
    this.#options = options;
    this.#cache = new Map<StageKey, unknown>();
    if (seed) {
      for (const key of Object.keys(seed) as StageKey[]) {
        this.#cache.set(key, seed[key]);
      }
    }
  }

  get options(): PipelineOptions {
    return this.#options;
  }

  peek<K extends StageKey>(key: K): StageOutputs[K] | undefined {
    return this.#cache.get(key) as StageOutputs[K] | undefined;
  }

  run<K extends StageKey>(key: K): StageOutputs[K] {
    const cached = this.peek(key);
    if (cached) return cached;
    const def = this.#stages.get(key);
    if (!def) throw new Error(`Unknown stage '${key}'`);
    const ctx = new StageContext(this.#options, <S extends StageKey>(k: S) => this.run(k));
    for (const dep of def.deps) this.run(dep);
    const out = def.run(ctx) as StageOutputs[K];
    this.#cache.set(key, out);
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
