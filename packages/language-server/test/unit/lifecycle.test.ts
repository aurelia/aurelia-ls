import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ErrorCodes,
  FileChangeType,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { describe, expect, test, vi } from "vitest";
import {
  handleInitialize,
  registerLifecycleHandlers,
  runServerOperation,
} from "../../src/handlers/lifecycle.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const workspaceRoot = path.resolve("test-workspace");
const workspaceUri = pathToFileURL(workspaceRoot).toString();

function workspaceFileUri(relativePath: string): string {
  return pathToFileURL(path.resolve(workspaceRoot, relativePath)).toString();
}

function createGeneration(sourceGeneration = 0, workspaceGeneration = 0) {
  return {
    workspaceGeneration,
    sourceGeneration,
    fingerprint: `semantic-runtime:test:workspace-${workspaceGeneration}:source-${sourceGeneration}`,
  };
}

type DocumentEvent = { document: TextDocument };
type WatchedFilesEvent = { changes: Array<{ uri: string; type: FileChangeType }> };

function createLifecycleHarness() {
  let generation = createGeneration();
  const openDocuments = new Map<string, TextDocument>();
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(workspaceUri);
  const handlers: {
    initialized?: () => void;
    shutdown?: () => Promise<void>;
    configuration?: () => void;
    watchedFiles?: (event: WatchedFilesEvent) => void;
    open?: (event: DocumentEvent) => void;
    change?: (event: DocumentEvent) => void;
    close?: (event: DocumentEvent) => void;
  } = {};

  const semanticRuntime = {
    configureWorkspace: vi.fn(),
    recordProjectTopologyChanged: vi.fn(() => {
      generation = createGeneration(generation.sourceGeneration + 1, generation.workspaceGeneration + 1);
      return generation;
    }),
    recordSourceTextChanged: vi.fn(() => {
      generation = createGeneration(generation.sourceGeneration + 1, generation.workspaceGeneration);
      return generation;
    }),
    currentGeneration: vi.fn(() => generation),
    dispose: vi.fn(async () => undefined),
  };
  const connection = {
    onInitialize: vi.fn(),
    onInitialized: vi.fn((handler: () => void) => { handlers.initialized = handler; }),
    onShutdown: vi.fn((handler: () => Promise<void>) => { handlers.shutdown = handler; }),
    onDidChangeConfiguration: vi.fn((handler: () => void) => { handlers.configuration = handler; }),
    onDidChangeWatchedFiles: vi.fn((handler: (event: WatchedFilesEvent) => void) => {
      handlers.watchedFiles = handler;
    }),
    sendNotification: vi.fn(async (_method: string, _params: unknown) => undefined),
    client: { register: vi.fn(async () => undefined) },
    languages: {
      diagnostics: { refresh: vi.fn(async () => undefined) },
      inlayHint: { refresh: vi.fn(async () => undefined) },
      semanticTokens: { refresh: vi.fn(async () => undefined) },
    },
  };
  const documents = {
    get: vi.fn((uri: string) => openDocuments.get(documentUris.key(uri)) ?? null),
    all: vi.fn(() => [...openDocuments.values()]),
    onDidOpen: vi.fn((handler: (event: DocumentEvent) => void) => { handlers.open = handler; }),
    onDidChangeContent: vi.fn((handler: (event: DocumentEvent) => void) => { handlers.change = handler; }),
    onDidClose: vi.fn((handler: (event: DocumentEvent) => void) => { handlers.close = handler; }),
  };
  const clientSupport = {
    configurationPull: false,
    configurationChangeRegistration: false,
    diagnosticRefresh: false,
    inlayHintRefresh: false,
    semanticTokensRefresh: false,
  };
  const logger = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const ctx = {
    connection,
    documents,
    documentUris,
    semanticRuntime,
    clientSupport,
    logger,
    clientSupportsCodeActionResolveEdit: false,
    get workspaceRoot() { return documentUris.workspaceRoot; },
    configureWorkspace: vi.fn((rootUri: string) => {
      documentUris.configure(rootUri);
      semanticRuntime.configureWorkspace();
    }),
    openDocument: (uri: string) => openDocuments.get(documentUris.key(uri)) ?? null,
    lookupText: vi.fn(() => null),
  };

  registerLifecycleHandlers(ctx as never);

  return {
    ctx,
    handlers,
    semanticRuntime,
    connection,
    clientSupport,
    emitOpen(document: TextDocument) {
      openDocuments.set(documentUris.key(document.uri), document);
      handlers.open?.({ document });
    },
    synchronize(document: TextDocument) {
      openDocuments.set(documentUris.key(document.uri), document);
      handlers.change?.({ document });
    },
    close(document: TextDocument) {
      openDocuments.delete(documentUris.key(document.uri));
      handlers.close?.({ document });
    },
    watch(changes: WatchedFilesEvent["changes"]) {
      handlers.watchedFiles?.({ changes });
    },
  };
}

