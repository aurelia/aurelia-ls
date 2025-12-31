/**
 * Kitchen sink integration test for Instrumentation
 *
 * Tests the complete trace instrumentation across:
 * - Full compiler pipeline (lower → resolve → bind → typecheck → synthesis)
 * - All exporters (Collecting, JSON, Console, Multi)
 * - Span hierarchy and parent-child relationships
 * - Events and attributes at every stage
 * - JSONExporter data extraction and summary statistics
 */
import { describe, test, expect, beforeEach } from "vitest";
import {
  // Core trace infrastructure
  createTrace,
  createCollectingExporter,
  createConsoleExporter,
  createJSONExporter,
  createMultiExporter,
  NOOP_TRACE,
  CompilerAttributes,
  formatDuration,
  type CompileTrace,
  type CollectingExporter,
  type JSONExporter,

  // Compiler pipeline
  DefaultTemplateProgram,
  DefaultTemplateBuildService,
  lowerDocument,
  resolveHost,
  bindScopes,
  typecheck,
  planAot,
  emitAotCode,
  planOverlay,

  // Support
  DEFAULT_SEMANTICS,
  getExpressionParser,
  DEFAULT_SYNTAX,
} from "@aurelia-ls/compiler";

// =============================================================================
// Test Fixtures
// =============================================================================

const COMPLEX_TEMPLATE = `<template>
  <h1>\${title}</h1>
  <div if.bind="showDetails">
    <p>\${description}</p>
    <ul>
      <li repeat.for="item of items">\${item.name}: \${item.value}</li>
    </ul>
  </div>
  <template switch.bind="status">
    <span case="active">Active</span>
    <span case="inactive">Inactive</span>
    <span default-case>Unknown</span>
  </template>
  <input value.bind="searchTerm" />
  <button click.trigger="handleClick()">Submit</button>
  <div with.bind="nested">
    <span>\${nestedProp}</span>
  </div>
</template>`;

const SIMPLE_TEMPLATE = `<template>\${message}</template>`;

function createVmReflection() {
  return {
    getRootVmTypeExpr: () => "TestVm",
    getSyntheticPrefix: () => "__AU_TTC_",
  };
}

function createProgram(trace?: CompileTrace) {
  return new DefaultTemplateProgram({
    vm: createVmReflection(),
    isJs: false,
    trace,
  });
}

// =============================================================================
// Full Pipeline Integration Tests
// =============================================================================

