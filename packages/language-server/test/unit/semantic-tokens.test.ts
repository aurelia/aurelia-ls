import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { NOOP_TRACE } from "@aurelia-ls/compiler";
import { handleSemanticTokensFull, SEMANTIC_TOKENS_LEGEND } from "../../src/handlers/semantic-tokens.js";
import type { ServerContext } from "../../src/context.js";

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
});
