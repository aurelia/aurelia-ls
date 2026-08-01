/**
 * Completion integration tests for the semantic-runtime-backed LSP lane.
 */
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
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
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
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
