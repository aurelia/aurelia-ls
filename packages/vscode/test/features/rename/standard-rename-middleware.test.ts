import { describe, expect, test, vi } from "vitest";
import { createMiddleware } from "../../../out/client-middleware.js";

class StubUri {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

type StubDocument = {
  languageId: string;
  uri: StubUri;
  version: number;
};

function createHarness(options: {
  languageId?: string;
  openDocumentVersion?: number;
  editVersion?: number;
  workspaceEdit?: unknown;
} = {}) {
  const uri = "file:///app.html";
  const document: StubDocument = {
    languageId: options.languageId ?? "html",
    uri: new StubUri(uri),
    version: options.openDocumentVersion ?? 4,
  };
  const protocolWorkspaceEdit = options.workspaceEdit ?? {
    documentChanges: [
      {
        textDocument: { uri, version: options.editVersion ?? document.version },
        edits: [],
      },
    ],
  };
  const convertedWorkspaceEdit = { converted: true };
  const rawClient = {
    sendRequest: vi.fn(async () => protocolWorkspaceEdit),
    code2ProtocolConverter: {
      asTextDocumentIdentifier: vi.fn((doc: StubDocument) => ({ uri: doc.uri.toString() })),
      asPosition: vi.fn((position: unknown) => position),
    },
    protocol2CodeConverter: {
      asWorkspaceEdit: vi.fn(async () => convertedWorkspaceEdit),
    },
  };
  const vscode = {
    Uri: {
      parse: (value: string) => new StubUri(value),
    },
    workspace: {
      textDocuments: [document],
    },
  };
  const middleware = createMiddleware(
    vscode as never,
    { warn: vi.fn() } as never,
    { enabled: false },
    { enabled: false, onSemanticTokens: null },
    { client: rawClient, inlayHintsEnabled: true } as never,
  );
  return { document, middleware, rawClient, convertedWorkspaceEdit };
}

describe("standard rename middleware", () => {
  test("validates protocol document versions before converting an HTML rename edit", async () => {
    const harness = createHarness();
    const token = { isCancellationRequested: false };
    const next = vi.fn();

    const result = await harness.middleware.provideRenameEdits?.(
      harness.document as never,
      { line: 1, character: 7 } as never,
      "item2",
      token as never,
      next,
    );

    expect(result).toBe(harness.convertedWorkspaceEdit);
    expect(next).not.toHaveBeenCalled();
    expect(harness.rawClient.sendRequest).toHaveBeenCalledWith(
      "textDocument/rename",
      {
        textDocument: { uri: "file:///app.html" },
        position: { line: 1, character: 7 },
        newName: "item2",
      },
      token,
    );
    expect(harness.rawClient.protocol2CodeConverter.asWorkspaceEdit).toHaveBeenCalled();
  });

  test("blocks an HTML rename when the server edit targets a stale open document version", async () => {
    const harness = createHarness({ openDocumentVersion: 5, editVersion: 4 });

    await expect(harness.middleware.provideRenameEdits?.(
      harness.document as never,
      { line: 1, character: 7 } as never,
      "item2",
      {} as never,
      vi.fn(),
    )).rejects.toThrow("editor documents changed");

    expect(harness.rawClient.protocol2CodeConverter.asWorkspaceEdit).not.toHaveBeenCalled();
  });

  test("delegates non-HTML rename requests to the language client", async () => {
    const harness = createHarness({ languageId: "typescript" });
    const delegated = { delegated: true };
    const next = vi.fn(async () => delegated);

    const result = await harness.middleware.provideRenameEdits?.(
      harness.document as never,
      { line: 1, character: 7 } as never,
      "item2",
      {} as never,
      next as never,
    );

    expect(result).toBe(delegated);
    expect(next).toHaveBeenCalled();
    expect(harness.rawClient.sendRequest).not.toHaveBeenCalled();
  });
});