function document(
  uri = workspaceFileUri("src/my-app.html"),
  version = 1,
  text = "<template></template>",
): TextDocument {
  const languageId = uri.endsWith(".html") ? "html" : "typescript";
  return TextDocument.create(uri, languageId, version, text);
}

describe("initialization", () => {
  test("resolves a workspace folder and records supported refresh capabilities", () => {
    const harness = createLifecycleHarness();
    const fallbackRootUri = pathToFileURL(path.resolve("workspace")).toString();

    const result = handleInitialize(harness.ctx as never, {
      rootUri: null,
      workspaceFolders: [{ uri: fallbackRootUri, name: "workspace" }],
      capabilities: {
        workspace: {
          configuration: true,
          didChangeConfiguration: { dynamicRegistration: true },
          diagnostics: { refreshSupport: true },
          inlayHint: { refreshSupport: true },
          semanticTokens: { refreshSupport: true },
        },
      },
    } as never);

    expect(harness.ctx.configureWorkspace).toHaveBeenCalledWith(fallbackRootUri);
    expect(harness.clientSupport).toEqual({
      configurationPull: true,
      configurationChangeRegistration: true,
      diagnosticRefresh: true,
      inlayHintRefresh: true,
      semanticTokensRefresh: true,
    });
    expect(result.capabilities.diagnosticProvider).toEqual({
      identifier: "aurelia",
      interFileDependencies: true,
      workspaceDiagnostics: false,
    });
  });

  test("rejects initialization without a filesystem-backed workspace root", () => {
    const harness = createLifecycleHarness();

    expect(() => handleInitialize(harness.ctx as never, {
      rootUri: null,
      capabilities: {},
    } as never)).toThrowError(expect.objectContaining({ code: ErrorCodes.InvalidParams }));
  });
});

