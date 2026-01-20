import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startServer,
  initialize,
  openDocument,
  waitForDiagnostics,
  waitForExit,
  fileUri,
  decodeHover,
  collectEdits,
  positionAt,
} from "./helpers/lsp-harness.js";
import {
  mapSemanticWorkspaceEdit,
  mapWorkspaceCompletions,
  mapWorkspaceDiagnostics,
  mapWorkspaceHover,
  mapWorkspaceLocations,
  toLspUri,
  type LookupTextFn,
} from "../../src/mapping/lsp-types.js";
import { TOKEN_MODIFIERS, TOKEN_TYPES } from "../../src/handlers/semantic-tokens.js";
import {
  asDocumentUri,
  type DocumentUri,
} from "@aurelia-ls/compiler";
import type { WorkspaceToken } from "@aurelia-ls/semantic-workspace";
import { createWorkspaceHarness } from "../../../semantic-workspace/test/harness/index.js";
import { asFixtureId } from "../../../semantic-workspace/test/fixtures/index.js";

type Range = { start: { line: number; character: number }; end: { line: number; character: number } };
type Location = { uri: string; range: Range };
type Edit = { uri: string; range: Range; newText: string };

const TYPE_INDEX = new Map<string, number>(TOKEN_TYPES.map((t, i) => [t, i]));
const MOD_INDEX = new Map<string, number>(TOKEN_MODIFIERS.map((m, i) => [m, i]));

