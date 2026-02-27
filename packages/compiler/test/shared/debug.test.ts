/**
 * Unit tests for Debug Channels.
 *
 * Tests the debug visibility system:
 * - Channel enable/disable via AURELIA_DEBUG
 * - Pretty formatting
 * - JSON formatting
 * - Configuration options
 * - Zero-cost when disabled
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  configureDebug,
  debug,
  isDebugEnabled,
  refreshDebugChannels,
  type DebugConfig,
} from "@aurelia-ls/compiler/shared/debug.js";
// =============================================================================
// Test Helpers
// =============================================================================

/** Capture output from debug channels */
function captureOutput(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const originalConfig = { format: "pretty", timestamps: false } as const;

  configureDebug({
    output: (msg) => messages.push(msg),
  });

  return {
    messages,
    restore: () => configureDebug({ ...originalConfig, output: console.log }),
  };
}

/** Set AURELIA_DEBUG and refresh channels */
function setDebugEnv(value: string | undefined): void {
  if (value === undefined) {
    delete process.env["AURELIA_DEBUG"];
  } else {
    process.env["AURELIA_DEBUG"] = value;
  }
  refreshDebugChannels();
}

// =============================================================================
// Channel Enable/Disable Tests
// =============================================================================

describe("debug channel activation", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ output: console.log }); // Reset output
  });

  test("channels are disabled by default (no env var)", () => {
    setDebugEnv(undefined);
    expect(isDebugEnabled()).toBe(false);
    expect(isDebugEnabled("lower")).toBe(false);
    expect(isDebugEnabled("link")).toBe(false);
  });

  test("channels are disabled when AURELIA_DEBUG=0", () => {
    setDebugEnv("0");
    expect(isDebugEnabled()).toBe(false);
  });

  test("channels are disabled when AURELIA_DEBUG=false", () => {
    setDebugEnv("false");
    expect(isDebugEnabled()).toBe(false);
  });

  test("single channel can be enabled", () => {
    setDebugEnv("lower");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(false);
    expect(isDebugEnabled("bind")).toBe(false);
  });

  test("multiple channels can be enabled", () => {
    setDebugEnv("lower,link,bind");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(true);
    expect(isDebugEnabled("bind")).toBe(true);
    expect(isDebugEnabled("typecheck")).toBe(false);
  });

  test("wildcard enables all channels", () => {
    setDebugEnv("*");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(true);
    expect(isDebugEnabled("bind")).toBe(true);
    expect(isDebugEnabled("typecheck")).toBe(true);
    expect(isDebugEnabled("aot")).toBe(true);
    expect(isDebugEnabled("overlay")).toBe(true);
    expect(isDebugEnabled("ssr")).toBe(true);
    expect(isDebugEnabled("transform")).toBe(true);
  });

  test("AURELIA_DEBUG=1 enables all channels", () => {
    setDebugEnv("1");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(true);
  });

  test("AURELIA_DEBUG=true enables all channels", () => {
    setDebugEnv("true");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(true);
  });

  test("channel names are case-insensitive", () => {
    setDebugEnv("LOWER,Link,BIND");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(true);
    expect(isDebugEnabled("bind")).toBe(true);
  });

  test("whitespace in channel list is trimmed", () => {
    setDebugEnv("  lower , link  , bind");
    expect(isDebugEnabled("lower")).toBe(true);
    expect(isDebugEnabled("link")).toBe(true);
    expect(isDebugEnabled("bind")).toBe(true);
  });
});

// =============================================================================
// Zero-Cost When Disabled Tests
// =============================================================================

describe("zero-cost when disabled", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ output: console.log });
  });

  test("disabled channel does not call output", () => {
    setDebugEnv(undefined);
    const { messages, restore } = captureOutput();

    debug.lower("test.point", { data: "value" });
    debug.link("test.point", { data: "value" });

    expect(messages).toHaveLength(0);
    restore();
  });

  test("enabled channel calls output", () => {
    setDebugEnv("lower");
    const { messages, restore } = captureOutput();

    debug.lower("test.point", { data: "value" });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("[lower.test.point]");
    restore();
  });

  test("only enabled channels produce output", () => {
    setDebugEnv("lower,bind");
    const { messages, restore } = captureOutput();

    debug.lower("point1");
    debug.link("point2"); // disabled
    debug.bind("point3");
    debug.typecheck("point4"); // disabled

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("[lower.point1]");
    expect(messages[1]).toContain("[bind.point3]");
    restore();
  });
});

// =============================================================================
// Pretty Formatting Tests
// =============================================================================

