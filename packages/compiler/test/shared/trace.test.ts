/**
 * Unit tests for CompileTrace instrumentation primitives.
 *
 * Tests the core tracing infrastructure:
 * - Span lifecycle (start, end, timing)
 * - Hierarchical span nesting
 * - Attributes and events
 * - NOOP_TRACE zero-cost behavior
 * - Exporter integration
 */
import { describe, test, expect, beforeEach } from "vitest";
import { createCollectingExporter, createConsoleExporter, createMultiExporter } from "@aurelia-ls/compiler/shared/trace-exporters.js";
import {
  CompilerAttributes,
  NOOP_SPAN,
  NOOP_TRACE,
  createTrace,
  formatDuration,
  type CompileTrace,
  type Span,
} from "@aurelia-ls/compiler/shared/trace.js";
// =============================================================================
// Core Trace Tests
// =============================================================================

describe("createTrace", () => {
  test("creates a trace with root span", () => {
    const trace = createTrace({ name: "test-trace" });
    expect(trace.rootSpan()).toBeDefined();
    expect(trace.rootSpan().name).toBe("test-trace");
  });

  test("root span has unique traceId", () => {
    const trace1 = createTrace({ name: "trace1" });
    const trace2 = createTrace({ name: "trace2" });
    expect(trace1.rootSpan().traceId).not.toBe(trace2.rootSpan().traceId);
  });

  test("can provide custom traceId", () => {
    const trace = createTrace({ name: "test", traceId: "custom-trace-123" });
    expect(trace.rootSpan().traceId).toBe("custom-trace-123");
  });
});

describe("span() - synchronous instrumentation", () => {
  test("executes function and returns result", () => {
    const trace = createTrace({ name: "test" });
    const result = trace.span("work", () => 42);
    expect(result).toBe(42);
  });

  test("propagates exceptions", () => {
    const trace = createTrace({ name: "test" });
    expect(() => {
      trace.span("failing", () => {
        throw new Error("boom");
      });
    }).toThrow("boom");
  });

  test("creates nested spans with hierarchy", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "root", exporter });

    trace.span("outer", () => {
      trace.span("inner", () => {
        // work
      });
    });

    const spans = exporter.spans;
    expect(spans.length).toBe(2);

    const outer = spans.find(s => s.name === "outer");
    const inner = spans.find(s => s.name === "inner");
    expect(outer).toBeDefined();
    expect(inner).toBeDefined();
    expect(inner?.parent?.name).toBe("outer");
  });

  test("records timing information", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    trace.span("timed", () => {
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return sum;
    });

    const span = exporter.spans.find(s => s.name === "timed");
    expect(span).toBeDefined();
    expect(span?.startTime).toBeGreaterThan(0n);
    expect(span?.endTime).toBeGreaterThan(span?.startTime ?? 0n);
    expect(span?.duration).toBeGreaterThan(0n);
  });

  test("marks span as error on exception", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    try {
      trace.span("failing", () => {
        throw new Error("test error");
      });
    } catch {
      // expected
    }

    const span = exporter.spans.find(s => s.name === "failing");
    expect(span).toBeDefined();
    expect(span?.attributes.get("error")).toBe(true);
    expect(span?.attributes.get("error.message")).toBe("test error");
  });
});

describe("spanAsync() - async instrumentation", () => {
  test("executes async function and returns result", async () => {
    const trace = createTrace({ name: "test" });
    const result = await trace.spanAsync("async-work", async () => {
      await Promise.resolve();
      return 42;
    });
    expect(result).toBe(42);
  });

  test("propagates async exceptions", async () => {
    const trace = createTrace({ name: "test" });
    await expect(
      trace.spanAsync("failing", async () => {
        throw new Error("async boom");
      })
    ).rejects.toThrow("async boom");
  });

  test("records timing for async spans", async () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    await trace.spanAsync("async-timed", async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const span = exporter.spans.find(s => s.name === "async-timed");
    expect(span).toBeDefined();
    expect(span?.duration).toBeGreaterThan(0n);
  });
});

describe("attributes", () => {
  test("setAttribute adds attribute to current span", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    trace.span("work", () => {
      trace.setAttribute("key", "value");
    });

    const span = exporter.spans.find(s => s.name === "work");
    expect(span?.attributes.get("key")).toBe("value");
  });

  test("setAttributes adds multiple attributes", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    trace.span("work", () => {
      trace.setAttributes({
        "string": "hello",
        "number": 42,
        "boolean": true,
      });
    });

    const span = exporter.spans.find(s => s.name === "work");
    expect(span?.attributes.get("string")).toBe("hello");
    expect(span?.attributes.get("number")).toBe(42);
    expect(span?.attributes.get("boolean")).toBe(true);
  });

  test("CompilerAttributes provides semantic keys", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    trace.span("compile", () => {
      trace.setAttributes({
        [CompilerAttributes.STAGE]: "10-lower",
        [CompilerAttributes.CACHE_HIT]: true,
        [CompilerAttributes.ARTIFACT_HASH]: "abc123",
      });
    });

    const span = exporter.spans.find(s => s.name === "compile");
    expect(span?.attributes.get(CompilerAttributes.STAGE)).toBe("10-lower");
    expect(span?.attributes.get(CompilerAttributes.CACHE_HIT)).toBe(true);
    expect(span?.attributes.get(CompilerAttributes.ARTIFACT_HASH)).toBe("abc123");
  });
});

