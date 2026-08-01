import { test, expect, vi } from "vitest";
import type { LanguageClient } from "vscode-languageclient/node";
import type { ClientFeature } from "../../out/core/feature.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext } from "../helpers/vscode-stub.js";

class StubLanguageClient {
  startCalls = 0;
  stopCalls = 0;
  #lsp: LanguageClient;
  sessions: unknown[];
  sessionGeneration = 0;
  #listeners = new Set<() => void>();

  constructor(lsp: LanguageClient, active = true) {
    this.#lsp = lsp;
    this.sessions = active ? [{
      workspace: { key: "file:///workspace", name: "workspace", uri: "file:///workspace" },
      client: lsp,
    }] : [];
  }

  get hasSessions() { return this.sessions.length > 0; }

  async start() {
    this.startCalls += 1;
  }

  async restart() {}
  async reconcile() {}
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
    this.sessions = active ? [{
      workspace: { key: "file:///workspace", name: "workspace", uri: "file:///workspace" },
      client: this.#lsp,
    }] : [];
    this.sessionGeneration += 1;
    for (const listener of this.#listeners) listener();
  }
}

const activationTest = test;

activationTest("activate wires the language client and explicit product features", async () => {
  const { activate, deactivate } = await import("../../out/extension.js");
  const { vscode: stubVscode } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const lsp = {
    onNotification: vi.fn(() => ({ dispose: () => {} })),
    sendRequest: vi.fn(async () => null),
  } as unknown as LanguageClient;
  const languageClient = new StubLanguageClient(lsp);
  const activated: string[] = [];
  const feature: ClientFeature = {
    id: "test.feature",
    activate: () => {
      activated.push("test.feature");
      return { dispose: () => {} };
    },
  };
  const context = stubExtensionContext(stubVscode);

  await activate(context, { vscode, languageClient: languageClient as never, features: [feature] });

  expect(languageClient.startCalls).toBe(1);
  expect(activated).toEqual(["test.feature"]);

  await deactivate();
  expect(languageClient.stopCalls).toBe(1);
});

activationTest("keeps product features inactive until a workspace session is owned", async () => {
  const { activate, deactivate } = await import("../../out/extension.js");
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const lsp = {
    onNotification: vi.fn(() => ({ dispose: () => {} })),
    sendRequest: vi.fn(async () => ({ contracts: { query: { version: "1" } } })),
  } as unknown as LanguageClient;
  const languageClient = new StubLanguageClient(lsp, false);
  const activated: string[] = [];
  let disposed = 0;
  const feature: ClientFeature = {
    id: "test.feature",
    activate: () => {
      activated.push("test.feature");
      return { dispose: () => { disposed += 1; } };
    },
  };

  await activate(stubExtensionContext(stubVscode), {
    vscode,
    languageClient: languageClient as never,
    features: [feature],
  });
  expect(activated).toEqual([]);
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);

  languageClient.setActive(true);
  await settleAsyncWork();
  expect(activated).toEqual(["test.feature"]);
  expect(recorded.contextValues.get("aurelia.active")).toBe(true);

  languageClient.setActive(false);
  await settleAsyncWork();
  expect(disposed).toBe(1);
  expect(recorded.contextValues.get("aurelia.active")).toBe(false);

  await deactivate();
});

activationTest("scopes editor contributions to the active document's owning session", async () => {
  const { activate, deactivate } = await import("../../out/extension.js");
  const { vscode: stubVscode, recorded } = createVscodeApi({
    activeTextEditor: {
      document: { uri: "placeholder" },
    },
  });
  const vscode = stubVscode as unknown as VscodeApi;
  stubVscode.window.activeTextEditor = {
    document: { uri: stubVscode.Uri.parse("file:///workspace/src/app.html") },
  };
  const lsp = {
    onNotification: vi.fn(() => ({ dispose: () => {} })),
    sendRequest: vi.fn(async () => ({ contracts: { query: { version: "1" } } })),
  } as unknown as LanguageClient;
  const languageClient = new StubLanguageClient(lsp);

  await activate(stubExtensionContext(stubVscode), {
    vscode,
    languageClient: languageClient as never,
    features: [],
  });
  expect(recorded.contextValues.get("aurelia.active")).toBe(true);
  expect(recorded.contextValues.get("aurelia.documentOwned")).toBe(true);

  recorded.fireActiveTextEditorChanged({
    document: { uri: stubVscode.Uri.parse("file:///plain/src/plain.ts") },
  });
  await settleAsyncWork();
  expect(recorded.contextValues.get("aurelia.active")).toBe(true);
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

  await deactivate();
});

activationTest("deactivates feature work that completes after its session generation retires", async () => {
  const { activate, deactivate } = await import("../../out/extension.js");
  const { vscode: stubVscode } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const executeCommand = stubVscode.commands.executeCommand;
  let blockInactiveContext = false;
  let inactiveContextRequests = 0;
  let releaseInactiveContext!: () => void;
  const inactiveContext = new Promise<void>((resolve) => {
    releaseInactiveContext = resolve;
  });
  stubVscode.commands.executeCommand = async (command, ...args) => {
    if (blockInactiveContext && command === "setContext" && args[0] === "aurelia.active" && args[1] === false) {
      inactiveContextRequests += 1;
      await inactiveContext;
    }
    return executeCommand(command, ...args);
  };
  const lsp = {
    onNotification: vi.fn(() => ({ dispose: () => {} })),
    sendRequest: vi.fn(async () => ({ contracts: { query: { version: "1" } } })),
  } as unknown as LanguageClient;
  const languageClient = new StubLanguageClient(lsp, false);
  let activationStarted = false;
  let resolveActivation!: () => void;
  const activationGate = new Promise<void>((resolve) => {
    resolveActivation = resolve;
  });
  let disposals = 0;
  const feature: ClientFeature = {
    id: "test.slow",
    activate: async () => {
      activationStarted = true;
      await activationGate;
      return { dispose: () => { disposals += 1; } };
    },
  };

  await activate(stubExtensionContext(stubVscode), {
    vscode,
    languageClient: languageClient as never,
    features: [feature],
  });
  languageClient.setActive(true);
  await vi.waitFor(() => expect(activationStarted).toBe(true));
  blockInactiveContext = true;
  languageClient.setActive(false);
  resolveActivation();
  await vi.waitFor(() => expect(inactiveContextRequests).toBe(1));

  expect(disposals).toBe(1);
  releaseInactiveContext();
  await settleAsyncWork();
  await deactivate();
});

async function settleAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
