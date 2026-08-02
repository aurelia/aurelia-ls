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
    activeTextEditor: { document: { uri: "placeholder" } },
  });
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.html") },
  };
  const languageClient = new StubLanguageClient(stubProtocolClient());
  const app = createApp(stubVscode, languageClient, []);

  await app.activate();
  expect(recorded.contextValues.get("aurelia.active")).toBe(true);
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///plain/src/plain.ts") },
  });
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);

  recorded.fireActiveTextEditorChanged(undefined);
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.html") },
  });
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  languageClient.setActive(false);
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(false);
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

function stubProtocolClient(): LanguageClient {
  return {
    onNotification: vi.fn(() => ({ dispose: () => {} })),
    sendRequest: vi.fn(async () => null),
  } as unknown as LanguageClient;
}

function workspaceSession(client: LanguageClient) {
  return {
    workspace: { key: "file:///workspace", name: "workspace", uri: "file:///workspace" },
    client,
  };
}

async function settleAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
