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
  pathFromFileUri,
  positionAt,
  type RenameResult,
  startServer,
  type TrackedDocument,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

function addHintPanelFixtureFiles(fixture: string): void {
  fs.writeFileSync(path.join(fixture, "src/components/hint-panel.ts"), [
    "import { customElement } from 'aurelia';",
    "import { DisplayHint } from '../attributes/display-hint';",
    "import template from './hint-panel.html';",
    "",
    "@customElement({",
    "  name: 'hint-panel',",
    "  template,",
    "  dependencies: [DisplayHint],",
    "})",
    "export class HintPanel {",
    "  label = 'secondary hint';",
    "  tone: 'fresh' | 'warning' | 'empty' = 'warning';",
    "}",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(fixture, "src/components/hint-panel.html"), [
    "<template>",
    "  <section display-hint=\"display-label.bind: label; tone.bind: tone\">",
    "    ${label}",
    "  </section>",
    "</template>",
  ].join("\n"), "utf8");
}

test("synced TypeScript documents feed source intelligence without claiming template-only lanes", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const productCardTs = openTrackedDocument(connection, fixture, "src/components/product-card.ts", "typescript", documents, openUris);
    await diagnostics.wait(productCardTs.uri, 5000);

    const bindablePosition = positionAtNeedle(productCardTs, "@bindable item", "item");

    await expect(connection.sendRequest("textDocument/hover", {
      textDocument: { uri: productCardTs.uri },
      position: bindablePosition,
    })).resolves.toBeNull();

    await expect(connection.sendRequest("textDocument/definition", {
      textDocument: { uri: productCardTs.uri },
      position: bindablePosition,
    })).resolves.toBeNull();

    await expect(connection.sendRequest("textDocument/prepareRename", {
      textDocument: { uri: productCardTs.uri },
      position: bindablePosition,
    })).resolves.toBeNull();

    const completions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: productCardTs.uri },
      position: bindablePosition,
    });
    expect(completions).toEqual({ isIncomplete: false, items: [] });

    const symbols = await connection.sendRequest("textDocument/documentSymbol", {
      textDocument: { uri: productCardTs.uri },
    });
    const symbolJson = JSON.stringify(symbols);
    expect(symbolJson).toContain("ProductCard");
    expect(symbolJson).toContain("item");
    expect(symbolJson).toContain("display-label");

    const codeLens = await connection.sendRequest("textDocument/codeLens", {
      textDocument: { uri: productCardTs.uri },
    });
    const lensJson = JSON.stringify(codeLens);
    expect(lensJson).toContain("element");
    expect(lensJson).toContain("bindable");
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("live script bindable edits refresh diagnostics for all affected open templates", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  addHintPanelFixtureFiles(fixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const hintPanelHtml = openTrackedDocument(connection, fixture, "src/components/hint-panel.html", "html", documents, openUris);
    const displayHintTs = openTrackedDocument(connection, fixture, "src/attributes/display-hint.ts", "typescript", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);
    await waitForCleanDiagnostics(diagnostics, hintPanelHtml.uri);

    const original = displayHintTs.text;
    changeTrackedDocument(connection, displayHintTs, original.replace(/\btone\b/g, "tone2"));

    await waitForDiagnosticMessage(diagnostics, myApp.uri, "tone");
    await waitForDiagnosticMessage(diagnostics, hintPanelHtml.uri, "tone");

    changeTrackedDocument(connection, displayHintTs, original);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);
    await waitForCleanDiagnostics(diagnostics, hintPanelHtml.uri);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

test("rename and references remain coherent after live TypeScript offset churn", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const productCardHtml = openTrackedDocument(connection, fixture, "src/components/product-card.html", "html", documents, openUris);
    const productCardTs = openTrackedDocument(connection, fixture, "src/components/product-card.ts", "typescript", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);

    changeTrackedDocument(
      connection,
      productCardTs,
      productCardTs.text.replace("export class ProductCard", "// offset churn before rename\nexport class ProductCard"),
    );

    const rename = await renameAtAnchorNeedle(connection, myApp, "product-card", "item.bind", "item2");
    expectVersionedEdit(rename, myApp, productCardHtml, productCardTs);
    expect(editPaths(rename)).toEqual(expect.arrayContaining([
      normalizedUriPath(myApp.uri),
      normalizedUriPath(productCardHtml.uri),
      normalizedUriPath(productCardTs.uri),
    ]));

    notifyChangedOpenDocuments(connection, applyWorkspaceEditToTrackedDocuments(rename, documents), openUris);

    const references = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: myApp.uri },
      position: positionAtAnchorNeedle(myApp, "product-card", "item2.bind", "item2"),
      context: { includeDeclaration: true },
    }) as Array<{ uri: string }>;
    const referencePaths = [...new Set(references.map((location) => normalizedUriPath(location.uri)))];
    expect(referencePaths).toEqual(expect.arrayContaining([
      normalizedUriPath(myApp.uri),
      normalizedUriPath(productCardHtml.uri),
      normalizedUriPath(productCardTs.uri),
    ]));
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

