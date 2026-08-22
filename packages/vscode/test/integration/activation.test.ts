import { expect, test, vi } from "vitest";
import type { LanguageClient } from "vscode-languageclient/node";
import { ClientApp } from "../../out/app.js";
import type { ClientFeature } from "../../out/core/feature.js";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext } from "../helpers/vscode-stub.js";

class StubLanguageClient {
  startCalls = 0;
  stopCalls = 0;
  reconcileCalls = 0;
  #lsp: LanguageClient;
  sessions: unknown[];
  #listeners = new Set<() => void>();

  constructor(lsp: LanguageClient, active = true) {
    this.#lsp = lsp;
    this.sessions = active ? [workspaceSession(lsp)] : [];
  }

  get hasSessions() { return this.sessions.length > 0; }
  get listenerCount() { return this.#listeners.size; }

  async start() {
    this.startCalls += 1;
  }

  async reconcile() {
    this.reconcileCalls += 1;
  }

  async reconfirmSessionTopology() {
    return true;
  }

  onDidChangeSessions(listener: () => void) {
    this.#listeners.add(listener);
    return { dispose: () => this.#listeners.delete(listener) };
  }

  sessionForUri(uri: { toString(): string }) {
    const session = this.sessions[0] as { workspace?: { uri?: string } } | undefined;
    const workspaceUri = session?.workspace?.uri;
    const documentUri = uri?.toString();
    return workspaceUri != null
      && (documentUri === workspaceUri || documentUri.startsWith(`${workspaceUri}/`))
      ? session
      : undefined;
  }

  clientForUri() { return this.#lsp; }

  async stop() {
    this.stopCalls += 1;
    this.sessions = [];
  }

  setActive(active: boolean) {
    this.sessions = active ? [workspaceSession(this.#lsp)] : [];
    for (const listener of this.#listeners) listener();
  }

  replaceIncarnationWithoutEvent() {
    const current = this.sessions[0] as ReturnType<typeof workspaceSession> | undefined;
    if (current != null) this.sessions = [{ ...current, incarnation: current.incarnation + 1 }];
  }
}

test("activates the language client and product contributions once", async () => {
  const { vscode: stubVscode } = createVscodeApi();
  const lsp = stubProtocolClient();
  const languageClient = new StubLanguageClient(lsp);
  const activated: string[] = [];
  let disposed = 0;
  const feature: ClientFeature = {
    id: "test.feature",
    activate: (_ctx, own) => {
      activated.push("test.feature");
      own({ dispose: () => { disposed += 1; } });
    },
  };
  const app = createApp(stubVscode, languageClient, [feature]);

  await app.activate();

  expect(languageClient.startCalls).toBe(1);
  expect(activated).toEqual(["test.feature"]);

  await app.deactivate();
  expect(languageClient.stopCalls).toBe(1);
  expect(disposed).toBe(1);
});

test("reconciles sessions only when workspace activation policy changes", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const languageClient = new StubLanguageClient(stubProtocolClient());
  const app = createApp(stubVscode, languageClient, []);
  await app.activate();

  recorded.fireConfigurationChanged("aurelia.inlayHints.bindingMode");
  await settleAsyncWork();
  expect(languageClient.reconcileCalls).toBe(0);

  recorded.fireConfigurationChanged("aurelia.templateDiagnostics.suppressNative");
  await settleAsyncWork();
  expect(languageClient.reconcileCalls).toBe(0);

  recorded.fireConfigurationChanged("aurelia.activationMode");
  await settleAsyncWork();
  expect(languageClient.reconcileCalls).toBe(1);

  await app.deactivate();
  recorded.fireConfigurationChanged("aurelia.activationMode");
  await settleAsyncWork();
  expect(languageClient.reconcileCalls).toBe(1);
});

test("keeps contributions stable while workspace sessions come and go", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const languageClient = new StubLanguageClient(stubProtocolClient(), false);
  let activations = 0;
  let disposals = 0;
  const feature: ClientFeature = {
    id: "test.feature",
    activate: (_ctx, own) => {
      activations += 1;
      own({ dispose: () => { disposals += 1; } });
    },
  };
  const app = createApp(stubVscode, languageClient, [feature]);

  await app.activate();
  expect(activations).toBe(1);
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);

  languageClient.setActive(true);
  await settleAsyncWork();
  expect(activations).toBe(1);
  expect(disposals).toBe(0);
  expect(recorded.contextValues.get("aurelia.active")).toBe(true);

  languageClient.setActive(false);
  await settleAsyncWork();
  expect(activations).toBe(1);
  expect(disposals).toBe(0);
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);

  await app.deactivate();
  expect(disposals).toBe(1);
});

test("scopes editor context to the active document's owning session", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi({
    activeTextEditor: { document: { uri: "placeholder", languageId: "html" } },
  });
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.html"), languageId: "html" },
  };
  const languageClient = new StubLanguageClient(stubProtocolClient());
  const app = createApp(stubVscode, languageClient, []);

  await app.activate();
  expect(recorded.contextValues.get("aurelia.active")).toBe(true);
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(true);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/golden/generated.html"), languageId: "html" },
  });
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.ts"), languageId: "typescript" },
  });
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);

  recorded.fireActiveTextEditorChanged(undefined);
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.html"), languageId: "html" },
  });
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(true);

  languageClient.setActive(false);
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);
  await app.deactivate();
});

