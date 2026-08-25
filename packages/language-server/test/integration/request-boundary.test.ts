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
      expect(getStderr()).toContain("[workspaceSymbol] cancelled semantic-runtime request");
    } finally {
      dispose();
      child.kill("SIGKILL");
      await waitForExit(child);
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
