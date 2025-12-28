import { test } from "vitest";
import assert from "node:assert/strict";
import { registerCommands } from "../out/commands.js";
import { VirtualDocProvider } from "../out/virtual-docs.js";
import { ClientLogger } from "../out/log.js";
import { createVscodeApi } from "./helpers/vscode-stub.mjs";

class StubLanguageClient {
  #responders;
  calls = [];

  constructor(responders = {}) {
    this.#responders = responders;
  }

  onNotification() {
    /* no-op */
  }

  async sendRequest(method, params) {
    this.calls.push({ method, params });
    const responder = this.#responders[method];
    if (typeof responder === "function") return responder(params);
    return responder ?? null;
  }
}

function setActiveEditor(vscode, uri) {
  vscode.window.activeTextEditor = {
    document: { uri, toString: () => uri.toString() },
    selection: { active: { line: 0, character: 0 } },
  };
}

test("showOverlay opens an overlay virtual document beside the active editor", async () => {
  const { vscode, recorded } = createVscodeApi();
  const overlayPath = "/workspace/component.overlay.ts";
  const overlayText = "export const value = 1;";
  const client = new StubLanguageClient({
    "aurelia/getOverlay": {
      artifact: {
        overlay: { path: overlayPath, text: overlayText },
        mapping: { entries: [] },
        calls: [],
      },
    },
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = { subscriptions: [] };
  const activeUri = vscode.Uri.parse("file:///component.html");
  setActiveEditor(vscode, activeUri);

  vscode.workspace.registerTextDocumentContentProvider(VirtualDocProvider.scheme, virtualDocs);
  registerCommands(context, client, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlay")();

  assert.equal(client.calls[0]?.method, "aurelia/getOverlay", "overlay request should be sent");
  const opened = recorded.openedDocuments.at(-1);
  assert.ok(opened?.uri.toString().startsWith("aurelia-overlay:"), "virtual document should use overlay scheme");
  assert.equal(virtualDocs.provideTextDocumentContent(opened.uri), overlayText, "virtual document should contain overlay text");
  const shown = recorded.shownDocuments.at(-1);
  assert.equal(shown?.opts?.viewColumn, vscode.ViewColumn.Beside, "overlay should open beside the template");
});

test("showOverlayMapping renders mapping entries and avoids overlay fallback when mapping is present", async () => {
  const { vscode, recorded } = createVscodeApi();
  const mappingEntries = [
    { exprId: "1", overlaySpan: { start: 5, end: 10 }, htmlSpan: { start: 2, end: 7 } },
  ];
  const client = new StubLanguageClient({
    "aurelia/getMapping": { overlayPath: "/workspace/component.overlay.ts", mapping: { entries: mappingEntries } },
    "aurelia/getOverlay": null,
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = { subscriptions: [] };
  setActiveEditor(vscode, vscode.Uri.parse("file:///component.html"));

  registerCommands(context, client, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlayMapping")();

  const mappingCall = client.calls.find((c) => c.method === "aurelia/getMapping");
  assert.ok(mappingCall, "mapping request should be issued");
  assert.ok(!client.calls.some((c) => c.method === "aurelia/getOverlay"), "overlay fallback should not run when mapping exists");
  const mappingDoc = recorded.openedDocuments.at(-1);
  const mappingText = mappingDoc?.getText?.() ?? mappingDoc?.text ?? "";
  assert.ok(mappingText.includes("# Mapping Artifact"), "mapping view should be markdown");
  assert.ok(mappingText.includes("expr=1"), "mapping view should list mapping entries");
});

test("showOverlayMapping falls back to overlay call sites when mapping entries are empty", async () => {
  const { vscode, recorded } = createVscodeApi();
  const overlayPath = "/workspace/component.overlay.ts";
  const client = new StubLanguageClient({
    "aurelia/getMapping": { overlayPath, mapping: { entries: [] } },
    "aurelia/getOverlay": {
      artifact: {
        overlay: { path: overlayPath, text: "text" },
        mapping: { entries: [] },
        calls: [{ exprId: "expr-1", overlayStart: 0, overlayEnd: 4, htmlSpan: { start: 1, end: 5 } }],
      },
    },
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = { subscriptions: [] };
  setActiveEditor(vscode, vscode.Uri.parse("file:///component.html"));

  registerCommands(context, client, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlayMapping")();

  const overlayCall = client.calls.find((c) => c.method === "aurelia/getOverlay");
  assert.ok(overlayCall, "overlay fallback should be triggered");
  const mappingDoc = recorded.openedDocuments.at(-1);
  const mappingText = mappingDoc?.getText?.() ?? mappingDoc?.text ?? "";
  assert.ok(mappingText.includes("# Overlay Mapping"), "fallback view should be labeled as overlay mapping");
  assert.ok(mappingText.includes("expr-1"), "overlay call site should be listed");
});
