import { test, expect, describe, vi } from "vitest";
import { handleInlayHints } from "../../src/handlers/inlay-hints.js";
import { testRequestGuard } from "./test-request-guard.js";

function createMockContext(rows: unknown[], enabled = true) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    clientSupport: { configurationPull: true },
    connection: {
      workspace: {
        getConfiguration: vi.fn(async () => enabled),
      },
    },
    ensureProgramDocument: vi.fn(() => ({
      uri: "file:///test.html",
      languageId: "html",
      getText: () => "x".repeat(300),
      positionAt: (offset: number) => ({ line: Math.floor(offset / 100), character: offset % 100 }),
    })),
    semanticRuntime: {
      templateInlayHints: vi.fn(async () => ({
        value: {
          displayText: `${rows.length} rows`,
          rows,
        },
      })),
    },
  };
}

function makeRow(effectiveModeLabel = "twoWay", source: unknown = { start: 50, end: 60 }) {
  return {
    hintKind: "binding-mode-resolution",
    definitionName: "my-app",
    bindingKind: "property",
    targetProperty: "value",
    authoredMode: "default",
    effectiveMode: "two-way",
    effectiveModeLabel,
    source,
    attributeSource: source,
    bindingSource: source,
  };
}

const fullRange = { start: { line: 0, character: 0 }, end: { line: 999, character: 0 } };
const params = (range = fullRange, uri = "file:///test.html") => ({
  textDocument: { uri },
  range,
});

describe("inlay hints: semantic-runtime mapping", () => {
  test("maps runtime binding-mode hint rows", async () => {
    const ctx = createMockContext([makeRow()]);
    const result = await handleInlayHints(ctx as never, params(), testRequestGuard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe(": twoWay");
    expect(result![0].position).toEqual({ line: 0, character: 60 });
    expect(ctx.semanticRuntime.templateInlayHints).toHaveBeenCalledOnce();
  });

  test("returns null when runtime has no hints", async () => {
    const ctx = createMockContext([]);
    const result = await handleInlayHints(ctx as never, params(), testRequestGuard);

    expect(result).toBeNull();
  });

  test("does not query semantic-runtime when the resource-scoped setting is disabled", async () => {
    const ctx = createMockContext([makeRow()], false);
    const result = await handleInlayHints(ctx as never, params(), testRequestGuard);

    expect(result).toBeNull();
    expect(ctx.connection.workspace.getConfiguration).toHaveBeenCalledWith({
      scopeUri: "file:///test.html",
      section: "aurelia.inlayHints.bindingMode",
    });
    expect(ctx.semanticRuntime.templateInlayHints).not.toHaveBeenCalled();
  });

  test("skips rows without exact source spans", async () => {
    const ctx = createMockContext([
      makeRow("twoWay", null),
      makeRow("toView", { path: "src/app.html" }),
    ]);
    const result = await handleInlayHints(ctx as never, params(), testRequestGuard);

    expect(result).toBeNull();
  });

  test("filters hints outside the requested line range", async () => {
    const ctx = createMockContext([
      makeRow("twoWay", { start: 50, end: 60 }),
      makeRow("toView", { start: 250, end: 260 }),
    ]);
    const result = await handleInlayHints(ctx as never, params({
      start: { line: 2, character: 0 },
      end: { line: 2, character: 99 },
    }), testRequestGuard);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe(": toView");
  });

  test("returns null when document is unavailable", async () => {
    const ctx = {
      ...createMockContext([makeRow()]),
      ensureProgramDocument: vi.fn(() => null),
    };
    const result = await handleInlayHints(ctx as never, params(), testRequestGuard);

    expect(result).toBeNull();
    expect(ctx.semanticRuntime.templateInlayHints).not.toHaveBeenCalled();
  });
});
