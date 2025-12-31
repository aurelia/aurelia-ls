/* =======================================================================================
 * COMPILE TRACE - Instrumentation primitives for compiler observability
 * ---------------------------------------------------------------------------------------
 * A hierarchical tracing system for performance profiling, debug tracing, and metrics.
 *
 * Core concepts:
 * - Span: Unit of work with timing, hierarchy, attributes, and events
 * - CompileTrace: Main API for instrumentation (span, event, setAttribute)
 * - TraceExporter: Pluggable backend for trace data (console, JSON, OpenTelemetry)
 * - NOOP_TRACE: Zero-cost no-op when tracing is disabled
 *
 * Design pattern: Like Diagnosed<T>, this follows the writer monad pattern -
 * accumulating metadata (timing/context) alongside computation without disrupting
 * the pure functional core.
 * ======================================================================================= */

// =============================================================================
// Attribute Types
// =============================================================================

/**
 * Values that can be attached to spans and events as structured context.
 * Follows OpenTelemetry attribute value conventions.
 */
export type AttributeValue =
  | string
  | number
  | boolean
  | null
  | readonly AttributeValue[];

/** Mutable map for building attributes. */
export type AttributeMap = Map<string, AttributeValue>;

/** Readonly view of attributes. */
export type ReadonlyAttributeMap = ReadonlyMap<string, AttributeValue>;

// =============================================================================
// Span Event
// =============================================================================

/**
 * A point-in-time marker within a span.
 * Use for significant moments that don't warrant their own span.
 *
 * @example
 * trace.event("cache.hit", { key: cacheKey });
 * trace.event("validation.complete", { errorCount: 3 });
 */
export interface SpanEvent {
  /** Event name (e.g., "cache.hit", "parse.complete") */
  readonly name: string;

  /** Timestamp in nanoseconds (via process.hrtime.bigint or performance.now) */
  readonly timestamp: bigint;

  /** Structured context for this event */
  readonly attributes: ReadonlyAttributeMap;
}

// =============================================================================
// Span Interface
// =============================================================================

/**
 * A unit of work with timing, context, and hierarchy.
 *
 * Spans form a tree: each span has at most one parent and zero or more children.
 * This enables hierarchical timing analysis (e.g., stage → function → expression).
 */
export interface Span {
  // ─────────────────────────────────────────────────────────────────────────
  // Identity
  // ─────────────────────────────────────────────────────────────────────────

  /** Human-readable name (e.g., "stage:10-lower", "resolve.element") */
  readonly name: string;

  /** Unique identifier for this span within the trace */
  readonly spanId: string;

  /** Trace-wide identifier (same for all spans in a trace tree) */
  readonly traceId: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Hierarchy
  // ─────────────────────────────────────────────────────────────────────────

  /** Parent span, or null if this is the root */
  readonly parent: Span | null;

  /** Child spans created within this span */
  readonly children: readonly Span[];

  // ─────────────────────────────────────────────────────────────────────────
  // Timing
  // ─────────────────────────────────────────────────────────────────────────

  /** Start time in nanoseconds */
  readonly startTime: bigint;

  /** End time in nanoseconds, or null if still running */
  readonly endTime: bigint | null;

  /** Duration in nanoseconds (endTime - startTime), or null if still running */
  readonly duration: bigint | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Context
  // ─────────────────────────────────────────────────────────────────────────

  /** Structured key-value context attached to this span */
  readonly attributes: ReadonlyAttributeMap;

  /** Point-in-time markers recorded during this span */
  readonly events: readonly SpanEvent[];

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  /** Mark this span as complete, recording end time */
  end(): void;

  /** Add or update an attribute */
  setAttribute(key: string, value: AttributeValue): void;

  /** Add multiple attributes */
  setAttributes(attrs: Record<string, AttributeValue>): void;

  /** Record a point-in-time event */
  addEvent(name: string, attributes?: Record<string, AttributeValue>): void;
}

