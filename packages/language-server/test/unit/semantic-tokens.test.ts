import type { SemanticTemplateSemanticTokenRow } from "@aurelia-ls/semantic-runtime";
import { describe, expect, it } from "vitest";
import { LSPErrorCodes } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { ServerContext } from "../../src/context.js";
import {
  handleSemanticTokensFull,
  SEMANTIC_TOKENS_LEGEND,
  WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
  WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
} from "../../src/handlers/semantic-tokens.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";
import { createTestOperation } from "./test-request-guard.js";

const documentUris = testWorkspaceDocumentUris("/app");
const templateUri = documentUris.uriForWorkspaceRelativePath("src/test.html")!;
const otherTemplateUri = documentUris.uriForWorkspaceRelativePath("src/other.html")!;

interface AnswerEnvelopeOverrides {
  readonly result?: string;
  readonly selection?: string;
  readonly coverage?: string;
}

function createContext(
  text: string,
  tokens: readonly SemanticTemplateSemanticTokenRow[],
  envelope: AnswerEnvelopeOverrides = {},
) {
  const doc = TextDocument.create(templateUri, "html", 1, text);

  const operation = createTestOperation({
    documents: { ensureProgramDocument: () => doc },
    templateSemanticTokens: async () => ({
      schemaVersion: "0.2",
      result: envelope.result ?? "answered",
      selection: envelope.selection ?? "not-applicable",
      coverage: envelope.coverage ?? "complete",
      summary: `${tokens.length} test semantic token row(s).`,
      value: {
        displayText: `${tokens.length} test token(s).`,
        rows: tokens,
      },
      page: null,
    }),
  });

  const ctx = {
    documentUris,
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
    const result = await handleSemanticTokensFull(ctx, { textDocument: { uri: templateUri } }, operation);

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
    const result = await handleSemanticTokensFull(ctx, { textDocument: { uri: templateUri } }, operation);

    // type index 3 = aureliaController; modifier bits 5+6 => 32 + 64 = 96
    expect(result?.data).toEqual([0, 5, 6, 3, 96]);
  });

  it.each([
    ["failed result", { result: "failed" }],
    ["applicable selection", { selection: "exact" }],
    ["open coverage", { coverage: "open" }],
  ])("rejects a %s before reading even an empty row payload", async (_case, envelope) => {
    await expectTokensToReject(
      "",
      [],
      "semantic runtime returned",
      envelope,
    );
  });

  it("fails loudly for token vocabulary outside the advertised legend", async () => {
    const unknownType = token("notInLegend", [], 0, 1);
    const unknownModifier = token("aureliaElement", ["notInLegend"], 0, 1);

    await expectTokensToReject("x", [unknownType], "unknown token type");
    await expectTokensToReject("x", [unknownModifier], "unknown token modifier");
  });

  it("fails loudly for missing, broad, invalid, empty, and multiline token ranges", async () => {
    await expectTokensToReject("abc", [{
      ...token("aureliaElement", [], 0, 1),
      source: null,
    }], "no exact authored source range");
    await expectTokensToReject("abc", [{
      ...token("aureliaElement", [], 0, 1),
      source: { kind: "source-file-address", label: templateUri, path: templateUri },
    } as SemanticTemplateSemanticTokenRow], "no exact authored source range");
    await expectTokensToReject("abc", [token("aureliaElement", [], -1, 1)], "valid for the current document");
    await expectTokensToReject("abc", [token("aureliaElement", [], 1, 1)], "non-positive source range");
    await expectTokensToReject("a\nb", [token("aureliaElement", [], 0, 3)], "spans multiple lines");
  });

  it("fails loudly when a token source targets another document", async () => {
    await expectTokensToReject("abc", [{
      ...token("aureliaElement", [], 0, 1),
      source: source(0, 1, otherTemplateUri),
    }], "requesting document");
  });

  it("fails loudly for overlapping tokens after source-order normalization", async () => {
    await expectTokensToReject("abcdef", [
      token("property", [], 2, 5),
      token("aureliaExpression", [], 0, 3),
    ], "ranges overlap");
  });

  it("retains adjacent single-line tokens", async () => {
    const { ctx, operation } = createContext("abcdef", [
      token("aureliaExpression", [], 0, 3),
      token("property", [], 3, 6),
    ]);

    await expect(handleSemanticTokensFull(
      ctx,
      { textDocument: { uri: templateUri } },
      operation,
    )).resolves.toEqual({
      data: [
        0, 0, 3, 11, 0,
        0, 3, 3, 13, 0,
      ],
    });
  });
});

function token(
  tokenType: string,
  tokenModifiers: readonly string[],
  start: number,
  end: number,
): SemanticTemplateSemanticTokenRow {
  return {
    tokenType,
    tokenModifiers,
    definitionName: "test",
    source: source(start, end),
  } as SemanticTemplateSemanticTokenRow;
}

async function expectTokensToReject(
  text: string,
  tokens: readonly SemanticTemplateSemanticTokenRow[],
  message: string,
  envelope: AnswerEnvelopeOverrides = {},
): Promise<void> {
  const { ctx, operation } = createContext(text, tokens, envelope);
  await expect(handleSemanticTokensFull(
    ctx,
    { textDocument: { uri: templateUri } },
    operation,
  )).rejects.toMatchObject({
    code: LSPErrorCodes.RequestFailed,
    message: expect.stringContaining(message),
  });
}

function source(
  start: number,
  end: number,
  path = templateUri,
): SemanticTemplateSemanticTokenRow["source"] {
  return {
    kind: "source-span-address",
    label: `${path}@${start}..${end}`,
    path,
    start,
    end,
  };
}
