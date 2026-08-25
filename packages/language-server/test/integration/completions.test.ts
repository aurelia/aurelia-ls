/**
 * Completion integration tests for the semantic-runtime-backed LSP lane.
 */
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CompletionItemTag } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  createAureliaAppFixture,
  createFixture,
  fileUri,
  initialize,
  openDocument,
  positionAt,
  startServer,
  waitForDiagnostics,
  waitForExit,
} from "./helpers/lsp-harness.js";

type CompletionListItem = {
  label?: string;
  insertText?: string;
  detail?: string;
  sortText?: string;
  tags?: number[];
  textEdit?: {
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  };
};

type CompletionListResponse = {
  isIncomplete: boolean;
  items: CompletionListItem[];
};

function expectCompletionList(response: unknown): CompletionListResponse {
  expect(Array.isArray(response)).toBe(false);
  const list = response as { isIncomplete?: unknown; items?: unknown };
  expect(typeof list.isIncomplete).toBe("boolean");
  expect(Array.isArray(list.items)).toBe(true);
  return list as CompletionListResponse;
}

describe("Completions", () => {
  test("provides semantic-runtime view-model member completions in interpolation", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot {",
        "  message: string = 'Hello';",
        "  count: number = 42;",
        "}",
      ].join("\n"),
      "src/app.html": "<main>${m}</main>",
    });

    const htmlUri = fileUri(fixture, "src/app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, htmlText.indexOf("m}") + 1),
      });

      const completionList = expectCompletionList(completions);
      expect(completionList.isIncomplete).toBe(false);
      expect(completionList.items.map((item) => item.label)).toContain("message");
      const message = completionList.items.find((item) => item.label === "message");
      expect(message?.textEdit).toBeDefined();
      const document = TextDocument.create(htmlUri, "html", 1, htmlText);
      const edit = message?.textEdit;
      if (edit == null) {
        throw new Error("Expected message completion to carry an authored text edit.");
      }
      expect(document.getText(edit.range)).toBe("m");
      const edited = htmlText.slice(0, document.offsetAt(edit.range.start))
        + edit.newText
        + htmlText.slice(document.offsetAt(edit.range.end));
      expect(edited).toBe("<main>${message}</main>");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("maps empty and partial member frontiers to cursor-local edits", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import type { CatalogItem } from './models';",
        "import template from './app.html';",
        "@customElement({ name: 'product-card', template })",
        "export class AppRoot {",
        "  item: CatalogItem | null = null;",
        "  labelText = 'Catalog';",
        "}",
      ].join("\n"),
      "src/models.ts": [
        "export interface CatalogItem {",
        "  readonly sku: string;",
        "  readonly name: string;",
        "  readonly description: string;",
        "  readonly quantity: number;",
        "  readonly tone: 'fresh' | 'warning' | 'empty';",
        "  readonly tags: readonly string[];",
        "}",
      ].join("\n"),
      "src/app.html": [
        '<p if.bind="item">${item.description} ${item.}</p>',
        '<p if.bind="item">${item.de}</p>',
        '<span>${lab}</span>',
      ].join("\n"),
    });

    const htmlUri = fileUri(fixture, "src/app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);
      const document = TextDocument.create(htmlUri, "html", 1, htmlText);
      const completionAt = async (offset: number): Promise<CompletionListResponse> =>
        expectCompletionList(await connection.sendRequest("textDocument/completion", {
          textDocument: { uri: htmlUri },
          position: positionAt(htmlText, offset),
        }));
      const requiredItem = (
        response: CompletionListResponse,
        label: string,
      ): CompletionListItem & { textEdit: NonNullable<CompletionListItem["textEdit"]> } => {
        const item = response.items.find((candidate) => candidate.label === label);
        if (item?.textEdit == null) {
          throw new Error(`Expected '${label}' completion to carry an authored text edit.`);
        }
        return item as CompletionListItem & { textEdit: NonNullable<CompletionListItem["textEdit"]> };
      };

      const emptyMarker = '${item.description} ${item.}</p>';
      const emptyMarkerStart = htmlText.indexOf(emptyMarker);
      const emptyOffset = emptyMarkerStart
        + emptyMarker.lastIndexOf('${item.')
        + '${item.'.length;
      const empty = await completionAt(emptyOffset);
      expect(empty.items.map((item) => item.label)).toEqual([
        "description",
        "name",
        "quantity",
        "sku",
        "tags",
        "tone",
      ]);
      const emptyDescription = requiredItem(empty, "description");
      expect(emptyDescription.textEdit.range).toEqual({
        start: positionAt(htmlText, emptyOffset),
        end: positionAt(htmlText, emptyOffset),
      });
      expect(document.getText(emptyDescription.textEdit.range)).toBe("");

      const partialMarker = '${item.de}</p>';
      const partialStart = htmlText.indexOf(partialMarker);
      const partialOffset = partialStart + '${item.de'.length;
      const partial = await completionAt(partialOffset);
      expect(partial.items.map((item) => item.label)).toEqual([
        "description",
        "name",
        "quantity",
        "sku",
        "tags",
        "tone",
      ]);
      const partialDescription = requiredItem(partial, "description");
      expect(document.getText(partialDescription.textEdit.range)).toBe("de");
      expect(partialDescription.textEdit.range.end).toEqual(positionAt(htmlText, partialOffset));

      const expressionOffset = htmlText.indexOf('${lab}') + '${lab'.length;
      const expression = requiredItem(await completionAt(expressionOffset), "labelText");
      expect(document.getText(expression.textEdit.range)).toBe("lab");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("lists the exact TodoTask surface after a member dot without root globals", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "interface TodoTask {",
        "  id: number;",
        "  title: string;",
        "  listId: number;",
        "  tagIds: number[];",
        "  completed: boolean;",
        "  toggle(): void;",
        "}",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot {",
        "  heading = 'Tasks';",
        "  task!: TodoTask;",
        "}",
      ].join("\n"),
      "src/app.html": "<p>${task.}</p>",
    });
    const htmlUri = fileUri(fixture, "src/app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);
      const completionList = expectCompletionList(await connection.sendRequest(
        "textDocument/completion",
        {
          textDocument: { uri: htmlUri },
          position: positionAt(htmlText, htmlText.indexOf("task.") + "task.".length),
        },
      ));

      expect(completionList.isIncomplete).toBe(false);
      expect(completionList.items.map((item) => item.label)).toEqual([
        "completed",
        "id",
        "listId",
        "tagIds",
        "title",
        "toggle",
      ]);
      expect(completionList.items.map((item) => item.label)).not.toContain("heading");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("presents authorable hostile and stockText surfaces through the real stdio server", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot {",
        "  stockText: string = 'In stock';",
        "  hostElement: HTMLElement = null!;",
        "  protected protectedStockText: string = 'Protected';",
        "  private privateStockText: string = 'Private';",
        "  #ecmaPrivateStockText: string = 'ECMAScript private';",
        "  /** @deprecated Use stockText. */",
        "  legacyStockText: string = 'Legacy';",
        "  binding(): void {}",
        "  [Symbol.iterator](): IterableIterator<string> {",
        "    return [this.stockText][Symbol.iterator]();",
        "  }",
        "}",
      ].join("\n"),
      "src/app.html": [
        "<p>${s}</p>",
        "<p>${stockText.}</p>",
        "<p>${hostElement.}</p>",
      ].join("\n"),
    });

    const htmlUri = fileUri(fixture, "src/app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);
      const completionAt = async (marker: string): Promise<CompletionListResponse> =>
        expectCompletionList(await connection.sendRequest("textDocument/completion", {
          textDocument: { uri: htmlUri },
          position: positionAt(htmlText, htmlText.indexOf(marker) + marker.length),
        }));

      const root = await completionAt("${s");
      const rootLabels = root.items.map((item) => item.label ?? "");
      expect(rootLabels).toContain("stockText");
      expect(rootLabels).toContain("protectedStockText");
      expect(rootLabels).toContain("privateStockText");
      expect(rootLabels).toContain("binding");
      expect(rootLabels).toContain("legacyStockText");
      expect(rootLabels.some((label) => label.startsWith("__@"))).toBe(false);
      expect(rootLabels.some((label) => label.startsWith("__#"))).toBe(false);
      expect(rootLabels).not.toContain("#ecmaPrivateStockText");
      const rootOrdinal = (label: string): number => rootLabels.indexOf(label);
      expect(rootOrdinal("stockText")).toBeLessThan(rootOrdinal("binding"));
      expect(rootOrdinal("binding")).toBeLessThan(rootOrdinal("protectedStockText"));
      expect(rootOrdinal("protectedStockText")).toBeLessThan(rootOrdinal("privateStockText"));
      expect(rootOrdinal("privateStockText")).toBeLessThan(rootOrdinal("legacyStockText"));
      const stockText = root.items.find((item) => item.label === "stockText");
      const legacyStockText = root.items.find((item) => item.label === "legacyStockText");
      expect(stockText?.sortText).toMatch(/^\d+$/u);
      expect(legacyStockText?.sortText).toMatch(/^\d+$/u);
      expect((legacyStockText?.sortText ?? "") > (stockText?.sortText ?? "")).toBe(true);
      expect(legacyStockText?.tags).toEqual([CompletionItemTag.Deprecated]);

      const primitive = await completionAt("${stockText.");
      const primitiveLabels = primitive.items.map((item) => item.label ?? "");
      expect(primitiveLabels.length).toBeGreaterThan(20);
      expect(primitiveLabels).toContain("length");
      expect(primitiveLabels).toContain("toUpperCase");
      expect(primitiveLabels.some((label) => label.startsWith("__@"))).toBe(false);
      const anchor = primitive.items.find((item) => item.label === "anchor");
      expect(anchor?.tags).toEqual([CompletionItemTag.Deprecated]);
      expect(primitiveLabels.indexOf("toUpperCase")).toBeLessThan(primitiveLabels.indexOf("anchor"));

      const dom = await completionAt("${hostElement.");
      const domLabels = dom.items.map((item) => item.label ?? "");
      expect(domLabels.length).toBeGreaterThan(200);
      expect(domLabels).toContain("focus");
      expect(domLabels).toContain("title");
      expect(domLabels.some((label) => label.startsWith("__@"))).toBe(false);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("authors composed binding commands only at safe top-level attribute-name loci", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "import { ItemCard } from './item-card';",
        "import { ShadowHost } from './shadow-host';",
        "@customElement({ name: 'app-root', template, dependencies: [ItemCard, ShadowHost] })",
        "export class AppRoot { value: unknown = null; }",
      ].join("\n"),
      "src/app.html": [
        "<template>",
        "  <item-card ite></item-card>",
        "  <li rep></li>",
        "  <item-card ></item-card>",
        "  <item-card item.bind=\"value\"></item-card>",
        "  <shadow-host></shadow-host>",
        "</template>",
      ].join("\n"),
      "src/item-card.ts": [
        "import { bindable, customElement } from 'aurelia';",
        "@customElement({ name: 'item-card', template: '<template></template>' })",
        "export class ItemCard {",
        "  @bindable item: unknown = null;",
        "}",
      ].join("\n"),
      "src/shadow-host.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './shadow-host.html';",
        "import { ShadowRepeat } from './shadow-repeat';",
        "@customElement({ name: 'shadow-host', template, dependencies: [ShadowRepeat] })",
        "export class ShadowHost {}",
      ].join("\n"),
      "src/shadow-host.html": "<template><li rep></li></template>",
      "src/shadow-repeat.ts": [
        "import { templateController } from 'aurelia';",
        "@templateController('repeat')",
        "export class ShadowRepeat {}",
      ].join("\n"),
    });

    const appUri = fileUri(fixture, "src/app.html");
    const shadowUri = fileUri(fixture, "src/shadow-host.html");
    const server = startServer(fixture);

    try {
      await initialize(server.connection, server.child, () => server.getStderr(), fixture);
      const appText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
      const shadowText = fs.readFileSync(path.join(fixture, "src/shadow-host.html"), "utf8");
      openDocument(server.connection, appUri, "html", appText);
      openDocument(server.connection, shadowUri, "html", shadowText);
      await waitForDiagnostics(server.connection, server.child, () => server.getStderr(), appUri, 5000);
      await waitForDiagnostics(server.connection, server.child, () => server.getStderr(), shadowUri, 5000);

      const completionAt = async (
        uri: string,
        text: string,
        offset: number,
        label: string,
      ): Promise<CompletionListItem & { textEdit: NonNullable<CompletionListItem["textEdit"]> }> => {
        const response = await server.connection.sendRequest("textDocument/completion", {
          textDocument: { uri },
          position: positionAt(text, offset),
        });
        const item = expectCompletionList(response).items.find((candidate) => candidate.label === label);
        if (item?.textEdit == null) {
          throw new Error(`Expected '${label}' completion to carry an authored text edit.`);
        }
        return item as CompletionListItem & { textEdit: NonNullable<CompletionListItem["textEdit"]> };
      };
      const apply = (
        uri: string,
        text: string,
        item: CompletionListItem & { textEdit: NonNullable<CompletionListItem["textEdit"]> },
      ): string => {
        const document = TextDocument.create(uri, "html", 1, text);
        return text.slice(0, document.offsetAt(item.textEdit.range.start))
          + item.textEdit.newText
          + text.slice(document.offsetAt(item.textEdit.range.end));
      };

      const bindableOffset = appText.indexOf("<item-card ite") + "<item-card ite".length;
      const bindable = await completionAt(appUri, appText, bindableOffset, "item");
      expect(TextDocument.create(appUri, "html", 1, appText).getText(bindable.textEdit.range)).toBe("ite");
      expect(bindable.textEdit.newText).toBe("item.bind");
      expect(apply(appUri, appText, bindable)).toContain("<item-card item.bind></item-card>");

      const repeatOffset = appText.indexOf("<li rep") + "<li rep".length;
      const repeat = await completionAt(appUri, appText, repeatOffset, "repeat");
      expect(TextDocument.create(appUri, "html", 1, appText).getText(repeat.textEdit.range)).toBe("rep");
      expect(repeat.textEdit.newText).toBe("repeat.for");
      expect(apply(appUri, appText, repeat)).toContain("<li repeat.for></li>");

      const insertionOffset = appText.indexOf("<item-card >") + "<item-card ".length;
      const insertion = await completionAt(appUri, appText, insertionOffset, "item");
      expect(TextDocument.create(appUri, "html", 1, appText).getText(insertion.textEdit.range)).toBe("");
      expect(insertion.textEdit.newText).toBe("item.bind");
      expect(apply(appUri, appText, insertion)).toContain("<item-card item.bind></item-card>");

      const existingCommandStart = appText.lastIndexOf("item.bind");
      const existing = await completionAt(appUri, appText, existingCommandStart + 2, "item");
      expect(TextDocument.create(appUri, "html", 1, appText).getText(existing.textEdit.range)).toBe("item");
      expect(existing.textEdit.newText).toBe("item");
      expect(apply(appUri, appText, existing)).toBe(appText);

      const shadowOffset = shadowText.indexOf("<li rep") + "<li rep".length;
      const shadowRepeat = await completionAt(shadowUri, shadowText, shadowOffset, "repeat");
      expect(TextDocument.create(shadowUri, "html", 1, shadowText).getText(shadowRepeat.textEdit.range)).toBe("rep");
      expect(shadowRepeat.textEdit.newText).toBe("repeat");
      expect(apply(shadowUri, shadowText, shadowRepeat)).toContain("<li repeat></li>");
    } finally {
      server.dispose();
      server.child.kill("SIGKILL");
      await waitForExit(server.child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("uses open editor buffers instead of stale disk text", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot {",
        "  message: string = 'Hello';",
        "}",
      ].join("\n"),
      "src/app.html": "<main>${message}</main>",
    });

    const htmlUri = fileUri(fixture, "src/app.html");
    const tsUri = fileUri(fixture, "src/app.ts");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = "<main>${t}</main>";
      const tsText = [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot {",
        "  title: string = 'Open buffer';",
        "}",
      ].join("\n");
      await openDocument(connection, tsUri, "typescript", tsText);
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, htmlText.indexOf("t}") + 1),
      });

      const labels = expectCompletionList(completions).items.map((item) => item.label);
      expect(labels).toContain("title");
      expect(labels).not.toContain("message");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("returns empty completion list when no template completion context is available", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot {}",
      ].join("\n"),
      "src/app.html": "<main>plain text</main>",
    });

    const htmlUri = fileUri(fixture, "src/app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, htmlText.indexOf("plain")),
      });

      expect(expectCompletionList(completions)).toEqual({ isIncomplete: false, items: [] });
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("does not invent a convention resource for unadmitted standalone files", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          types: [],
        },
        files: ["component.ts"],
      }),
      "component.ts": "export class Component { message = 'Hello'; }",
      "component.html": "<template>${m}</template>",
    });

    const htmlUri = fileUri(fixture, "component.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "component.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, htmlText.indexOf("m}") + 1),
      });

      const completionList = expectCompletionList(completions);
      expect(completionList.isIncomplete).toBe(false);
      expect(completionList.items).toEqual([]);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