test("withdraws context keys when the session incarnation changes while setContext is awaiting", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.html"), languageId: "html" },
  };
  const originalExecuteCommand = stubVscode.commands.executeCommand.bind(stubVscode.commands);
  const positiveContextGate = deferred<void>();
  let positiveContextBlocked = false;
  stubVscode.commands.executeCommand = vi.fn(async (command: string, ...args: unknown[]) => {
    const result = await originalExecuteCommand(command, ...args);
    if (
      !positiveContextBlocked
      && command === "setContext"
      && args[0] === "aurelia.documentOwned"
      && args[1] === true
    ) {
      positiveContextBlocked = true;
      await positiveContextGate.promise;
    }
    return result;
  });
  const languageClient = new StubLanguageClient(stubProtocolClient());
  const app = createApp(stubVscode, languageClient, []);

  const activation = app.activate();
  await vi.waitFor(() => expect(positiveContextBlocked).toBe(true));
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);
  languageClient.replaceIncarnationWithoutEvent();
  positiveContextGate.resolve(undefined);
  await activation;

  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);
  await app.deactivate();
});

test("keeps an owned root document out of template-only context", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi({
    openDocuments: [{
      uri: "file:///workspace/index.html",
      languageId: "html",
      text: "<body><app-root></app-root></body>",
    }],
  });
  const document = stubVscode.workspace.textDocuments[0]!;
  stubVscode.window.activeTextEditor = { document };
  const lsp = stubProtocolClient({
    sourceOwnership: (uri) => sourceOwnershipResponse(uri, true, "root-document", false),
  });
  const app = createApp(stubVscode, new StubLanguageClient(lsp), []);

  await app.activate();

  expect(document.languageId).toBe("html");
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);
  await app.deactivate();
});

test("keeps an exactly owned template in native HTML by default without a containment pull", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi({
    openDocuments: [{
      uri: "file:///workspace/src/app.html",
      languageId: "html",
      text: "<template></template>",
    }],
  });
  const document = stubVscode.workspace.textDocuments[0]!;
  stubVscode.window.activeTextEditor = { document };
  const lsp = stubProtocolClient({
    sourceOwnership: (uri) => sourceOwnershipResponse(uri, true, "template-document"),
  });
  const app = createApp(stubVscode, new StubLanguageClient(lsp), []);

  await app.activate();

  expect(document.languageId).toBe("html");
  expect(lsp.sendRequestMock).toHaveBeenCalledTimes(1);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(true);
  await app.deactivate();
});