describe("pretty formatting", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
    setDebugEnv("*");
    configureDebug({ format: "pretty", timestamps: false });
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ output: console.log });
  });

  test("formats point name with channel prefix", () => {
    const { messages, restore } = captureOutput();

    debug.lower("element.start");

    expect(messages[0]).toBe("[lower.element.start]");
    restore();
  });

  test("formats simple data inline", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { name: "foo", count: 42 });

    expect(messages[0]).toBe('[lower.test] { name="foo", count=42 }');
    restore();
  });

  test("formats boolean values", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { enabled: true, disabled: false });

    expect(messages[0]).toBe("[lower.test] { enabled=true, disabled=false }");
    restore();
  });

  test("formats null and undefined", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { nothing: null, missing: undefined });

    expect(messages[0]).toBe("[lower.test] { nothing=null, missing=undefined }");
    restore();
  });

  test("truncates long strings", () => {
    const { messages, restore } = captureOutput();
    const longString = "a".repeat(100);

    debug.lower("test", { value: longString });

    expect(messages[0]).toContain('value="' + "a".repeat(57) + '..."');
    restore();
  });

  test("formats small arrays inline", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { items: [1, 2, 3] });

    expect(messages[0]).toBe("[lower.test] { items=[1, 2, 3] }");
    restore();
  });

  test("summarizes large arrays", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });

    expect(messages[0]).toBe("[lower.test] { items=[10 items] }");
    restore();
  });

  test("formats objects with name property", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { element: { name: "my-app" } });

    expect(messages[0]).toBe("[lower.test] { element=<my-app> }");
    restore();
  });

  test("formats objects with kind property", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { node: { kind: "element" } });

    expect(messages[0]).toBe("[lower.test] { node=<element> }");
    restore();
  });

  test("handles empty data object", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", {});

    expect(messages[0]).toBe("[lower.test]");
    restore();
  });

  test("handles no data argument", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test");

    expect(messages[0]).toBe("[lower.test]");
    restore();
  });
});

// =============================================================================
// JSON Formatting Tests
// =============================================================================

describe("JSON formatting", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
    setDebugEnv("*");
    configureDebug({ format: "json", timestamps: false });
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ format: "pretty", output: console.log });
  });

  test("outputs valid JSON", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test.point", { name: "foo", count: 42 });

    const parsed = JSON.parse(messages[0]!);
    expect(parsed).toEqual({
      channel: "lower",
      point: "test.point",
      data: { name: "foo", count: 42 },
    });
    restore();
  });

  test("includes timestamp when enabled", () => {
    configureDebug({ format: "json", timestamps: true });
    const { messages, restore } = captureOutput();

    const before = Date.now();
    debug.lower("test");
    const after = Date.now();

    const parsed = JSON.parse(messages[0]!);
    expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
    expect(parsed.timestamp).toBeLessThanOrEqual(after);
    restore();
  });

  test("omits data field when no data provided", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test");

    const parsed = JSON.parse(messages[0]!);
    expect(parsed).toEqual({
      channel: "lower",
      point: "test",
    });
    expect(parsed).not.toHaveProperty("data");
    restore();
  });
});

// =============================================================================
// Timestamps Tests
// =============================================================================

describe("timestamps", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
    setDebugEnv("*");
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ format: "pretty", timestamps: false, output: console.log });
  });

  test("pretty format includes ISO timestamp when enabled", () => {
    configureDebug({ format: "pretty", timestamps: true });
    const { messages, restore } = captureOutput();

    debug.lower("test");

    // Should start with ISO timestamp in brackets
    expect(messages[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[lower\.test\]$/);
    restore();
  });

  test("pretty format omits timestamp when disabled", () => {
    configureDebug({ format: "pretty", timestamps: false });
    const { messages, restore } = captureOutput();

    debug.lower("test");

    expect(messages[0]).toBe("[lower.test]");
    restore();
  });
});

// =============================================================================
// All Channels Tests
// =============================================================================

describe("all debug channels", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
    setDebugEnv("*");
    configureDebug({ format: "pretty", timestamps: false });
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ output: console.log });
  });

  test("lower channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.lower("element.start", { tag: "div" });
    expect(messages[0]).toContain("[lower.element.start]");
    restore();
  });

  test("link channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.link("target.bindable", { to: "value" });
    expect(messages[0]).toContain("[link.target.bindable]");
    restore();
  });

  test("bind channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.bind("frame.enter", { scope: 0 });
    expect(messages[0]).toContain("[bind.frame.enter]");
    restore();
  });

  test("typecheck channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.typecheck("mismatch", { expected: "string" });
    expect(messages[0]).toContain("[typecheck.mismatch]");
    restore();
  });

  test("aot channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.aot("plan.start", { path: "app.html" });
    expect(messages[0]).toContain("[aot.plan.start]");
    restore();
  });

  test("overlay channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.overlay("emit.start", { isJs: false });
    expect(messages[0]).toContain("[overlay.emit.start]");
    restore();
  });

  test("ssr channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.ssr("render.start", { url: "/" });
    expect(messages[0]).toContain("[ssr.render.start]");
    restore();
  });

  test("transform channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.transform("start", { filePath: "app.ts" });
    expect(messages[0]).toContain("[transform.start]");
    restore();
  });

  test("project channel outputs correctly", () => {
    const { messages, restore } = captureOutput();
    debug.project("start", { sourceFileCount: 10 });
    expect(messages[0]).toContain("[project.start]");
    restore();
  });
});