test("versioned rename edits reject stale open-buffer application", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const productCardHtml = openTrackedDocument(connection, fixture, "src/components/product-card.html", "html", documents, openUris);
    const productCardTs = openTrackedDocument(connection, fixture, "src/components/product-card.ts", "typescript", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);

    const rename = await renameAtAnchorNeedle(connection, myApp, "product-card", "item.bind", "item2");
    expectVersionedEdit(rename, myApp, productCardHtml, productCardTs);

    changeTrackedDocument(
      connection,
      productCardTs,
      productCardTs.text.replace("export class ProductCard", "// changed after rename response\nexport class ProductCard"),
    );

    expect(() => applyWorkspaceEditToTrackedDocuments(rename, documents)).toThrow(/expected document version/i);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30000);

test("secondary template lanes stay usable after a live TypeScript source refresh", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const documents = new Map<string, TrackedDocument>();
  const openUris = new Set<string>();
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const myApp = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents, openUris);
    const productCardTs = openTrackedDocument(connection, fixture, "src/components/product-card.ts", "typescript", documents, openUris);
    await waitForCleanDiagnostics(diagnostics, myApp.uri);

    changeTrackedDocument(
      connection,
      productCardTs,
      productCardTs.text.replace("export class ProductCard", "// source refresh before secondary lanes\nexport class ProductCard"),
    );

    const memberPosition = positionAtAnchorNeedle(myApp, "state.searchText", "searchText");
    const tagPosition = positionAtAnchorNeedle(myApp, "product-card", "product-card");
    const fullRange = {
      start: { line: 0, character: 0 },
      end: positionAt(myApp.text, myApp.text.length),
    };

    const highlights = await connection.sendRequest("textDocument/documentHighlight", {
      textDocument: { uri: myApp.uri },
      position: memberPosition,
    }) as unknown[];
    expect(Array.isArray(highlights)).toBe(true);
    expect(highlights.length).toBeGreaterThan(0);

    const inlayHints = await connection.sendRequest("textDocument/inlayHint", {
      textDocument: { uri: myApp.uri },
      range: fullRange,
    }) as unknown[];
    expect(Array.isArray(inlayHints)).toBe(true);
    expect(JSON.stringify(inlayHints)).toContain(":");

    const foldingRanges = await connection.sendRequest("textDocument/foldingRange", {
      textDocument: { uri: myApp.uri },
    }) as unknown[];
    expect(Array.isArray(foldingRanges)).toBe(true);
    expect(foldingRanges.length).toBeGreaterThan(0);

    const selectionRanges = await connection.sendRequest("textDocument/selectionRange", {
      textDocument: { uri: myApp.uri },
      positions: [memberPosition],
    }) as unknown[];
    expect(Array.isArray(selectionRanges)).toBe(true);
    expect(selectionRanges.length).toBe(1);
    expect(JSON.stringify(selectionRanges[0])).toContain("parent");

    const linkedEditing = await connection.sendRequest("textDocument/linkedEditingRange", {
      textDocument: { uri: myApp.uri },
      position: tagPosition,
    }) as { ranges?: unknown[] } | null;
    expect(linkedEditing?.ranges?.length).toBe(2);

    const semanticTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: myApp.uri },
    }) as { data?: unknown[] };
    expect(Array.isArray(semanticTokens.data)).toBe(true);
    expect(semanticTokens.data!.length).toBeGreaterThan(0);
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

