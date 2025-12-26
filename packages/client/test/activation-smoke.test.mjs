import test from "node:test";
import assert from "node:assert/strict";
import { activate, deactivate } from "../out/extension.js";
import { VirtualDocProvider } from "../out/virtual-docs.js";
import { ClientLogger } from "../out/log.js";
import { createVscodeApi } from "./helpers/vscode-stub.mjs";

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
  const { vscode, recorded } = createVscodeApi();
  const lsp = new StubLspClient();
  const languageClient = new StubAureliaLanguageClient(lsp);
  const status = new StubStatusService();
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = { extensionUri: vscode.Uri.parse("file:///ext"), subscriptions: [] };

  await activate(context, { vscode, languageClient, status, virtualDocs, logger });

  assert.equal(languageClient.startCalls, 1, "language client should be started");
  assert.ok(recorded.contentProviders.some((p) => p.scheme === "aurelia-overlay"), "virtual doc provider registered");
  for (const command of [
    "aurelia.showOverlay",
    "aurelia.showOverlayMapping",
    "aurelia.showTemplateInfo",
    "aurelia.dumpState",
  ]) {
    assert.ok(recorded.registeredCommands.includes(command), `${command} should be registered`);
  }

  const payload = { uri: "file:///component.html", calls: 2, diags: 1 };
  lsp.trigger("aurelia/overlayReady", payload);
  assert.equal(status.overlays.length, 1, "overlayReady should be forwarded to status");
  assert.deepEqual(status.overlays[0], payload);

  await deactivate();
  assert.equal(languageClient.stopCalls, 1, "language client should be stopped on deactivate");
});
