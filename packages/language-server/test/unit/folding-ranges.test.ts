import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleFoldingRanges } from "@aurelia-ls/language-server/api";
import type { SemanticTemplateFoldingRangeRow } from "@aurelia-ls/semantic-runtime";

const uri = "file:///app/src/app.html";
const text = [
  "<template>",
  "  <section>",
  "    <div>One</div>",
  "  </section>",
  "  <input value.bind=\"title\">",
  "</template>",
].join("\n");
const doc = TextDocument.create(uri, "html", 1, text);

const sectionStart = text.indexOf("<section>");
const sectionEnd = text.indexOf("</section>") + "</section>".length;
const inputStart = text.indexOf("<input");
const inputEnd = text.indexOf(">", inputStart) + 1;

function source(start: number, end: number, path = uri) {
  return {
    kind: "source-span-address",
    label: `src/app.html@${start}..${end}`,
    path,
    start,
    end,
    role: "range",
  };
}

function row(
  start: number,
  end: number,
  tagName: string,
  path = uri,
): SemanticTemplateFoldingRangeRow {
  return {
    foldKind: "element",
    definitionName: "my-app",
    tagName,
    childCount: 1,
    selfClosing: false,
    source: source(start, end, path),
  };
}

function createMockContext(rows: SemanticTemplateFoldingRangeRow[]) {
  return {
    workspaceRoot: "/app",
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => doc),
    semanticRuntime: {
      templateFoldingRanges: vi.fn(() => Promise.resolve({
        schemaVersion: "0.1",
        outcome: "hit",
        closure: "complete",
        summary: "mock",
        value: {
          displayText: "mock",
          rows,
        },
        page: null,
      })),
    },
  };
}

describe("runtime-backed folding ranges", () => {
  test("maps multiline template folding rows to LSP folding ranges", async () => {
    const rows = [
      row(sectionStart, sectionEnd, "section"),
      row(inputStart, inputEnd, "input"),
    ];
    const ctx = createMockContext(rows);

    const result = await handleFoldingRanges(ctx as never, {
      textDocument: { uri },
    });

    expect(ctx.semanticRuntime.templateFoldingRanges).toHaveBeenCalledWith(doc);
    expect(result).toEqual([
      {
        startLine: doc.positionAt(sectionStart).line,
        startCharacter: doc.positionAt(sectionStart).character,
        endLine: doc.positionAt(sectionEnd).line,
        endCharacter: doc.positionAt(sectionEnd).character,
      },
    ]);
  });

  test("returns null when runtime rows do not belong to the active document", async () => {
    const ctx = createMockContext([
      row(sectionStart, sectionEnd, "section", "file:///app/src/other.html"),
    ]);

    const result = await handleFoldingRanges(ctx as never, {
      textDocument: { uri },
    });

    expect(result).toBeNull();
  });
});