test("rejects late template ownership and rechecks active document language-mode lifecycle", async () => {
  const firstOwnership = deferred<ReturnType<typeof sourceOwnershipResponse>>();
  const { vscode: stubVscode, recorded } = createVscodeApi({
    configuration: {
      "aurelia.templateDiagnostics.suppressNative": true,
    },
    openDocuments: [{
      uri: "file:///workspace/src/app.html",
      languageId: "html",
      text: "<template></template>",
    }],
  });
  const document = stubVscode.workspace.textDocuments[0]!;
  stubVscode.window.activeTextEditor = { document };
  const lsp = stubProtocolClient({
    sourceOwnership: (uri, requestIndex) => requestIndex < 2
      ? firstOwnership.promise
      : sourceOwnershipResponse(uri, true, `language-${requestIndex}`),
  });
  const languageClient = new StubLanguageClient(lsp);
  const app = createApp(stubVscode, languageClient, []);

  const activation = app.activate();
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(2));

  document.languageId = "typescript";
  firstOwnership.resolve(sourceOwnershipResponse(document.uri.toString(), true, "language-0"));
  await activation;
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);

  recorded.fireDocumentOpened(document);
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(3));
  await vi.waitFor(() => expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true));
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);

  document.languageId = "html";
  recorded.fireDocumentClosed(document);
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(4));
  await vi.waitFor(() => expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(true));

  await app.deactivate();
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);
});

test("treats canonical server and encoded editor URI spellings as one owned document", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const editorUri = "file:///workspace/c%3A/Projects/App/src/app.ts";
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse(editorUri) },
  };
  const lsp = stubProtocolClient({
    sourceOwnership: (uri) => sourceOwnershipResponse(
      uri.includes("100%25done.ts")
        ? uri
        : uri.includes("a%2520b.ts")
          ? "file:///workspace/a%20b.ts"
          : "file:///workspace/c:/Projects/App/src/app.ts",
      true,
      "canonical-uri",
    ),
  });
  const languageClient = new StubLanguageClient(lsp);
  const app = createApp(stubVscode, languageClient, []);

  await app.activate();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/100%25done.ts") },
  });
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(2));
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/a%2520b.ts") },
  });
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(3));
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);

  await app.deactivate();
});

test("rechecks active context after source analysis settles and ignores an older ownership answer", async () => {
  const staleOwnership = deferred<ReturnType<typeof sourceOwnershipResponse>>();
  const { vscode: stubVscode, recorded } = createVscodeApi();
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.ts") },
  };
  const lsp = stubProtocolClient({
    sourceOwnership: (uri, requestIndex) => {
      if (requestIndex === 0) return sourceOwnershipResponse(uri, true, "source-1");
      if (requestIndex === 1) return staleOwnership.promise;
      return sourceOwnershipResponse(uri, false, "source-3");
    },
  });
  const languageClient = new StubLanguageClient(lsp);
  const app = createApp(stubVscode, languageClient, []);

  await app.activate();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  lsp.emit("aurelia/analysisChanged", {
    fingerprint: "source-2",
    changeKind: "source-text",
    changedSourceUris: ["file:///workspace/src/app.ts"],
  });
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(2));
  lsp.emit("aurelia/analysisChanged", {
    fingerprint: "source-3",
    changeKind: "source-text",
    changedSourceUris: ["file:///workspace/src/app.ts"],
  });
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(3));
  await vi.waitFor(() => expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false));

  staleOwnership.resolve(sourceOwnershipResponse("file:///workspace/src/app.ts", true, "source-2"));
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);

  await app.deactivate();
});

test("ignores a late ownership answer after the active editor changes", async () => {
  const firstOwnership = deferred<ReturnType<typeof sourceOwnershipResponse>>();
  const { vscode: stubVscode, recorded } = createVscodeApi();
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/first.ts") },
  };
  const lsp = stubProtocolClient({
    sourceOwnership: (uri) => uri.endsWith("/first.ts")
      ? firstOwnership.promise
      : sourceOwnershipResponse(uri, true, "second"),
  });
  const languageClient = new StubLanguageClient(lsp);
  const app = createApp(stubVscode, languageClient, []);

  const activation = app.activate();
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(1));
  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/second.ts") },
  });
  await vi.waitFor(() => expect(lsp.sendRequestMock).toHaveBeenCalledTimes(2));
  await vi.waitFor(() => expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true));

  firstOwnership.resolve(sourceOwnershipResponse("file:///workspace/src/first.ts", false, "first"));
  await activation;
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  await app.deactivate();
});

