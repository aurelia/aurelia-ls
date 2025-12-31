/* =======================================================================================
 * TRACE EXPORTERS - Pluggable backends for trace data
 * ---------------------------------------------------------------------------------------
 * Exporters receive span lifecycle events and present them for different audiences:
 * - ConsoleExporter: Human-readable output for dev debugging
 * - JSONExporter: Structured data for build analysis (future)
 * - MetricsExporter: Aggregate statistics for production (future)
 *
 * See .claude/docs/instrumentation-architecture.md for design rationale.
 * ======================================================================================= */

import type { Span, SpanEvent, TraceExporter } from "./trace.js";
import { formatDuration } from "./trace.js";

// =============================================================================
// No-Op Exporter
// =============================================================================

/**
 * Exporter that does nothing.
 * Useful as a default when no exporter is configured.
 */
export const NOOP_EXPORTER: TraceExporter = {
  onSpanStart: () => {},
  onSpanEnd: () => {},
  onEvent: () => {},
  flush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
};

// =============================================================================
// Console Exporter Options
// =============================================================================

export interface ConsoleExporterOptions {
  /**
   * Minimum span duration to log (in nanoseconds).
   * Spans shorter than this are omitted to reduce noise.
   * Default: 0 (log all spans)
   */
  minDuration?: bigint;

  /**
   * Whether to log events.
   * Default: true
   */
  logEvents?: boolean;

  /**
   * Whether to log attributes.
   * Default: true
   */
  logAttributes?: boolean;

  /**
   * Whether to use colors in output.
   * Default: true (if terminal supports it)
   */
  colors?: boolean;

  /**
   * Custom log function.
   * Default: console.log
   */
  log?: (message: string) => void;

  /**
   * Prefix for all log lines.
   * Default: "[trace]"
   */
  prefix?: string;
}

// =============================================================================
// Console Exporter
// =============================================================================

/**
 * Exporter that logs spans to the console in a human-readable format.
 * Useful for development debugging.
 *
 * @example
 * const exporter = createConsoleExporter({ minDuration: 1_000_000n }); // 1ms
 * const trace = createTrace({ name: "compile", exporter });
 */
export class ConsoleExporter implements TraceExporter {
  private readonly options: Required<ConsoleExporterOptions>;
  private depth = 0;

  constructor(options: ConsoleExporterOptions = {}) {
    const supportsColor = typeof process !== "undefined" &&
      process.stdout?.isTTY &&
      process.env["NO_COLOR"] === undefined;

    this.options = {
      minDuration: options.minDuration ?? 0n,
      logEvents: options.logEvents ?? true,
      logAttributes: options.logAttributes ?? true,
      colors: options.colors ?? supportsColor,
      log: options.log ?? console.log,
      prefix: options.prefix ?? "[trace]",
    };
  }

  onSpanStart(span: Span): void {
    const indent = "  ".repeat(this.depth);
    const prefix = this.formatPrefix();
    const name = this.formatSpanName(span.name);
    this.options.log(`${prefix} ${indent}${name} started`);
    this.depth++;
  }

  onSpanEnd(span: Span): void {
    this.depth = Math.max(0, this.depth - 1);

    // Skip if below minimum duration threshold
    if (span.duration !== null && span.duration < this.options.minDuration) {
      return;
    }

    const indent = "  ".repeat(this.depth);
    const prefix = this.formatPrefix();
    const name = this.formatSpanName(span.name);
    const duration = span.duration !== null ? formatDuration(span.duration) : "?";
    const durationStr = this.formatDuration(duration);

    let line = `${prefix} ${indent}${name} ${durationStr}`;

    // Add key attributes inline
    if (this.options.logAttributes && span.attributes.size > 0) {
      const attrs = this.formatAttributes(span.attributes);
      if (attrs) {
        line += ` ${attrs}`;
      }
    }

    this.options.log(line);
  }

  onEvent(span: Span, event: SpanEvent): void {
    if (!this.options.logEvents) return;

    const indent = "  ".repeat(this.depth);
    const prefix = this.formatPrefix();
    const eventName = this.formatEventName(event.name);

    let line = `${prefix} ${indent}  ${eventName}`;

    if (this.options.logAttributes && event.attributes.size > 0) {
      const attrs = this.formatAttributes(event.attributes);
      if (attrs) {
        line += ` ${attrs}`;
      }
    }

    this.options.log(line);
  }

