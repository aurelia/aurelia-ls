import { test, expect, vi } from "vitest";
import type { LanguageClient } from "vscode-languageclient/node.js";
import type { FeatureModule } from "../../out/core/feature-graph.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext } from "../helpers/vscode-stub.js";

class StubLanguageClient {
  startCalls = 0;
  stopCalls = 0;
  #lsp: LanguageClient;

  constructor(lsp: LanguageClient) {
    this.#lsp = lsp;
  }

  async start() {
    this.startCalls += 1;
    return this.#lsp;
  }

  async stop() {
    this.stopCalls += 1;
  }
}

const activationTest = process.env.VSCODE_RUNNER ? test : test.skip;

// Requires VS Code runtime (vscode module) via @vscode/test-electron.
activationTest("activate wires language client and feature graph", async () => {
  const { activate, deactivate } = await import("../../out/extension.js");
  const { vscode: stubVscode } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const lsp = {
    onNotification: vi.fn(),
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

  await activate(context, { vscode, languageClient, features: [feature] });

  expect(languageClient.startCalls).toBe(1);
  expect(activated).toEqual(["test.feature"]);

  await deactivate();
  expect(languageClient.stopCalls).toBe(1);
});
