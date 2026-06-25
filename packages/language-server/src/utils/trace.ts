import type { Logger } from "../services/types.js";

export type TraceAttributeValue = string | number | boolean | null | readonly TraceAttributeValue[];

export interface TraceSpan {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, TraceAttributeValue>;
  readonly duration: bigint | null;
}

export interface CompileTrace {
  span<T>(name: string, fn: () => T): T;
  spanAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
  event(name: string, attributes?: Record<string, TraceAttributeValue>): void;
  setAttribute(key: string, value: TraceAttributeValue): void;
  setAttributes(attrs: Record<string, TraceAttributeValue>): void;
  startSpan(name: string): TraceSpan;
  currentSpan(): TraceSpan | undefined;
  rootSpan(): TraceSpan;
  flush(): Promise<void>;
}

class MutableTraceSpan implements TraceSpan {
  readonly attributes = new Map<string, TraceAttributeValue>();
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
  #root = new MutableTraceSpan("root");

  span<T>(_name: string, fn: () => T): T {
    return fn();
  }

  spanAsync<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  event(_name: string, _attributes?: Record<string, TraceAttributeValue>): void {}
  setAttribute(_key: string, _value: TraceAttributeValue): void {}
  setAttributes(_attrs: Record<string, TraceAttributeValue>): void {}

  startSpan(name: string): TraceSpan {
    return new MutableTraceSpan(name);
  }

  currentSpan(): TraceSpan | undefined {
    return undefined;
  }

  rootSpan(): TraceSpan {
    return this.#root;
  }

  async flush(): Promise<void> {}
}

export const NOOP_TRACE: CompileTrace = new NoopTrace();

export function createServerTrace(logger: Logger): CompileTrace {
  const enabled = isTraceEnabled();
  if (!enabled) {
    return NOOP_TRACE;
  }
  logger.info("[trace] Tracing enabled via AURELIA_TRACE environment variable");
  return new LoggingTrace(logger);
}

class LoggingTrace implements CompileTrace {
  #root = new MutableTraceSpan("root");
  #stack: MutableTraceSpan[] = [this.#root];

  constructor(private readonly logger: Logger) {}

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

  event(name: string, attributes?: Record<string, TraceAttributeValue>): void {
    const suffix = attributes == null ? "" : ` ${formatAttributes(attributes)}`;
    this.logger.log(`[trace] ${name}${suffix}`);
  }

  setAttribute(key: string, value: TraceAttributeValue): void {
    this.#stack[this.#stack.length - 1]?.attributes.set(key, value);
  }

  setAttributes(attrs: Record<string, TraceAttributeValue>): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.setAttribute(key, value);
    }
  }

  startSpan(name: string): TraceSpan {
    return this.begin(name);
  }

  currentSpan(): TraceSpan | undefined {
    return this.#stack[this.#stack.length - 1];
  }

  rootSpan(): TraceSpan {
    return this.#root;
  }

  async flush(): Promise<void> {}

  private begin(name: string): MutableTraceSpan {
    const span = new MutableTraceSpan(name);
    this.#stack.push(span);
    return span;
  }

  private end(span: MutableTraceSpan): void {
    span.end();
    if (this.#stack[this.#stack.length - 1] === span) {
      this.#stack.pop();
    } else {
      this.#stack = this.#stack.filter((entry) => entry !== span);
    }
    this.logger.log(`[trace] ${span.name} (${formatDuration(span.duration)}) ${formatAttributes(Object.fromEntries(span.attributes))}`);
  }
}

function isTraceEnabled(): boolean {
  return process.env["AURELIA_TRACE"] === "1" ||
    process.env["AURELIA_TRACE"] === "true" ||
    process.env["AURELIA_LS_TRACE"] === "1" ||
    process.env["AURELIA_LS_TRACE"] === "true";
}

function formatDuration(duration: bigint | null): string {
  if (duration == null) return "?";
  const ns = Number(duration);
  if (ns < 1_000) return `${ns}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}us`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

function formatAttributes(attrs: Record<string, TraceAttributeValue>): string {
  const segments = Object.entries(attrs).map(([key, value]) => `${key}=${JSON.stringify(value)}`);
  return segments.length === 0 ? "" : `{${segments.join(" ")}}`;
}