  async flush(): Promise<void> {
    // Console output is synchronous, nothing to flush
  }

  async shutdown(): Promise<void> {
    // No resources to clean up
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Formatting Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private formatPrefix(): string {
    if (this.options.colors) {
      return `\x1b[90m${this.options.prefix}\x1b[0m`; // Gray
    }
    return this.options.prefix;
  }

  private formatSpanName(name: string): string {
    if (this.options.colors) {
      // Stage names in cyan, other spans in default
      if (name.startsWith("stage:")) {
        return `\x1b[36m${name}\x1b[0m`;
      }
      return `\x1b[1m${name}\x1b[0m`; // Bold
    }
    return name;
  }

  private formatEventName(name: string): string {
    if (this.options.colors) {
      // Events in yellow
      return `\x1b[33m[${name}]\x1b[0m`;
    }
    return `[${name}]`;
  }

  private formatDuration(duration: string): string {
    if (this.options.colors) {
      return `\x1b[32m(${duration})\x1b[0m`; // Green
    }
    return `(${duration})`;
  }

  private formatAttributes(attrs: ReadonlyMap<string, unknown>): string {
    const pairs: string[] = [];

    for (const [key, value] of attrs) {
      // Skip internal/verbose attributes
      if (key === "error.message") continue;

      const shortKey = key.split(".").pop() ?? key;
      const formattedValue = this.formatValue(value);
      pairs.push(`${shortKey}=${formattedValue}`);
    }

    if (pairs.length === 0) return "";

    const content = pairs.join(" ");
    if (this.options.colors) {
      return `\x1b[90m{${content}}\x1b[0m`; // Gray
    }
    return `{${content}}`;
  }

  private formatValue(value: unknown): string {
    if (typeof value === "string") {
      // Truncate long strings
      if (value.length > 40) {
        return `"${value.slice(0, 37)}..."`;
      }
      return `"${value}"`;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "number" || typeof value === "bigint") {
      return String(value);
    }
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return `[${value.length}]`;
    }
    // Fallback - use JSON.stringify to avoid [object Object]
    try {
      return JSON.stringify(value);
    } catch {
      return "[unserializable]";
    }
  }
}

/**
 * Create a console exporter with the given options.
 */
export function createConsoleExporter(options?: ConsoleExporterOptions): ConsoleExporter {
  return new ConsoleExporter(options);
}

// =============================================================================
// Collecting Exporter (for testing)
// =============================================================================

/**
 * An exporter that collects all spans and events for inspection.
 * Useful for testing trace instrumentation.
 */
export class CollectingExporter implements TraceExporter {
  readonly spans: Span[] = [];
  readonly events: Array<{ span: Span; event: SpanEvent }> = [];
  readonly startedSpans: Span[] = [];
  readonly endedSpans: Span[] = [];

  onSpanStart(span: Span): void {
    this.startedSpans.push(span);
  }

  onSpanEnd(span: Span): void {
    this.endedSpans.push(span);
    this.spans.push(span);
  }

  onEvent(span: Span, event: SpanEvent): void {
    this.events.push({ span, event });
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    this.clear();
    return Promise.resolve();
  }

  /** Clear all collected data */
  clear(): void {
    this.spans.length = 0;
    this.events.length = 0;
    this.startedSpans.length = 0;
    this.endedSpans.length = 0;
  }

  /** Find spans by name */
  findSpans(name: string): Span[] {
    return this.spans.filter(s => s.name === name);
  }

  /** Find events by name */
  findEvents(name: string): Array<{ span: Span; event: SpanEvent }> {
    return this.events.filter(e => e.event.name === name);
  }

  /** Get total duration of all spans */
  totalDuration(): bigint {
    return this.spans.reduce((sum, span) => sum + (span.duration ?? 0n), 0n);
  }
}

/**
 * Create a collecting exporter for testing.
 */
export function createCollectingExporter(): CollectingExporter {
  return new CollectingExporter();
}

