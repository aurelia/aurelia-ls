import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleSemanticTokensFull,
  SEMANTIC_TOKENS_LEGEND,
  WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
  WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
} from "../../src/handlers/semantic-tokens.js";
import type { ServerContext } from "../../src/context.js";
import type { SemanticTemplateSemanticTokenRow } from "@aurelia-ls/semantic-runtime";
import { createTestOperation } from "./test-request-guard.js";

function createContext(text: string, tokens: SemanticTemplateSemanticTokenRow[]) {
  const uri = "file:///test.html";
  const doc = TextDocument.create(uri, "html", 1, text);

  const operation = createTestOperation({
    documents: { ensureProgramDocument: () => doc },
    templateSemanticTokens: async () => ({
      value: {
        displayText: `${tokens.length} test token(s).`,
        rows: tokens,
      },
    }),
  });

  const ctx = {
    trace: {
      span: (_name: string, run: () => unknown) => run(),
      spanAsync: (_name: string, run: () => Promise<unknown>) => run(),
      event: () => {},
      setAttribute: () => {},
      setAttributes: () => {},
      startSpan: (name: string) => ({ name, attributes: new Map(), duration: null }),
      currentSpan: () => undefined,
      rootSpan: () => ({ name: "root", attributes: new Map(), duration: null }),
      flush: async () => {},
    },
    logger: {
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  } as unknown as ServerContext;
  return { ctx, operation };
}

describe("semantic tokens handler", () => {
  it("exposes aurelia token types in the legend", () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toContain("aureliaElement");
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toContain("declaration");
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toContain(WORKSPACE_TOKEN_MODIFIER_GAP_AWARE);
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toContain(WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE);
  });

  it("encodes semantic-runtime tokens into LSP delta format", async () => {
    const text = "<nav-bar></nav-bar>";
    const tokens: SemanticTemplateSemanticTokenRow[] = [
      { tokenType: "aureliaElement", tokenModifiers: [], definitionName: "nav-bar", source: source(1, 8) },
      { tokenType: "aureliaElement", tokenModifiers: [], definitionName: "nav-bar", source: source(11, 18) },
    ];

    const { ctx, operation } = createContext(text, tokens);
    const result = await handleSemanticTokensFull(ctx, { textDocument: { uri: "file:///test.html" } }, operation);

    expect(result?.data).toEqual([
      0, 1, 7, 0, 0,
      0, 10, 7, 0, 0,
    ]);
  });

  it("encodes gap-aware modifiers using legend bitmasks", async () => {
    const text = "<div repeat.for=\"item of items\"></div>";
    const tokens: SemanticTemplateSemanticTokenRow[] = [
      {
        tokenType: "aureliaController",
        tokenModifiers: [
          WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
          WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
        ],
        definitionName: "app",
        source: source(5, 11),
      },
    ];

    const { ctx, operation } = createContext(text, tokens);
    const result = await handleSemanticTokensFull(ctx, { textDocument: { uri: "file:///test.html" } }, operation);

    // type index 3 = aureliaController; modifier bits 5+6 => 32 + 64 = 96
    expect(result?.data).toEqual([0, 5, 6, 3, 96]);
  });
});

function source(start: number, end: number): SemanticTemplateSemanticTokenRow["source"] {
  return {
    kind: "source-span-address",
    label: `test.html@${start}..${end}`,
    path: "test.html",
    start,
    end,
  };
}
