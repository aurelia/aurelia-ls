import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger, LogLevel } from "../log.js";
import type { PresentationConfig } from "./config.js";

export type AttributeValue = string | number | boolean | null | readonly AttributeValue[];
export type DebugChannel = (point: string, data?: unknown) => void;

export interface Span {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, AttributeValue>;
  readonly duration: bigint | null;
}

export interface SpanEvent {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, AttributeValue>;
}

export interface TraceExporter {
  onSpanStart(span: Span): void;
  onSpanEnd(span: Span): void;
  onEvent(span: Span, event: SpanEvent): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface CompileTrace {
  span<T>(name: string, fn: () => T): T;
  spanAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
  event(name: string, attributes?: Record<string, AttributeValue>): void;
  setAttribute(key: string, value: AttributeValue): void;
  setAttributes(attrs: Record<string, AttributeValue>): void;
  startSpan(name: string): Span;
  currentSpan(): Span | undefined;
  rootSpan(): Span;
  flush(): Promise<void>;
}

class MutableSpan implements Span {
  readonly attributes = new Map<string, AttributeValue>();
  #started = process.hrtime.bigint();
  #ended: bigint | null = null;

  constructor(readonly name: string) {}

  get duration(): bigint | null {
    return this.#ended == null ? null : this.#ended - this.#started;
  }

  end(): void {
    this.#ended = process.hrtime.bigint();
  }
}

class NoopTrace implements CompileTrace {
  #root = new MutableSpan("root");

  span<T>(_name: string, fn: () => T): T {
    return fn();
  }

  spanAsync<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  event(_name: string, _attributes?: Record<string, AttributeValue>): void {}
  setAttribute(_key: string, _value: AttributeValue): void {}
  setAttributes(_attrs: Record<string, AttributeValue>): void {}

  startSpan(name: string): Span {
    return new MutableSpan(name);
  }

  currentSpan(): Span | undefined {
    return undefined;
  }

  rootSpan(): Span {
    return this.#root;
  }

  async flush(): Promise<void> {}
}

const NOOP_TRACE: CompileTrace = new NoopTrace();

function createTrace(options: { name: string; exporter: TraceExporter }): CompileTrace {
  return new LocalTrace(options.name, options.exporter);
}

class LocalTrace implements CompileTrace {
  #root: MutableSpan;
  #stack: MutableSpan[];

  constructor(name: string, private readonly exporter: TraceExporter) {
    this.#root = new MutableSpan(name);
    this.#stack = [this.#root];
  }

  span<T>(name: string, fn: () => T): T {
    const span = this.begin(name);
    try {
      return fn();
    } finally {
      this.end(span);
    }
  }

  async spanAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const span = this.begin(name);
    try {
      return await fn();
    } finally {
      this.end(span);
    }
  }

  event(name: string, attributes: Record<string, AttributeValue> = {}): void {
    const span = this.#stack[this.#stack.length - 1] ?? this.#root;
    this.exporter.onEvent(span, { name, attributes: new Map(Object.entries(attributes)) });
  }

  setAttribute(key: string, value: AttributeValue): void {
    this.#stack[this.#stack.length - 1]?.attributes.set(key, value);
  }

  setAttributes(attrs: Record<string, AttributeValue>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.setAttribute(key, value);
    }
  }

  startSpan(name: string): Span {
    return this.begin(name);
  }

  currentSpan(): Span | undefined {
    return this.#stack[this.#stack.length - 1];
  }

  rootSpan(): Span {
    return this.#root;
  }

  flush(): Promise<void> {
    return this.exporter.flush();
  }

  private begin(name: string): MutableSpan {
    const span = new MutableSpan(name);
    this.#stack.push(span);
    this.exporter.onSpanStart(span);
    return span;
  }

  private end(span: MutableSpan): void {
    span.end();
    if (this.#stack[this.#stack.length - 1] === span) {
      this.#stack.pop();
    } else {
      this.#stack = this.#stack.filter((entry) => entry !== span);
    }
    this.exporter.onSpanEnd(span);
  }
}

export interface ErrorReportOptions {
  notify?: boolean;
  showOutput?: boolean;
  context?: Record<string, unknown>;
}

export type CaptureResult<T> = { ok: true; value: T } | { ok: false };

export class ErrorReporter {
  #logger: ClientLogger;
  #vscode: VscodeApi;
  #notify = true;
  #showOutput = true;

  constructor(logger: ClientLogger, vscode: VscodeApi) {
    this.#logger = logger;
    this.#vscode = vscode;
  }

  update(config: PresentationConfig): void {
    const errors = config.observability.errors;
    this.#notify = errors.notify;
    this.#showOutput = errors.showOutput;
  }

