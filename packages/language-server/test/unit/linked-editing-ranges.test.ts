import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleLinkedEditingRange } from "../../src/handlers/linked-editing-ranges.js";
import { createTestOperation } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const documentUris = testWorkspaceDocumentUris("/app");
const uri = documentUris.uriForWorkspaceRelativePath("src/app.html")!;
const text =
  '<template><my-card value.bind="title"></my-card><input /></template>';
const doc = TextDocument.create(uri, "html", 1, text);

const elementStart = text.indexOf("<my-card");
const elementEnd = text.indexOf("</my-card>") + "</my-card>".length;
const openTagStart = elementStart + 1;
const openTagEnd = openTagStart + "my-card".length;
const closeTagStart = text.indexOf("</my-card>") + 2;
const closeTagEnd = closeTagStart + "my-card".length;

const inputStart = text.indexOf("<input");
const inputEnd = text.indexOf("/>", inputStart) + 2;

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
  const templateCursorInfo = vi.fn(() =>
    Promise.resolve({
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "mock",
      value,
      page: null,
    }),
  );
  const operation = createTestOperation({
    documents: { ensureProgramDocument: () => doc },
    templateCursorInfo,
  });
  return {
    workspaceRoot: documentUris.workspaceRoot,
    documentUris,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    operation,
    templateCursorInfo,
  };
}

function cursorInfo(
  input: {
    tagName?: string | null;
    sourceStart?: number;
    sourceEnd?: number;
  } = {},
) {
  return {
    displayText: "mock",
    siteKind: "html",
    expressionFrontier: null,
    missingInputs: [],
    template: {
      compilationLane: "app-runtime",
      source: source(0, text.length),
    },
    activeSource: source(openTagStart, openTagEnd),
    html: {
      nodeKind: "element",
      tagName: input.tagName ?? "my-card",
      attributeName: null,
      attributeValue: null,
      source: source(
        input.sourceStart ?? elementStart,
        input.sourceEnd ?? elementEnd,
      ),
      attributeSource: null,
      tagNameSource:
        input.tagName === "input"
          ? source(inputStart + 1, inputStart + 6)
          : source(openTagStart, openTagEnd),
      closingTagNameSource:
        input.tagName === "input" ? null : source(closeTagStart, closeTagEnd),
    },
    valueSite: null,
    selectedDefinition: null,
    selectedBindable: null,
    selectedMemberName: null,
    selectedMember: null,
    memberOwnerType: null,
    diagnostics: [],
  };
}

function range(start: number, end: number) {
  return {
    start: doc.positionAt(start),
    end: doc.positionAt(end),
  };
}

describe("runtime-backed linked editing ranges", () => {
  test("links authored opening and closing tag names when cursor is on the tag", async () => {
    const ctx = createMockContext(cursorInfo());
    const position = doc.positionAt(openTagStart + 2);

    const result = await handleLinkedEditingRange(
      ctx as never,
      {
        textDocument: { uri },
        position,
      },
      ctx.operation,
    );

    expect(ctx.templateCursorInfo).toHaveBeenCalledWith(
      doc.uri,
      position,
    );
    expect(result).toEqual({
      ranges: [
        range(openTagStart, openTagEnd),
        range(closeTagStart, closeTagEnd),
      ],
      wordPattern: "[-_A-Za-z0-9]+",
    });
  });

  test("returns null away from the paired tag name", async () => {
    const ctx = createMockContext(cursorInfo());

    const result = await handleLinkedEditingRange(
      ctx as never,
      {
        textDocument: { uri },
        position: doc.positionAt(text.indexOf("value.bind")),
      },
      ctx.operation,
    );

    expect(result).toBeNull();
  });

  test("returns null for self-closing elements without an authored close tag", async () => {
    const ctx = createMockContext(
      cursorInfo({
        tagName: "input",
        sourceStart: inputStart,
        sourceEnd: inputEnd,
      }),
    );

    const result = await handleLinkedEditingRange(
      ctx as never,
      {
        textDocument: { uri },
        position: doc.positionAt(inputStart + 2),
      },
      ctx.operation,
    );

    expect(result).toBeNull();
  });
});
