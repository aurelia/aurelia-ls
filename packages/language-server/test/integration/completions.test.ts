/**
 * Completions integration tests.
 *
 * Tests that the language server provides completions for Aurelia templates.
 */
import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COMPLETION_GAP_MARKER_LABEL } from "@aurelia-ls/language-server/api";
import {
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
  test("provides completions for view-model properties in interpolation", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          types: [],
        },
        files: ["component.ts"],
      }),
      "component.ts": [
        "export class Component {",
        "  message: string = 'Hello';",
        "  count: number = 42;",
        "}",
      ].join("\n"),
      "component.html": "<template>${m}</template>",
    });

    const htmlUri = fileUri(fixture, "component.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "component.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      // Position after the "m" in ${m}
      const pos = positionAt(htmlText, htmlText.indexOf("m}"));

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: pos,
      });

      const completionList = expectCompletionList(completions);
      expect(completionList.isIncomplete).toBe(false);
      const items = completionList.items;
      expect(items.length).toBeGreaterThan(0);

      // Check that 'message' is in the completions
      const labels = items.map((item) => item.label);
      expect(labels).toContain("message");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("provides completions for different view-model property", async () => {
    // Similar to first test but with 'c' prefix to match 'count' property
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          types: [],
        },
        files: ["app.ts"],
      }),
      "app.ts": [
        "export class App {",
        "  counter: number = 0;",
        "  greeting: string = 'Hello';",
        "}",
      ].join("\n"),
      // Use 'c' prefix to match 'counter'
      "app.html": "<template>${c}</template>",
    });

    const htmlUri = fileUri(fixture, "app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      // Position right after the "c" in ${c}
      const pos = positionAt(htmlText, htmlText.indexOf("c}"));

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: pos,
      });

      const completionList = expectCompletionList(completions);
      expect(completionList.isIncomplete).toBe(false);
      const labels = completionList.items.map((item) => item.label);

      // Should include counter which matches the prefix
      expect(labels).toContain("counter");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("returns empty completion list when no context available", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          types: [],
        },
        files: ["component.ts"],
      }),
      "component.ts": "export class Component {}",
      "component.html": "<template>plain text</template>",
    });

    const htmlUri = fileUri(fixture, "component.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "component.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      // Position in plain text (not in an interpolation or binding)
      const pos = positionAt(htmlText, htmlText.indexOf("plain"));

      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: pos,
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

  test("completes module specifiers for <import from>", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          experimentalDecorators: true,
          types: [],
        },
        files: ["app.ts", "views/summary-panel.ts"],
      }),
      "app.ts": [
        "import { customElement } from 'aurelia';",
        "@customElement({ name: 'app-root' })",
        "export class AppRoot {}",
      ].join("\n"),
      "views/summary-panel.ts": [
        "import { customElement } from 'aurelia';",
        "@customElement({ name: 'summary-panel' })",
        "export class SummaryPanel {}",
      ].join("\n"),
      "app.html": [
        "<import from=\"./views/s\"></import>",
        "<summary-panel></summary-panel>",
      ].join("\n"),
    });

    const htmlUri = fileUri(fixture, "app.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "app.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

      const pos = positionAt(htmlText, htmlText.indexOf("./views/s") + "./views/s".length);
      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: pos,
      });

      const completionList = expectCompletionList(completions);
      expect(completionList.isIncomplete).toBe(false);
      const labels = completionList.items.map((item) => item.label);
      expect(labels).toContain("./views/summary-panel");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("signals incomplete list and non-actionable gap marker when diagnostics report analysis gaps", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          types: [],
        },
        files: ["component.ts"],
      }),
      "component.ts": [
        "export class Component {",
        "  message: string = 'Hello';",
        "}",
      ].join("\n"),
      "component.html": [
        "<import from=\"./missing-resource\"></import>",
        "<missing-element></missing-element>",
        "<template>${m}</template>",
      ].join("\n"),
    });

    const htmlUri = fileUri(fixture, "component.html");
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const htmlText = fs.readFileSync(path.join(fixture, "component.html"), "utf8");
      await openDocument(connection, htmlUri, "html", htmlText);
      const diagnostics = await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);
      expect(diagnostics.length).toBeGreaterThan(0);

      const pos = positionAt(htmlText, htmlText.indexOf("m}"));
      const completions = await connection.sendRequest("textDocument/completion", {
        textDocument: { uri: htmlUri },
        position: pos,
      });

      const completionList = expectCompletionList(completions);
      expect(completionList.isIncomplete).toBe(true);
      expect(completionList.items.length).toBeGreaterThan(0);
      expect(completionList.items.map((item) => item.label)).toContain("message");

      const marker = completionList.items.find((item) => item.label === COMPLETION_GAP_MARKER_LABEL);
      expect(marker).toBeDefined();
      expect(marker?.insertText).toBe("");
      expect(completionList.items.at(-1)?.label).toBe(COMPLETION_GAP_MARKER_LABEL);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