  report(error: unknown, label: string, options: ErrorReportOptions = {}): void {
    const notify = options.notify ?? this.#notify;
    const showOutput = options.showOutput ?? this.#showOutput;
    const context = options.context;

    this.#logger.error(label, context, error);

    if (notify) {
      const message = error instanceof Error ? error.message : String(error);
      this.#vscode.window.showErrorMessage(`${label}: ${message}`);
    }
    if (showOutput) {
      this.#logger.show(true);
    }
  }

  guard<T>(label: string, fn: () => T, options?: ErrorReportOptions): CaptureResult<T> {
    try {
      return { ok: true, value: fn() };
    } catch (err) {
      this.report(err, label, options);
      return { ok: false };
    }
  }

  async capture<T>(label: string, fn: () => Promise<T>, options?: ErrorReportOptions): Promise<CaptureResult<T>> {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (err) {
      this.report(err, label, options);
      return { ok: false };
    }
  }
}

export class DebugService {
  #logger: ClientLogger;
  #channelCache = new Map<string, DebugChannel>();
  #envValue = "0";
  #enabled = false;
  #channels = new Set<string>();
  #format: "pretty" | "json" = "pretty";
  #timestamps = false;

  constructor(logger: ClientLogger) {
    this.#logger = logger;
  }

  update(config: PresentationConfig): void {
    const debugConfig = config.observability.debug;
    const channels = normalizeChannels(debugConfig.channels);
    this.#enabled = debugConfig.enabled;
    this.#channels = new Set(channels);
    this.#format = debugConfig.format;
    this.#timestamps = debugConfig.timestamps;
    this.#envValue = debugConfig.enabled
      ? channels.length
        ? channels.join(",")
        : "*"
      : "0";

    process.env["AURELIA_DEBUG"] = this.#envValue;
    process.env["AURELIA_LS_DEBUG"] = this.#envValue;

    this.#channelCache.clear();
  }

  get envValue(): string {
    return this.#envValue;
  }

  channel(name: string): DebugChannel {
    const key = name.trim().toLowerCase();
    if (!key) return () => {};
    const existing = this.#channelCache.get(key);
    if (existing) return existing;
    const proxy: DebugChannel = (point, data) => {
      this.writeDebug(key, point, data);
    };
    this.#channelCache.set(key, proxy);
    return proxy;
  }

  private writeDebug(channel: string, point: string, data?: unknown): void {
    if (!this.#enabled) return;
    if (this.#channels.size > 0 && !this.#channels.has(channel) && !this.#channels.has("*")) return;
    const timestamp = this.#timestamps ? `${new Date().toISOString()} ` : "";
    const message = this.#format === "json"
      ? JSON.stringify({ channel, point, data, time: this.#timestamps ? new Date().toISOString() : undefined })
      : `${timestamp}[debug:${channel}] ${point}${data === undefined ? "" : ` ${formatDebugData(data)}`}`;
    this.#logger.write("debug", message, undefined, { raw: true, force: true });
  }
}

export class TraceService implements CompileTrace {
  #logger: ClientLogger;
  #trace: CompileTrace = NOOP_TRACE;
  #enabled = false;
  #minDurationNs = 0n;
  #logEvents = true;
  #logAttributes = true;

  constructor(logger: ClientLogger) {
    this.#logger = logger;
  }

  update(config: PresentationConfig): void {
    const traceConfig = config.observability.trace;
    this.#enabled = traceConfig.enabled;
    const minDurationMs = Number.isFinite(traceConfig.minDurationMs) ? traceConfig.minDurationMs : 0;
    this.#minDurationNs = BigInt(Math.max(0, Math.round(minDurationMs * 1_000_000)));
    this.#logEvents = traceConfig.logEvents;
    this.#logAttributes = traceConfig.logAttributes;

    if (!this.#enabled) {
      this.#trace = NOOP_TRACE;
      return;
    }

    const exporter = new OutputChannelTraceExporter(this.#logger, {
      minDurationNs: this.#minDurationNs,
      logEvents: this.#logEvents,
      logAttributes: this.#logAttributes,
      prefix: "[trace]",
      level: "trace",
    });

    this.#trace = createTrace({
      name: "vscode",
      exporter,
    });
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  span<T>(name: string, fn: () => T): T {
    return this.#trace.span(name, fn);
  }

  spanAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return this.#trace.spanAsync(name, fn);
  }

  event(name: string, attributes?: Record<string, AttributeValue>): void {
    this.#trace.event(name, attributes);
  }

  setAttribute(key: string, value: AttributeValue): void {
    this.#trace.setAttribute(key, value);
  }

  setAttributes(attrs: Record<string, AttributeValue>): void {
    this.#trace.setAttributes(attrs);
  }

  startSpan(name: string): Span {
    return this.#trace.startSpan(name);
  }

  currentSpan(): Span | undefined {
    return this.#trace.currentSpan();
  }

  rootSpan(): Span {
    return this.#trace.rootSpan();
  }

  flush(): Promise<void> {
    return this.#trace.flush();
  }
}

export class ObservabilityService {
  #logger: ClientLogger;
  #debug: DebugService;
  #trace: TraceService;
  #errors: ErrorReporter;
  #serverEnv: Record<string, string> = {};

