import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { AureliaProtocolRequest, type RelatedFilesResponse, type SourceOwnershipResponse } from "../../src/protocol.js";
import { copyFixtureDirectory, fileUri, initialize, openDocument, startServer, waitForExit } from "./helpers/lsp-harness.js";

test("keeps both related files and template Problems when a nested module scope appears and disappears", async () => {
  const fixture = copyFixtureDirectory(path.resolve(import.meta.dirname,
    "../../../semantic-runtime/fixtures/pressure/app-pattern-convention-minimal-app"));
  const script = fileUri(fixture, "src/my-app.ts");
  const template = fileUri(fixture, "src/my-app.html");
  const marker = path.join(fixture, "src/package.json");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const checkTemplate = async () => {
    const ownership = await connection.sendRequest<SourceOwnershipResponse>(AureliaProtocolRequest.SourceOwnership, { uri: template });
    expect(ownership.templateOwned).toBe(true);
    const related = (uri: string) => connection.sendRequest<RelatedFilesResponse>(AureliaProtocolRequest.RelatedFiles, { uri });
    expect((await related(template)).map(row => row.uri)).toEqual([script]);
    expect((await related(script)).map(row => row.uri)).toEqual([template]);
    const report = await connection.sendRequest<{ items: { code?: string | number }[] }>(
      "textDocument/diagnostic", { identifier: "aurelia", textDocument: { uri: template } },
    );
    expect(report.items.map(row => row.code)).toEqual(["missing-expression-member"]);
  };
  try {
    await initialize(connection, child, getStderr, fixture);
    openDocument(connection, script, "typescript", fs.readFileSync(path.join(fixture, "src/my-app.ts"), "utf8"));
    openDocument(connection, template, "html", "<h1>${missingMessage}</h1>");
    await checkTemplate();
    fs.writeFileSync(marker, '{"type":"module"}');
    const uri = fileUri(fixture, "src/package.json");
    await connection.sendNotification("workspace/didChangeWatchedFiles", { changes: [{ uri, type: 1 }] });
    await checkTemplate();
    fs.unlinkSync(marker);
    await connection.sendNotification("workspace/didChangeWatchedFiles", { changes: [{ uri, type: 3 }] });
    await checkTemplate();
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);
