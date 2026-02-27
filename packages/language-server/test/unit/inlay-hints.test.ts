import { test, expect, describe, vi } from "vitest";
import { handleInlayHints } from "@aurelia-ls/language-server/api";

function createMockContext(compilation: unknown) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => ({
      getText: () => "",
      positionAt: (offset: number) => ({ line: Math.floor(offset / 100), character: offset % 100 }),
    })),
    workspace: {
      getCompilation: vi.fn(() => compilation),
    },
  };
}

function makeBinding(mode: string, effectiveMode: string, command?: string, nameLoc?: { start: number; end: number }) {
  return {
    kind: "propertyBinding" as const,
    to: "value",
    from: {},
    mode,
    effectiveMode,
    command: command ?? "bind",
    nameLoc: nameLoc ?? { start: 10, end: 20 },
  };
}

function makeCompilation(bindings: ReturnType<typeof makeBinding>[]) {
  return {
    linked: {
      templates: [{
        rows: [{
          instructions: bindings,
        }],
      }],
    },
  };
}

const fullRange = { start: { line: 0, character: 0 }, end: { line: 999, character: 0 } };
const params = (uri = "file:///test.html") => ({
  textDocument: { uri },
  range: fullRange,
});

describe("inlay hints: mode resolution property", () => {
  test("shows hint when mode is default and effectiveMode is resolved", () => {
    const compilation = makeCompilation([
      makeBinding("default", "twoWay"),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe(": twoWay");
  });

  test("no hint when authored mode matches effective mode (explicit command)", () => {
    const compilation = makeCompilation([
      makeBinding("twoWay", "twoWay", "two-way"),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).toBeNull();
  });

  test("no hint when effectiveMode is default (unresolved)", () => {
    const compilation = makeCompilation([
      makeBinding("default", "default"),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).toBeNull();
  });

  test("shows hint for .bind resolving to toView", () => {
    const compilation = makeCompilation([
      makeBinding("default", "toView"),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).not.toBeNull();
    expect(result![0].label).toBe(": toView");
  });

  test("no hint for pattern-based shorthand with explicit mode override", () => {
    // :value pattern sets mode = "toView", effectiveMode = "toView"
    const compilation = makeCompilation([
      makeBinding("toView", "toView", "bind"),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).toBeNull();
  });

  test("works with custom binding commands that have mode default", () => {
    const compilation = makeCompilation([
      makeBinding("default", "fromView", "my-custom-bind"),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).not.toBeNull();
    expect(result![0].label).toBe(": fromView");
  });

  test("skips non-propertyBinding instructions", () => {
    const compilation = {
      linked: {
        templates: [{
          rows: [{
            instructions: [
              { kind: "listenerBinding", to: "click" },
              makeBinding("default", "twoWay"),
            ],
          }],
        }],
      },
    };
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).toHaveLength(1);
  });

  test("returns null when no compilation available", () => {
    const ctx = createMockContext(null);
    const result = handleInlayHints(ctx as never, params());

    expect(result).toBeNull();
  });

  test("positions hint at end of nameLoc span", () => {
    const compilation = makeCompilation([
      makeBinding("default", "twoWay", "bind", { start: 50, end: 60 }),
    ]);
    const ctx = createMockContext(compilation);
    const result = handleInlayHints(ctx as never, params());

    expect(result).not.toBeNull();
    // positionAt(60) → line 0, character 60
    expect(result![0].position.character).toBe(60);
  });
});