describe("Trace Integration: Full Compiler Pipeline", () => {
  let exporter: CollectingExporter;
  let trace: CompileTrace;
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  beforeEach(() => {
    exporter = createCollectingExporter();
    trace = createTrace({ name: "integration-test", exporter });
  });

  test("traces complete analysis pipeline with complex template", () => {
    // Run complete analysis pipeline
    trace.span("compile", () => {
      // Stage 1: Lower
      const ir = lowerDocument(COMPLEX_TEMPLATE, {
        trace,
        exprParser,
        attrParser,
        file: "test.html",
      });

      expect(ir.diags?.length ?? 0).toBe(0);

      // Stage 2: Resolve
      const linked = resolveHost(ir, DEFAULT_SEMANTICS, {
        trace,
        resourceScope: null,
      });

      // Stage 3: Bind
      const scope = bindScopes(linked, { trace });

      // Stage 4: Typecheck
      typecheck({
        linked,
        scope,
        ir,
        rootVmType: "TestVm",
        trace,
      });
    });

    // Verify spans were recorded (at least compile + 4 stages)
    expect(exporter.spans.length).toBeGreaterThanOrEqual(5);

    // Verify all pipeline stages
    const lowerSpan = exporter.findSpans("lower.document")[0];
    const resolveSpan = exporter.findSpans("resolve.host")[0];
    const bindSpan = exporter.findSpans("bind.scopes")[0];
    const typecheckSpan = exporter.findSpans("typecheck")[0];

    expect(lowerSpan).toBeDefined();
    expect(resolveSpan).toBeDefined();
    expect(bindSpan).toBeDefined();
    expect(typecheckSpan).toBeDefined();

    // Verify timing was recorded
    expect(lowerSpan?.duration).toBeGreaterThan(0n);
    expect(resolveSpan?.duration).toBeGreaterThan(0n);
    expect(bindSpan?.duration).toBeGreaterThan(0n);

    // Verify attributes were set
    expect(lowerSpan?.attributes.has("lower.html_length")).toBe(true);
    expect(bindSpan?.attributes.has("bind.frame_count")).toBe(true);
  });

  test("traces events throughout pipeline", () => {
    trace.span("compile", () => {
      const ir = lowerDocument(COMPLEX_TEMPLATE, {
        trace,
        exprParser,
        attrParser,
        file: "test.html",
      });

      resolveHost(ir, DEFAULT_SEMANTICS, {
        trace,
        resourceScope: null,
      });
    });

    // Verify lower events
    const lowerEvents = exporter.events.filter((e) =>
      e.event.name.startsWith("lower.")
    );
    expect(lowerEvents.length).toBeGreaterThan(0);

    // Verify specific events exist
    const parseStart = exporter.findEvents("lower.parse_start");
    const parseComplete = exporter.findEvents("lower.parse_complete");
    expect(parseStart.length).toBe(1);
    expect(parseComplete.length).toBe(1);
  });

  test("maintains span hierarchy across stages", () => {
    const compileSpan = trace.span("compile", () => {
      const ir = lowerDocument(SIMPLE_TEMPLATE, {
        trace,
        exprParser,
        attrParser,
        file: "test.html",
      });

      resolveHost(ir, DEFAULT_SEMANTICS, {
        trace,
        resourceScope: null,
      });

      return "done";
    });

    // All pipeline spans should be children of compile
    const lowerSpan = exporter.findSpans("lower.document")[0];
    const resolveSpan = exporter.findSpans("resolve.host")[0];

    expect(lowerSpan?.parent?.name).toBe("compile");
    expect(resolveSpan?.parent?.name).toBe("compile");

    // Result should be returned through traced function
    expect(compileSpan).toBe("done");
  });

  test("records template metrics in attributes", () => {
    trace.span("compile", () => {
      lowerDocument(COMPLEX_TEMPLATE, {
        trace,
        exprParser,
        attrParser,
        file: "test.html",
      });
    });

    const lowerSpan = exporter.findSpans("lower.document")[0];

    // Should have template metrics (using CompilerAttributes constants)
    expect(lowerSpan?.attributes.has(CompilerAttributes.ROW_COUNT)).toBe(true);
    expect(lowerSpan?.attributes.has("lower.html_length")).toBe(true);
  });
});

// =============================================================================
// AOT Synthesis Tracing
// =============================================================================

describe("Trace Integration: AOT Synthesis", () => {
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  test("traces AOT plan and emit stages", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "aot-test", exporter });

    trace.span("aot", () => {
      // Run full analysis first
      const ir = lowerDocument(SIMPLE_TEMPLATE, {
        trace,
        exprParser,
        attrParser,
        file: "test.html",
      });

      const linked = resolveHost(ir, DEFAULT_SEMANTICS, {
        trace,
        resourceScope: null,
      });

      const scope = bindScopes(linked, { trace });

      // AOT synthesis
      const plan = planAot(linked, scope, {
        trace,
        templateFilePath: "test.html",
      });
      expect(plan).toBeDefined();

      const emitted = emitAotCode(plan, { trace });
      expect(emitted).toBeDefined();
    });

    // Verify AOT spans
    const planSpan = exporter.findSpans("aot.plan")[0];
    const emitSpan = exporter.findSpans("aot.emit")[0];

    expect(planSpan).toBeDefined();
    expect(emitSpan).toBeDefined();

    // Verify AOT events
    const planEvents = exporter.events.filter((e) =>
      e.event.name.startsWith("aot.plan.")
    );
    const emitEvents = exporter.events.filter((e) =>
      e.event.name.startsWith("aot.emit.")
    );

    expect(planEvents.length).toBeGreaterThan(0);
    expect(emitEvents.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Overlay Synthesis Tracing
// =============================================================================

describe("Trace Integration: Overlay Synthesis", () => {
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  test("traces overlay plan stage", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "overlay-test", exporter });

    trace.span("overlay", () => {
      const ir = lowerDocument(SIMPLE_TEMPLATE, {
        trace,
        exprParser,
        attrParser,
        file: "test.html",
      });

      const linked = resolveHost(ir, DEFAULT_SEMANTICS, {
        trace,
        resourceScope: null,
      });

      const scope = bindScopes(linked, { trace });

      // Overlay synthesis
      const plan = planOverlay(linked, scope, {
        trace,
        isJs: false,
        vm: createVmReflection(),
      });
      expect(plan).toBeDefined();
    });

    // Verify overlay span
    const overlaySpan = exporter.findSpans("overlay.plan")[0];
    expect(overlaySpan).toBeDefined();

    // Verify attributes
    expect(overlaySpan?.attributes.has("overlay.plan.templateCount")).toBe(true);
  });
});

