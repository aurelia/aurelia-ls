import fs from "node:fs";
import { CancellationTokenSource, ConfigurationRequest, InlayHintRequest, LSPErrorCodes } from "vscode-languageserver/node";
import { describe, expect, test } from "vitest";
import {
  createAureliaAppFixture,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

describe("request boundary", () => {
  test("returns the LSP cancellation error when an in-flight semantic request is cancelled", async () => {
    const template = '<input value.bind="message">';
    const fixture = createAureliaAppFixture({
      "src/app.ts": [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "@customElement({ name: 'app-root', template })",
        "export class AppRoot { message = 'hello'; }",
      ].join("\n"),
      "src/app.html": template,
    });
    const { connection, child, dispose, getStderr } = startServer(fixture);

    try {
      await initialize(connection, child, getStderr, fixture, { configuration: {} });
      const uri = fileUri(fixture, "src/app.html");
      openDocument(connection, uri, "html", template);
      const cancellation = new CancellationTokenSource();
      connection.onRequest(ConfigurationRequest.type, ({ items }) => items.map(item => {
        if (item.scopeUri !== uri || item.section !== "aurelia.inlayHints.bindingMode") return null;
        // The server is awaiting this reply. Send cancellation first on the same stdio connection.
        cancellation.cancel();
        return true;
      }));
      const request = connection.sendRequest(InlayHintRequest.type, {
        textDocument: { uri },
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: template.length } },
      }, cancellation.token);

      await expect(request).rejects.toMatchObject({ code: LSPErrorCodes.RequestCancelled });
      await expect(connection.sendRequest("workspace/symbol", { query: "AppRoot" }))
        .resolves.toContainEqual(expect.objectContaining({ name: "AppRoot" }));
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
        feature: "inlayHints",
        clientCancelled: 1,
      }));
      expect(getStderr()).not.toContain("[inlayHints] cancelled semantic-runtime request");
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
