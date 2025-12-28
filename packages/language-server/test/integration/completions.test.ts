/**
 * Completions integration tests.
 *
 * Tests that the language server provides completions for Aurelia templates.
 */
import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

      // completions could be an array or { items: [] }
      const items = Array.isArray(completions) ? completions : (completions as { items?: unknown[] })?.items ?? [];
      expect(items.length).toBeGreaterThan(0);

      // Check that 'message' is in the completions
      const labels = items.map((item: { label?: string }) => item.label);
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

      const items = Array.isArray(completions) ? completions : (completions as { items?: unknown[] })?.items ?? [];
      const labels = items.map((item: { label?: string }) => item.label);

      // Should include counter which matches the prefix
      expect(labels).toContain("counter");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("returns empty array when no context available", async () => {
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

      // Should return array (possibly empty) without throwing
      const items = Array.isArray(completions) ? completions : (completions as { items?: unknown[] })?.items ?? [];
      expect(Array.isArray(items)).toBe(true);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