// =============================================================================
// Build Service Integration
// =============================================================================

describe("Trace Integration: Build Service", () => {
  test("program with build service compiles correctly", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "build-service", exporter });

    const program = createProgram(trace);
    const build = new DefaultTemplateBuildService(program);

    const uri = "/app/traced.html";
    program.upsertTemplate(uri, SIMPLE_TEMPLATE);

    // This should use the trace from the program
    const artifact = build.getOverlay(uri);
    expect(artifact).toBeDefined();
    expect(artifact.overlay.text.length).toBeGreaterThan(0);

    // Note: The pipeline engine internally may use NOOP_TRACE or its own tracing
    // mechanism - the main validation is that compilation succeeds
  });
});

// =============================================================================
// JSONExporter Deep Tests
// =============================================================================

describe("Trace Integration: JSONExporter", () => {
  test("getData returns complete trace structure", () => {
    const exporter = createJSONExporter({ includeEvents: true, includeHierarchy: true });
    const trace = createTrace({ name: "json-test", exporter });

    trace.span("parent", () => {
      trace.setAttribute("custom", "value");
      trace.event("milestone", { step: 1 });

      trace.span("child1", () => {
        trace.event("work.start");
        trace.event("work.end");
      });

      trace.span("child2", () => {
        trace.setAttribute("count", 42);
      });
    });

    trace.rootSpan().end();

    const data = exporter.getData();

    // Verify trace structure
    expect(data.traceId).toBe(trace.rootSpan().traceId);
    expect(data.spanCount).toBeGreaterThanOrEqual(3); // parent, child1, child2
    expect(data.eventCount).toBe(3); // milestone, work.start, work.end
    expect(data.totalDurationMs).toBeGreaterThan(0);

    // Verify spans have hierarchy
    const parentSpan = data.spans.find((s) => s.name === "parent");
    const child1Span = data.spans.find((s) => s.name === "child1");
    const child2Span = data.spans.find((s) => s.name === "child2");

    expect(parentSpan).toBeDefined();
    expect(child1Span).toBeDefined();
    expect(child2Span).toBeDefined();

    expect(child1Span?.parentSpanId).toBe(parentSpan?.spanId);
    expect(child2Span?.parentSpanId).toBe(parentSpan?.spanId);

    // Verify attributes
    expect(parentSpan?.attributes.custom).toBe("value");
    expect(child2Span?.attributes.count).toBe(42);

    // Verify events
    expect(parentSpan?.events?.length).toBe(1);
    expect(parentSpan?.events?.[0]?.name).toBe("milestone");
  });

  test("getSummary provides aggregated statistics", () => {
    const exporter = createJSONExporter();
    const trace = createTrace({ name: "summary-test", exporter });

    // Create multiple spans with same name to test aggregation
    for (let i = 0; i < 5; i++) {
      trace.span("repeated-work", () => {
        trace.event("tick");
      });
    }

    trace.span("unique-work", () => {
      trace.event("special");
    });

    trace.rootSpan().end();

    const summary = exporter.getSummary();

    expect(summary.traceId).toBeDefined();
    expect(summary.spanCount).toBeGreaterThanOrEqual(6); // 5 repeated + 1 unique (may include root)
    expect(summary.eventCount).toBe(6); // 5 ticks + 1 special
    expect(summary.totalDurationMs).toBeGreaterThan(0);

    // Verify top spans aggregation
    expect(summary.topSpans.length).toBeGreaterThan(0);

    const repeatedStats = summary.topSpans.find((s) => s.name === "repeated-work");
    expect(repeatedStats).toBeDefined();
    expect(repeatedStats?.count).toBe(5);
    expect(repeatedStats?.totalMs).toBeGreaterThanOrEqual(0);
  });

  test("toJSON produces valid JSON string", () => {
    const exporter = createJSONExporter({ pretty: true });
    const trace = createTrace({ name: "json-output", exporter });

    trace.span("work", () => {
      trace.setAttribute("key", "value");
    });

    trace.rootSpan().end();

    const json = exporter.toJSON();

    // Should be valid JSON
    const parsed = JSON.parse(json);
    expect(parsed.traceId).toBeDefined();
    expect(parsed.spans).toBeDefined();
    expect(Array.isArray(parsed.spans)).toBe(true);
  });

  test("respects minDuration filter", () => {
    const exporter = createJSONExporter({
      minDuration: 1_000_000_000n, // 1 second - nothing should pass
    });
    const trace = createTrace({ name: "filter-test", exporter });

    trace.span("quick", () => {
      // Super fast, should be filtered
    });

    trace.rootSpan().end();

    const data = exporter.getData();

    // Quick spans should be filtered out
    expect(data.spans.find((s) => s.name === "quick")).toBeUndefined();
  });

  test("clear resets exporter state", () => {
    const exporter = createJSONExporter();
    const trace = createTrace({ name: "clear-test", exporter });

    trace.span("work", () => {});
    trace.rootSpan().end();

    expect(exporter.getData().spanCount).toBeGreaterThan(0);

    exporter.clear();

    const data = exporter.getData();
    expect(data.spanCount).toBe(0);
    expect(data.traceId).toBe("unknown");
  });
});