// =============================================================================
// Multi-Exporter (fan-out)
// =============================================================================

/**
 * Exporter that forwards events to multiple exporters.
 * Useful for sending traces to multiple destinations.
 *
 * @example
 * const multi = createMultiExporter([
 *   createConsoleExporter(),
 *   createJsonExporter({ path: "traces.json" }),
 * ]);
 */
export class MultiExporter implements TraceExporter {
  private readonly exporters: TraceExporter[];

  constructor(exporters: TraceExporter[]) {
    this.exporters = exporters;
  }

  onSpanStart(span: Span): void {
    for (const exporter of this.exporters) {
      exporter.onSpanStart(span);
    }
  }

  onSpanEnd(span: Span): void {
    for (const exporter of this.exporters) {
      exporter.onSpanEnd(span);
    }
  }

  onEvent(span: Span, event: SpanEvent): void {
    for (const exporter of this.exporters) {
      exporter.onEvent(span, event);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this.exporters.map(e => e.flush()));
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.exporters.map(e => e.shutdown()));
  }
}

/**
 * Create a multi-exporter that forwards to multiple destinations.
 */
export function createMultiExporter(exporters: TraceExporter[]): MultiExporter {
  return new MultiExporter(exporters);
}

// =============================================================================
// JSON Exporter (for build analysis)
// =============================================================================

/**
 * Options for JSONExporter.
 */
export interface JSONExporterOptions {
  /**
   * Minimum span duration to include (in nanoseconds).
   * Spans shorter than this are filtered out.
   * Default: 0 (include all spans)
   */
  minDuration?: bigint;

  /**
   * Whether to include events in output.
   * Default: true
   */
  includeEvents?: boolean;

  /**
   * Whether to include span hierarchy (parent/children).
   * Default: true
   */
  includeHierarchy?: boolean;

  /**
   * Pretty-print JSON with indentation.
   * Default: false (compact)
   */
  pretty?: boolean;
}

/**
 * Serializable span data for JSON export.
 */
export interface SerializedSpan {
  name: string;
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  startTime: string; // bigint as string
  endTime: string | null;
  durationMs: number | null;
  durationFormatted: string | null;
  attributes: Record<string, unknown>;
  events?: SerializedEvent[];
  children?: string[]; // spanIds
}

/**
 * Serializable event data for JSON export.
 */
export interface SerializedEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, unknown>;
}

/**
 * Complete trace data for JSON export.
 */
export interface SerializedTrace {
  traceId: string;
  startTime: string;
  endTime: string | null;
  totalDurationMs: number | null;
  spanCount: number;
  eventCount: number;
  spans: SerializedSpan[];
}

/**
 * Exporter that collects spans and can serialize to JSON.
 * Useful for build analysis, CI integration, and debugging.
 *
 * @example
 * const exporter = createJSONExporter({ pretty: true });
 * const trace = createTrace({ name: "build", exporter });
 *
 * // ... run compilation ...
 *
 * // Get JSON data
 * const json = exporter.toJSON();
 * fs.writeFileSync("trace.json", json);
 *
 * // Or get structured data
 * const data = exporter.getData();
 */
export class JSONExporter implements TraceExporter {
  private readonly options: Required<JSONExporterOptions>;
  private readonly spans: Span[] = [];
  private readonly events: Array<{ span: Span; event: SpanEvent }> = [];
  private traceId: string | null = null;
  private startTime: bigint | null = null;
  private endTime: bigint | null = null;

  constructor(options: JSONExporterOptions = {}) {
    this.options = {
      minDuration: options.minDuration ?? 0n,
      includeEvents: options.includeEvents ?? true,
      includeHierarchy: options.includeHierarchy ?? true,
      pretty: options.pretty ?? false,
    };
  }

  onSpanStart(span: Span): void {
    // Track trace start time from root span
    if (span.parent === null) {
      this.traceId = span.traceId;
      this.startTime = span.startTime;
    }
  }

  onSpanEnd(span: Span): void {
    // Filter by minimum duration
    if (span.duration !== null && span.duration < this.options.minDuration) {
      return;
    }

    this.spans.push(span);

    // Track trace end time from root span
    if (span.parent === null) {
      this.endTime = span.endTime;
    }
  }