// =============================================================================
// refreshDebugChannels Tests
// =============================================================================

describe("refreshDebugChannels", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ output: console.log });
  });

  test("updates channels when env var changes", () => {
    // Start disabled
    setDebugEnv(undefined);
    expect(isDebugEnabled("lower")).toBe(false);

    // Enable
    setDebugEnv("lower");
    expect(isDebugEnabled("lower")).toBe(true);

    // Disable again
    setDebugEnv(undefined);
    expect(isDebugEnabled("lower")).toBe(false);
  });

  test("channels produce output after being enabled", () => {
    setDebugEnv(undefined);
    const { messages, restore } = captureOutput();

    // Should not output when disabled
    debug.lower("before");
    expect(messages).toHaveLength(0);

    // Enable and refresh
    setDebugEnv("lower");

    // Now should output
    debug.lower("after");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("[lower.after]");

    restore();
  });
});

// =============================================================================
// configureDebug Tests
// =============================================================================

describe("configureDebug", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
    setDebugEnv("*");
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ format: "pretty", timestamps: false, output: console.log });
  });

  test("can change format at runtime", () => {
    const { messages, restore } = captureOutput();

    configureDebug({ format: "pretty" });
    debug.lower("test1", { value: 1 });

    configureDebug({ format: "json" });
    debug.lower("test2", { value: 2 });

    expect(messages[0]).toBe("[lower.test1] { value=1 }");
    expect(JSON.parse(messages[1]!)).toEqual({
      channel: "lower",
      point: "test2",
      data: { value: 2 },
    });

    restore();
  });

  test("can toggle timestamps at runtime", () => {
    const { messages, restore } = captureOutput();

    configureDebug({ format: "pretty", timestamps: false });
    debug.lower("without");

    configureDebug({ timestamps: true });
    debug.lower("with");

    expect(messages[0]).toBe("[lower.without]");
    expect(messages[1]).toMatch(/^\[.*\] \[lower\.with\]$/);

    restore();
  });

  test("can set custom output function", () => {
    const customOutput: string[] = [];

    configureDebug({
      output: (msg) => customOutput.push(`CUSTOM: ${msg}`),
    });

    debug.lower("test");

    expect(customOutput).toHaveLength(1);
    expect(customOutput[0]).toBe("CUSTOM: [lower.test]");

    configureDebug({ output: console.log });
  });

  test("partial config preserves other settings", () => {
    const { messages, restore } = captureOutput();

    configureDebug({ format: "json", timestamps: true });
    configureDebug({ timestamps: false }); // Only change timestamps

    debug.lower("test");

    // Should still be JSON format
    const parsed = JSON.parse(messages[0]!);
    expect(parsed.channel).toBe("lower");
    expect(parsed).not.toHaveProperty("timestamp");

    restore();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("edge cases", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env["AURELIA_DEBUG"];
    setDebugEnv("*");
    configureDebug({ format: "pretty", timestamps: false });
  });

  afterEach(() => {
    setDebugEnv(originalEnv);
    configureDebug({ output: console.log });
  });

  test("handles nested objects", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", {
      outer: {
        inner: {
          deep: "value",
        },
      },
    });

    // Should show {outer={...}} due to depth limit
    expect(messages[0]).toContain("outer=");
    restore();
  });

  test("handles arrays of objects with name", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", {
      items: [{ name: "a" }, { name: "b" }],
    });

    // Objects with name property are formatted as <name>
    expect(messages[0]).toBe("[lower.test] { items=[<a>, <b>] }");
    restore();
  });

  test("handles large arrays of objects", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", {
      items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    });

    // Large arrays get summarized
    expect(messages[0]).toContain("[5 items]");
    restore();
  });

  test("handles empty array", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { items: [] });

    expect(messages[0]).toBe("[lower.test] { items=[] }");
    restore();
  });

  test("handles string arrays", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { tags: ["a", "b"] });

    expect(messages[0]).toBe('[lower.test] { tags=["a", "b"] }');
    restore();
  });

  test("handles mixed type arrays", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { mixed: [1, "two", true] });

    expect(messages[0]).toBe('[lower.test] { mixed=[1, "two", true] }');
    restore();
  });

  test("handles special characters in strings", () => {
    const { messages, restore } = captureOutput();

    debug.lower("test", { value: 'hello "world"' });

    expect(messages[0]).toContain('hello "world"');
    restore();
  });
});