  constructor(vscode: VscodeApi, logger: ClientLogger, config: PresentationConfig) {
    this.#logger = logger;
    this.#debug = new DebugService(logger);
    this.#trace = new TraceService(logger);
    this.#errors = new ErrorReporter(logger, vscode);
    this.update(config);
  }

  get logger(): ClientLogger {
    return this.#logger;
  }

  get debug(): DebugService {
    return this.#debug;
  }

  get trace(): TraceService {
    return this.#trace;
  }

  get errors(): ErrorReporter {
    return this.#errors;
  }

  get serverEnv(): Record<string, string> {
    return { ...this.#serverEnv };
  }

  update(config: PresentationConfig): boolean {
    const logging = config.observability.logging;
    this.#logger.updateSettings({
      level: logging.level,
      format: logging.format,
      timestamps: logging.timestamps,
    });

    this.#debug.update(config);
    this.#trace.update(config);
    this.#errors.update(config);

    const nextEnv = buildServerEnv(this.#debug.envValue, config.observability.trace.enabled);
    const changed = !shallowEqual(this.#serverEnv, nextEnv);
    this.#serverEnv = nextEnv;
    return changed;
  }
}

type TraceExporterOptions = {
  minDurationNs: bigint;
  logEvents: boolean;
  logAttributes: boolean;
  prefix: string;
  level: LogLevel;
};

class OutputChannelTraceExporter implements TraceExporter {
  #logger: ClientLogger;
  #options: TraceExporterOptions;
  #depth = 0;

  constructor(logger: ClientLogger, options: TraceExporterOptions) {
    this.#logger = logger;
    this.#options = options;
  }

  onSpanStart(span: Span): void {
    const indent = "  ".repeat(this.#depth);
    this.#logger.write(
      this.#options.level,
      `${this.#options.prefix} ${indent}${span.name} started`,
      undefined,
      { raw: true, force: true },
    );
    this.#depth++;
  }

  onSpanEnd(span: Span): void {
    this.#depth = Math.max(0, this.#depth - 1);
    if (span.duration !== null && span.duration < this.#options.minDurationNs) {
      return;
    }

    const indent = "  ".repeat(this.#depth);
    const duration = span.duration !== null ? formatDuration(span.duration) : "?";
    let line = `${this.#options.prefix} ${indent}${span.name} (${duration})`;

    if (this.#options.logAttributes && span.attributes.size > 0) {
      const attrs = formatAttributes(span.attributes);
      if (attrs) {
        line += ` ${attrs}`;
      }
    }

    this.#logger.write(this.#options.level, line, undefined, { raw: true, force: true });
  }

  onEvent(span: Span, event: SpanEvent): void {
    if (!this.#options.logEvents) return;

    const indent = "  ".repeat(this.#depth);
    let line = `${this.#options.prefix} ${indent}  [${event.name}]`;

    if (this.#options.logAttributes && event.attributes.size > 0) {
      const attrs = formatAttributes(event.attributes);
      if (attrs) {
        line += ` ${attrs}`;
      }
    }

    this.#logger.write(this.#options.level, line, undefined, { raw: true, force: true });
  }

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}

function formatAttributes(attrs: ReadonlyMap<string, AttributeValue>): string {
  const pairs: string[] = [];
  for (const [key, value] of attrs) {
    if (key === "error.message") continue;
    const shortKey = key.split(".").pop() ?? key;
    pairs.push(`${shortKey}=${formatAttributeValue(value)}`);
  }
  return pairs.length ? `{${pairs.join(" ")}}` : "";
}

function formatAttributeValue(value: AttributeValue): string {
  if (typeof value === "string") {
    if (value.length > 40) {
      return `"${value.slice(0, 37)}..."`;
    }
    return `"${value}"`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  return "[unknown]";
}

function formatDebugData(data: unknown): string {
  if (data == null) return String(data);
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return "[unserializable]";
  }
}

function formatDuration(nanos: bigint): string {
  const ns = Number(nanos);
  if (ns < 1_000) return `${ns}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}us`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

function normalizeChannels(channels: readonly string[]): string[] {
  return channels
    .map((channel) => channel.trim().toLowerCase())
    .filter(Boolean);
}

function buildServerEnv(debugEnv: string, traceEnabled: boolean): Record<string, string> {
  const traceValue = traceEnabled ? "1" : "0";
  return {
    AURELIA_DEBUG: debugEnv,
    AURELIA_LS_DEBUG: debugEnv,
    AURELIA_TRACE: traceValue,
    AURELIA_LS_TRACE: traceValue,
  };
}

function shallowEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
