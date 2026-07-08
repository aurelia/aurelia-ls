import { describe, test, expect, vi } from "vitest";
import { refreshAllOpenDocuments, refreshDocument, registerLifecycleHandlers } from "@aurelia-ls/language-server/api";

function createGeneration(sourceGeneration = 0) {
  return {
    workspaceGeneration: 0,
    sourceGeneration,
    fingerprint: `semantic-runtime:test:source-${sourceGeneration}`,
  };
}

function createMockContext(overrides: Record<string, unknown> = {}) {
  let generation = createGeneration();
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    connection: {
      sendDiagnostics: vi.fn(),
      sendNotification: vi.fn(),
      sendRequest: vi.fn(async () => undefined),
    },
    documents: {
      all: vi.fn(() => []),
    },
    workspace: {
      open: vi.fn(),
      update: vi.fn(),
      close: vi.fn(),
      diagnostics: vi.fn(() => ({ bySurface: new Map(), suppressed: [] })),
      getCompilation: vi.fn(() => null),
    },
    semanticRuntime: {
      recordProjectTopologyChanged: vi.fn(() => {
        generation = createGeneration(generation.sourceGeneration + 1);
        return generation;
      }),
      recordSourceTextChanged: vi.fn(async () => {
        generation = createGeneration(generation.sourceGeneration + 1);
        return generation;
      }),
      currentGeneration: vi.fn(() => generation),
      requestGuard: vi.fn(() => ({ generation, isCancellationRequested: null })),
      isCurrentGeneration: vi.fn((candidate) =>
        candidate.workspaceGeneration === generation.workspaceGeneration
        && candidate.sourceGeneration === generation.sourceGeneration
      ),
      appDiagnostics: vi.fn(async () => ({ value: { rows: [] } })),
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
  // Pattern AP: diagnostic analysis error → previous diagnostics preserved
  test("does not send empty diagnostics when runtime diagnostics throws (Pattern AP)", async () => {
    const ctx = createMockContext();
    const doc = createMockDoc();

    // First call succeeds — diagnostics sent
    await refreshDocument(ctx as never, doc as never, "open");
    expect(ctx.connection.sendDiagnostics).toHaveBeenCalledTimes(1);

    // Second call: semantic-runtime diagnostics throws
    ctx.connection.sendDiagnostics.mockClear();
    ctx.semanticRuntime.appDiagnostics.mockImplementation(() => {
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

  test("records one source generation for a direct document refresh", async () => {
    const ctx = createMockContext();
    const doc = createMockDoc();

    await refreshDocument(ctx as never, doc as never, "change");

    expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
    expect(ctx.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
  });

  test("does not publish diagnostics from a stale refresh generation", async () => {
    const first = createGeneration(1);
    const second = createGeneration(2);
    const ctx = createMockContext({
      semanticRuntime: {
        recordProjectTopologyChanged: vi.fn(() => second),
        recordSourceTextChanged: vi.fn(async () => first),
        currentGeneration: vi.fn(() => second),
        requestGuard: vi.fn(() => ({ generation: first, isCancellationRequested: null })),
        isCurrentGeneration: vi.fn((candidate) => candidate.sourceGeneration === second.sourceGeneration),
        appDiagnostics: vi.fn(async () => ({ value: { rows: [] } })),
      },
    });
    const doc = createMockDoc();

    await refreshDocument(ctx as never, doc as never, "change");

    expect(ctx.connection.sendDiagnostics).not.toHaveBeenCalled();
    expect(ctx.logger.log).toHaveBeenCalledWith(
      expect.stringContaining("skipped stale diagnostics"),
    );
  });
});

describe("refreshAllOpenDocuments", () => {
  test("marks source text changed once for a multi-document refresh wave", async () => {
    const first = createMockDoc("file:///app/src/one.html");
    const second = createMockDoc("file:///app/src/two.html");
    const ctx = createMockContext({
      documents: {
        all: vi.fn(() => [first, second]),
      },
    });

    await refreshAllOpenDocuments(ctx as never, "change", { sourceChanged: true });

    expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
    expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledTimes(2);
    expect(ctx.connection.sendDiagnostics).toHaveBeenCalledTimes(2);
    expect(ctx.connection.sendNotification).toHaveBeenCalledWith(
      "aurelia/workspaceChanged",
      expect.objectContaining({
        domains: ["diagnostics", "templates"],
        reason: "change",
      }),
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
      sendRequest: vi.fn(async () => undefined),
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
    expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
  });
});

describe("registerLifecycleHandlers — onDidChangeContent", () => {
  test("records source text changes immediately before the diagnostic debounce fires", () => {
    vi.useFakeTimers();
    try {
      let changeHandler: ((e: { document: ReturnType<typeof createMockDoc> }) => void) | undefined;
      const documents = {
        onDidOpen: vi.fn(),
        onDidChangeContent: vi.fn((fn: (e: { document: ReturnType<typeof createMockDoc> }) => void) => {
          changeHandler = fn;
        }),
        onDidClose: vi.fn(),
      };
      const connection = {
        onInitialize: vi.fn(),
        onDidChangeConfiguration: vi.fn(),
        onDidChangeWatchedFiles: vi.fn(),
        sendDiagnostics: vi.fn(),
        sendNotification: vi.fn(),
        sendRequest: vi.fn(async () => undefined),
      };
      const ctx = createMockContext({ documents, connection });
      const doc = createMockDoc();

      registerLifecycleHandlers(ctx as never);
      expect(changeHandler).toBeDefined();

      changeHandler!({ document: doc });

      expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
      expect(ctx.semanticRuntime.appDiagnostics).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
