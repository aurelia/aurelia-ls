import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleSelectionRanges } from "@aurelia-ls/language-server/api";

const uri = "file:///app/src/app.html";
const text = '<template><input value.bind="title"></template>';
const doc = TextDocument.create(uri, "html", 1, text);

const titleStart = text.indexOf("title");
const titleEnd = titleStart + "title".length;
const attributeStart = text.indexOf("value.bind");
const attributeEnd = attributeStart + 'value.bind="title"'.length;
const elementStart = text.indexOf("<input");
const elementEnd = text.indexOf(">", elementStart) + 1;

function source(start: number, end: number) {
  return {
    kind: "source-span-address",
    label: `src/app.html@${start}..${end}`,
    path: uri,
    start,
    end,
    role: "range",
  };
}

function createMockContext(value: Record<string, unknown>) {
  return {
    workspaceRoot: "/app",
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => doc),
    semanticRuntime: {
      templateCursorInfo: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock",
        value,
        page: null,
      })),
    },
  };
}

function cursorInfo(overrides: Record<string, unknown> = {}) {
  return {
    displayText: "mock",
    siteKind: "expression-member",
    expressionFrontier: null,
    missingInputs: [],
    template: { compilationLane: "app-runtime", source: source(0, text.length) },
    html: {
      nodeKind: "element",
      tagName: "input",
      attributeName: "value.bind",
      attributeValue: "title",
      source: source(elementStart, elementEnd),
      attributeSource: source(attributeStart, attributeEnd),
    },
    valueSite: {
      siteKind: "attribute",
      rawValue: "title",
      entryFamily: "binding-command",
      bindingCommandName: "bind",
      bindableName: "value",
      bindableAttribute: "value",
      source: source(titleStart, titleEnd),
    },
    selectedDefinition: null,
    selectedBindable: null,
    selectedMemberName: "title",
    selectedMember: null,
    memberOwnerType: {
      display: "App",
      shapeKind: "object",
      origin: "typescript",
      source: source(titleStart, titleEnd),
      declarationSource: null,
    },
    diagnostics: [],
    ...overrides,
  };
}

function range(start: number, end: number) {
  return {
    start: doc.positionAt(start),
    end: doc.positionAt(end),
  };
}

describe("runtime-backed selection ranges", () => {
  test("builds an active-document semantic range ladder", async () => {
    const ctx = createMockContext(cursorInfo());
    const position = doc.positionAt(titleStart + 2);

    const result = await handleSelectionRanges(ctx as never, {
      textDocument: { uri },
      positions: [position],
    });

    expect(ctx.semanticRuntime.templateCursorInfo).toHaveBeenCalledWith(
      doc,
      position,
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]?.range).toEqual(range(titleStart, titleEnd));
    expect(result?.[0]?.parent?.range).toEqual(range(attributeStart, attributeEnd));
    expect(result?.[0]?.parent?.parent?.range).toEqual(range(elementStart, elementEnd));
    expect(result?.[0]?.parent?.parent?.parent?.range).toEqual(range(0, text.length));
  });

  test("returns null when runtime has no source-backed active-document span", async () => {
    const ctx = createMockContext(cursorInfo({
      template: { compilationLane: "app-runtime", source: null },
      html: {
        nodeKind: null,
        tagName: null,
        attributeName: null,
        attributeValue: null,
        source: null,
        attributeSource: null,
      },
      valueSite: null,
      selectedMemberName: null,
      memberOwnerType: null,
    }));

    const result = await handleSelectionRanges(ctx as never, {
      textDocument: { uri },
      positions: [doc.positionAt(titleStart + 2)],
    });

    expect(result).toBeNull();
  });
});
