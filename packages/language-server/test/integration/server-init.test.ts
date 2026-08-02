/**
 * Server initialization tests.
 *
 * Tests that the language server starts correctly and responds to
 * LSP initialize requests with proper capabilities.
 */
import { describe, test, expect } from "vitest";
import fs from "node:fs";
import {
  createFixture,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";
import { URI } from "vscode-uri";
import {
  WORKSPACE_TOKEN_MODIFIER_GAP_AWARE,
  WORKSPACE_TOKEN_MODIFIER_GAP_CONSERVATIVE,
} from "../../src/handlers/semantic-tokens.js";

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
      expect(capabilities.documentHighlightProvider).toBe(true);
      expect(capabilities.referencesProvider).toBe(true);
      expect(capabilities.renameProvider).toBeTruthy();
      expect(capabilities.codeActionProvider).toEqual({ resolveProvider: true });
      expect(capabilities.documentSymbolProvider).toBe(true);
      expect(capabilities.workspaceSymbolProvider).toBe(true);
      expect(capabilities.codeLensProvider).toEqual({ resolveProvider: false });
      expect(capabilities.selectionRangeProvider).toBe(true);
      expect(capabilities.linkedEditingRangeProvider).toBe(true);
      expect(capabilities.foldingRangeProvider).toBe(true);
      expect(capabilities.inlayHintProvider).toBe(true);
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

  test("uses workspaceFolders when rootUri is absent", async () => {
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
          workspaceFolders: [{ uri: URI.file(fixture).toString(), name: "fixture" }],
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

      const initResult = result as { capabilities?: unknown };
      expect(initResult.capabilities).toBeDefined();
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("rejects initialize when the client supplies no workspace root", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022" }, files: [] }),
    });
    const { connection, child, dispose } = startServer(fixture);

    try {
      await expect(connection.sendRequest("initialize", {
        processId: process.pid,
        rootUri: null,
        workspaceFolders: null,
        capabilities: {},
      })).rejects.toMatchObject({ code: -32602 });
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("retires the semantic session and exits through the standard shutdown sequence", async () => {
    const fixture = createFixture({
      "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022" }, files: [] }),
    });
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await connection.sendRequest("initialize", {
        processId: process.pid,
        rootUri: URI.file(fixture).toString(),
        capabilities: {},
      });
      connection.sendNotification("initialized", {});
      await connection.sendRequest("shutdown");
      connection.sendNotification("exit");
      await waitForExit(child, 5_000);
      expect(child.exitCode).toBe(0);
    } catch (error) {
      throw new Error(`${String(error)}; stderr=${getStderr()}`);
    } finally {
      dispose();
      if (child.exitCode == null && child.signalCode == null) {
        child.kill("SIGKILL");
        await waitForExit(child);
      }
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
