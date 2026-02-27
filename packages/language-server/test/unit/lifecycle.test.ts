import { describe, test, expect, vi } from "vitest";
import { refreshDocument, registerLifecycleHandlers } from "@aurelia-ls/language-server/api";

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    connection: {
      sendDiagnostics: vi.fn(),
      sendNotification: vi.fn(),
    },
    workspace: {
      open: vi.fn(),
      update: vi.fn(),
      close: vi.fn(),
      diagnostics: vi.fn(() => ({ bySurface: new Map(), suppressed: [] })),
      getOverlay: vi.fn(() => null),
      getCompilation: vi.fn(() => null),
    },
    lookupText: vi.fn(() => null),
    ...overrides,
  };
}

function createMockDoc(uri = "file:///app/src/my-app.html") {
  return {
    uri,
    getText: vi.fn(() => "<template></template>"),
    version: 1,
  };
}

describe("refreshDocument", () => {
  // Pattern AP: compilation error → previous diagnostics preserved
  test("does not send empty diagnostics when workspace throws (Pattern AP)", async () => {
    const ctx = createMockContext();
    const doc = createMockDoc();

    // First call succeeds — diagnostics sent
    await refreshDocument(ctx as never, doc as never, "open");
    expect(ctx.connection.sendDiagnostics).toHaveBeenCalledTimes(1);

    // Second call: workspace.diagnostics throws
    ctx.connection.sendDiagnostics.mockClear();
    ctx.workspace.diagnostics.mockImplementation(() => {
      throw new Error("compilation failed");
    });

    await refreshDocument(ctx as never, doc as never, "change");

    // sendDiagnostics must NOT have been called — previous diagnostics survive
    expect(ctx.connection.sendDiagnostics).not.toHaveBeenCalled();
    // Error was logged
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("refreshDocument failed"),
    );
  });

  // Pattern AR: successful refresh sends diagnostics
  test("sends diagnostics on successful refresh (Pattern AR)", async () => {
    const ctx = createMockContext();
    const doc = createMockDoc();

    await refreshDocument(ctx as never, doc as never, "open");

    expect(ctx.connection.sendDiagnostics).toHaveBeenCalledTimes(1);
    expect(ctx.connection.sendDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ uri: doc.uri }),
    );
  });
});

describe("registerLifecycleHandlers — onDidClose", () => {
  // Pattern AQ: document close still clears diagnostics
  test("sends empty diagnostics when document is closed (Pattern AQ)", () => {
    let closeHandler: ((e: { document: { uri: string } }) => void) | undefined;
    const documents = {
      onDidOpen: vi.fn(),
      onDidChangeContent: vi.fn(),
      onDidClose: vi.fn((fn: (e: { document: { uri: string } }) => void) => {
        closeHandler = fn;
      }),
    };
    const connection = {
      onInitialize: vi.fn(),
      onDidChangeConfiguration: vi.fn(),
      onDidChangeWatchedFiles: vi.fn(),
      sendDiagnostics: vi.fn(),
      sendNotification: vi.fn(),
    };
    const ctx = createMockContext({ documents, connection });

    registerLifecycleHandlers(ctx as never);
    expect(closeHandler).toBeDefined();

    const docUri = "file:///app/src/my-app.html";
    closeHandler!({ document: { uri: docUri } });

    expect(connection.sendDiagnostics).toHaveBeenCalledWith({
      uri: docUri,
      diagnostics: [],
    });
  });
});
