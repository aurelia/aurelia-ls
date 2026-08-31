import fs from "node:fs";
import { CancellationTokenSource } from "vscode-languageserver/node";
import { describe, expect, test } from "vitest";
import {
  createAureliaAppFixture,
  initialize,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

describe("request boundary", () => {
  test("returns the LSP cancellation error for a cancelled semantic request", async () => {
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "@customElement({ name: 'app-root', template: '<template>${message}</template>' })",
        "export class AppRoot { message = 'hello'; }",
      ].join("\n"),
    });
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const cancellation = new CancellationTokenSource();
      const request = connection.sendRequest("workspace/symbol", { query: "" }, cancellation.token);
      cancellation.cancel();

      await expect(request).rejects.toMatchObject({ code: -32800 });
      const support = await connection.sendRequest("aurelia/supportSnapshot", {
        identitySalt: Buffer.alloc(32, 1).toString("base64url"),
      }) as {
        readonly requests: {
          readonly aggregates: readonly {
            readonly feature: string;
            readonly clientCancelled: number;
          }[];
        };
      };
      expect(support.requests.aggregates).toContainEqual(expect.objectContaining({
        feature: "workspaceSymbol",
        clientCancelled: 1,
      }));
      expect(getStderr()).not.toContain("[workspaceSymbol] cancelled semantic-runtime request");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("collects a cold support snapshot without opening an app or exposing source identity", async () => {
    const fixture = createAureliaAppFixture({
      "src/private-canary.ts": [
        "import { customElement } from 'aurelia';",
        "const SENSITIVE_CANARY = 'must-not-cross-support-boundary';",
        "@customElement({ name: 'private-canary', template: '<template>${SENSITIVE_CANARY}</template>' })",
        "export class PrivateCanary {}",
      ].join("\n"),
    });
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture);
      const support = await connection.sendRequest("aurelia/supportSnapshot", {
        identitySalt: Buffer.alloc(32, 2).toString("base64url"),
      }) as {
        readonly schemaVersion: string;
        readonly analysisCache: {
          readonly status: string;
          readonly cachedAppCount?: number;
          readonly workspaceKernel?: { readonly totalRecords: number };
        };
      };

      expect(support.schemaVersion).toBe("aurelia-support-snapshot/1");
      expect(support.analysisCache).toEqual({ status: "unavailable" });
      const serialized = JSON.stringify(support);
      expect(serialized).not.toContain(fixture);
      expect(serialized).not.toContain("private-canary");
      expect(serialized).not.toContain("SENSITIVE_CANARY");
      expect(serialized).not.toContain("must-not-cross-support-boundary");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
