import { test, expect } from "vitest";
import type { LanguageClient } from "vscode-languageclient/node.js";
import { registerCommands } from "../out/commands.js";
import { VirtualDocProvider } from "../out/virtual-docs.js";
import { ClientLogger } from "../out/log.js";
import type { VscodeApi } from "../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext, type StubVscodeApi } from "./helpers/vscode-stub.js";

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

function setActiveEditor(vscode: StubVscodeApi, uri: { toString(): string }) {
  vscode.window.activeTextEditor = {
    document: { uri, toString: () => uri.toString() },
    selection: { active: { line: 0, character: 0 } },
  };
}

test("showOverlay opens an overlay virtual document beside the active editor", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
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
  const context = stubExtensionContext(stubVscode);
  const activeUri = stubVscode.Uri.parse("file:///component.html");
  setActiveEditor(stubVscode, activeUri);

  stubVscode.workspace.registerTextDocumentContentProvider(VirtualDocProvider.scheme, virtualDocs);
  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlay")();

  expect(client.calls[0]?.method, "overlay request should be sent").toBe("aurelia/getOverlay");
  const opened = recorded.openedDocuments.at(-1);
  expect(opened?.uri.toString().startsWith("aurelia-overlay:"), "virtual document should use overlay scheme").toBe(true);
  expect(virtualDocs.provideTextDocumentContent(opened!.uri as unknown as import("vscode").Uri), "virtual document should contain overlay text").toBe(overlayText);
  const shown = recorded.shownDocuments.at(-1) as { opts?: { viewColumn?: number } };
  expect(shown?.opts?.viewColumn, "overlay should open beside the template").toBe(stubVscode.ViewColumn.Beside);
});

test("showOverlayMapping renders mapping entries and avoids overlay fallback when mapping is present", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const mappingEntries = [
    { exprId: "1", overlaySpan: { start: 5, end: 10 }, htmlSpan: { start: 2, end: 7 } },
  ];
  const client = new StubLanguageClient({
    "aurelia/getMapping": { overlayPath: "/workspace/component.overlay.ts", mapping: { entries: mappingEntries } },
    "aurelia/getOverlay": null,
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
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
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
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
  const context = stubExtensionContext(stubVscode);
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlayMapping")();

  const overlayCall = client.calls.find((c) => c.method === "aurelia/getOverlay");
  expect(overlayCall, "overlay fallback should be triggered").toBeTruthy();
  const mappingDoc = recorded.openedDocuments.at(-1);
  const mappingText = mappingDoc?.getText?.() ?? mappingDoc?.text ?? "";
  expect(mappingText, "fallback view should be labeled as overlay mapping").toContain("# Overlay Mapping");
  expect(mappingText, "overlay call site should be listed").toContain("expr-1");
});

test("showSsrPreview opens HTML and manifest documents side by side", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const ssrHtml = "<div>rendered</div>";
  const ssrManifest = '{"scopes":[]}';
  const client = new StubLanguageClient({
    "aurelia/getSsr": {
      artifact: {
        html: { path: "/component.ssr.html", text: ssrHtml },
        manifest: { path: "/component.manifest.json", text: ssrManifest },
      },
    },
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showSsrPreview")();

  expect(client.calls[0]?.method).toBe("aurelia/getSsr");
  expect(recorded.openedDocuments).toHaveLength(2);
  const htmlDoc = recorded.openedDocuments[0];
  const manifestDoc = recorded.openedDocuments[1];
  expect(htmlDoc?.text).toBe(ssrHtml);
  expect(htmlDoc?.languageId).toBe("html");
  expect(manifestDoc?.text).toBe(ssrManifest);
  expect(manifestDoc?.languageId).toBe("json");
  const lastShown = recorded.shownDocuments.at(-1) as { opts?: { viewColumn?: number } };
  expect(lastShown?.opts?.viewColumn).toBe(stubVscode.ViewColumn.Beside);
});

test("showSsrPreview shows message when no SSR output available", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const client = new StubLanguageClient({ "aurelia/getSsr": null });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showSsrPreview")();

  expect(recorded.infoMessages).toContain("No SSR output for this document");
  expect(recorded.openedDocuments).toHaveLength(0);
});

test("showTemplateInfo displays query result with expression and node info", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const client = new StubLanguageClient({
    "aurelia/queryAtPosition": {
      expr: { exprId: "e1" },
      node: { kind: "element" },
      controller: { kind: "repeat" },
      bindables: [{ name: "items" }],
      mappingSize: 5,
    },
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showTemplateInfo")();

  expect(client.calls[0]?.method).toBe("aurelia/queryAtPosition");
  expect(client.calls[0]?.params).toHaveProperty("position");
  const doc = recorded.openedDocuments.at(-1);
  const text = doc?.text ?? "";
  expect(text).toContain("# Template Info");
  expect(text).toContain("expr: e1");
  expect(text).toContain("node: element");
  expect(text).toContain("controller: repeat");
  expect(text).toContain("bindables: 1");
  expect(text).toContain("mapping entries: 5");
});

test("dumpState sends request and logs result", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const serverState = { templates: 3, resources: 10 };
  const client = new StubLanguageClient({ "aurelia/dumpState": serverState });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.dumpState")();

  expect(client.calls[0]?.method).toBe("aurelia/dumpState");
  expect(recorded.infoMessages).toContain("Dumped state to 'Aurelia LS (Client)' output.");
  const logLines = (logger.channel as unknown as { lines: string[] }).lines;
  expect(logLines.some((line: string) => line.includes('"templates": 3'))).toBe(true);
});

test("showOverlay shows error message when request fails", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const client = new StubLanguageClient({
    "aurelia/getOverlay": () => { throw new Error("Server crashed"); },
  });
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlay")();

  expect(recorded.errorMessages[0]).toContain("Show Generated Overlay failed");
  expect(recorded.errorMessages[0]).toContain("Server crashed");
});

test("commands show message when no active editor", async () => {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const client = new StubLanguageClient({});
  const virtualDocs = new VirtualDocProvider(vscode);
  const logger = new ClientLogger("test", vscode);
  const context = stubExtensionContext(stubVscode);
  // No active editor set

  registerCommands(context, client as unknown as LanguageClient, virtualDocs, logger, vscode);
  await recorded.commandHandlers.get("aurelia.showOverlay")();
  await recorded.commandHandlers.get("aurelia.showSsrPreview")();
  await recorded.commandHandlers.get("aurelia.showTemplateInfo")();

  expect(recorded.infoMessages.filter((m: string) => m === "No active editor")).toHaveLength(3);
  expect(client.calls).toHaveLength(0);
});
