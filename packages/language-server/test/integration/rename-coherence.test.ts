import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyWorkspaceEditToTrackedDocuments,
  changeDocument,
  collectEdits,
  copyFixtureDirectory,
  createDiagnosticsRecorder,
  fileUri,
  initialize,
  normalizedUriPath,
  openDocument,
  positionAt,
  type RenameResult,
  startServer,
  type TrackedDocument,
  waitForDiagnostics,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

test("template-origin bindable rename stays coherent across immediate open-buffer rename cycles", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    openTrackedDocument(connection, fixture, "src/components/stock-badge.ts", "typescript", documents, openUris);
    openTrackedDocument(connection, fixture, "src/components/stock-badge.html", "html", documents, openUris);
    await waitForDiagnostics(connection, child, () => getStderr(), myApp.uri, 5000);

    await prepareRenameAtNeedle(connection, myApp, "stock-badge item.bind");

    const first = await renameAtNeedle(connection, myApp, "stock-badge item.bind", "item2");
    expect(editPaths(first).sort()).toEqual([
      fileUri(fixture, "src/components/stock-badge.html"),
      fileUri(fixture, "src/components/stock-badge.ts"),
      myApp.uri,
    ].map(normalizedUriPath).sort());
    notifyChangedOpenDocuments(connection, applyWorkspaceEditToTrackedDocuments(first, documents), openUris);

    const second = await renameAtNeedle(connection, myApp, "stock-badge item2.bind", "item");
    notifyChangedOpenDocuments(connection, applyWorkspaceEditToTrackedDocuments(second, documents), openUris);

    const third = await renameAtNeedle(connection, myApp, "stock-badge item.bind", "item2");
    expect(editPaths(third)).toContain(normalizedUriPath(fileUri(fixture, "src/components/stock-badge.ts")));
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("template-origin bindable rename rebuilds from disk for closed edited target files", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    await waitForDiagnostics(connection, child, () => getStderr(), myApp.uri, 5000);

    await prepareRenameAtNeedle(connection, myApp, "stock-badge item.bind");

    const first = await renameAtNeedle(connection, myApp, "stock-badge item.bind", "item2");
    notifyChangedOpenDocuments(connection, applyWorkspaceEditToTrackedDocuments(first, documents), openUris);

    const second = await renameAtNeedle(connection, myApp, "stock-badge item2.bind", "item");
    expect(editPaths(second)).toContain(normalizedUriPath(fileUri(fixture, "src/components/stock-badge.ts")));
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("rename waits for source invalidation when a TypeScript offset shifts immediately before the request", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const badgeTs = openTrackedDocument(connection, fixture, "src/components/stock-badge.ts", "typescript", documents, openUris);
    await waitForDiagnostics(connection, child, () => getStderr(), myApp.uri, 5000);

    await prepareRenameAtNeedle(connection, myApp, "stock-badge item.bind");

    badgeTs.text = badgeTs.text.replace("export class StockBadge", "// offset canary\nexport class StockBadge");
    badgeTs.version += 1;
    fs.writeFileSync(fileURLToPath(badgeTs.uri), badgeTs.text, "utf8");
    changeDocument(connection, badgeTs.uri, badgeTs.text, badgeTs.version);

    const rename = await renameAtNeedle(connection, myApp, "stock-badge item.bind", "item2");
    expect(editPaths(rename)).toContain(normalizedUriPath(badgeTs.uri));
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("TypeScript-origin bindable rename propagation stays coherent across merged edit cycles", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const productCardTs = openTrackedDocument(connection, fixture, "src/components/product-card.ts", "typescript", documents, openUris);
    openTrackedDocument(connection, fixture, "src/components/product-card.html", "html", documents, openUris);
    await waitForDiagnostics(connection, child, () => getStderr(), myApp.uri, 5000);

    const first = await renameFromTsAtNeedle(connection, productCardTs, "@bindable item", "item2");
    expectRenameFromTsSuccess(first);
    expect(editPaths(first.workspaceEdit)).toContain(normalizedUriPath(productCardTs.uri));
    const firstChanged = applyWorkspaceEditToTrackedDocuments(first.workspaceEdit, documents);
    notifyChangedOpenDocuments(connection, firstChanged, openUris);

    const second = await renameFromTsAtNeedle(connection, productCardTs, "@bindable item2", "item");
    expectRenameFromTsSuccess(second);
    const secondChanged = applyWorkspaceEditToTrackedDocuments(second.workspaceEdit, documents);
    notifyChangedOpenDocuments(connection, secondChanged, openUris);

    const third = await renameFromTsAtNeedle(connection, productCardTs, "@bindable item", "item2");
    expectRenameFromTsSuccess(third);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("template diagnostics settle after cross-file bindable rename cycles", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const stockBadgeHtml = openTrackedDocument(connection, fixture, "src/components/stock-badge.html", "html", documents, openUris);
    openTrackedDocument(connection, fixture, "src/components/stock-badge.ts", "typescript", documents, openUris);
    await diagnostics.wait(myApp.uri, 5000);
    await diagnostics.wait(stockBadgeHtml.uri, 5000);

    const first = await renameAtNeedle(connection, myApp, "stock-badge item.bind", "item2");
    notifyChangedOpenDocuments(connection, applyWorkspaceEditToTrackedDocuments(first, documents), openUris);
    const afterRenameDiagnostics = await diagnostics.wait(myApp.uri, 5000);
    const afterRenameChildDiagnostics = await diagnostics.wait(stockBadgeHtml.uri, 5000);
    expectDiagnosticsNotToMention(afterRenameDiagnostics, "item2");
    expectDiagnosticsNotToMention(afterRenameChildDiagnostics, "item2");

    const second = await renameAtNeedle(connection, myApp, "stock-badge item2.bind", "item");
    notifyChangedOpenDocuments(connection, applyWorkspaceEditToTrackedDocuments(second, documents), openUris);
    const afterUndoShapeDiagnostics = await diagnostics.wait(myApp.uri, 5000);
    const afterUndoShapeChildDiagnostics = await diagnostics.wait(stockBadgeHtml.uri, 5000);
    expectDiagnosticsNotToMention(afterUndoShapeDiagnostics, "item2");
    expectDiagnosticsNotToMention(afterUndoShapeChildDiagnostics, "item2");
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("closed TypeScript source changes invalidate open template diagnostics", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    expectDiagnosticsNotToMention(await diagnostics.wait(myApp.uri, 5000), "bindable");

    const displayHintPath = path.join(fixture, "src/attributes/display-hint.ts");
    const displayHintUri = fileUri(fixture, "src/attributes/display-hint.ts");
    const originalDisplayHint = fs.readFileSync(displayHintPath, "utf8");

    fs.writeFileSync(displayHintPath, originalDisplayHint.replace(/\btone\b/g, "ton"), "utf8");
    notifyWatchedFileChanged(connection, displayHintUri);
    await waitForDiagnosticMessage(diagnostics, myApp.uri, "property \"tone\" is not bindable");

    fs.writeFileSync(displayHintPath, originalDisplayHint, "utf8");
    notifyWatchedFileChanged(connection, displayHintUri);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);
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

function notifyChangedOpenDocuments(
  connection: ReturnType<typeof startServer>["connection"],
  changed: readonly TrackedDocument[],
  openUris: ReadonlySet<string>,
): void {
  for (const document of changed) {
    if (!openUris.has(document.uri)) continue;
    changeDocument(connection, document.uri, document.text, document.version);
  }
}

function notifyWatchedFileChanged(
  connection: ReturnType<typeof startServer>["connection"],
  uri: string,
): void {
  connection.sendNotification("workspace/didChangeWatchedFiles", {
    changes: [{ uri, type: 2 }],
  });
}

async function prepareRenameAtNeedle(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  needle: string,
): Promise<unknown> {
  return connection.sendRequest("textDocument/prepareRename", {
    textDocument: { uri: document.uri },
    position: positionAtNeedle(document, needle),
  });
}

async function renameAtNeedle(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  needle: string,
  newName: string,
): Promise<RenameResult> {
  const result = await connection.sendRequest("textDocument/rename", {
    textDocument: { uri: document.uri },
    position: positionAtNeedle(document, needle),
    newName,
  });
  expect(result, `rename at ${needle} should return a WorkspaceEdit`).toBeTruthy();
  return result as RenameResult;
}

type RenameFromTsResponse =
  | {
    status: "success";
    workspaceEdit: RenameResult;
    message: string;
    templateReferenceCount: number;
    typeScriptReferenceCount: number;
    candidateCount: number;
  }
  | {
    status: "available" | "not-applicable" | "refused" | "blocked";
    reason: string;
    message: string;
    failures?: readonly string[];
    templateReferenceCount?: number;
    typeScriptReferenceCount?: number;
    candidateCount?: number;
  };

function expectRenameFromTsSuccess(
  response: RenameFromTsResponse,
): asserts response is Extract<RenameFromTsResponse, { status: "success" }> {
  expect(response.status).toBe("success");
}

async function renameFromTsAtNeedle(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  needle: string,
  newName: string,
): Promise<RenameFromTsResponse> {
  return connection.sendRequest("aurelia/renameFromTs", {
    uri: document.uri,
    position: positionAtNeedle(document, needle),
    newName,
  }) as Promise<RenameFromTsResponse>;
}

function positionAtNeedle(document: TrackedDocument, needle: string): { line: number; character: number } {
  const offset = document.text.indexOf(needle);
  expect(offset, `expected to find ${JSON.stringify(needle)} in ${document.uri}`).toBeGreaterThanOrEqual(0);
  const memberStart = needle.indexOf("item");
  return positionAt(document.text, offset + memberStart + 1);
}

function editPaths(edit: RenameResult): string[] {
  return [...new Set(collectEdits(edit).map((row) => normalizedUriPath(row.uri)))];
}

function expectDiagnosticsNotToMention(diagnostics: readonly unknown[], text: string): void {
  const messages = diagnostics
    .map((diagnostic) => (diagnostic as { message?: unknown }).message)
    .filter((message): message is string => typeof message === "string");
  expect(messages.filter((message) => message.includes(text))).toEqual([]);
}

async function waitForDiagnosticMessage(
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>,
  uri: string,
  expected: string,
): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    const rows = await diagnostics.wait(uri, 10000);
    const messages = rows
      .map((diagnostic) => (diagnostic as { message?: unknown }).message)
      .filter((message): message is string => typeof message === "string");
    if (messages.some((message) => message.includes(expected))) {
      return;
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