// =============================================================================
// MultiExporter Integration
// =============================================================================

describe("Trace Integration: MultiExporter", () => {
  test("routes to multiple exporters simultaneously", () => {
    const collector = createCollectingExporter();
    const json = createJSONExporter();
    const logs: string[] = [];
    const console = createConsoleExporter({
      log: (msg) => logs.push(msg),
      colors: false,
    });

    const multi = createMultiExporter([collector, json, console]);
    const trace = createTrace({ name: "multi-test", exporter: multi });

    trace.span("work", () => {
      trace.event("milestone");
      trace.setAttribute("key", "value");
    });

    trace.rootSpan().end();

    // All exporters should have received data
    expect(collector.spans.length).toBeGreaterThan(0);
    expect(json.getData().spanCount).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Pipeline Engine Stage Tracing
// =============================================================================

describe("Trace Integration: Pipeline Engine", () => {
  test("engine compiles templates successfully", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "engine-test", exporter });
    const program = createProgram(trace);
    const build = new DefaultTemplateBuildService(program);

    program.upsertTemplate("/app/engine.html", COMPLEX_TEMPLATE);
    const artifact = build.getOverlay("/app/engine.html");

    // Verify compilation succeeded
    expect(artifact).toBeDefined();
    expect(artifact.overlay.text.length).toBeGreaterThan(0);
  });

  test("engine caches compiled templates", () => {
    const program = createProgram();
    const build = new DefaultTemplateBuildService(program);

    const uri = "/app/cached.html";
    program.upsertTemplate(uri, SIMPLE_TEMPLATE);

    // First call
    const first = build.getOverlay(uri);

    // Second call - should return same cached result
    const second = build.getOverlay(uri);

    // Same content hash means cache hit
    expect(first.overlay.contentHash).toBe(second.overlay.contentHash);
  });
});

// =============================================================================
// NOOP_TRACE Performance Baseline
// =============================================================================

describe("Trace Integration: NOOP_TRACE Zero-Cost", () => {
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  test("NOOP_TRACE allows pipeline execution", () => {
    // Just verify it doesn't crash and returns proper results
    const ir = lowerDocument(SIMPLE_TEMPLATE, {
      trace: NOOP_TRACE,
      exprParser,
      attrParser,
      file: "test.html",
    });

    expect(ir).toBeDefined();
    expect(ir.templates.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Error Handling in Traces
// =============================================================================

describe("Trace Integration: Error Handling", () => {
  test("traces record errors without crashing", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "error-test", exporter });

    expect(() => {
      trace.span("will-fail", () => {
        trace.event("before-error");
        throw new Error("Intentional test error");
      });
    }).toThrow("Intentional test error");

    // Span should still be recorded with error attributes
    const failSpan = exporter.findSpans("will-fail")[0];
    expect(failSpan).toBeDefined();
    expect(failSpan?.attributes.get("error")).toBe(true);
    expect(failSpan?.attributes.get("error.message")).toBe("Intentional test error");

    // Event before error should be recorded
    const beforeEvents = exporter.findEvents("before-error");
    expect(beforeEvents.length).toBe(1);
  });

  test("async errors are properly traced", async () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "async-error-test", exporter });

    await expect(
      trace.spanAsync("async-fail", async () => {
        trace.event("async-start");
        await Promise.resolve();
        throw new Error("Async error");
      })
    ).rejects.toThrow("Async error");

    const failSpan = exporter.findSpans("async-fail")[0];
    expect(failSpan).toBeDefined();
    expect(failSpan?.attributes.get("error")).toBe(true);
  });
});