// =============================================================================
// Trace Exporter Interface
// =============================================================================

/**
 * Pluggable backend for receiving trace data.
 *
 * Exporters observe span lifecycle events and can:
 * - Log to console (dev debugging)
 * - Write JSON files (build analysis)
 * - Aggregate metrics (production monitoring)
 * - Send to OpenTelemetry collector (distributed tracing)
 */
export interface TraceExporter {
  /** Called when a span starts */
  onSpanStart(span: Span): void;

  /** Called when a span ends */
  onSpanEnd(span: Span): void;

  /** Called when an event is recorded */
  onEvent(span: Span, event: SpanEvent): void;

  /** Flush any buffered data (for async exporters) */
  flush(): Promise<void>;

  /** Clean up resources */
  shutdown(): Promise<void>;
}

// =============================================================================
// Compile Trace Interface
// =============================================================================

/**
 * Main API for compiler instrumentation.
 *
 * Usage patterns:
 *
 * 1. Wrap synchronous work:
 *    const result = trace.span("stage:10-lower", () => lowerDocument(html));
 *
 * 2. Wrap async work:
 *    const result = await trace.spanAsync("fetch.schema", () => fetchSchema());
 *
 * 3. Record events:
 *    trace.event("cache.hit", { key: cacheKey });
 *
 * 4. Add context:
 *    trace.setAttribute("template.path", filePath);
 *
 * When tracing is disabled, use NOOP_TRACE for zero overhead.
 */
export interface CompileTrace {
  // ─────────────────────────────────────────────────────────────────────────
  // Scoped Instrumentation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute a function within a named span, returning the function's result.
   * The span is automatically ended when the function returns (or throws).
   */
  span<T>(name: string, fn: () => T): T;

  /**
   * Execute an async function within a named span.
   * The span is ended when the promise resolves (or rejects).
   */
  spanAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;

  // ─────────────────────────────────────────────────────────────────────────
  // Context
  // ─────────────────────────────────────────────────────────────────────────

  /** Record a point-in-time event in the current span */
  event(name: string, attributes?: Record<string, AttributeValue>): void;

  /** Add an attribute to the current span */
  setAttribute(key: string, value: AttributeValue): void;

  /** Add multiple attributes to the current span */
  setAttributes(attrs: Record<string, AttributeValue>): void;

  // ─────────────────────────────────────────────────────────────────────────
  // Manual Span Control
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start a span manually (for complex control flow).
   * Caller is responsible for calling span.end().
   */
  startSpan(name: string): Span;

  /** Get the currently active span, if any */
  currentSpan(): Span | undefined;

  /** Get the root span of this trace */
  rootSpan(): Span;

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  /** Flush pending data to exporters */
  flush(): Promise<void>;
}

// =============================================================================
// Semantic Attribute Keys
// =============================================================================

/**
 * Standardized attribute keys for compiler traces.
 * Using consistent keys enables cross-trace analysis and dashboards.
 */
export const CompilerAttributes = {
  // Stage identity
  STAGE: "compiler.stage",
  TEMPLATE: "compiler.template",

  // Cache behavior
  CACHE_KEY: "cache.key",
  CACHE_HIT: "cache.hit",
  CACHE_SOURCE: "cache.source", // "run" | "cache" | "seed"

  // Artifacts
  ARTIFACT_HASH: "artifact.hash",
  ARTIFACT_SIZE: "artifact.size",

  // Diagnostics
  DIAG_COUNT: "diag.count",
  DIAG_ERROR_COUNT: "diag.errors",
  DIAG_WARNING_COUNT: "diag.warnings",

  // Template metrics
  NODE_COUNT: "template.nodes",
  EXPR_COUNT: "template.expressions",
  INSTR_COUNT: "template.instructions",
  ROW_COUNT: "template.rows",

  // File info
  FILE_PATH: "file.path",
  FILE_SIZE: "file.size",
} as const;