test("rolls back all owned contributions when activation fails", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const languageClient = new StubLanguageClient(stubProtocolClient());
  let disposed = 0;
  const app = createApp(stubVscode, languageClient, [{
    id: "test.first",
    activate: (_ctx, own) => { own({ dispose: () => { disposed += 1; } }); },
  }, {
    id: "test.failure",
    activate: (_ctx, own) => {
      own({ dispose: () => { disposed += 1; } });
      throw new Error("registration failed");
    },
  }]);

  await expect(app.activate()).rejects.toThrow("registration failed");

  expect(disposed).toBe(2);
  expect(languageClient.stopCalls).toBe(1);
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
  expect(recorded.contextValues.get("aurelia.activeTemplateOwned")).toBe(false);
});

test("rolls back earlier state listeners when listener registration fails", async () => {
  const { vscode: stubVscode } = createVscodeApi();
  stubVscode.window.onDidChangeActiveTextEditor = () => {
    throw new Error("editor listener registration failed");
  };
  const languageClient = new StubLanguageClient(stubProtocolClient());
  const app = createApp(stubVscode, languageClient, []);

  await expect(app.activate()).rejects.toThrow("editor listener registration failed");

  expect(languageClient.listenerCount).toBe(0);
  expect(languageClient.stopCalls).toBe(1);
});

function createApp(
  stubVscode: ReturnType<typeof createVscodeApi>["vscode"],
  languageClient: StubLanguageClient,
  features: readonly ClientFeature[],
): ClientApp {
  const vscode = stubVscode as unknown as VscodeApi;
  const outputChannel = vscode.window.createOutputChannel("test", { log: true });
  const logger = new ClientLogger(outputChannel);
  return new ClientApp(stubExtensionContext(stubVscode), {
    vscode,
    logger,
    outputChannel,
    languageClient: languageClient as never,
    features,
  });
}

type StubProtocolClient = LanguageClient & {
  readonly sendRequestMock: ReturnType<typeof vi.fn>;
  emit(method: string, payload: unknown): void;
};

function stubProtocolClient(options: {
  readonly sourceOwnership?: (
    uri: string,
    requestIndex: number,
  ) => unknown | Promise<unknown>;
} = {}): StubProtocolClient {
  const notifications = new Map<string, (payload: unknown) => void>();
  let ownershipRequest = 0;
  const sendRequest = vi.fn(async (method: string, params?: unknown) => {
    if (method !== "aurelia/sourceOwnership") return null;
    const uri = (params as { uri: string }).uri;
    const requestIndex = ownershipRequest++;
    return await (options.sourceOwnership?.(uri, requestIndex)
      ?? sourceOwnershipResponse(uri, !uri.includes("/golden/"), `ownership-${requestIndex}`));
  });
  return {
    onNotification: vi.fn((method: string, handler: (payload: unknown) => void) => {
      notifications.set(method, handler);
      return { dispose: () => notifications.delete(method) };
    }),
    sendRequest,
    sendRequestMock: sendRequest,
    emit(method: string, payload: unknown) {
      notifications.get(method)?.(payload);
    },
  } as unknown as StubProtocolClient;
}

function sourceOwnershipResponse(
  uri: string,
  owned: boolean,
  fingerprint: string,
  templateOwned = owned && uri.endsWith(".html"),
) {
  return {
    fingerprint,
    sourceUri: uri,
    answer: {
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: owned ? "owned" : "unowned",
      page: null,
    },
    templateOwned,
    owners: owned ? [{
      projectKey: "app",
      rootUri: "file:///workspace",
      projectPath: uri.slice("file:///workspace/".length),
      role: "app-source",
    }] : [],
  };
}

function workspaceSession(client: LanguageClient) {
  return {
    workspace: { key: "file:///workspace", name: "workspace", uri: "file:///workspace" },
    client,
    incarnation: 1,
  };
}

async function settleAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
