import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ManagedSemanticWorkspaceOperationStaleError,
  SemanticSourceWorldCurrentnessKind,
} from "@aurelia-ls/semantic-runtime";
import {
  CodeActionKind,
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
import { SemanticRuntimeLspRequestAbortedError } from "../../src/runtime/semantic-runtime-session.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const workspaceRoot = path.resolve("test-workspace");
const workspaceUri = pathToFileURL(workspaceRoot).toString();

function workspaceFileUri(relativePath: string): string {
  return pathToFileURL(path.resolve(workspaceRoot, relativePath)).toString();
}

function createGeneration(sourceGeneration = 0, workspaceGeneration = 0) {
  return {
    requestEpoch: sourceGeneration,
    workspaceGeneration,
    sourceGeneration,
    sourceWorldRevision: `source-world:${sourceGeneration}`,
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
    recordProjectConfigurationChanged: vi.fn(() => {
      generation = createGeneration(generation.sourceGeneration + 1, generation.workspaceGeneration);
      return generation;
    }),
    runRequest: vi.fn(async (
      _isCancellationRequested: (() => boolean) | null,
      request: (operation: { readonly generation: ReturnType<typeof createGeneration> }) => unknown,
    ) => await request({ generation })),
    invalidateRequests: vi.fn(() => {
      generation = createGeneration(generation.sourceGeneration + 1, generation.workspaceGeneration);
    }),
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
    configureWorkspace: vi.fn((
      rootUri: string,
      excludedRootUris: readonly string[] = [],
      _projectRootHintUris: readonly string[] = [],
    ) => {
      documentUris.configure(rootUri, excludedRootUris);
      semanticRuntime.configureWorkspace();
    }),
    ownsDocument: (uri: string) => documentUris.ownsDocument(uri),
    openWorkspaceDocument: (uri: string) => documentUris.workspaceHostPath(uri) == null
      ? null
      : openDocuments.get(documentUris.key(uri)) ?? null,
    openDocument: (uri: string) => documentUris.ownsDocument(uri)
      ? openDocuments.get(documentUris.key(uri)) ?? null
      : null,
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
  const languageId = uri.endsWith(".html")
    ? "html"
    : uri.endsWith(".json") ? "json" : "typescript";
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

    expect(harness.ctx.configureWorkspace).toHaveBeenCalledWith(fallbackRootUri, [], []);
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
    expect(result.capabilities.codeActionProvider).toEqual({
      codeActionKinds: [CodeActionKind.QuickFix],
      resolveProvider: true,
    });
    expect(result.capabilities.inlayHintProvider).toBe(true);
    expect(result.capabilities.semanticTokensProvider).toEqual(expect.objectContaining({ full: true }));
  });

  test("rejects initialization without a filesystem-backed workspace root", () => {
    const harness = createLifecycleHarness();

    expect(() => handleInitialize(harness.ctx as never, {
      rootUri: null,
      capabilities: {},
    } as never)).toThrowError(expect.objectContaining({ code: ErrorCodes.InvalidParams }));
  });

  test("configures typed nested workspace exclusions and rejects malformed topology", () => {
    const harness = createLifecycleHarness();
    const excludedUri = workspaceFileUri("packages/disabled");
    const projectRootHintUri = workspaceFileUri("packages/app");

    handleInitialize(harness.ctx as never, {
      rootUri: workspaceUri,
      initializationOptions: {
        excludedWorkspaceRootUris: [excludedUri],
        projectRootHintUris: [projectRootHintUri],
      },
      capabilities: {},
    } as never);
    expect(harness.ctx.configureWorkspace).toHaveBeenCalledWith(
      workspaceUri,
      [excludedUri],
      [projectRootHintUri],
    );

    expect(() => handleInitialize(harness.ctx as never, {
      rootUri: workspaceUri,
      initializationOptions: { excludedWorkspaceRootUris: "not-an-array" },
      capabilities: {},
    } as never)).toThrowError(expect.objectContaining({ code: ErrorCodes.InvalidParams }));

    expect(() => handleInitialize(harness.ctx as never, {
      rootUri: workspaceUri,
      initializationOptions: { projectRootHintUris: [42] },
      capabilities: {},
    } as never)).toThrowError(expect.objectContaining({ code: ErrorCodes.InvalidParams }));
  });
});