// =============================================================================
// Attribute Types
// =============================================================================

describe("Trace Integration: Attribute Types", () => {
  test("supports all attribute value types", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "types-test", exporter });

    trace.span("typed", () => {
      trace.setAttributes({
        string: "hello",
        number: 42,
        float: 3.14,
        boolean: true,
        booleanFalse: false,
        bigint: 9007199254740991n,
        array: [1, 2, 3],
        object: { nested: "value" },
        nullValue: null,
        undefinedValue: undefined,
      });
    });

    const span = exporter.findSpans("typed")[0];
    expect(span?.attributes.get("string")).toBe("hello");
    expect(span?.attributes.get("number")).toBe(42);
    expect(span?.attributes.get("float")).toBe(3.14);
    expect(span?.attributes.get("boolean")).toBe(true);
    expect(span?.attributes.get("booleanFalse")).toBe(false);
    expect(span?.attributes.get("bigint")).toBe(9007199254740991n);
    expect(span?.attributes.get("array")).toEqual([1, 2, 3]);
    expect(span?.attributes.get("object")).toEqual({ nested: "value" });
    expect(span?.attributes.get("nullValue")).toBe(null);
    expect(span?.attributes.get("undefinedValue")).toBe(undefined);
  });
});

// =============================================================================
// Deep Nesting
// =============================================================================

describe("Trace Integration: Deep Nesting", () => {
  test("handles deeply nested spans correctly", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "deep-test", exporter });
    const depth = 50;

    function recurse(n: number): number {
      if (n <= 0) return 0;
      return trace.span(`depth-${n}`, () => {
        trace.setAttribute("level", n);
        return 1 + recurse(n - 1);
      });
    }

    const result = recurse(depth);
    expect(result).toBe(depth);

    // All depth levels should be recorded
    expect(exporter.spans.length).toBe(depth);

    // Verify parent-child chain
    const depth50 = exporter.findSpans("depth-50")[0];
    const depth49 = exporter.findSpans("depth-49")[0];
    const depth1 = exporter.findSpans("depth-1")[0];

    expect(depth49?.parent?.name).toBe("depth-50");
    expect(depth1?.parent?.name).toBe("depth-2");
    expect(depth1?.children.length).toBe(0); // Leaf
  });
});

// =============================================================================
// Console Exporter Format Tests
// =============================================================================

describe("Trace Integration: Console Output", () => {
  test("console exporter formats output correctly", () => {
    const logs: string[] = [];
    const exporter = createConsoleExporter({
      log: (msg) => logs.push(msg),
      colors: false,
      prefix: "[test]",
      logEvents: true,
      logAttributes: true,
    });

    const trace = createTrace({ name: "console-test", exporter });

    trace.span("outer", () => {
      trace.setAttribute("key", "value");
      trace.event("checkpoint");
      trace.span("inner", () => {});
    });

    // Verify log output format
    expect(logs.some((l) => l.includes("[test]"))).toBe(true);
    expect(logs.some((l) => l.includes("outer"))).toBe(true);
    expect(logs.some((l) => l.includes("inner"))).toBe(true);
    expect(logs.some((l) => l.includes("checkpoint"))).toBe(true);
  });

  test("console exporter respects indentation", () => {
    const logs: string[] = [];
    const exporter = createConsoleExporter({
      log: (msg) => logs.push(msg),
      colors: false,
    });

    const trace = createTrace({ name: "indent-test", exporter });

    trace.span("level0", () => {
      trace.span("level1", () => {
        trace.span("level2", () => {});
      });
    });

    // Find end logs (they have timing in parentheses)
    const endLogs = logs.filter((l) => l.includes("("));

    // Level 2 should have more leading spaces than level 0
    const level2Log = endLogs.find((l) => l.includes("level2"));
    const level0Log = endLogs.find((l) => l.includes("level0"));

    if (level2Log && level0Log) {
      const level2Indent = level2Log.search(/level2/);
      const level0Indent = level0Log.search(/level0/);
      expect(level2Indent).toBeGreaterThan(level0Indent);
    }
  });
});

