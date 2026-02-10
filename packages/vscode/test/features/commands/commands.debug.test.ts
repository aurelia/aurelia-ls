import { test, expect } from "vitest";
import { registerCommands } from "../../../out/commands.js";
import { VirtualDocProvider } from "../../../out/virtual-docs.js";
import { QueryClient } from "../../../out/core/query-client.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import type { LspFacade } from "../../../out/core/lsp-facade.js";
import { createVscodeApi, stubExtensionContext, type StubVscodeApi } from "../../helpers/vscode-stub.js";
import { createTestObservability } from "../../helpers/test-helpers.js";

// TODO: Re-enable broader command flow coverage once VS Code runtime harness exists.
class StubLsp {
  #responders: Record<string, unknown>;
  calls: Array<{ method: string; params?: unknown }> = [];

  constructor(responders: Record<string, unknown> = {}) {
    this.#responders = responders;
  }

  async getOverlay(uri: string) {
    return this.#respond("aurelia/getOverlay", { uri });
  }

  async getMapping(uri: string) {
    return this.#respond("aurelia/getMapping", { uri });
  }

  async getSsr(uri: string) {
    return this.#respond("aurelia/getSsr", { uri });
  }

  async queryAtPosition(uri: string, position: { line: number; character: number }) {
    return this.#respond("aurelia/queryAtPosition", { uri, position });
  }

  async dumpState() {
    return this.#respond("aurelia/dumpState", {});
  }

  #respond(method: string, params: unknown) {
    this.calls.push({ method, params });
    const responder = this.#responders[method];
    if (typeof responder === "function") {
      return (responder as (args: unknown) => unknown)(params);
    }
    return responder ?? null;
  }
}

function setActiveEditor(vscode: StubVscodeApi, uri: { toString(): string }) {
  vscode.window.activeTextEditor = {
    document: { uri, toString: () => uri.toString(), version: 7 },
    selection: { active: { line: 0, character: 0 } },
  };
}

function createHarness(responders: Record<string, unknown> = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const { observability, logger } = createTestObservability(vscode);
  const lsp = new StubLsp(responders);
  const queries = new QueryClient(lsp as unknown as LspFacade, observability);
  const virtualDocs = new VirtualDocProvider(vscode);
  const context = stubExtensionContext(stubVscode);

  registerCommands(context, queries, virtualDocs, observability, vscode);

  return { stubVscode, recorded, queries, lsp, virtualDocs, logger };
}

test.skip("showOverlay opens a virtual overlay document beside the active editor", async () => {
  const overlayPath = "/workspace/component.overlay.ts";
  const overlayText = "export const value = 1;";
  const { stubVscode, recorded, lsp, virtualDocs } = createHarness({
    "aurelia/getOverlay": {
      artifact: {
        overlay: { path: overlayPath, text: overlayText },
        mapping: { entries: [] },
        calls: [],
      },
    },
  });
  const activeUri = stubVscode.Uri.parse("file:///component.html");
  setActiveEditor(stubVscode, activeUri);

  await recorded.commandHandlers.get("aurelia.showOverlay")();

  expect(lsp.calls[0]?.method).toBe("aurelia/getOverlay");
  const opened = recorded.openedDocuments.at(-1);
  expect(opened?.uri.toString().startsWith("aurelia-overlay:")).toBe(true);
  expect(
    virtualDocs.provideTextDocumentContent(opened!.uri as unknown as import("vscode").Uri),
  ).toBe(overlayText);
  const shown = recorded.shownDocuments.at(-1) as { opts?: { viewColumn?: number } };
  expect(shown?.opts?.viewColumn).toBe(stubVscode.ViewColumn.Beside);
});

test.skip("showOverlayMapping uses mapping entries when present", async () => {
  const { stubVscode, recorded, lsp } = createHarness({
    "aurelia/getMapping": { overlayPath: "/workspace/component.overlay.ts", mapping: { entries: [
      { exprId: "1", overlaySpan: { start: 5, end: 10 }, htmlSpan: { start: 2, end: 7 } },
    ] } },
  });
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  await recorded.commandHandlers.get("aurelia.showOverlayMapping")();

  expect(lsp.calls.find((call) => call.method === "aurelia/getMapping")).toBeTruthy();
  const mappingDoc = recorded.openedDocuments.at(-1);
  const mappingText = mappingDoc?.getText?.() ?? mappingDoc?.text ?? "";
  expect(mappingText).toContain("# Mapping Artifact");
  expect(mappingText).toContain("expr=1");
});

test("showTemplateInfo sends a position query with doc version", async () => {
  const { stubVscode, recorded, lsp } = createHarness({
    "aurelia/queryAtPosition": {
      expr: { exprId: "e1" },
      node: { kind: "element" },
      controller: { kind: "repeat" },
      bindables: [{ name: "items" }],
      mappingSize: 5,
    },
  });
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  await recorded.commandHandlers.get("aurelia.showTemplateInfo")();

  const call = lsp.calls.find((c) => c.method === "aurelia/queryAtPosition");
  expect(call?.params).toHaveProperty("position");
});

test.skip("showSsrPreview opens HTML and manifest documents", async () => {
  const ssrHtml = "<div>rendered</div>";
  const ssrManifest = "{\"scopes\":[]}";
  const { stubVscode, recorded, lsp } = createHarness({
    "aurelia/getSsr": { artifact: { html: { path: "/component.ssr.html", text: ssrHtml }, manifest: { path: "/component.manifest.json", text: ssrManifest } } },
  });
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  await recorded.commandHandlers.get("aurelia.showSsrPreview")();

  expect(lsp.calls[0]?.method).toBe("aurelia/getSsr");
  expect(recorded.openedDocuments).toHaveLength(2);
});

test("commands show message when no active editor", async () => {
  const { recorded } = createHarness();
  await recorded.commandHandlers.get("aurelia.showOverlay")();
  await recorded.commandHandlers.get("aurelia.showSsrPreview")();
  await recorded.commandHandlers.get("aurelia.showTemplateInfo")();
  expect(recorded.infoMessages.filter((m: string) => m === "No active editor")).toHaveLength(3);
});

test.skip("showOverlay reports errors via error reporter", async () => {
  const { stubVscode, recorded } = createHarness({
    "aurelia/getOverlay": () => { throw new Error("Server crashed"); },
  });
  setActiveEditor(stubVscode, stubVscode.Uri.parse("file:///component.html"));

  await recorded.commandHandlers.get("aurelia.showOverlay")();

  expect(recorded.errorMessages[0]).toContain("command.showOverlay");
  expect(recorded.errorMessages[0]).toContain("Server crashed");
});

test.skip("dumpState logs result to output", async () => {
  const { recorded, logger } = createHarness({ "aurelia/dumpState": { templates: 3 } });
  await recorded.commandHandlers.get("aurelia.dumpState")();
  const logLines = (logger.channel as unknown as { lines: string[] }).lines;
  expect(logLines.some((line: string) => line.includes("\"templates\": 3"))).toBe(true);
});
