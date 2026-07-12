import { describe, test, expect, vi } from "vitest";
import {
  refreshAllOpenDocuments,
  refreshDocument,
  registerLifecycleHandlers,
  SemanticRuntimeLspRequestAbortedError,
} from "@aurelia-ls/language-server/api";

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
      get: vi.fn(() => null),
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

  test("re-enters the current generation after a stale diagnostics request", async () => {
    const first = createGeneration(1);
    const second = createGeneration(2);
    const doc = createMockDoc();
    let generation = first;
    const ctx = createMockContext({
      documents: {
        get: vi.fn(() => doc),
        all: vi.fn(() => [doc]),
      },
      semanticRuntime: {
        recordProjectTopologyChanged: vi.fn(() => second),
        recordSourceTextChanged: vi.fn(async () => first),
        currentGeneration: vi.fn(() => generation),
        requestGuard: vi.fn(() => ({ generation, isCancellationRequested: null })),
        isCurrentGeneration: vi.fn((candidate) => candidate.sourceGeneration === generation.sourceGeneration),
        appDiagnostics: vi.fn(async () => {
          if (generation === first) {
            generation = second;
            throw new SemanticRuntimeLspRequestAbortedError("stale");
          }
          return { value: { rows: [] } };
        }),
      },
    });

    await refreshDocument(ctx as never, doc as never, "open", { sourceChanged: false });

    expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledTimes(2);
    expect(ctx.connection.sendDiagnostics).toHaveBeenCalledTimes(1);
  });
});

describe("refreshAllOpenDocuments", () => {
  test("marks source text changed once for a multi-document refresh wave", async () => {
    const first = createMockDoc("file:///app/src/one.html");
    const second = createMockDoc("file:///app/src/two.html");
    const ctx = createMockContext({
      documents: {
        get: vi.fn((uri: string) => uri === first.uri ? first : uri === second.uri ? second : null),
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

describe("registerLifecycleHandlers — onDidChangeWatchedFiles", () => {
  test("records source changes and refreshes open documents for closed analyzed source edits", async () => {
    let watchedHandler: ((e: { changes: Array<{ uri: string; type: number }> }) => void) | undefined;
    const openDoc = createMockDoc("file:///app/src/my-app.html");
    const documents = {
      get: vi.fn(() => openDoc),
      all: vi.fn(() => [openDoc]),
      onDidOpen: vi.fn(),
      onDidChangeContent: vi.fn(),
      onDidClose: vi.fn(),
    };
    const connection = {
      onInitialize: vi.fn(),
      onDidChangeConfiguration: vi.fn(),
      onDidChangeWatchedFiles: vi.fn((fn: (e: { changes: Array<{ uri: string; type: number }> }) => void) => {
        watchedHandler = fn;
      }),
      sendDiagnostics: vi.fn(),
      sendNotification: vi.fn(),
      sendRequest: vi.fn(async () => undefined),
    };
    const ctx = createMockContext({ documents, connection });

    registerLifecycleHandlers(ctx as never);
    expect(watchedHandler).toBeDefined();

    watchedHandler!({ changes: [{ uri: "file:///app/src/attributes/display-hint.ts", type: 2 }] });
    await settleAsyncWork();

    expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
    expect(ctx.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
    expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledWith(openDoc, expect.anything());
    expect(connection.sendNotification).toHaveBeenCalledWith(
      "aurelia/workspaceChanged",
      expect.objectContaining({
        domains: ["resources", "types", "diagnostics", "templates"],
        reason: "watched files",
      }),
    );
  });
});

describe("registerLifecycleHandlers — onDidChangeContent", () => {
  test("does not consume the onDidChangeContent echo emitted for onDidOpen", async () => {
    let openHandler: ((e: { document: ReturnType<typeof createMockDoc> }) => void) | undefined;
    let changeHandler: ((e: { document: ReturnType<typeof createMockDoc> }) => void) | undefined;
    const documents = {
      get: vi.fn(() => null),
      all: vi.fn(() => []),
      onDidOpen: vi.fn((fn: (e: { document: ReturnType<typeof createMockDoc> }) => void) => {
        openHandler = fn;
      }),
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
    openHandler!({ document: doc });
    changeHandler!({ document: doc });
    await settleAsyncWork();

    expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
    expect(ctx.logger.log).not.toHaveBeenCalledWith(expect.stringContaining("didChange"));
  });

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

  test("refreshes all open documents after a script source edit debounce", async () => {
    vi.useFakeTimers();
    try {
      let changeHandler: ((e: { document: ReturnType<typeof createMockDoc> }) => void) | undefined;
      const scriptDoc = createMockDoc("file:///app/src/attributes/display-hint.ts");
      const htmlDoc = createMockDoc("file:///app/src/my-app.html");
      const documents = {
        get: vi.fn((uri: string) => uri === scriptDoc.uri ? scriptDoc : htmlDoc),
        all: vi.fn(() => [htmlDoc, scriptDoc]),
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

      registerLifecycleHandlers(ctx as never);
      expect(changeHandler).toBeDefined();

      changeHandler!({ document: scriptDoc });

      expect(ctx.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledWith(htmlDoc, expect.anything());
      expect(ctx.semanticRuntime.appDiagnostics).toHaveBeenCalledWith(scriptDoc, expect.anything());
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

async function settleAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