describe("document source authority", () => {
  test("advances synchronized dependency inputs inside an excluded workspace subtree", async () => {
    const harness = createLifecycleHarness();
    harness.ctx.configureWorkspace(workspaceUri, [workspaceFileUri("packages/disabled")]);
    const doc = document(workspaceFileUri("packages/disabled/src/my-app.html"));

    harness.emitOpen(doc);
    harness.synchronize(doc);
    harness.close(doc);
    harness.watch([{ uri: doc.uri, type: FileChangeType.Changed }]);
    await settleAsyncWork();

    expect(harness.ctx.ownsDocument(doc.uri)).toBe(false);
    expect(harness.semanticRuntime.recordSourceTextChanged).toHaveBeenCalledTimes(3);
    expect(harness.semanticRuntime.recordSourceTextChanged).toHaveBeenNthCalledWith(
      1,
      [path.resolve(workspaceRoot, "packages/disabled/src/my-app.html")],
    );
    expect(harness.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
  });

  test("forwards excluded structural watcher events without granting authored ownership", () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      const excludedRoot = workspaceFileUri("packages/disabled");
      const markerUri = workspaceFileUri("packages/disabled/package.json");
      const sourceUri = workspaceFileUri("packages/disabled/src/dependency.ts");
      harness.ctx.configureWorkspace(workspaceUri, [excludedRoot]);

      harness.watch([
        { uri: markerUri, type: FileChangeType.Created },
        { uri: sourceUri, type: FileChangeType.Deleted },
      ]);

      expect(harness.ctx.ownsDocument(markerUri)).toBe(false);
      expect(harness.ctx.ownsDocument(sourceUri)).toBe(false);
      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledWith([
        path.resolve(workspaceRoot, "packages/disabled/package.json"),
        path.resolve(workspaceRoot, "packages/disabled/src/dependency.ts"),
      ]);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

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
      harness.clientSupport.inlayHintRefresh = true;
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
        {
          fingerprint: "semantic-runtime:test:workspace-0:source-2",
          changeKind: "source-text",
        },
      );
      expect(harness.connection.languages.semanticTokens.refresh).toHaveBeenCalledOnce();
      expect(harness.connection.languages.inlayHint.refresh).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("publishes no analysis effects until managed egress accepts the generation", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      harness.clientSupport.inlayHintRefresh = true;
      harness.clientSupport.semanticTokensRefresh = true;
      const egress = deferred<void>();
      harness.semanticRuntime.runRequest.mockImplementationOnce(async (_probe, request) => {
        const value = await request({ generation: createGeneration(1) });
        await egress.promise;
        return value;
      });

      harness.synchronize(document());
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.runRequest).toHaveBeenCalledOnce();
      expect(harness.connection.sendNotification).not.toHaveBeenCalled();
      expect(harness.connection.languages.diagnostics.refresh).not.toHaveBeenCalled();
      expect(harness.connection.languages.inlayHint.refresh).not.toHaveBeenCalled();
      expect(harness.connection.languages.semanticTokens.refresh).not.toHaveBeenCalled();

      egress.resolve(undefined);
      await settleAsyncWork();

      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
      expect(harness.connection.languages.inlayHint.refresh).toHaveBeenCalledOnce();
      expect(harness.connection.languages.semanticTokens.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("discards a stale managed generation and retries from a new ingress", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      harness.semanticRuntime.runRequest.mockImplementationOnce(async (_probe, request) => {
        await request({ generation: createGeneration(1) });
        throw lspStaleError(managedStaleError(SemanticSourceWorldCurrentnessKind.FreshBootRequired));
      });

      harness.synchronize(document());
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.runRequest).toHaveBeenCalledOnce();
      expect(harness.connection.sendNotification).not.toHaveBeenCalled();
      expect(harness.connection.languages.diagnostics.refresh).not.toHaveBeenCalled();
      expect(harness.ctx.logger.error).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.runRequest).toHaveBeenCalledTimes(2);
      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.sendNotification).toHaveBeenCalledWith(
        "aurelia/analysisChanged",
        expect.objectContaining({ changeKind: "topology" }),
      );
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("retries a request-epoch stale analysis without escalating its change kind", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.semanticRuntime.runRequest.mockRejectedValueOnce(
        new SemanticRuntimeLspRequestAbortedError("stale"),
      );

      harness.synchronize(document());
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();
      expect(harness.connection.sendNotification).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.connection.sendNotification).toHaveBeenCalledWith(
        "aurelia/analysisChanged",
        expect.objectContaining({ changeKind: "source-text" }),
      );
      expect(harness.ctx.logger.error).not.toHaveBeenCalled();
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

  test.each([
    "package.json",
    "jsconfig.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "aurelia.project.json",
  ])("advances synchronized and closed %s as exact configuration values", (configurationFile) => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      const uri = workspaceFileUri(configurationFile);
      const first = document(uri, 1, "{}");
      const second = document(uri, 2, '{"version":1}');

      harness.emitOpen(first);
      harness.synchronize(first);
      harness.synchronize(second);
      harness.close(second);

      expect(harness.semanticRuntime.recordProjectConfigurationChanged).toHaveBeenCalledTimes(3);
      expect(harness.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
      expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
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

  test.each([
    FileChangeType.Created,
    FileChangeType.Deleted,
  ])("treats source %s as one structural-membership event", async (changeType) => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;

      harness.watch([
        { uri: workspaceFileUri("src/feature.mts"), type: changeType as FileChangeType },
        { uri: workspaceFileUri("src/feature.html"), type: changeType as FileChangeType },
        { uri: workspaceFileUri("src/feature.css"), type: changeType as FileChangeType },
        { uri: workspaceFileUri("src/feature.json"), type: changeType as FileChangeType },
      ]);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledOnce();
      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledWith([
        path.resolve(workspaceRoot, "src/feature.mts"),
        path.resolve(workspaceRoot, "src/feature.html"),
        path.resolve(workspaceRoot, "src/feature.css"),
        path.resolve(workspaceRoot, "src/feature.json"),
      ]);
      expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test.each([
    "package.json",
    "jsconfig.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "aurelia.project.json",
  ])("advances watched %s edits as exact configuration values", async (configurationFile) => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();

      harness.watch([{ uri: workspaceFileUri(configurationFile), type: FileChangeType.Changed }]);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordProjectConfigurationChanged).toHaveBeenCalledOnce();
      expect(harness.semanticRuntime.recordProjectConfigurationChanged).toHaveBeenCalledWith([
        path.resolve(workspaceRoot, configurationFile),
      ]);
      expect(harness.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
      expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test.each([
    ...[
      "package.json",
      "jsconfig.json",
      "tsconfig.json",
      "aurelia.project.json",
    ].flatMap((configurationFile) => [
      [configurationFile, FileChangeType.Created] as const,
      [configurationFile, FileChangeType.Deleted] as const,
    ]),
  ])("treats structural %s %s as topology", async (configurationFile, changeType) => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();

      harness.watch([{
        uri: workspaceFileUri(configurationFile),
        type: changeType as FileChangeType,
      }]);
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledOnce();
      expect(harness.semanticRuntime.recordProjectTopologyChanged).toHaveBeenCalledWith([
        path.resolve(workspaceRoot, configurationFile),
      ]);
      expect(harness.semanticRuntime.recordProjectConfigurationChanged).not.toHaveBeenCalled();
      expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("does not replay a watched save for an open project configuration", async () => {
    const harness = createLifecycleHarness();
    const config = document(workspaceFileUri("aurelia.project.json"), 1, '{"version":1}');
    harness.emitOpen(config);

    harness.watch([{ uri: config.uri, type: FileChangeType.Changed }]);
    await settleAsyncWork();

    expect(harness.semanticRuntime.recordProjectTopologyChanged).not.toHaveBeenCalled();
    expect(harness.semanticRuntime.recordProjectConfigurationChanged).not.toHaveBeenCalled();
    expect(harness.semanticRuntime.recordSourceTextChanged).not.toHaveBeenCalled();
  });

  test.each([
    "source-then-topology",
    "topology-then-source",
  ] as const)("preserves topology dominance for %s debounce order", async (order) => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      const recordSource = () => harness.synchronize(document());
      const recordTopology = () => harness.watch([{
        uri: workspaceFileUri("aurelia.project.json"),
        type: FileChangeType.Changed,
      }]);

      if (order === "source-then-topology") {
        recordSource();
        recordTopology();
      } else {
        recordTopology();
        recordSource();
      }
      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();

      expect(harness.connection.sendNotification).toHaveBeenCalledOnce();
      expect(harness.connection.sendNotification).toHaveBeenCalledWith(
        "aurelia/analysisChanged",
        expect.objectContaining({ changeKind: "topology" }),
      );
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

  test("shares one prompt shutdown and retires resources after foreground operations settle", async () => {
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
    await first;
    expect(harness.semanticRuntime.invalidateRequests).toHaveBeenCalledOnce();
    expect(harness.semanticRuntime.dispose).not.toHaveBeenCalled();

    resolveOperation();
    await operation;
    await settleAsyncWork();

    expect(harness.semanticRuntime.dispose).toHaveBeenCalledOnce();
  });

  test("cancels pending analysis refreshes before disposing the semantic session", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.synchronize(document());

      await harness.handlers.shutdown?.();
      await settleAsyncWork();
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

  test("suppresses analysis effects when shutdown begins during managed egress", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      const egress = deferred<void>();
      harness.semanticRuntime.runRequest.mockImplementationOnce(async (_probe, request) => {
        const value = await request({ generation: createGeneration(1) });
        await egress.promise;
        return value;
      });
      harness.synchronize(document());

      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();
      expect(harness.semanticRuntime.runRequest).toHaveBeenCalledOnce();

      await harness.handlers.shutdown?.();
      egress.resolve(undefined);
      await settleAsyncWork();

      expect(harness.connection.sendNotification).not.toHaveBeenCalled();
      expect(harness.connection.languages.diagnostics.refresh).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  test("does not let an unanswered client refresh acknowledgement block shutdown", async () => {
    vi.useFakeTimers();
    try {
      const harness = createLifecycleHarness();
      harness.clientSupport.diagnosticRefresh = true;
      harness.connection.languages.diagnostics.refresh.mockImplementationOnce(
        () => new Promise<void>(() => {}),
      );
      harness.synchronize(document());

      await vi.advanceTimersByTimeAsync(300);
      await settleAsyncWork();
      expect(harness.connection.languages.diagnostics.refresh).toHaveBeenCalledOnce();

      await harness.handlers.shutdown?.();
      await settleAsyncWork();
      expect(harness.semanticRuntime.dispose).toHaveBeenCalledOnce();
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

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

function managedStaleError(
  currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired | null = null,
): ManagedSemanticWorkspaceOperationStaleError {
  return new ManagedSemanticWorkspaceOperationStaleError({
    message: "Managed semantic operation became stale.",
    reason: currentnessKind == null ? "analysis-currentness-changed" : "source-world-changed",
    currentnessKind,
    previousSourceWorldRevision: "source-world:1",
    nextSourceWorldRevision: currentnessKind == null ? "source-world:1" : "source-world:2",
    analysisBasisRevision: currentnessKind == null ? "analysis-basis:1" : null,
    changedReadKeys: [],
    changedFacets: [],
    changedSemanticFactKeys: currentnessKind == null ? ["semantic-domain:test"] : [],
  });
}

function lspStaleError(cause: unknown): SemanticRuntimeLspRequestAbortedError {
  return new SemanticRuntimeLspRequestAbortedError("stale", cause);
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