  onEvent(span: Span, event: SpanEvent): void {
    if (this.options.includeEvents) {
      this.events.push({ span, event });
    }
  }

  flush(): Promise<void> {
    // Nothing to flush (in-memory)
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    this.clear();
    return Promise.resolve();
  }

  /**
   * Clear all collected data.
   */
  clear(): void {
    this.spans.length = 0;
    this.events.length = 0;
    this.traceId = null;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Get structured trace data.
   */
  getData(): SerializedTrace {
    const serializedSpans: SerializedSpan[] = this.spans.map((span) => {
      const durationMs = span.duration !== null
        ? Number(span.duration) / 1_000_000
        : null;

      const serialized: SerializedSpan = {
        name: span.name,
        spanId: span.spanId,
        traceId: span.traceId,
        parentSpanId: span.parent?.spanId ?? null,
        startTime: span.startTime.toString(),
        endTime: span.endTime?.toString() ?? null,
        durationMs,
        durationFormatted: span.duration !== null ? formatDuration(span.duration) : null,
        attributes: Object.fromEntries(span.attributes),
      };

      // Add events for this span
      if (this.options.includeEvents) {
        const spanEvents = this.events
          .filter((e) => e.span.spanId === span.spanId)
          .map((e) => ({
            name: e.event.name,
            timestamp: e.event.timestamp.toString(),
            attributes: Object.fromEntries(e.event.attributes),
          }));
        if (spanEvents.length > 0) {
          serialized.events = spanEvents;
        }
      }

      // Add children
      if (this.options.includeHierarchy) {
        const childIds = span.children.map((c) => c.spanId);
        if (childIds.length > 0) {
          serialized.children = childIds;
        }
      }

      return serialized;
    });

    const totalDurationMs = this.startTime !== null && this.endTime !== null
      ? Number(this.endTime - this.startTime) / 1_000_000
      : null;

    return {
      traceId: this.traceId ?? "unknown",
      startTime: this.startTime?.toString() ?? "0",
      endTime: this.endTime?.toString() ?? null,
      totalDurationMs,
      spanCount: this.spans.length,
      eventCount: this.events.length,
      spans: serializedSpans,
    };
  }

  /**
   * Get JSON string representation of the trace.
   */
  toJSON(): string {
    const data = this.getData();
    return this.options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }

  /**
   * Get a summary of the trace (useful for logging).
   */
  getSummary(): TraceSummary {
    const data = this.getData();

    // Calculate stats by span name
    const byName = new Map<string, { count: number; totalMs: number; maxMs: number }>();
    for (const span of data.spans) {
      const existing = byName.get(span.name);
      const durationMs = span.durationMs ?? 0;
      if (existing) {
        existing.count++;
        existing.totalMs += durationMs;
        existing.maxMs = Math.max(existing.maxMs, durationMs);
      } else {
        byName.set(span.name, { count: 1, totalMs: durationMs, maxMs: durationMs });
      }
    }

    // Sort by total time descending
    const topSpans = [...byName.entries()]
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
      .slice(0, 10)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        totalMs: Math.round(stats.totalMs * 100) / 100,
        avgMs: Math.round((stats.totalMs / stats.count) * 100) / 100,
        maxMs: Math.round(stats.maxMs * 100) / 100,
      }));

    return {
      traceId: data.traceId,
      totalDurationMs: data.totalDurationMs !== null
        ? Math.round(data.totalDurationMs * 100) / 100
        : null,
      spanCount: data.spanCount,
      eventCount: data.eventCount,
      topSpans,
    };
  }
}

/**
 * Summary of a trace for quick analysis.
 */
export interface TraceSummary {
  traceId: string;
  totalDurationMs: number | null;
  spanCount: number;
  eventCount: number;
  topSpans: Array<{
    name: string;
    count: number;
    totalMs: number;
    avgMs: number;
    maxMs: number;
  }>;
}

/**
 * Create a JSON exporter for build analysis.
 */
export function createJSONExporter(options?: JSONExporterOptions): JSONExporter {
  return new JSONExporter(options);
}