/** Type for compiler attribute keys */
export type CompilerAttributeKey = (typeof CompilerAttributes)[keyof typeof CompilerAttributes];

// =============================================================================
// No-Op Implementation (Zero Cost When Disabled)
// =============================================================================

/**
 * No-op span that does nothing.
 * Used by NOOP_TRACE and returned from startSpan when tracing is disabled.
 */
export const NOOP_SPAN: Span = {
  name: "",
  spanId: "",
  traceId: "",
  parent: null,
  children: [],
  startTime: 0n,
  endTime: null,
  duration: null,
  attributes: new Map(),
  events: [],
  end: () => {},
  setAttribute: () => {},
  setAttributes: () => {},
  addEvent: () => {},
};

/**
 * No-op trace that executes functions without instrumentation.
 * Use this when tracing is disabled for zero runtime overhead.
 *
 * @example
 * const trace = options.trace ?? NOOP_TRACE;
 * return trace.span("stage:10-lower", () => lowerDocument(html));
 */
export const NOOP_TRACE: CompileTrace = {
  span: <T>(_name: string, fn: () => T): T => fn(),
  spanAsync: <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn(),
  event: () => {},
  setAttribute: () => {},
  setAttributes: () => {},
  startSpan: () => NOOP_SPAN,
  currentSpan: () => undefined,
  rootSpan: () => NOOP_SPAN,
  flush: () => Promise.resolve(),
};

// =============================================================================
// Timing Utilities
// =============================================================================

/**
 * Get current time in nanoseconds.
 * Uses process.hrtime.bigint in Node.js, falls back to performance.now in browser.
 */
export function nowNanos(): bigint {
  if (typeof process !== "undefined" && typeof process.hrtime?.bigint === "function") {
    return process.hrtime.bigint();
  }
  // Browser fallback: performance.now() returns milliseconds as float
  return BigInt(Math.round(performance.now() * 1_000_000));
}

/**
 * Format nanoseconds as human-readable duration.
 */
