import { test, expect, vi } from "vitest";
import type { LanguageClient } from "vscode-languageclient/node";
import type { FeatureModule } from "../../out/core/feature-graph.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext } from "../helpers/vscode-stub.js";

class StubLanguageClient {
  startCalls = 0;
  stopCalls = 0;
  #lsp: LanguageClient;
  sessions: unknown[];
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
  sessionForUri() { return this.sessions[0]; }
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
    for (const listener of this.#listeners) listener();
  }
}

const activationTest = test;

activationTest("activate wires language client and feature graph", async () => {
  const { activate, deactivate } = await import("../../out/extension.js");
  const { vscode: stubVscode } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const lsp = {
    onNotification: vi.fn(() => ({ dispose: () => {} })),
    sendRequest: vi.fn(async () => null),
  } as unknown as LanguageClient;
  const languageClient = new StubLanguageClient(lsp);
  const activated: string[] = [];
  const feature: FeatureModule = {
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
  const feature: FeatureModule = {
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

async function settleAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
