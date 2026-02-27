/**
 * Server initialization tests.
 *
 * Tests that the language server starts correctly and responds to
 * LSP initialize requests with proper capabilities.
 */
import { describe, test, expect } from "vitest";
import fs from "node:fs";
import { WORKSPACE_TOKEN_MODIFIER_GAP_AWARE, WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE } from "@aurelia-ls/semantic-workspace/types.js";
import {
  createFixture,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";
import { URI } from "vscode-uri";

describe("Server initialization", () => {
  test("responds to initialize request with capabilities", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          types: [],
        },
        files: [],
      }),
    });

    const { connection, child, dispose, getStderr } = startServer(fixture);
    const rootUri = URI.file(fixture).toString();

    try {
      const result = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${getStderr()}`)), 5000);
        const onExit = (code: number | null, signal: string | null) => {
          clearTimeout(timer);
          reject(new Error(`server exited before initialize (code=${code} signal=${signal}): ${getStderr()}`));
        };
        child.once("exit", onExit);

        connection.sendRequest("initialize", {
          processId: process.pid,
          rootUri,
          capabilities: {},
        }).then(
          (res) => {
            clearTimeout(timer);
            child.off("exit", onExit);
            resolve(res);
          },
          (err) => {
            clearTimeout(timer);
            child.off("exit", onExit);
            reject(err);
          },
        );
      });

      const initResult = result as { capabilities?: unknown };
      expect(initResult.capabilities).toBeDefined();

      const capabilities = initResult.capabilities as Record<string, unknown>;
      expect(capabilities.hoverProvider).toBe(true);
      expect(capabilities.definitionProvider).toBeTruthy();
      expect(capabilities.referencesProvider).toBe(true);
      expect(capabilities.renameProvider).toBeTruthy();
      expect(capabilities.codeActionProvider).toBe(true);
      expect(capabilities.completionProvider).toBeDefined();
      expect(capabilities.textDocumentSync).toBeDefined();

      // Semantic tokens capability
      const semanticTokensProvider = capabilities.semanticTokensProvider as Record<string, unknown> | undefined;
      expect(semanticTokensProvider).toBeDefined();
      expect(semanticTokensProvider?.full).toBe(true);
      const legend = semanticTokensProvider?.legend as { tokenTypes: string[]; tokenModifiers: string[] } | undefined;
      expect(legend?.tokenTypes).toContain("aureliaElement");
      expect(legend?.tokenModifiers).toContain("declaration");
      expect(legend?.tokenModifiers).toContain(WORKSPACE_TOKEN_MODIFIER_GAP_AWARE);
      expect(legend?.tokenModifiers).toContain(WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("handles initialize with null rootUri", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
        files: [],
      }),
    });

    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      const result = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${getStderr()}`)), 5000);
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error(`server exited unexpectedly: ${getStderr()}`));
        });

        connection.sendRequest("initialize", {
          processId: process.pid,
          rootUri: null,
          capabilities: {},
        }).then(
          (res) => {
            clearTimeout(timer);
            resolve(res);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });

      // Should still return capabilities even with null rootUri
      const initResult = result as { capabilities?: unknown };
      expect(initResult.capabilities).toBeDefined();
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("accepts initialized notification after initialize", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
        files: [],
      }),
    });

    const { connection, child, dispose, getStderr } = startServer(fixture);
    const rootUri = URI.file(fixture).toString();

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${getStderr()}`)), 5000);
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error(`server exited unexpectedly: ${getStderr()}`));
        });

        connection.sendRequest("initialize", {
          processId: process.pid,
          rootUri,
          capabilities: {},
        }).then(
          () => {
            clearTimeout(timer);
            // Send initialized notification - should not throw
            connection.sendNotification("initialized", {});
            resolve();
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });

      // If we got here without error, the test passes
      expect(true).toBe(true);
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