export function formatDuration(nanos: bigint): string {
  const ns = Number(nanos);
  if (ns < 1_000) return `${ns}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

// =============================================================================
// Span Implementation
// =============================================================================

/** Counter for generating unique span IDs within a process */
let spanIdCounter = 0;

/**
 * Generate a unique span ID.
 * Simple incrementing counter - sufficient for single-process tracing.
 */
function generateSpanId(): string {
  return `span_${++spanIdCounter}`;
}

/**
 * Generate a unique trace ID.
 * Uses timestamp + random suffix for reasonable uniqueness.
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `trace_${timestamp}_${random}`;
}

/**
 * Internal span implementation.
 */
class SpanImpl implements Span {
  readonly name: string;
  readonly spanId: string;
  readonly traceId: string;
  readonly parent: Span | null;
  readonly startTime: bigint;

  private _endTime: bigint | null = null;
  private readonly _children: Span[] = [];
  private readonly _attributes: AttributeMap = new Map();
  private readonly _events: SpanEvent[] = [];
  private readonly _exporter: TraceExporter | null;

  constructor(
    name: string,
    traceId: string,
    parent: Span | null,
    exporter: TraceExporter | null,
  ) {
    this.name = name;
    this.spanId = generateSpanId();
    this.traceId = traceId;
    this.parent = parent;
    this.startTime = nowNanos();
    this._exporter = exporter;

    // Register with parent
    if (parent && parent instanceof SpanImpl) {
      parent._children.push(this);
    }

    // Notify exporter
    this._exporter?.onSpanStart(this);
  }

  get endTime(): bigint | null {
    return this._endTime;
  }

  get duration(): bigint | null {
    return this._endTime !== null ? this._endTime - this.startTime : null;
  }

  get children(): readonly Span[] {
    return this._children;
  }

  get attributes(): ReadonlyAttributeMap {
    return this._attributes;
  }

  get events(): readonly SpanEvent[] {
    return this._events;
  }

  end(): void {
    if (this._endTime !== null) return; // Already ended
    this._endTime = nowNanos();
    this._exporter?.onSpanEnd(this);
  }

  setAttribute(key: string, value: AttributeValue): void {
    this._attributes.set(key, value);
  }

  setAttributes(attrs: Record<string, AttributeValue>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this._attributes.set(key, value);
    }
  }

  addEvent(name: string, attributes?: Record<string, AttributeValue>): void {
    const event: SpanEvent = {
      name,
      timestamp: nowNanos(),
      attributes: new Map(Object.entries(attributes ?? {})),
    };
    this._events.push(event);
    this._exporter?.onEvent(this, event);
  }
}

// =============================================================================
// Compile Trace Implementation
// =============================================================================

/**
 * Options for creating a CompileTrace.
 */
export interface CreateTraceOptions {
  /** Name for the root span */
  name?: string;

  /** Exporter to receive trace events */
  exporter?: TraceExporter;

  /** Pre-generated trace ID (for distributed tracing continuity) */
  traceId?: string;
}

/**
 * Active trace implementation.
 */
class CompileTraceImpl implements CompileTrace {
  private readonly _traceId: string;
  private readonly _rootSpan: SpanImpl;
  private readonly _exporter: TraceExporter | null;
  private _currentSpan: Span;

  constructor(options: CreateTraceOptions = {}) {
    this._traceId = options.traceId ?? generateTraceId();
    this._exporter = options.exporter ?? null;
    this._rootSpan = new SpanImpl(
      options.name ?? "trace",
      this._traceId,
      null,
      this._exporter,
    );
    this._currentSpan = this._rootSpan;
  }

  span<T>(name: string, fn: () => T): T {
    const span = this.startSpan(name);
    try {
      const result = fn();
      span.end();
      return result;
    } catch (error) {
      span.setAttribute("error", true);
      span.setAttribute("error.message", error instanceof Error ? error.message : String(error));
      span.end();
      throw error;
    }
  }

  async spanAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const span = this.startSpan(name);
    try {
      const result = await fn();
      span.end();
      return result;
    } catch (error) {
      span.setAttribute("error", true);
      span.setAttribute("error.message", error instanceof Error ? error.message : String(error));
      span.end();
      throw error;
    }
  }

  event(name: string, attributes?: Record<string, AttributeValue>): void {
    this._currentSpan.addEvent(name, attributes);
  }

  setAttribute(key: string, value: AttributeValue): void {
    this._currentSpan.setAttribute(key, value);
  }

  setAttributes(attrs: Record<string, AttributeValue>): void {
    this._currentSpan.setAttributes(attrs);
  }

  startSpan(name: string): Span {
    const span = new SpanImpl(name, this._traceId, this._currentSpan, this._exporter);
    const previousSpan = this._currentSpan;
    this._currentSpan = span;

    // Wrap end() to restore parent as current
    const originalEnd = span.end.bind(span);
    span.end = () => {
      originalEnd();
      if (this._currentSpan === span) {
        this._currentSpan = previousSpan;
      }
    };

    return span;
  }

  currentSpan(): Span | undefined {
    return this._currentSpan;
  }

  rootSpan(): Span {
    return this._rootSpan;
  }

  async flush(): Promise<void> {
    await this._exporter?.flush();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new CompileTrace for instrumenting a compilation.
 *
 * @example
 * // With console exporter for debugging
 * const trace = createTrace({ name: "compile:my-app.html", exporter: consoleExporter });
 *
 * // Simple trace without exporter (for testing)
 * const trace = createTrace({ name: "test" });
 *
 * // Use the trace
 * const result = trace.span("stage:10-lower", () => lowerDocument(html));
 */
export function createTrace(options?: CreateTraceOptions): CompileTrace {
  return new CompileTraceImpl(options);
}
