/**
 * Tests for Vite Plugin Trace Utilities
 *
 * Tests the trace configuration and management utilities:
 * - resolveTraceOptions
 * - createManagedTrace
 * - createRequestTrace
 * - createBuildTrace
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import {
  resolveTraceOptions,
  createManagedTrace,
  createRequestTrace,
  createBuildTrace,
} from "../src/trace.js";

// Module-level temp directory for tests that need file paths
let tempDir: string;

// =============================================================================
// resolveTraceOptions Tests
// =============================================================================

describe("resolveTraceOptions", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "trace-options-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("disabled tracing", () => {
    test("returns disabled when options is undefined", () => {
      delete process.env["AURELIA_TRACE"];
      const result = resolveTraceOptions(undefined, "/project");

      expect(result.enabled).toBe(false);
      expect(result.output).toBe("silent");
    });

    test("returns disabled when options is false", () => {
      delete process.env["AURELIA_TRACE"];
      const result = resolveTraceOptions(false, "/project");

      expect(result.enabled).toBe(false);
    });
  });

  describe("enabled via options", () => {
    beforeEach(() => {
      delete process.env["AURELIA_TRACE"];
    });

    test("enables when options is true", () => {
      const result = resolveTraceOptions(true, "/project");

      expect(result.enabled).toBe(true);
      expect(result.output).toBe("console");
    });

    test("enables when options is object", () => {
      const result = resolveTraceOptions({}, "/project");

      expect(result.enabled).toBe(true);
    });

    test("uses console output by default", () => {
      const result = resolveTraceOptions(true, "/project");

      expect(result.output).toBe("console");
    });

    test("respects output option", () => {
      const result = resolveTraceOptions({ output: "json" }, "/project");

      expect(result.output).toBe("json");
    });

    test("respects silent output", () => {
      const result = resolveTraceOptions({ output: "silent" }, "/project");

      expect(result.output).toBe("silent");
    });
  });

  describe("enabled via environment variable", () => {
    test("enables when AURELIA_TRACE=1", () => {
      process.env["AURELIA_TRACE"] = "1";
      const result = resolveTraceOptions(undefined, "/project");

      expect(result.enabled).toBe(true);
    });

    test("enables when AURELIA_TRACE=true", () => {
      process.env["AURELIA_TRACE"] = "true";
      const result = resolveTraceOptions(undefined, "/project");

      expect(result.enabled).toBe(true);
    });

    test("does not enable for other values", () => {
      process.env["AURELIA_TRACE"] = "false";
      const result = resolveTraceOptions(undefined, "/project");

      expect(result.enabled).toBe(false);
    });
  });

  describe("minDuration option", () => {
    beforeEach(() => {
      delete process.env["AURELIA_TRACE"];
    });

    test("defaults to 0", () => {
      const result = resolveTraceOptions(true, "/project");

      expect(result.minDurationNs).toBe(0n);
    });

    test("converts milliseconds to nanoseconds", () => {
      const result = resolveTraceOptions({ minDuration: 5 }, "/project");

      expect(result.minDurationNs).toBe(5_000_000n);
    });

    test("handles fractional milliseconds", () => {
      const result = resolveTraceOptions({ minDuration: 0.5 }, "/project");

      expect(result.minDurationNs).toBe(500_000n);
    });
  });

  describe("file option", () => {
    beforeEach(() => {
      delete process.env["AURELIA_TRACE"];
    });

    test("resolves relative file path", () => {
      const result = resolveTraceOptions(
        { output: "json", file: "traces/build.json" },
        tempDir
      );

      expect(result.file).toBe(join(tempDir, "traces/build.json"));
    });

    test("uses default file for json output when not specified", () => {
      const result = resolveTraceOptions({ output: "json" }, tempDir);

      expect(result.file).toBe(join(tempDir, "aurelia-trace.json"));
    });

    test("file is null for console output", () => {
      const result = resolveTraceOptions({ output: "console" }, "/project");

      expect(result.file).toBeNull();
    });
  });

  describe("other options", () => {
    beforeEach(() => {
      delete process.env["AURELIA_TRACE"];
    });

    test("includeEvents defaults to true", () => {
      const result = resolveTraceOptions(true, "/project");

      expect(result.includeEvents).toBe(true);
    });

    test("respects includeEvents option", () => {
      const result = resolveTraceOptions({ includeEvents: false }, "/project");

      expect(result.includeEvents).toBe(false);
    });

    test("summary defaults to true", () => {
      const result = resolveTraceOptions(true, "/project");

      expect(result.summary).toBe(true);
    });

    test("respects summary option", () => {
      const result = resolveTraceOptions({ summary: false }, "/project");

      expect(result.summary).toBe(false);
    });
  });
});

// =============================================================================
// createManagedTrace Tests
// =============================================================================

describe("createManagedTrace", () => {
  test("returns NOOP when disabled", () => {
    const options = resolveTraceOptions(undefined, "/project");
    const managed = createManagedTrace("test", options);

    expect(managed.jsonExporter).toBeNull();

    // Should not throw
    managed.trace.span("work", () => 42);
    managed.finish();
  });

  test("creates console trace when enabled with console output", () => {
    const options = resolveTraceOptions({ output: "console" }, "/project");
    const managed = createManagedTrace("test", options);

    expect(managed.trace).toBeDefined();
    expect(managed.jsonExporter).toBeNull();
  });

  test("creates JSON trace when enabled with json output", () => {
    const options = resolveTraceOptions({ output: "json" }, "/project");
    const managed = createManagedTrace("test", options);

    expect(managed.trace).toBeDefined();
    expect(managed.jsonExporter).not.toBeNull();
  });

  test("creates silent trace with JSON exporter for programmatic access", () => {
    const options = resolveTraceOptions({ output: "silent" }, "/project");
    const managed = createManagedTrace("test", options);

    expect(managed.trace).toBeDefined();
    expect(managed.jsonExporter).not.toBeNull();
  });

  test("trace records spans correctly", () => {
    const options = resolveTraceOptions({ output: "silent" }, "/project");
    const managed = createManagedTrace("test", options);

    managed.trace.span("work", () => {
      managed.trace.setAttribute("key", "value");
      managed.trace.event("milestone");
    });

    managed.finish();

    const data = managed.jsonExporter!.getData();
    expect(data.spanCount).toBeGreaterThan(0);
    expect(data.eventCount).toBeGreaterThan(0);
  });

  describe("finish behavior", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "trace-test-"));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    test("writes JSON file when configured", () => {
      const filePath = join(tempDir, "trace.json");
      const options = resolveTraceOptions(
        { output: "json", file: filePath },
        tempDir
      );
      const managed = createManagedTrace("test", options);

      managed.trace.span("work", () => {});
      managed.finish();

      expect(existsSync(filePath)).toBe(true);

      const content = JSON.parse(readFileSync(filePath, "utf-8"));
      expect(content.traceId).toBeDefined();
      expect(content.spans).toBeDefined();
    });

    test("logs summary when enabled", () => {
      const logs: string[] = [];
      const logger = { info: (msg: string) => logs.push(msg) };

      const options = resolveTraceOptions(
        { output: "silent", summary: true },
        "/project"
      );
      const managed = createManagedTrace("test", options, logger);

      managed.trace.span("work", () => {});
      managed.finish();

      expect(logs.some((l) => l.includes("spans"))).toBe(true);
    });

    test("does not log summary when disabled", () => {
      const logs: string[] = [];
      const logger = { info: (msg: string) => logs.push(msg) };

      const options = resolveTraceOptions(
        { output: "silent", summary: false },
        "/project"
      );
      const managed = createManagedTrace("test", options, logger);

      managed.trace.span("work", () => {});
      managed.finish();

      expect(logs.length).toBe(0);
    });
  });
});

// =============================================================================
// createRequestTrace Tests
// =============================================================================

describe("createRequestTrace", () => {
  test("creates trace with request prefix", () => {
    const options = resolveTraceOptions({ output: "silent" }, "/project");
    const managed = createRequestTrace("/about", options);

    expect(managed.trace.rootSpan().name).toBe("request:/about");
  });

  test("truncates long URLs", () => {
    const options = resolveTraceOptions({ output: "silent" }, "/project");
    const longUrl = "/very/long/path/that/exceeds/forty/characters/in/length";
    const managed = createRequestTrace(longUrl, options);

    expect(managed.trace.rootSpan().name).toContain("request:");
    expect(managed.trace.rootSpan().name.length).toBeLessThan(
      "request:".length + longUrl.length
    );
    expect(managed.trace.rootSpan().name).toContain("...");
  });

  test("returns NOOP when disabled", () => {
    const options = resolveTraceOptions(undefined, "/project");
    const managed = createRequestTrace("/about", options);

    expect(managed.jsonExporter).toBeNull();
  });
});

// =============================================================================
// createBuildTrace Tests
// =============================================================================

describe("createBuildTrace", () => {
  test("creates trace with build name", () => {
    const options = resolveTraceOptions({ output: "silent" }, "/project");
    const managed = createBuildTrace(options);

    expect(managed.trace.rootSpan().name).toBe("build");
  });

  test("returns NOOP when disabled", () => {
    const options = resolveTraceOptions(undefined, "/project");
    const managed = createBuildTrace(options);

    expect(managed.jsonExporter).toBeNull();
  });

  test("can record build spans", () => {
    const options = resolveTraceOptions({ output: "silent" }, "/project");
    const managed = createBuildTrace(options);

    managed.trace.span("transform:file.ts", () => {
      managed.trace.setAttribute("size", 1024);
    });

    managed.trace.span("transform:other.ts", () => {});

    managed.finish();

    const data = managed.jsonExporter!.getData();
    // 2 transform spans + 1 root span = 3
    expect(data.spanCount).toBe(3);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Trace Utilities Integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "trace-integration-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("full build trace workflow", () => {
    const logs: string[] = [];
    const logger = { info: (msg: string) => logs.push(msg) };
    const filePath = join(tempDir, "build-trace.json");

    const options = resolveTraceOptions(
      {
        output: "json",
        file: filePath,
        summary: true,
        minDuration: 0,
        includeEvents: true,
      },
      tempDir
    );

    const build = createBuildTrace(options, logger);

    // Simulate build
    build.trace.span("resolve-config", () => {
      build.trace.event("config.loaded");
    });

    build.trace.span("transform-files", () => {
      for (let i = 0; i < 5; i++) {
        build.trace.span(`transform:file-${i}.ts`, () => {
          build.trace.setAttribute("index", i);
          build.trace.event("transform.complete");
        });
      }
    });

    build.trace.span("emit-output", () => {
      build.trace.setAttribute("outputSize", 50000);
    });

    build.finish();

    // Verify file was written
    expect(existsSync(filePath)).toBe(true);

    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    // 8 explicit spans + 1 root span = 9
    expect(data.spanCount).toBe(9); // resolve + transform + 5 files + emit + root
    expect(data.eventCount).toBe(6); // config.loaded + 5 transform.complete

    // Verify summary was logged
    expect(logs.some((l) => l.includes("build:"))).toBe(true);
    expect(logs.some((l) => l.includes("spans"))).toBe(true);
  });

  test("full request trace workflow", () => {
    const logs: string[] = [];
    const logger = { info: (msg: string) => logs.push(msg) };

    const options = resolveTraceOptions(
      { output: "silent", summary: true },
      tempDir
    );

    const request = createRequestTrace("/api/users", options, logger);

    // Simulate request handling
    request.trace.span("load-components", () => {
      request.trace.event("components.loaded");
    });

    request.trace.span("render", () => {
      request.trace.setAttribute("componentCount", 3);
      request.trace.event("render.start");
      request.trace.event("render.complete");
    });

    request.trace.span("serialize", () => {
      request.trace.setAttribute("htmlSize", 5000);
    });

    request.finish();

    // Verify data
    const data = request.jsonExporter!.getData();
    // 3 explicit spans + 1 root span = 4
    expect(data.spanCount).toBe(4);
    expect(data.eventCount).toBe(3);

    // Verify summary was logged
    expect(logs.some((l) => l.includes("request:"))).toBe(true);
  });

  test("minDuration filtering works end-to-end", () => {
    const options = resolveTraceOptions(
      {
        output: "silent",
        minDuration: 1000, // 1 second - nothing should pass
      },
      tempDir
    );

    const build = createBuildTrace(options);

    // Quick spans that should be filtered
    for (let i = 0; i < 10; i++) {
      build.trace.span(`quick-${i}`, () => {});
    }

    build.finish();

    // All spans should be filtered out (except potentially root)
    const data = build.jsonExporter!.getData();
    const nonRootSpans = data.spans.filter((s) => s.name !== "build");
    expect(nonRootSpans.length).toBe(0);
  });
});
