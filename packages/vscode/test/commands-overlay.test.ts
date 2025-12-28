import { test, expect } from "vitest";
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

  expect(client.calls[0]?.method, "overlay request should be sent").toBe("aurelia/getOverlay");
  const opened = recorded.openedDocuments.at(-1);
  expect(opened?.uri.toString().startsWith("aurelia-overlay:"), "virtual document should use overlay scheme").toBe(true);
  expect(virtualDocs.provideTextDocumentContent(opened.uri), "virtual document should contain overlay text").toBe(overlayText);
  const shown = recorded.shownDocuments.at(-1);
  expect(shown?.opts?.viewColumn, "overlay should open beside the template").toBe(vscode.ViewColumn.Beside);
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
  expect(mappingCall, "mapping request should be issued").toBeTruthy();
  expect(client.calls.some((c) => c.method === "aurelia/getOverlay"), "overlay fallback should not run when mapping exists").toBe(false);
  const mappingDoc = recorded.openedDocuments.at(-1);
  const mappingText = mappingDoc?.getText?.() ?? mappingDoc?.text ?? "";
  expect(mappingText, "mapping view should be markdown").toContain("# Mapping Artifact");
  expect(mappingText, "mapping view should list mapping entries").toContain("expr=1");
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
  expect(overlayCall, "overlay fallback should be triggered").toBeTruthy();
  const mappingDoc = recorded.openedDocuments.at(-1);
  const mappingText = mappingDoc?.getText?.() ?? mappingDoc?.text ?? "";
  expect(mappingText, "fallback view should be labeled as overlay mapping").toContain("# Overlay Mapping");
  expect(mappingText, "overlay call site should be listed").toContain("expr-1");
});
