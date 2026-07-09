import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  changeDocument,
  copyFixtureDirectory,
  createDiagnosticsRecorder,
  fileUri,
  initialize,
  openDocument,
  pathFromFileUri,
  positionAt,
  startServer,
  type TrackedDocument,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

type LspDiagnosticLike = {
  readonly message?: unknown;
  readonly range?: {
    readonly start: { readonly line: number; readonly character: number };
    readonly end: { readonly line: number; readonly character: number };
  };
};

test("template diagnostics use current dirty-buffer spans after offset churn", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);

    changeTrackedDocument(
      connection,
      myApp,
      `<!-- inserted before diagnostics -->\n${myApp.text.replace("state.searchText", "state.missingSearchText")}`,
    );

    const rows = await waitForDiagnosticsWithMessage(diagnostics, myApp.uri, "missingSearchText");
    const matches = rows.filter((row) => diagnosticMessage(row).includes("missingSearchText"));
    expect(matches).toHaveLength(1);
    const [diagnostic] = matches;
    const start = myApp.text.indexOf("missingSearchText");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(diagnostic.range).toEqual({
      start: positionAt(myApp.text, start),
      end: positionAt(myApp.text, start + "missingSearchText".length),
    });
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

test("rapid invalid-to-valid template edits do not leak stale diagnostics", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);

    const original = myApp.text;
    changeTrackedDocument(connection, myApp, original.replace("state.searchText", "state.transientMissing"));
    changeTrackedDocument(connection, myApp, original);

    await waitForCleanDiagnostics(diagnostics, myApp.uri);
    await expectNoDiagnosticMessageForDuration(diagnostics, myApp.uri, "transientMissing", 900);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

test("diagnostics from one dirty template do not publish on another open template", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const productCardHtml = openTrackedDocument(connection, fixture, "src/components/product-card.html", "html", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);
    await waitForCleanDiagnostics(diagnostics, productCardHtml.uri);

    changeTrackedDocument(
      connection,
      productCardHtml,
      productCardHtml.text.replace("item.description", "missingCardMember"),
    );

    await waitForDiagnosticMessage(diagnostics, productCardHtml.uri, "missingCardMember");
    await expectNoDiagnosticMessageForDuration(diagnostics, myApp.uri, "missingCardMember", 900);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

test("closing a dirty diagnostic document clears its published diagnostics", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const productCardHtml = openTrackedDocument(connection, fixture, "src/components/product-card.html", "html", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, productCardHtml.uri);

    changeTrackedDocument(
      connection,
      productCardHtml,
      productCardHtml.text.replace("item.description", "missingCardMember"),
    );
    await waitForDiagnosticMessage(diagnostics, productCardHtml.uri, "missingCardMember");

    closeTrackedDocument(connection, productCardHtml, openUris);
    const cleared = await diagnostics.wait(productCardHtml.uri, 5000);
    expect(cleared).toEqual([]);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

function openTrackedDocument(
  connection: ReturnType<typeof startServer>["connection"],
  fixture: string,
  relPath: string,
  languageId: string,
  documents: Map<string, TrackedDocument>,
  openUris: Set<string>,
): TrackedDocument {
  const uri = fileUri(fixture, relPath);
  const text = fs.readFileSync(path.join(fixture, relPath), "utf8");
  const document: TrackedDocument = { uri, languageId, text, version: 1 };
  documents.set(uri, document);
  openUris.add(uri);
  openDocument(connection, uri, languageId, text, document.version);
  return document;
}

function changeTrackedDocument(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  text: string,
): void {
  expect(text, `expected ${document.uri} to change`).not.toBe(document.text);
  document.text = text;
  document.version += 1;
  fs.writeFileSync(pathFromFileUri(document.uri), document.text, "utf8");
  changeDocument(connection, document.uri, document.text, document.version);
}

function closeTrackedDocument(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  openUris: Set<string>,
): void {
  openUris.delete(document.uri);
  connection.sendNotification("textDocument/didClose", {
    textDocument: { uri: document.uri },
  });
}

async function waitForDiagnosticMessage(
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>,
  uri: string,
  expected: string,
): Promise<LspDiagnosticLike> {
  const rows = await waitForDiagnosticsWithMessage(diagnostics, uri, expected);
  return rows.find((diagnostic) => diagnosticMessage(diagnostic).includes(expected))!;
}

async function waitForDiagnosticsWithMessage(
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>,
  uri: string,
  expected: string,
): Promise<LspDiagnosticLike[]> {
  for (let i = 0; i < 8; i += 1) {
    const rows = await diagnostics.wait(uri, 10000) as LspDiagnosticLike[];
    const match = rows.find((diagnostic) => diagnosticMessage(diagnostic).includes(expected));
    if (match != null) {
      return rows;
    }
  }
  throw new Error(`Timed out waiting for diagnostic containing ${JSON.stringify(expected)} for ${uri}`);
}

async function waitForCleanDiagnostics(
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>,
  uri: string,
): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    const rows = await diagnostics.wait(uri, 10000);
    if (rows.length === 0) {
      return;
    }
  }
  throw new Error(`Timed out waiting for clean diagnostics for ${uri}`);
}

async function expectNoDiagnosticMessageForDuration(
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>,
  uri: string,
  forbidden: string,
  durationMs: number,
): Promise<void> {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    const timeout = Math.max(1, Math.min(200, deadline - Date.now()));
    try {
      const rows = await diagnostics.wait(uri, timeout) as LspDiagnosticLike[];
      const messages = rows.map(diagnosticMessage).filter((message) => message.includes(forbidden));
      expect(messages, `unexpected stale diagnostic for ${uri}`).toEqual([]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("diagnostics timeout")) {
        continue;
      }
      throw error;
    }
  }
}

function diagnosticMessage(diagnostic: LspDiagnosticLike): string {
  return typeof diagnostic.message === "string" ? diagnostic.message : "";
}