describe("events", () => {
  test("event records point-in-time marker", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    trace.span("work", () => {
      trace.event("cache.hit");
    });

    const events = exporter.findEvents("cache.hit");
    expect(events.length).toBe(1);
    expect(events[0]?.event.timestamp).toBeGreaterThan(0n);
  });

  test("event with attributes", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    trace.span("work", () => {
      trace.event("file.processed", { path: "/test.html", size: 1024 });
    });

    const events = exporter.findEvents("file.processed");
    expect(events.length).toBe(1);
    expect(events[0]?.event.attributes.get("path")).toBe("/test.html");
    expect(events[0]?.event.attributes.get("size")).toBe(1024);
  });
});

describe("manual span control", () => {
  test("startSpan creates span without auto-ending", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "test", exporter });

    const span = trace.startSpan("manual");
    expect(span.endTime).toBeNull();

    span.end();
    expect(span.endTime).not.toBeNull();
  });

  test("currentSpan returns active span", () => {
    const trace = createTrace({ name: "test" });

    trace.span("outer", () => {
      expect(trace.currentSpan()?.name).toBe("outer");

      trace.span("inner", () => {
        expect(trace.currentSpan()?.name).toBe("inner");
      });

      expect(trace.currentSpan()?.name).toBe("outer");
    });
  });
});

// =============================================================================
// NOOP_TRACE Tests
// =============================================================================

describe("NOOP_TRACE", () => {
  test("span executes function without instrumentation", () => {
    const result = NOOP_TRACE.span("work", () => 42);
    expect(result).toBe(42);
  });

  test("spanAsync executes async function", async () => {
    const result = await NOOP_TRACE.spanAsync("work", async () => 42);
    expect(result).toBe(42);
  });

  test("event, setAttribute, setAttributes are no-ops", () => {
    // Should not throw
    NOOP_TRACE.event("test");
    NOOP_TRACE.setAttribute("key", "value");
    NOOP_TRACE.setAttributes({ a: 1, b: 2 });
  });

  test("startSpan returns NOOP_SPAN", () => {
    const span = NOOP_TRACE.startSpan("test");
    expect(span).toBe(NOOP_SPAN);
  });

  test("currentSpan returns undefined", () => {
    expect(NOOP_TRACE.currentSpan()).toBeUndefined();
  });

  test("rootSpan returns NOOP_SPAN", () => {
    expect(NOOP_TRACE.rootSpan()).toBe(NOOP_SPAN);
  });

  test("flush resolves immediately", async () => {
    await NOOP_TRACE.flush(); // Should not throw
  });
});

describe("NOOP_SPAN", () => {
  test("has empty identity", () => {
    expect(NOOP_SPAN.name).toBe("");
    expect(NOOP_SPAN.spanId).toBe("");
    expect(NOOP_SPAN.traceId).toBe("");
  });

  test("has no timing", () => {
    expect(NOOP_SPAN.startTime).toBe(0n);
    expect(NOOP_SPAN.endTime).toBeNull();
    expect(NOOP_SPAN.duration).toBeNull();
  });

  test("methods are no-ops", () => {
    NOOP_SPAN.end();
    NOOP_SPAN.setAttribute("key", "value");
    NOOP_SPAN.setAttributes({ a: 1 });
    NOOP_SPAN.addEvent("test");
    // Should not throw
  });
});

// =============================================================================
// Exporter Tests
// =============================================================================

describe("CollectingExporter", () => {
  let exporter: ReturnType<typeof createCollectingExporter>;

  beforeEach(() => {
    exporter = createCollectingExporter();
  });

  test("collects all spans", () => {
    const trace = createTrace({ name: "test", exporter });

    trace.span("a", () => {
      trace.span("b", () => {});
    });
    trace.span("c", () => {});

    expect(exporter.spans.length).toBe(3);
    expect(exporter.findSpans("a").length).toBe(1);
    expect(exporter.findSpans("b").length).toBe(1);
    expect(exporter.findSpans("c").length).toBe(1);
  });

  test("collects all events", () => {
    const trace = createTrace({ name: "test", exporter });

    trace.span("work", () => {
      trace.event("start");
      trace.event("middle");
      trace.event("end");
    });

    expect(exporter.events.length).toBe(3);
  });

  test("clear removes all data", () => {
    const trace = createTrace({ name: "test", exporter });

    trace.span("work", () => {
      trace.event("test");
    });

    expect(exporter.spans.length).toBeGreaterThan(0);
    expect(exporter.events.length).toBeGreaterThan(0);

    exporter.clear();

    expect(exporter.spans.length).toBe(0);
    expect(exporter.events.length).toBe(0);
  });

  test("totalDuration sums all span durations", () => {
    const trace = createTrace({ name: "test", exporter });

    trace.span("a", () => {});
    trace.span("b", () => {});

    expect(exporter.totalDuration()).toBeGreaterThan(0n);
  });
});

