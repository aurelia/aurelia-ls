import { describe, test, expect, vi } from "vitest";
import { CompletionItemKind, ResponseError } from "vscode-languageserver/node.js";
import { asDocumentUri, canonicalDocumentUri } from "@aurelia-ls/compiler";
import {
  COMPLETION_GAP_MARKER_LABEL,
  handleCompletion,
  handleRename,
} from "@aurelia-ls/language-server/api";

const testUri = asDocumentUri("file:///app/src/my-app.html");
const testText = "<template>\n  <my-el></my-el>\n</template>";

function createMockContext(renameResult: unknown) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => ({
      uri: "file:///app/src/my-app.html",
      offsetAt: vi.fn(() => 0),
    })),
    workspace: {
      refactor: vi.fn(() => ({
        rename: vi.fn(() => renameResult),
      })),
    },
    lookupText: vi.fn((uri: string) => (uri === testUri ? testText : null)),
  };
}

function createMockCompletionContext(input: {
  completions: readonly Array<{
    label: string;
    kind?: string;
    detail?: string;
    confidence?: "exact" | "high" | "partial" | "low";
  }>;
  isIncomplete?: boolean;
}) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => ({
      uri: "file:///app/src/my-app.html",
      offsetAt: vi.fn(() => 0),
    })),
    workspace: {
      query: vi.fn(() => ({
        completions: vi.fn(() => ({ items: input.completions, isIncomplete: input.isIncomplete ?? false })),
      })),
    },
    lookupText: vi.fn(() => testText),
  };
}

describe("handleRename", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 5 },
    newName: "new-name",
  };

  // Pattern AK: rename error → ResponseError with workspace message
  test("throws ResponseError with workspace error message (Pattern AK)", () => {
    const ctx = createMockContext({
      error: {
        kind: "refactor-policy-denied",
        message: "rename denied by refactor policy (provenance-required).",
        retryable: false,
      },
    });

    expect(() => handleRename(ctx as never, params)).toThrow(ResponseError);
    try {
      handleRename(ctx as never, params);
    } catch (e) {
      expect(e).toBeInstanceOf(ResponseError);
      expect((e as ResponseError<unknown>).message).toBe(
        "rename denied by refactor policy (provenance-required).",
      );
    }
  });

  // Pattern AL: rename success → WorkspaceEdit returned
  test("returns mapped WorkspaceEdit on success (Pattern AL)", () => {
    const ctx = createMockContext({
      edit: {
        edits: [
          {
            uri: testUri,
            span: { start: 14, end: 19, file: canonicalDocumentUri(testUri).file },
            newText: "new-name",
          },
        ],
      },
    });

    const result = handleRename(ctx as never, params);
    expect(result).not.toBeNull();
    // The mapped edit contains changes keyed by URI
    const uris = Object.keys(result!.changes ?? {});
    expect(uris).toHaveLength(1);
    expect(result!.changes![uris[0]!]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ newText: "new-name" }),
      ]),
    );
  });
});

describe("handleCompletion", () => {
  const params = {
    textDocument: { uri: "file:///app/src/my-app.html" },
    position: { line: 0, character: 5 },
  };

  test("maps canonical completion kind ids and returns CompletionList", () => {
    const ctx = createMockCompletionContext({
      completions: [
        { label: "if", kind: "template-controller", detail: "Template Controller" },
      ],
    });

    const result = handleCompletion(ctx as never, params);
    expect(result.isIncomplete).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        label: "if",
        kind: CompletionItemKind.Struct,
        detail: "Template Controller",
      }),
    );
  });

  test("signals incomplete list and appends a gap marker when workspace reports scope gaps", () => {
    const ctx = createMockCompletionContext({
      completions: [
        { label: "summary-panel", kind: "custom-element", confidence: "partial" },
      ],
      isIncomplete: true,
    });

    const result = handleCompletion(ctx as never, params);
    expect(result.isIncomplete).toBe(true);
    expect(result.items.some((item) => item.label === "summary-panel")).toBe(true);
    const marker = result.items.find((item) => item.label === COMPLETION_GAP_MARKER_LABEL);
    expect(marker?.kind).toBe(CompletionItemKind.Text);
    expect(marker?.insertText).toBe("");
  });

  test("signals incomplete list when workspace isIncomplete is true regardless of item confidence", () => {
    const ctx = createMockCompletionContext({
      completions: [
        { label: "summary-panel", kind: "custom-element", confidence: "high" },
      ],
      isIncomplete: true,
    });

    const result = handleCompletion(ctx as never, params);
    expect(result.isIncomplete).toBe(true);
    const marker = result.items.find((item) => item.label === COMPLETION_GAP_MARKER_LABEL);
    expect(marker).toBeDefined();
    expect(marker?.insertText).toBe("");
  });

  test("returns empty CompletionList when document is unavailable", () => {
    const ctx = createMockCompletionContext({ completions: [] });
    ctx.ensureProgramDocument = vi.fn(() => null);
    const result = handleCompletion(ctx as never, params);
    expect(result).toEqual({ isIncomplete: false, items: [] });
  });
});
