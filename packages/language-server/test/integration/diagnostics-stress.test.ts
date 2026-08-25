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

test("cold open-document bursts converge on diagnostics for the latest unsaved template", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  const serverLogs: string[] = [];
  const logSubscription = connection.onNotification(
    "window/logMessage",
    (params: { message?: unknown }) => {
      if (typeof params.message === "string") {
        serverLogs.push(params.message);
      }
    },
  );

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const searchOffset = myApp.text.indexOf("state.searchText") + "state.".length;
    expect(searchOffset).toBeGreaterThanOrEqual("state.".length);
    await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: myApp.uri },
      position: positionAt(myApp.text, searchOffset),
    });

    for (const [relPath, languageId] of [
      ["src/my-app.ts", "typescript"],
      ["src/components/product-card.html", "html"],
      ["src/components/product-card.ts", "typescript"],
      ["src/components/stock-badge.html", "html"],
      ["src/components/stock-badge.ts", "typescript"],
      ["src/attributes/display-hint.ts", "typescript"],
    ] as const) {
      openTrackedDocument(connection, fixture, relPath, languageId, documents, openUris);
    }

    changeOpenBufferDocument(
      connection,
      myApp,
      myApp.text.replace("${preview.name}", "${heading()}"),
    );

    let rows: LspDiagnosticLike[];
    try {
      rows = await waitForDiagnosticsWithMessage(diagnostics, myApp.uri, "not callable");
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nServer lifecycle log:\n${serverLogs.join("\n")}`,
        { cause: error },
      );
    }
    const diagnostic = rows.find((row) => diagnosticMessage(row).includes("not callable"));
    expect(diagnostic).toBeDefined();
    const start = myApp.text.indexOf("heading()");
    expect(diagnostic?.range).toEqual({
      start: positionAt(myApp.text, start),
      end: positionAt(myApp.text, start + "heading".length),
    });
  } finally {
    logSubscription.dispose();
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60000);

test("cold dirty-template open bursts publish diagnostics for every opened document", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const cases = [
      {
        relPath: "src/my-app.html",
        marker: "missingMyAppOpen",
        change: (text: string) => text.replace("preview.name", "preview.missingMyAppOpen"),
      },
      {
        relPath: "src/components/product-card.html",
        marker: "missingProductOpen",
        change: (text: string) => text.replace("item.description", "item.missingProductOpen"),
      },
      {
        relPath: "src/components/stock-badge.html",
        marker: "missingStockOpen",
        change: (text: string) => text.replace("item?.tone", "item?.missingStockOpen"),
      },
    ] as const;

    const opened = cases.map(({ relPath, change }) => {
      const text = change(fs.readFileSync(path.join(fixture, relPath), "utf8"));
      return openTrackedDocumentWithText(
        connection,
        fixture,
        relPath,
        "html",
        text,
        documents,
        openUris,
      );
    });

    const published = await Promise.all(cases.map(({ marker }, index) =>
      waitForDiagnosticsWithMessage(diagnostics, opened[index]!.uri, marker)));
    for (let index = 0; index < cases.length; index += 1) {
      const marker = cases[index]!.marker;
      const document = opened[index]!;
      const row = published[index]!.find((diagnostic) => diagnosticMessage(diagnostic).includes(marker));
      const start = document.text.indexOf(marker);
      expect(row?.range).toEqual({
        start: positionAt(document.text, start),
        end: positionAt(document.text, start + marker.length),
      });
    }
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60000);

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

test("closing a dirty diagnostic document returns diagnostics to the host-owned text", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const productCardHtml = openTrackedDocument(connection, fixture, "src/components/product-card.html", "html", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, productCardHtml.uri);

    changeOpenBufferDocument(
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
  const text = fs.readFileSync(path.join(fixture, relPath), "utf8");
  return openTrackedDocumentWithText(
    connection,
    fixture,
    relPath,
    languageId,
    text,
    documents,
    openUris,
  );
}

function openTrackedDocumentWithText(
  connection: ReturnType<typeof startServer>["connection"],
  fixture: string,
  relPath: string,
  languageId: string,
  text: string,
  documents: Map<string, TrackedDocument>,
  openUris: Set<string>,
): TrackedDocument {
  const uri = fileUri(fixture, relPath);
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

function changeOpenBufferDocument(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  text: string,
): void {
  expect(text, `expected ${document.uri} to change`).not.toBe(document.text);
  document.text = text;
  document.version += 1;
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
