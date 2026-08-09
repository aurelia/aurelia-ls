import { describe, expect, test, vi } from "vitest";
import { LSPErrorCodes } from "vscode-languageserver/node";
import {
  bindingModeInlayHintsEnabled,
  handleInlayHints,
} from "../../src/handlers/inlay-hints.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const documentUris = testWorkspaceDocumentUris("/app");
const templateUri = documentUris.uriForWorkspaceRelativePath("src/test.html")!;
const otherTemplateUri = documentUris.uriForWorkspaceRelativePath("src/other.html")!;

interface AnswerEnvelopeOverrides {
  readonly result?: string;
  readonly selection?: string;
  readonly coverage?: string;
}

function createMockContext(enabled = true) {
  return {
    documentUris,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    clientSupport: { configurationPull: true },
    connection: {
      workspace: {
        getConfiguration: vi.fn(async () => enabled),
      },
    },
  };
}

function createMockOperation(rows: unknown[], envelope: AnswerEnvelopeOverrides = {}) {
  return {
    documents: {
      ensureProgramDocument: vi.fn(() => ({
        uri: templateUri,
        languageId: "html",
        getText: () => "x".repeat(300),
        positionAt: (offset: number) => ({
          line: Math.floor(offset / 100),
          character: offset % 100,
        }),
      })),
    },
    templateInlayHints: vi.fn(async () => ({
      schemaVersion: "0.2",
      result: envelope.result ?? "answered",
      selection: envelope.selection ?? "not-applicable",
      coverage: envelope.coverage ?? "complete",
      summary: `${rows.length} test inlay hint row(s).`,
      value: {
        displayText: `${rows.length} rows`,
        rows,
      },
      page: null,
    })),
  };
}

function exactSource(start: number, end: number, path = templateUri) {
  return {
    kind: "source-span-address",
    label: `${path}@${start}..${end}`,
    path,
    start,
    end,
  };
}

function makeRow(effectiveModeLabel = "twoWay", source: unknown = exactSource(50, 60)) {
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

const fullRange = {
  start: { line: 0, character: 0 },
  end: { line: 999, character: 0 },
};
const params = (range = fullRange, uri = templateUri) => ({
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

  test("returns null when a complete runtime answer has no hints", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([]);
    const result = await handleInlayHints(ctx as never, params(), operation as never);

    expect(result).toBeNull();
  });

  test("prepares resource-scoped configuration before semantic admission", async () => {
    const ctx = createMockContext(false);
    const enabled = await bindingModeInlayHintsEnabled(ctx as never, templateUri);

    expect(enabled).toBe(false);
    expect(ctx.connection.workspace.getConfiguration).toHaveBeenCalledWith({
      scopeUri: templateUri,
      section: "aurelia.inlayHints.bindingMode",
    });
  });

  test("does not contact the client when configuration pull is unsupported", async () => {
    const ctx = createMockContext();
    ctx.clientSupport.configurationPull = false;

    await expect(bindingModeInlayHintsEnabled(ctx as never, templateUri)).resolves.toBe(false);
    expect(ctx.connection.workspace.getConfiguration).not.toHaveBeenCalled();
  });

  test("treats unavailable resource configuration as disabled presentation policy", async () => {
    const ctx = createMockContext();
    ctx.connection.workspace.getConfiguration.mockRejectedValueOnce(new Error("client unavailable"));

    await expect(bindingModeInlayHintsEnabled(ctx as never, templateUri)).resolves.toBe(false);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining("client unavailable"));
  });

  test.each([
    ["null", null, "no exact authored insertion anchor"],
    [
      "broad",
      { kind: "source-file-address", label: templateUri, path: templateUri },
      "no exact authored insertion anchor",
    ],
    ["wrong-document", exactSource(50, 60, otherTemplateUri), "requesting document"],
    ["out-of-range", exactSource(290, 301), "outside the current document text"],
  ])("fails loudly for a %s published source anchor", async (_case, source, message) => {
    await expectInlayHintsToReject(
      createMockOperation([makeRow("twoWay", source)]),
      message,
    );
  });

  test("fails loudly for an unhandled published hint kind", async () => {
    await expectInlayHintsToReject(
      createMockOperation([{ ...makeRow(), hintKind: "future-hint-kind" }]),
      "unsupported hint kind",
    );
  });

  test.each([
    ["failed result", { result: "failed" }],
    ["applicable selection", { selection: "exact" }],
    ["open coverage", { coverage: "open" }],
  ])("rejects a %s before reading even an empty row payload", async (_case, envelope) => {
    await expectInlayHintsToReject(
      createMockOperation([], envelope),
      "semantic runtime returned",
    );
  });

  test("filters hints outside the requested line range", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([
      makeRow("twoWay", exactSource(50, 60)),
      makeRow("toView", exactSource(250, 260)),
    ]);
    const result = await handleInlayHints(ctx as never, params({
      start: { line: 2, character: 0 },
      end: { line: 2, character: 99 },
    }), operation as never);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe(": toView");
  });

  test("uses a start-inclusive and end-exclusive requested range", async () => {
    const ctx = createMockContext();
    const operation = createMockOperation([
      makeRow("before", exactSource(50, 59)),
      makeRow("atStart", exactSource(50, 60)),
      makeRow("inside", exactSource(60, 70)),
      makeRow("atEnd", exactSource(70, 80)),
      makeRow("after", exactSource(80, 81)),
    ]);
    const result = await handleInlayHints(ctx as never, params({
      start: { line: 0, character: 60 },
      end: { line: 0, character: 80 },
    }), operation as never);

    expect(result?.map((hint) => hint.label)).toEqual([
      ": atStart",
      ": inside",
    ]);
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

async function expectInlayHintsToReject(
  operation: ReturnType<typeof createMockOperation>,
  message: string,
): Promise<void> {
  await expect(handleInlayHints(
    createMockContext() as never,
    params(),
    operation as never,
  )).rejects.toMatchObject({
    code: LSPErrorCodes.RequestFailed,
    message: expect.stringContaining(message),
  });
}