async function renameAtAnchorNeedle(
  connection: ReturnType<typeof startServer>["connection"],
  document: TrackedDocument,
  anchor: string,
  needle: string,
  newName: string,
): Promise<RenameResult> {
  const result = await connection.sendRequest("textDocument/rename", {
    textDocument: { uri: document.uri },
    position: positionAtAnchorNeedle(document, anchor, needle),
    newName,
  });
  expect(result, `rename at ${anchor} / ${needle} should return a WorkspaceEdit`).toBeTruthy();
  return result as RenameResult;
}

function positionAtNeedle(
  document: TrackedDocument,
  container: string,
  member: string,
): { line: number; character: number } {
  const offset = document.text.indexOf(container);
  expect(offset, `expected to find ${JSON.stringify(container)} in ${document.uri}`).toBeGreaterThanOrEqual(0);
  const memberStart = container.indexOf(member);
  expect(memberStart, `expected ${JSON.stringify(container)} to contain ${JSON.stringify(member)}`).toBeGreaterThanOrEqual(0);
  return positionAt(document.text, offset + memberStart + Math.min(1, Math.max(0, member.length - 1)));
}

function positionAtAnchorNeedle(
  document: TrackedDocument,
  anchor: string,
  needle: string,
  member = needle,
): { line: number; character: number } {
  const anchorOffset = document.text.indexOf(anchor);
  expect(anchorOffset, `expected to find ${JSON.stringify(anchor)} in ${document.uri}`).toBeGreaterThanOrEqual(0);
  const needleOffset = document.text.indexOf(needle, anchorOffset);
  expect(needleOffset, `expected to find ${JSON.stringify(needle)} after ${JSON.stringify(anchor)} in ${document.uri}`).toBeGreaterThanOrEqual(0);
  const memberOffset = needle.indexOf(member);
  expect(memberOffset, `expected ${JSON.stringify(needle)} to contain ${JSON.stringify(member)}`).toBeGreaterThanOrEqual(0);
  return positionAt(document.text, needleOffset + memberOffset + Math.min(1, Math.max(0, member.length - 1)));
}

function editPaths(edit: RenameResult): string[] {
  return [...new Set(collectEdits(edit).map((row) => normalizedUriPath(row.uri)))];
}

function expectVersionedEdit(edit: RenameResult, ...documents: readonly TrackedDocument[]): void {
  expect(edit.changes).toBeUndefined();
  for (const document of documents) {
    const change = edit.documentChanges?.find((candidate) =>
      candidate.textDocument?.uri != null
      && normalizedUriPath(candidate.textDocument.uri) === normalizedUriPath(document.uri)
    );
    expect(change?.textDocument?.version, `expected a versioned edit for ${document.uri}`).toBe(document.version);
  }
}

async function waitForDiagnosticMessage(
  diagnostics: ReturnType<typeof createDiagnosticsRecorder>,
  uri: string,
  expected: string,
): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    const rows = await diagnostics.wait(uri, 10000);
    const messages = diagnosticMessages(rows);
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

function diagnosticMessages(diagnostics: readonly unknown[]): string[] {
  return diagnostics
    .map((diagnostic) => (diagnostic as { message?: unknown }).message)
    .filter((message): message is string => typeof message === "string");
}