describe("document source authority", () => {
  test("ignores events outside semantic-runtime source admission", async () => {
    const harness = createLifecycleHarness();
    const doc = TextDocument.create(
      workspaceFileUri("notes.txt"),
      "html",
      1,
      "<template></template>",
    );

    harness.emitOpen(doc);
    harness.synchronize(doc);
    harness.close(doc);
    await settleAsyncWork();

    expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
    expect(harness.connection.sendNotification).not.toHaveBeenCalled();
    expect(harness.connection.languages.diagnostics.refresh).not.toHaveBeenCalled();
  });

  test("advances source text only from the synchronized-content event", () => {
    const harness = createLifecycleHarness();
    const doc = document();

    harness.emitOpen(doc);
    expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();

    harness.synchronize(doc);
    expect(harness.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledOnce();
  });

  test("coalesces synchronized edits into one settled analysis notification", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      harness.clientSupport.semanticTokensRefresh = true;
      const doc = document();

      harness.synchronize(doc);
      harness.synchronize(document(doc.uri, 2, "<template>${value}</template>"));
      await vi.advanceTimersByTimeAsync(299);
      expect(harness.connection.sendNotification).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      await settleAsyncWork();

      expect(harness.ctx.logger.error.mock.calls).toEqual([]);
      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.sendNotification).toHaveBeenCalledWith(
        "aurelia/analysisChanged",
        { fingerprint: "semantic-runtime:test:workspace-0:source-2" },
      );
      expect(harness.connection.languages.semanticTokens.refresh).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("returns diagnostic authority to the workspace host on close", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      const doc = document();

      harness.emitOpen(doc);
      harness.synchronize(doc);
      harness.close(doc);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(2);
      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

describe("workspace source events", () => {
  test("does not replay a filesystem save for an already-open source", async () => {
    const harness = createLifecycleHarness();
    const doc = document(workspaceFileUri("src/my-app.mts"));
    harness.emitOpen(doc);

    harness.watch([{ uri: doc.uri, type: FileChangeType.Changed }]);
    await settleAsyncWork();

    expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
    expect(harness.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
  });

  test("refreshes diagnostics after a closed admitted source changes", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;

      harness.watch([{ uri: workspaceFileUri("src/configuration.cjs"), type: FileChangeType.Changed }]);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("coalesces closed-source and synchronized edits into one diagnostic refresh", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      const doc = document();

      harness.watch([{ uri: workspaceFileUri("src/configuration.cjs"), type: FileChangeType.Changed }]);
      harness.synchronize(doc);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("treats admitted source creation as one project-topology event", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;

      harness.watch([
        { uri: workspaceFileUri("src/feature.mts"), type: FileChangeType.Created },
        { uri: workspaceFileUri("src/feature.html"), type: FileChangeType.Created },
        { uri: workspaceFileUri("src/feature.css"), type: FileChangeType.Created },
        { uri: workspaceFileUri("src/feature.json"), type: FileChangeType.Created },
      ]);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledOnce();
      expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("treats project configuration edits as topology changes", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();

      harness.watch([{ uri: workspaceFileUri("tsconfig.app.json"), type: FileChangeType.Changed }]);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledOnce();
      expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

describe("configuration and shutdown", () => {
  test("registers inlay invalidation and refreshes hints without rebuilding the project", async () => {
    const harness = createLifecycleHarness();
    harness.clientSupport.configurationChangeRegistration = true;
    harness.clientSupport.inlayHintRefresh = true;

    harness.handlers.initialized?.();
    await settleAsyncWork();
    expect(harness.connection.client.register).toHaveBeenCalledWith(
      expect.objectContaining({ method: "workspace/didChangeConfiguration" }),
      { section: "aurelia.inlayHints" },
    );

    harness.handlers.configuration?.();
    await settleAsyncWork();
    expect(harness.connection.languages.inlayHint.refresh).toHaveBeenCalledOnce();
    expect(harness.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
  });

  test("reports a background lifecycle failure through its single task owner", async () => {
    const harness = createLifecycleHarness();
    harness.clientSupport.configurationChangeRegistration = true;
    harness.connection.client.register.mockRejectedValueOnce(new Error("registration failed"));

    harness.handlers.initialized?.();
    await waitFor(() => harness.ctx.logger.error.mock.calls.length === 1);

    expect(harness.ctx.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("configuration registration failed: Error: registration failed"),
    );
  });

  test("shares one shutdown and drains foreground operations before disposal", async () => {
    const harness = createLifecycleHarness();
    let resolveOperation!: () => void;
    const operation = runServerOperation(
      harness.ctx as never,
      () => new Promise<void>((resolve) => { resolveOperation = resolve; }),
    );
    await Promise.resolve();

    const first = harness.handlers.shutdown?.();
    const second = harness.handlers.shutdown?.();
    expect(first).toBe(second);
    expect(harness.semanticRuntime.dispose).not.toHaveBeenCalled();

    resolveOperation();
    await operation;
    await first;

    expect(harness.semanticRuntime.dispose).toHaveBeenCalledOnce();
  });

  test("cancels pending analysis refreshes before disposing the semantic session", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.synchronize(document());

      await harness.handlers.shutdown?.();
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.dispose).toHaveBeenCalledOnce();
      expect(harness.connection.sendNotification).not.toHaveBeenCalled();
      expect(harness.connection.languages.diagnostics.refresh).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

async function settleAsyncWork(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for lifecycle work to settle.");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