describe("ConsoleExporter", () => {
  test("creates with default options", () => {
    const exporter = createConsoleExporter();
    expect(exporter).toBeDefined();
  });

  test("respects minDuration filter", () => {
    const logs: string[] = [];
    const exporter = createConsoleExporter({
      minDuration: 1_000_000_000n, // 1 second - nothing should be logged
      log: (msg) => logs.push(msg),
    });

    const trace = createTrace({ name: "test", exporter });
    trace.span("quick", () => {});

    // onSpanStart logs, but onSpanEnd should be filtered
    const endLogs = logs.filter(l => l.includes("("));
    expect(endLogs.length).toBe(0);
  });

  test("logs events when enabled", () => {
    const logs: string[] = [];
    const exporter = createConsoleExporter({
      logEvents: true,
      log: (msg) => logs.push(msg),
    });

    const trace = createTrace({ name: "test", exporter });
    trace.span("work", () => {
      trace.event("test-event");
    });

    expect(logs.some(l => l.includes("test-event"))).toBe(true);
  });

  test("can disable event logging", () => {
    const logs: string[] = [];
    const exporter = createConsoleExporter({
      logEvents: false,
      log: (msg) => logs.push(msg),
    });

    const trace = createTrace({ name: "test", exporter });
    trace.span("work", () => {
      trace.event("test-event");
    });

    expect(logs.some(l => l.includes("test-event"))).toBe(false);
  });
});

describe("MultiExporter", () => {
  test("forwards to all exporters", () => {
    const exporter1 = createCollectingExporter();
    const exporter2 = createCollectingExporter();
    const multi = createMultiExporter([exporter1, exporter2]);

    const trace = createTrace({ name: "test", exporter: multi });

    trace.span("work", () => {
      trace.event("test");
    });

    expect(exporter1.spans.length).toBe(1);
    expect(exporter2.spans.length).toBe(1);
    expect(exporter1.events.length).toBe(1);
    expect(exporter2.events.length).toBe(1);
  });
});

// =============================================================================
// Utility Tests
// =============================================================================

describe("formatDuration", () => {
  test("formats nanoseconds", () => {
    expect(formatDuration(500n)).toBe("500ns");
  });

  test("formats microseconds", () => {
    expect(formatDuration(5_000n)).toBe("5.00µs");
    expect(formatDuration(500_000n)).toBe("500.00µs");
  });

  test("formats milliseconds", () => {
    expect(formatDuration(5_000_000n)).toBe("5.00ms");
    expect(formatDuration(500_000_000n)).toBe("500.00ms");
  });

  test("formats seconds", () => {
    expect(formatDuration(1_000_000_000n)).toBe("1.00s");
    expect(formatDuration(5_500_000_000n)).toBe("5.50s");
  });
});

describe("CompilerAttributes", () => {
  test("has stage attributes", () => {
    expect(CompilerAttributes.STAGE).toBe("compiler.stage");
    expect(CompilerAttributes.TEMPLATE).toBe("compiler.template");
  });

  test("has cache attributes", () => {
    expect(CompilerAttributes.CACHE_KEY).toBe("cache.key");
    expect(CompilerAttributes.CACHE_HIT).toBe("cache.hit");
    expect(CompilerAttributes.CACHE_SOURCE).toBe("cache.source");
  });

  test("has artifact attributes", () => {
    expect(CompilerAttributes.ARTIFACT_HASH).toBe("artifact.hash");
    expect(CompilerAttributes.ARTIFACT_SIZE).toBe("artifact.size");
  });

  test("has diagnostic attributes", () => {
    expect(CompilerAttributes.DIAG_COUNT).toBe("diag.count");
    expect(CompilerAttributes.DIAG_ERROR_COUNT).toBe("diag.errors");
    expect(CompilerAttributes.DIAG_WARNING_COUNT).toBe("diag.warnings");
  });

  test("has template metrics", () => {
    expect(CompilerAttributes.NODE_COUNT).toBe("template.nodes");
    expect(CompilerAttributes.EXPR_COUNT).toBe("template.expressions");
    expect(CompilerAttributes.INSTR_COUNT).toBe("template.instructions");
    expect(CompilerAttributes.ROW_COUNT).toBe("template.rows");
  });
});
