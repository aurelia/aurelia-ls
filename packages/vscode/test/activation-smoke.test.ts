import { test, expect } from "vitest";
import { activate, deactivate, type ActivationServices } from "../out/extension.js";
import { VirtualDocProvider } from "../out/virtual-docs.js";
import { ClientLogger } from "../out/log.js";
import type { VscodeApi } from "../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext } from "./helpers/vscode-stub.js";

class StubStatusService {
  overlays = [];
  disposed = false;
  idleCalled = false;

  overlayReady(payload) {
    this.overlays.push(payload);
  }

  idle() {
    this.idleCalled = true;
  }

  dispose() {
    this.disposed = true;
  }
}

class StubLspClient {
  notifications = new Map();

  onNotification(method, handler) {
    this.notifications.set(method, handler);
  }

  trigger(method, payload) {
    this.notifications.get(method)?.(payload);
  }
}

class StubAureliaLanguageClient {
  startCalls = 0;
  stopCalls = 0;
  lsp;

  constructor(lsp) {
    this.lsp = lsp;
  }

  async start() {
    this.startCalls += 1;
    return this.lsp;
  }

  async stop() {
    this.stopCalls += 1;
  }
}

test("activate wires language client, commands, and notifications", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const lsp = new StubLspClient();
  const languageClient = new StubAureliaLanguageClient(lsp);
  const status = new StubStatusService();
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);

  await activate(context, { vscode, languageClient, status, virtualDocs, logger } as unknown as ActivationServices);

  expect(languageClient.startCalls, "language client should be started").toBe(1);
  expect(recorded.contentProviders.some((p) => p.scheme === "aurelia-overlay"), "virtual doc provider registered").toBe(true);
  for (const command of [
    "aurelia.showOverlay",
    "aurelia.showOverlayMapping",
    "aurelia.showTemplateInfo",
    "aurelia.dumpState",
  ]) {
    expect(recorded.registeredCommands, `${command} should be registered`).toContain(command);
  }

  const payload = { uri: "file:///component.html", calls: 2, diags: 1 };
  lsp.trigger("aurelia/overlayReady", payload);
  expect(status.overlays.length, "overlayReady should be forwarded to status").toBe(1);
  expect(status.overlays[0]).toEqual(payload);

  await deactivate();
  expect(languageClient.stopCalls, "language client should be stopped on deactivate").toBe(1);
});
