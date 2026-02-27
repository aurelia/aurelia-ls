import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { NOOP_TRACE } from "@aurelia-ls/compiler/shared/trace.js";
import {
  handleSemanticTokensFull,
  SEMANTIC_TOKENS_LEGEND,
  type ServerContext,
} from "@aurelia-ls/language-server/api";
import { WORKSPACE_TOKEN_MODIFIER_GAP_AWARE, WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE } from "@aurelia-ls/semantic-workspace/types.js";
type WorkspaceToken = {
  type: string;
  span: { start: number; end: number };
  modifiers?: readonly string[];
};

function createContext(text: string, tokens: WorkspaceToken[]): ServerContext {
  const uri = "file:///test.html";
  const doc = TextDocument.create(uri, "html", 1, text);

  const workspace = {
    lookupText: () => text,
    query: () => ({ semanticTokens: () => tokens }),
  };

  return {
    trace: NOOP_TRACE,
    logger: {
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    ensureProgramDocument: () => doc,
    workspace,
  } as unknown as ServerContext;
}

describe("semantic tokens handler", () => {
  it("exposes aurelia token types in the legend", () => {
    expect(SEMANTIC_TOKENS_LEGEND.tokenTypes).toContain("aureliaElement");
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toContain("declaration");
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toContain(WORKSPACE_TOKEN_MODIFIER_GAP_AWARE);
    expect(SEMANTIC_TOKENS_LEGEND.tokenModifiers).toContain(WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE);
  });

  it("encodes workspace tokens into LSP delta format", () => {
    const text = "<nav-bar></nav-bar>";
    const tokens: WorkspaceToken[] = [
      { type: "aureliaElement", span: { start: 1, end: 8 } },
      { type: "aureliaElement", span: { start: 11, end: 18 } },
    ];

    const ctx = createContext(text, tokens);
    const result = handleSemanticTokensFull(ctx, { textDocument: { uri: "file:///test.html" } });

    expect(result?.data).toEqual([
      0, 1, 7, 0, 0,
      0, 10, 7, 0, 0,
    ]);
  });

  it("encodes gap-aware modifiers using legend bitmasks", () => {
    const text = "<div repeat.for=\"item of items\"></div>";
    const tokens: WorkspaceToken[] = [
      {
        type: "aureliaController",
        span: { start: 5, end: 11 },
        modifiers: [
          WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
          WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
        ],
      },
    ];

    const ctx = createContext(text, tokens);
    const result = handleSemanticTokensFull(ctx, { textDocument: { uri: "file:///test.html" } });

    // type index 3 = aureliaController; modifier bits 5+6 => 32 + 64 = 96
    expect(result?.data).toEqual([0, 5, 6, 3, 96]);
  });
});
