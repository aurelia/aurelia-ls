import { test, expect, describe, vi } from "vitest";
import {
  bindingModeInlayHintsEnabled,
  handleInlayHints,
} from "../../src/handlers/inlay-hints.js";

function createMockContext(enabled = true) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    clientSupport: { configurationPull: true },
    connection: {
      workspace: {
        getConfiguration: vi.fn(async () => enabled),
      },
    },
  };
}

function createMockOperation(rows: unknown[]) {
  return {
    documents: {
      ensureProgramDocument: vi.fn(() => ({
        uri: "file:///test.html",
        languageId: "html",
        getText: () => "x".repeat(300),
        positionAt: (offset: number) => ({ line: Math.floor(offset / 100), character: offset % 100 }),
      })),
    },
    templateInlayHints: vi.fn(async () => ({
      value: {
        displayText: `${rows.length} rows`,
        rows,
      },
    })),
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
    const ctx = createMockContext();
    const operation = createMockOperation([makeRow()]);
    const result = await handleInlayHints(ctx as never, params(), operation as never);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe(": twoWay");
    expect(result![0].position).toEqual({ line: 0, character: 60 });
    expect(operation.templateInlayHints).toHaveBeenCalledOnce();
  });

  test("returns null when runtime has no hints", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([]);
    const result = await handleInlayHints(ctx as never, params(), operation as never);

    expect(result).toBeNull();
  });

  test("prepares resource-scoped configuration before semantic admission", async () => {
    const ctx = createMockContext(false);
    const enabled = await bindingModeInlayHintsEnabled(ctx as never, "file:///test.html");

    expect(enabled).toBe(false);
    expect(ctx.connection.workspace.getConfiguration).toHaveBeenCalledWith({
      scopeUri: "file:///test.html",
      section: "aurelia.inlayHints.bindingMode",
    });
  });

  test("does not contact the client when configuration pull is unsupported", async () => {
    const ctx = createMockContext();
    ctx.clientSupport.configurationPull = false;

    await expect(bindingModeInlayHintsEnabled(ctx as never, "file:///test.html")).resolves.toBe(false);
    expect(ctx.connection.workspace.getConfiguration).not.toHaveBeenCalled();
  });

  test("treats unavailable resource configuration as disabled presentation policy", async () => {
    const ctx = createMockContext();
    ctx.connection.workspace.getConfiguration.mockRejectedValueOnce(new Error("client unavailable"));

    await expect(bindingModeInlayHintsEnabled(ctx as never, "file:///test.html")).resolves.toBe(false);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining("client unavailable"));
  });

  test("skips rows without exact source spans", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([
      makeRow("twoWay", null),
      makeRow("toView", { path: "src/app.html" }),
    ]);
    const result = await handleInlayHints(ctx as never, params(), operation as never);

    expect(result).toBeNull();
  });

  test("filters hints outside the requested line range", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([
      makeRow("twoWay", { start: 50, end: 60 }),
      makeRow("toView", { start: 250, end: 260 }),
    ]);
    const result = await handleInlayHints(ctx as never, params({
      start: { line: 2, character: 0 },
      end: { line: 2, character: 99 },
    }), operation as never);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe(": toView");
  });

  test("returns null when document is unavailable", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([makeRow()]);
    operation.documents.ensureProgramDocument.mockReturnValueOnce(null as never);
    const result = await handleInlayHints(ctx as never, params(), operation as never);

    expect(result).toBeNull();
    expect(operation.templateInlayHints).not.toHaveBeenCalled();
  });
});
