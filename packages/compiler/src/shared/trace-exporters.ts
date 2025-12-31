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
    return String(value);
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

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {
    this.clear();
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
