import { describe, test, expect, vi } from "vitest";
import { ResponseError } from "vscode-languageserver/node.js";
import { asDocumentUri, canonicalDocumentUri } from "@aurelia-ls/compiler";
import { handleRename } from "../../src/handlers/features.js";

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