// =============================================================================
// Format Duration Edge Cases
// =============================================================================

describe("Trace Integration: formatDuration edge cases", () => {
  test("formats zero duration", () => {
    expect(formatDuration(0n)).toBe("0ns");
  });

  test("formats nanoseconds", () => {
    expect(formatDuration(500n)).toBe("500ns");
    expect(formatDuration(999n)).toBe("999ns");
  });

  test("formats microseconds", () => {
    expect(formatDuration(1000n)).toBe("1.00µs");
    expect(formatDuration(5_000n)).toBe("5.00µs");
  });

  test("formats milliseconds", () => {
    expect(formatDuration(1_000_000n)).toBe("1.00ms");
    expect(formatDuration(500_000_000n)).toBe("500.00ms");
  });

  test("formats seconds", () => {
    expect(formatDuration(1_000_000_000n)).toBe("1.00s");
    expect(formatDuration(60_000_000_000n)).toBe("60.00s");
  });
});

// =============================================================================
// Concurrent Spans
// =============================================================================

describe("Trace Integration: Concurrent Operations", () => {
  test("handles concurrent async spans", async () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "concurrent-test", exporter });

    await trace.spanAsync("concurrent", async () => {
      // Launch multiple concurrent operations
      await Promise.all([
        trace.spanAsync("task-1", async () => {
          trace.event("task-1-start");
          await new Promise((r) => setTimeout(r, 10));
          trace.event("task-1-end");
        }),
        trace.spanAsync("task-2", async () => {
          trace.event("task-2-start");
          await new Promise((r) => setTimeout(r, 10));
          trace.event("task-2-end");
        }),
        trace.spanAsync("task-3", async () => {
          trace.event("task-3-start");
          await new Promise((r) => setTimeout(r, 10));
          trace.event("task-3-end");
        }),
      ]);
    });

    // All tasks should be recorded
    expect(exporter.findSpans("task-1").length).toBe(1);
    expect(exporter.findSpans("task-2").length).toBe(1);
    expect(exporter.findSpans("task-3").length).toBe(1);

    // All events should be recorded
    expect(exporter.findEvents("task-1-start").length).toBe(1);
    expect(exporter.findEvents("task-2-end").length).toBe(1);
  });
});

// =============================================================================
// Real World Scenario: Multiple Templates
// =============================================================================

describe("Trace Integration: Multiple Template Compilation", () => {
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  test("traces multiple template compilations independently", () => {
    const exporter = createCollectingExporter();
    const trace = createTrace({ name: "multi-template", exporter });

    const templates = [
      { file: "/app/home.html", content: "<template><h1>${title}</h1></template>" },
      { file: "/app/about.html", content: "<template><p>${description}</p></template>" },
      { file: "/app/contact.html", content: "<template><form>${formData}</form></template>" },
    ];

    trace.span("compile-all", () => {
      for (const { file, content } of templates) {
        trace.span(`compile:${file}`, () => {
          const ir = lowerDocument(content, {
            trace,
            exprParser,
            attrParser,
            file,
          });

          resolveHost(ir, DEFAULT_SEMANTICS, { trace });
        });
      }
    });

    // Should have compile spans for each template
    const compileSpans = exporter.spans.filter((s) =>
      s.name.startsWith("compile:/app/")
    );
    expect(compileSpans.length).toBe(3);

    // Each should have full pipeline
    const lowerSpans = exporter.findSpans("lower.document");
    expect(lowerSpans.length).toBe(3);
  });
});

// =============================================================================
// Exporter Lifecycle
// =============================================================================

describe("Trace Integration: Exporter Lifecycle", () => {
  test("flush and shutdown work correctly", async () => {
    const collector = createCollectingExporter();
    const json = createJSONExporter();
    const multi = createMultiExporter([collector, json]);

    const trace = createTrace({ name: "lifecycle-test", exporter: multi });

    trace.span("work", () => {});

    // Flush should not throw
    await multi.flush();

    // Data should still be accessible
    expect(collector.spans.length).toBeGreaterThan(0);
    expect(json.getData().spanCount).toBeGreaterThan(0);

    // Shutdown should clean up
    await multi.shutdown();

    // Collector should be cleared after shutdown
    expect(collector.spans.length).toBe(0);
  });
});