function findPosition(text: string, needle: string, delta = 0): { line: number; character: number } {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Marker not found: ${needle}`);
  }
  return positionAt(text, index + delta);
}

function normalizeUri(uri: string): string {
  return toLspUri(asDocumentUri(uri));
}

function normalizeHover(hover: unknown): { contents: string; range: Range | null } | null {
  if (!hover) return null;
  const value = hover as { contents?: unknown; range?: Range };
  return {
    contents: decodeHover(value),
    range: value.range ?? null,
  };
}

function normalizeLocations(input: unknown): Location[] {
  if (!input) return [];
  const items = Array.isArray(input) ? input : [input];
  return items
    .map((entry) => {
      const loc = entry as { uri?: string; range?: Range; targetUri?: string; targetRange?: Range };
      if (loc.targetUri && loc.targetRange) {
        return { uri: normalizeUri(loc.targetUri), range: loc.targetRange };
      }
      if (loc.uri && loc.range) {
        return { uri: normalizeUri(loc.uri), range: loc.range };
      }
      return null;
    })
    .filter((entry): entry is Location => !!entry);
}

function normalizeDiagnostics(input: unknown[]): unknown[] {
  return input
    .map((diag) => {
      const entry = diag as { range?: Range; code?: unknown; message?: string; severity?: number; source?: string; data?: unknown };
      return {
        range: entry.range,
        code: entry.code,
        message: entry.message,
        severity: entry.severity,
        source: entry.source,
        data: entry.data,
      };
    })
    .sort((a, b) => {
      const aKey = `${a.range?.start.line ?? 0}:${a.range?.start.character ?? 0}:${String(a.code ?? "")}`;
      const bKey = `${b.range?.start.line ?? 0}:${b.range?.start.character ?? 0}:${String(b.code ?? "")}`;
      return aKey.localeCompare(bKey);
    });
}

function normalizeEdits(edit: unknown): Edit[] {
  if (!edit) return [];
  const edits = collectEdits(edit as { changes?: Record<string, { range: Range; newText: string }[]> });
  return edits
    .map((entry) => ({
      uri: normalizeUri(entry.uri),
      range: entry.range as Range,
      newText: entry.newText,
    }))
    .sort((a, b) => {
      const aKey = `${a.uri}:${a.range.start.line}:${a.range.start.character}:${a.range.end.line}:${a.range.end.character}`;
      const bKey = `${b.uri}:${b.range.start.line}:${b.range.start.character}:${b.range.end.line}:${b.range.end.character}`;
      return aKey.localeCompare(bKey);
    });
}

function normalizeCompletions(input: unknown): Array<{
  label: string;
  detail?: string;
  documentation?: string;
  sortText?: string;
  insertText?: string;
}> {
  if (!input) return [];
  const list = Array.isArray(input) ? input : (input as { items?: unknown[] }).items ?? [];
  return list.map((item) => {
    const entry = item as {
      label?: string;
      detail?: string;
      documentation?: string | { value?: string };
      sortText?: string;
      insertText?: string;
    };
    const doc = entry.documentation;
    const documentation = typeof doc === "string" ? doc : doc && typeof doc === "object" ? doc.value : undefined;
    return {
      label: entry.label ?? "",
      detail: entry.detail,
      documentation,
      sortText: entry.sortText,
      insertText: entry.insertText,
    };
  });
}

function normalizeCodeActions(input: unknown): Array<{ title: string; kind?: string; edits: Edit[] }> {
  if (!input) return [];
  const actions = input as Array<{ title?: string; kind?: string; edit?: unknown }>;
  return actions.map((action) => ({
    title: action.title ?? "",
    kind: action.kind,
    edits: normalizeEdits(action.edit ?? null),
  }));
}

function encodeTokens(tokens: readonly WorkspaceToken[], text: string): number[] {
  const raw: Array<{ line: number; char: number; length: number; type: number; modifiers: number }> = [];
  for (const token of tokens) {
    const typeIndex = TYPE_INDEX.get(token.type);
    if (typeIndex === undefined) continue;
    const length = token.span.end - token.span.start;
    if (length <= 0) continue;
    const start = positionAt(text, token.span.start);
    raw.push({
      line: start.line,
      char: start.character,
      length,
      type: typeIndex,
      modifiers: encodeModifiers(token.modifiers),
    });
  }

  raw.sort((a, b) => a.line - b.line || a.char - b.char);

  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;
  for (const token of raw) {
    const deltaLine = token.line - prevLine;
    const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char;
    data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers);
    prevLine = token.line;
    prevChar = token.char;
  }
  return data;
}

function encodeModifiers(modifiers?: readonly string[]): number {
  if (!modifiers?.length) return 0;
  let value = 0;
  for (const mod of modifiers) {
    const idx = MOD_INDEX.get(mod);
    if (idx === undefined) continue;
    value |= 1 << idx;
  }
  return value;
}

describe("adapter contract (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: DocumentUri;
  let appText: string;
  let tableUri: DocumentUri;
  let tableText: string;
  let appLspUri: string;
  let tableLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;
  let appVersion = 1;
  let tableVersion = 1;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    appUri = harness.openTemplate("src/my-app.html");
    tableUri = harness.openTemplate("src/views/table-panel.html");

    const app = harness.readText(appUri);
    const table = harness.readText(tableUri);
    if (!app || !table) {
      throw new Error("Expected template text for workspace-contract fixtures");
    }
    appText = app;
    tableText = table;

    lookupText = (uri) => harness.readText(uri) ?? null;

    appLspUri = fileUri(harness.root, "src/my-app.html");
    tableLspUri = fileUri(harness.root, "src/views/table-panel.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);
    openDocument(connection, appLspUri, "html", appText);
    const appDiags = await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
    openDocument(connection, tableLspUri, "html", tableText);
    const tableDiags = await waitForDiagnostics(connection, child, getStderr, tableLspUri, 10000);
    lspDiagnosticsByUri = new Map([
      [appLspUri, appDiags as unknown[]],
      [tableLspUri, tableDiags as unknown[]],
    ]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover and definition results", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const pos = findPosition(appText, "<summary-panel", 1);
    const workspaceQuery = harness.workspace.query(appUri);

    const workspaceHover = workspaceQuery.hover(pos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appLspUri },
      position: pos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const workspaceDefs = workspaceQuery.definition(pos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: appLspUri },
      position: pos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);
  });

  it("mirrors references and rename edits", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const pos = findPosition(tableText, "item.rating", "item.".length);
    const workspaceQuery = harness.workspace.query(tableUri);

    const workspaceRefs = workspaceQuery.references(pos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: tableLspUri },
      position: pos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const renameResult = harness.workspace.refactor().rename({
      uri: tableUri,
      position: pos,
      newName: "score",
    });
    if ("error" in renameResult) {
      throw new Error(`Workspace rename failed: ${renameResult.error.message}`);
    }

    const expectedEdit = mapSemanticWorkspaceEdit(renameResult.edit, lookupText);
    const lspRename = await connection.sendRequest("textDocument/rename", {
      textDocument: { uri: tableLspUri },
      position: pos,
      newName: "score",
    });
    expect(normalizeEdits(lspRename)).toEqual(normalizeEdits(expectedEdit));
  });

  it("mirrors completions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const pos = findPosition(appText, "value.bind", "value.".length);
    const workspaceQuery = harness.workspace.query(appUri);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(pos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: appLspUri },
      position: pos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors diagnostics output", () => {
    const expectedApp = mapWorkspaceDiagnostics(appUri, harness.workspace.diagnostics(appUri), lookupText);
    const expectedTable = mapWorkspaceDiagnostics(tableUri, harness.workspace.diagnostics(tableUri), lookupText);
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(appLspUri) ?? [])).toEqual(normalizeDiagnostics(expectedApp));
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(tableLspUri) ?? [])).toEqual(normalizeDiagnostics(expectedTable));
  });

  it("mirrors semantic tokens", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(appUri).semanticTokens();
    const expected = encodeTokens(workspaceTokens, appText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: appLspUri },
    });
    const actual = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actual).toEqual(expected);
  });

  it("mirrors code actions", async () => {
    const connection = serverState.connection;
    const child = serverState.child;
    const getStderr = serverState.getStderr;
    if (!connection || !child || !getStderr) throw new Error("Missing LSP server state");

    const mutated = appText.replace(
      "<div class=\"quick-actions\">",
      "  <status-badge status.bind=\"activeDevice.status\"></status-badge>\n  <div class=\"quick-actions\">",
    );
    harness.updateTemplate(appUri, mutated);
    appVersion += 1;
    connection.sendNotification("textDocument/didChange", {
      textDocument: { uri: appLspUri, version: appVersion },
      contentChanges: [{ text: mutated }],
    });
    await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);

    const pos = findPosition(mutated, "status-badge", 1);
    const workspaceActions = harness.workspace.refactor().codeActions({ uri: appUri, position: pos });
    const expected = workspaceActions
      .map((action) => ({
        title: action.title,
        kind: action.kind,
        edit: mapSemanticWorkspaceEdit(action.edit ?? null, lookupText),
      }))
      .filter((action) => action.edit != null);

    const lspActions = await connection.sendRequest("textDocument/codeAction", {
      textDocument: { uri: appLspUri },
      range: { start: pos, end: pos },
      context: { diagnostics: [] },
    });

    expect(normalizeCodeActions(lspActions)).toEqual(normalizeCodeActions(expected));

    harness.updateTemplate(appUri, appText);
    appVersion += 1;
    connection.sendNotification("textDocument/didChange", {
      textDocument: { uri: appLspUri, version: appVersion },
      contentChanges: [{ text: appText }],
    });
    await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
  });
});

describe("adapter contract (template control scenarios)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let controllersUri: DocumentUri;
  let controllersText: string;
  let projectionUri: DocumentUri;
  let projectionText: string;
  let deepUri: DocumentUri;
  let deepText: string;
  let localsUri: DocumentUri;
  let localsText: string;
  let controllersLspUri: string;
  let projectionLspUri: string;
  let deepLspUri: string;
  let localsLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-control-scenarios"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    controllersUri = harness.openTemplate("src/components/controllers-branches.html");
    projectionUri = harness.openTemplate("src/components/projection-demo.html");
    deepUri = harness.openTemplate("src/components/deep-nesting.html");
    localsUri = harness.openTemplate("src/components/locals-demo.html");

    const controllers = harness.readText(controllersUri);
    const projection = harness.readText(projectionUri);
    const deep = harness.readText(deepUri);
    const locals = harness.readText(localsUri);
    if (!controllers || !projection || !deep || !locals) {
      throw new Error("Expected template text for template-control-scenarios fixtures");
    }
    controllersText = controllers;
    projectionText = projection;
    deepText = deep;
    localsText = locals;

    lookupText = (uri) => harness.readText(uri) ?? null;

    controllersLspUri = fileUri(harness.root, "src/components/controllers-branches.html");
    projectionLspUri = fileUri(harness.root, "src/components/projection-demo.html");
    deepLspUri = fileUri(harness.root, "src/components/deep-nesting.html");
    localsLspUri = fileUri(harness.root, "src/components/locals-demo.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);

    openDocument(connection, controllersLspUri, "html", controllersText);
    const controllersDiags = await waitForDiagnostics(connection, child, getStderr, controllersLspUri, 10000);
    openDocument(connection, projectionLspUri, "html", projectionText);
    const projectionDiags = await waitForDiagnostics(connection, child, getStderr, projectionLspUri, 10000);
    openDocument(connection, deepLspUri, "html", deepText);
    const deepDiags = await waitForDiagnostics(connection, child, getStderr, deepLspUri, 10000);
    openDocument(connection, localsLspUri, "html", localsText);
    const localsDiags = await waitForDiagnostics(connection, child, getStderr, localsLspUri, 10000);

    lspDiagnosticsByUri = new Map([
      [controllersLspUri, controllersDiags as unknown[]],
      [projectionLspUri, projectionDiags as unknown[]],
      [deepLspUri, deepDiags as unknown[]],
      [localsLspUri, localsDiags as unknown[]],
    ]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover and definition results (controllers-branches)", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const pos = findPosition(controllersText, "promise.bind", 1);
    const workspaceQuery = harness.workspace.query(controllersUri);

    const workspaceHover = workspaceQuery.hover(pos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: controllersLspUri },
      position: pos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const defPos = findPosition(controllersText, "modePrimary", 1);
    const workspaceDefs = workspaceQuery.definition(defPos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: controllersLspUri },
      position: defPos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);
  });

  it("mirrors projection definitions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const pos = findPosition(projectionText, "<my-card", 1);
    const workspaceDefs = harness.workspace.query(projectionUri).definition(pos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: projectionLspUri },
      position: pos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);
  });

  it("mirrors references and completions (locals-demo)", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const pos = findPosition(localsText, "item.name", 1);
    const workspaceQuery = harness.workspace.query(localsUri);

    const workspaceRefs = workspaceQuery.references(pos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: localsLspUri },
      position: pos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const completionPos = findPosition(localsText, "item.name", "item.".length);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(completionPos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: localsLspUri },
      position: completionPos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors semantic tokens (deep-nesting)", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(deepUri).semanticTokens();
    const expected = encodeTokens(workspaceTokens, deepText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: deepLspUri },
    });
    const actual = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actual).toEqual(expected);
  });

  it("mirrors diagnostics output", () => {
    const expectedControllers = mapWorkspaceDiagnostics(controllersUri, harness.workspace.diagnostics(controllersUri), lookupText);
    const expectedProjection = mapWorkspaceDiagnostics(projectionUri, harness.workspace.diagnostics(projectionUri), lookupText);
    const expectedDeep = mapWorkspaceDiagnostics(deepUri, harness.workspace.diagnostics(deepUri), lookupText);
    const expectedLocals = mapWorkspaceDiagnostics(localsUri, harness.workspace.diagnostics(localsUri), lookupText);

    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(controllersLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedControllers),
    );
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(projectionLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedProjection),
    );
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(deepLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedDeep),
    );
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(localsLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedLocals),
    );
  });
});

describe("adapter contract (binding shorthand syntax)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: DocumentUri;
  let appText: string;
  let appLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("binding-shorthand-syntax"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) throw new Error("Expected template text for binding-shorthand-syntax fixture");
    appText = app;
    lookupText = (uri) => harness.readText(uri) ?? null;
    appLspUri = fileUri(harness.root, "src/my-app.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);
    openDocument(connection, appLspUri, "html", appText);
    const appDiags = await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
    lspDiagnosticsByUri = new Map([[appLspUri, appDiags as unknown[]]]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover/definition/references/completions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceQuery = harness.workspace.query(appUri);
    const defPos = findPosition(appText, ":value=\"message\"", ":value=\"".length + 1);

    const workspaceHover = workspaceQuery.hover(defPos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appLspUri },
      position: defPos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const workspaceDefs = workspaceQuery.definition(defPos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: appLspUri },
      position: defPos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);

    const refPos = findPosition(appText, "${count}", 3);
    const workspaceRefs = workspaceQuery.references(refPos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: appLspUri },
      position: refPos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const completionPos = findPosition(appText, ":class=\"state\"", ":class=\"".length + 1);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(completionPos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: appLspUri },
      position: completionPos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors semantic tokens and diagnostics", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(appUri).semanticTokens();
    const expectedTokens = encodeTokens(workspaceTokens, appText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: appLspUri },
    });
    const actualTokens = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actualTokens).toEqual(expectedTokens);

    const expectedDiagnostics = mapWorkspaceDiagnostics(appUri, harness.workspace.diagnostics(appUri), lookupText);
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(appLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedDiagnostics),
    );
  });
});

describe("adapter contract (template local scopes)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: DocumentUri;
  let appText: string;
  let appLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-local-scopes"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) throw new Error("Expected template text for template-local-scopes fixture");
    appText = app;
    lookupText = (uri) => harness.readText(uri) ?? null;
    appLspUri = fileUri(harness.root, "src/my-app.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);
    openDocument(connection, appLspUri, "html", appText);
    const appDiags = await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
    lspDiagnosticsByUri = new Map([[appLspUri, appDiags as unknown[]]]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover/definition/references/completions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceQuery = harness.workspace.query(appUri);
    const hoverPos = findPosition(appText, "repeat.for", 1);

    const workspaceHover = workspaceQuery.hover(hoverPos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appLspUri },
      position: hoverPos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const defPos = findPosition(appText, "${label}", 3);
    const workspaceDefs = workspaceQuery.definition(defPos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: appLspUri },
      position: defPos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);

    const workspaceRefs = workspaceQuery.references(defPos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: appLspUri },
      position: defPos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const completionPos = findPosition(appText, "item.name", "item.".length);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(completionPos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: appLspUri },
      position: completionPos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors semantic tokens and diagnostics", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(appUri).semanticTokens();
    const expectedTokens = encodeTokens(workspaceTokens, appText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: appLspUri },
    });
    const actualTokens = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actualTokens).toEqual(expectedTokens);

    const expectedDiagnostics = mapWorkspaceDiagnostics(appUri, harness.workspace.diagnostics(appUri), lookupText);
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(appLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedDiagnostics),
    );
  });
});

describe("adapter contract (portal chain)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: DocumentUri;
  let appText: string;
  let appLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("portal-chain"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) throw new Error("Expected template text for portal-chain fixture");
    appText = app;
    lookupText = (uri) => harness.readText(uri) ?? null;
    appLspUri = fileUri(harness.root, "src/my-app.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);
    openDocument(connection, appLspUri, "html", appText);
    const appDiags = await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
    lspDiagnosticsByUri = new Map([[appLspUri, appDiags as unknown[]]]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover/definition/references/completions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceQuery = harness.workspace.query(appUri);
    const hoverPos = findPosition(appText, "portal.bind", 1);

    const workspaceHover = workspaceQuery.hover(hoverPos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appLspUri },
      position: hoverPos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const defPos = findPosition(appText, "showPortal", 1);
    const workspaceDefs = workspaceQuery.definition(defPos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: appLspUri },
      position: defPos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);

    const workspaceRefs = workspaceQuery.references(defPos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: appLspUri },
      position: defPos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const completionPos = findPosition(appText, "${title}", 3);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(completionPos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: appLspUri },
      position: completionPos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors semantic tokens and diagnostics", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(appUri).semanticTokens();
    const expectedTokens = encodeTokens(workspaceTokens, appText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: appLspUri },
    });
    const actualTokens = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actualTokens).toEqual(expectedTokens);

    const expectedDiagnostics = mapWorkspaceDiagnostics(appUri, harness.workspace.diagnostics(appUri), lookupText);
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(appLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedDiagnostics),
    );
  });
});

describe("adapter contract (portal deep nesting)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: DocumentUri;
  let appText: string;
  let appLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("portal-deep-nesting"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) throw new Error("Expected template text for portal-deep-nesting fixture");
    appText = app;
    lookupText = (uri) => harness.readText(uri) ?? null;
    appLspUri = fileUri(harness.root, "src/my-app.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);
    openDocument(connection, appLspUri, "html", appText);
    const appDiags = await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
    lspDiagnosticsByUri = new Map([[appLspUri, appDiags as unknown[]]]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover/definition/references/completions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceQuery = harness.workspace.query(appUri);
    const hoverPos = findPosition(appText, "promise.bind", 1);

    const workspaceHover = workspaceQuery.hover(hoverPos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appLspUri },
      position: hoverPos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const defPos = findPosition(appText, "result.show", 1);
    const workspaceDefs = workspaceQuery.definition(defPos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: appLspUri },
      position: defPos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);

    const workspaceRefs = workspaceQuery.references(defPos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: appLspUri },
      position: defPos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const completionPos = findPosition(appText, "item.label", "item.".length);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(completionPos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: appLspUri },
      position: completionPos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors semantic tokens and diagnostics", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(appUri).semanticTokens();
    const expectedTokens = encodeTokens(workspaceTokens, appText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: appLspUri },
    });
    const actualTokens = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actualTokens).toEqual(expectedTokens);

    const expectedDiagnostics = mapWorkspaceDiagnostics(appUri, harness.workspace.diagnostics(appUri), lookupText);
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(appLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedDiagnostics),
    );
  });
});

describe("adapter contract (let edge cases)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: DocumentUri;
  let appText: string;
  let appLspUri: string;
  let lookupText: LookupTextFn;
  let lspDiagnosticsByUri: Map<string, unknown[]>;

  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";

  const serverState: {
    connection: ReturnType<typeof startServer>["connection"] | null;
    child: ReturnType<typeof startServer>["child"] | null;
    dispose: (() => void) | null;
    getStderr: (() => string) | null;
  } = { connection: null, child: null, dispose: null, getStderr: null };

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("let-edge-cases"),
      openTemplates: "none",
      resolution: { stripSourcedNodes },
    });
    appUri = harness.openTemplate("src/my-app.html");
    const app = harness.readText(appUri);
    if (!app) throw new Error("Expected template text for let-edge-cases fixture");
    appText = app;
    lookupText = (uri) => harness.readText(uri) ?? null;
    appLspUri = fileUri(harness.root, "src/my-app.html");

    const { connection, child, dispose, getStderr } = startServer(harness.root);
    serverState.connection = connection;
    serverState.child = child;
    serverState.dispose = dispose;
    serverState.getStderr = getStderr;

    await initialize(connection, child, getStderr, harness.root);
    openDocument(connection, appLspUri, "html", appText);
    const appDiags = await waitForDiagnostics(connection, child, getStderr, appLspUri, 10000);
    lspDiagnosticsByUri = new Map([[appLspUri, appDiags as unknown[]]]);
  });

  afterAll(async () => {
    if (serverState.dispose) serverState.dispose();
    if (serverState.child) {
      serverState.child.kill("SIGKILL");
      await waitForExit(serverState.child);
    }
  });

  it("mirrors hover/definition/references/completions", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceQuery = harness.workspace.query(appUri);
    const hoverPos = findPosition(appText, "repeat.for", 1);

    const workspaceHover = workspaceQuery.hover(hoverPos);
    const expectedHover = normalizeHover(mapWorkspaceHover(workspaceHover, lookupText));
    const lspHover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: appLspUri },
      position: hoverPos,
    });
    expect(normalizeHover(lspHover)).toEqual(expectedHover);

    const defPos = findPosition(appText, "${total}", 3);
    const workspaceDefs = workspaceQuery.definition(defPos);
    const expectedDefs = normalizeLocations(mapWorkspaceLocations(workspaceDefs, lookupText));
    const lspDefs = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: appLspUri },
      position: defPos,
    });
    expect(normalizeLocations(lspDefs)).toEqual(expectedDefs);

    const workspaceRefs = workspaceQuery.references(defPos);
    const expectedRefs = normalizeLocations(mapWorkspaceLocations(workspaceRefs, lookupText));
    const lspRefs = await connection.sendRequest("textDocument/references", {
      textDocument: { uri: appLspUri },
      position: defPos,
      context: { includeDeclaration: true },
    });
    expect(normalizeLocations(lspRefs)).toEqual(expectedRefs);

    const completionPos = findPosition(appText, "entry.name", "entry.".length);
    const expectedItems = mapWorkspaceCompletions(workspaceQuery.completions(completionPos));
    const lspCompletions = await connection.sendRequest("textDocument/completion", {
      textDocument: { uri: appLspUri },
      position: completionPos,
    });
    expect(normalizeCompletions(lspCompletions)).toEqual(normalizeCompletions(expectedItems));
  });

  it("mirrors semantic tokens and diagnostics", async () => {
    const connection = serverState.connection;
    if (!connection) throw new Error("Missing LSP connection");

    const workspaceTokens = harness.workspace.query(appUri).semanticTokens();
    const expectedTokens = encodeTokens(workspaceTokens, appText);
    const lspTokens = await connection.sendRequest("textDocument/semanticTokens/full", {
      textDocument: { uri: appLspUri },
    });
    const actualTokens = (lspTokens as { data?: number[] } | null)?.data ?? [];
    expect(actualTokens).toEqual(expectedTokens);

    const expectedDiagnostics = mapWorkspaceDiagnostics(appUri, harness.workspace.diagnostics(appUri), lookupText);
    expect(normalizeDiagnostics(lspDiagnosticsByUri.get(appLspUri) ?? [])).toEqual(
      normalizeDiagnostics(expectedDiagnostics),
    );
  });
});
