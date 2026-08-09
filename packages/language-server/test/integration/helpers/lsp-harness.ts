import { expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
  type MessageConnection,
} from "vscode-languageserver/node";

const serverEntry = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "out",
  "main.js",
);

export function startServer(cwd: string) {
  const child = spawn(process.execPath, [serverEntry, "--stdio"], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stderr: string[] = [];
  child.stderr!.on("data", (data: Buffer) => {
    stderr.push(data.toString());
    process.stderr.write(data);
  });
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout!),
    new StreamMessageWriter(child.stdin!),
  );
  connection.onNotification("window/logMessage", (params: { type?: number; message?: string }) => {
    stderr.push(`[lsp:${params.type ?? "?"}] ${params.message ?? ""}\n`);
  });
  connection.listen();
  return {
    child,
    connection,
    getStderr() {
      return stderr.join("");
    },
    dispose() {
      try {
        connection.dispose();
      } catch {}
    },
  };
}

export async function initialize(
  connection: MessageConnection,
  child: ChildProcess,
  getStderr: () => string,
  workspaceRoot: string,
  options: {
    readonly configuration?: Readonly<Record<string, unknown>>;
    readonly onInlayHintRefresh?: () => void;
    readonly diagnostics?: {
      readonly onAnalysisChanged?: (params: unknown) => void;
      readonly onRefresh?: () => void;
    };
    /** Client-authored workspace URI when the test is exercising a non-file URI namespace. */
    readonly rootUri?: string;
  } = {},
) {
  if (options.configuration != null) {
    connection.onRequest("workspace/configuration", (params: {
      readonly items?: readonly { readonly section?: string }[];
    }) => (params.items ?? []).map((item) =>
      item.section == null ? null : options.configuration![item.section] ?? null
    ));
    connection.onRequest("client/registerCapability", () => null);
    connection.onRequest("workspace/inlayHint/refresh", () => {
      options.onInlayHintRefresh?.();
      return null;
    });
  }
  if (options.diagnostics != null) {
    connection.onNotification("aurelia/analysisChanged", (params: unknown) => {
      options.diagnostics?.onAnalysisChanged?.(params);
    });
    connection.onRequest("workspace/diagnostic/refresh", () => {
      options.diagnostics?.onRefresh?.();
      return null;
    });
  }
  const rootUri = options.rootUri ?? pathToFileURL(workspaceRoot).toString();
  return await new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${getStderr()}`)), 5000);
    const onExit = (code: number | null, signal: string | null) => {
      clearTimeout(timer);
      reject(new Error(`server exited before initialize (code=${code} signal=${signal}): ${getStderr()}`));
    };
    child.once("exit", onExit);
    connection.sendRequest("initialize", {
      processId: process.pid,
      rootUri,
      capabilities: {
        workspace: options.configuration == null && options.diagnostics == null
          ? undefined
          : {
              ...(options.configuration == null ? {} : {
                configuration: true,
                didChangeConfiguration: { dynamicRegistration: true },
                inlayHint: { refreshSupport: true },
              }),
              ...(options.diagnostics == null ? {} : {
                diagnostics: { refreshSupport: true },
              }),
            },
        textDocument: {
          codeAction: {
            dataSupport: true,
            resolveSupport: { properties: ["edit"] },
          },
          ...(options.diagnostics == null ? {} : {
            diagnostic: {
              relatedInformation: true,
              tagSupport: { valueSet: [1, 2] },
              codeDescriptionSupport: true,
              dataSupport: true,
              dynamicRegistration: true,
              relatedDocumentSupport: false,
              markupMessageSupport: false,
            },
          }),
        },
      },
    }).then(
      (result: unknown) => {
        clearTimeout(timer);
        child.off("exit", onExit);
        connection.sendNotification("initialized", {});
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        child.off("exit", onExit);
        reject(err);
      },
    );
  });
}

export function openDocument(
  connection: MessageConnection,
  uri: string,
  languageId: string,
  text: string,
  version = 1,
) {
  connection.sendNotification("textDocument/didOpen", {
    textDocument: {
      uri,
      languageId,
      version,
      text,
    },
  });
}

export function changeDocument(
  connection: MessageConnection,
  uri: string,
  text: string,
  version: number,
) {
  connection.sendNotification("textDocument/didChange", {
    textDocument: {
      uri,
      version,
    },
    contentChanges: [
      {
        text,
      },
    ],
  });
}

export function waitForDiagnostics(
  connection: MessageConnection,
  child: ChildProcess,
  getStderr: () => string,
  uri: string,
  timeoutMs = 5000,
): Promise<unknown[]> {
  return pullDiagnostics(connection, child, getStderr, uri, timeoutMs);
}

export function createDiagnosticsRecorder(
  connection: MessageConnection,
  child: ChildProcess,
  getStderr: () => string,
) {
  return {
    wait(uri: string, timeoutMs = 5000): Promise<unknown[]> {
      return pullDiagnostics(connection, child, getStderr, uri, timeoutMs);
    },
    dispose(): void {},
  };
}

function pullDiagnostics(
  connection: MessageConnection,
  child: ChildProcess,
  getStderr: () => string,
  uri: string,
  timeoutMs: number,
): Promise<unknown[]> {
  return new Promise<unknown[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      reject(new Error(`diagnostics timeout for ${uri}`));
    }, timeoutMs);
    const onExit = (code: number | null, signal: string | null) => {
      clearTimeout(timer);
      reject(new Error(`server exited (code=${code ?? "null"} signal=${signal ?? "null"}): ${getStderr()}`));
    };
    child.once("exit", onExit);
    void connection.sendRequest("textDocument/diagnostic", {
      textDocument: { uri },
    }).then((report: unknown) => {
      clearTimeout(timer);
      child.off("exit", onExit);
      const items = report != null && typeof report === "object" && !Array.isArray(report)
        ? (report as { items?: unknown }).items
        : undefined;
      resolve(Array.isArray(items) ? items : []);
    }, (error: unknown) => {
      clearTimeout(timer);
      child.off("exit", onExit);
      reject(error);
    });
  });
}

export function positionAt(text: string, offset: number) {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 0;
  let lastLineStart = 0;
  for (let i = 0; i < clamped; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 10 /* \n */) {
      line += 1;
      lastLineStart = i + 1;
    }
  }
  return { line, character: clamped - lastLineStart };
}

export function offsetAt(text: string, position: { line: number; character: number }): number {
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < text.length; i++) {
    if (line === position.line) {
      return Math.min(lineStart + position.character, text.length);
    }
    if (text.charCodeAt(i) === 10 /* \n */) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return line === position.line ? Math.min(lineStart + position.character, text.length) : text.length;
}

export function decodeHover(hover: unknown): string {
  if (!hover) return "";
  const h = hover as { contents?: unknown };
  const content = Array.isArray(h.contents) ? h.contents : [h.contents];
  return content
    .map((c) => {
      if (!c) return "";
      if (typeof c === "string") return c;
      const obj = c as { value?: string; language?: string };
      if ("value" in obj && typeof obj.value === "string") return obj.value;
      if ("language" in obj && "value" in obj) return `${obj.language}: ${obj.value}`;
      return "";
    })
    .join("\n");
}

interface Edit {
  uri: string;
  range: unknown;
  newText: string;
}

export interface RenameResult {
  documentChanges?: Array<{
    kind?: string;
    textDocument?: { uri: string; version?: number | null };
    edits?: Array<{ range: unknown; newText: string }>;
  }>;
  changes?: Record<string, Array<{ range: unknown; newText: string }> | undefined>;
}

export function collectEdits(renameResult: RenameResult): Edit[] {
  const edits: Edit[] = [];
  const docChanges = renameResult.documentChanges ?? [];
  for (const change of docChanges) {
    if (change.kind === "rename" || change.kind === "create" || change.kind === "delete") continue;
    if (change.textDocument && change.edits) {
      for (const e of change.edits) {
        edits.push({ uri: change.textDocument.uri, range: e.range, newText: e.newText });
      }
    }
  }
  const changes = renameResult.changes ?? {};
  for (const [uri, uriEdits] of Object.entries(changes)) {
    for (const e of uriEdits ?? []) {
      edits.push({ uri, range: e.range, newText: e.newText });
    }
  }
  return edits;
}

export function createFixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-lsp-integ-"));
  for (const [name, contents] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents, "utf8");
  }
  return dir;
}

/** Create a boot-admitted Aurelia app instead of relying on filename conventions in adapter tests. */
export function createAureliaAppFixture(
  files: Record<string, string>,
  additionalDependencies: Readonly<Record<string, string>> = {},
): string {
  return createFixture({
    "package.json": JSON.stringify({
      name: "aurelia-lsp-integration-fixture",
      private: true,
      type: "module",
      dependencies: {
        aurelia: "^2.0.0-rc.1",
        ...additionalDependencies,
      },
      devDependencies: {
        typescript: "^6.0.3",
      },
    }),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        strict: true,
        skipLibCheck: true,
        allowArbitraryExtensions: true,
        noEmit: true,
      },
      include: ["src"],
    }),
    "src/main.ts": [
      "import Aurelia from 'aurelia';",
      "import { AppRoot } from './app';",
      "Aurelia.app(AppRoot).start();",
    ].join("\n"),
    ...files,
  });
}

export function copyFixtureDirectory(sourceDir: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-lsp-integ-"));
  fs.cpSync(sourceDir, dir, { recursive: true });
  return dir;
}

export function waitForExit(child: ChildProcess, timeoutMs = 2000): Promise<void> {
  if (child.exitCode != null || child.signalCode != null) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not exit within ${timeoutMs}ms`)), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function fileUri(root: string, relPath: string): string {
  const normalized = path.join(root, relPath);
  expect(path.isAbsolute(normalized)).toBe(true);
  // Use Node's pathToFileURL for consistent URI format (doesn't encode colons)
  return pathToFileURL(normalized).toString();
}

export function pathFromFileUri(uri: string): string {
  return fileURLToPath(uri);
}

export function normalizedUriPath(uri: string): string {
  return normalizedFileIdentity(pathFromFileUri(uri));
}

export interface TrackedDocument {
  readonly uri: string;
  readonly languageId: string;
  text: string;
  version: number;
}

export function applyWorkspaceEditToTrackedDocuments(
  edit: RenameResult,
  documents: Map<string, TrackedDocument>,
): readonly TrackedDocument[] {
  const changed = new Map<string, TrackedDocument>();
  const editsByUri = new Map<string, {
    expectedVersion: number | null;
    edits: Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>;
  }>();
  for (const change of edit.documentChanges ?? []) {
    if (change.kind === "rename" || change.kind === "create" || change.kind === "delete") continue;
    if (!change.textDocument || !change.edits) continue;
    const bucket = editsByUri.get(change.textDocument.uri) ?? {
      expectedVersion: change.textDocument.version ?? null,
      edits: [],
    };
    if (bucket.expectedVersion == null && change.textDocument.version != null) {
      bucket.expectedVersion = change.textDocument.version;
    }
    bucket.edits.push(...change.edits as Array<{
      range: { start: { line: number; character: number }; end: { line: number; character: number } };
      newText: string;
    }>);
    editsByUri.set(change.textDocument.uri, bucket);
  }
  const allEdits = collectEdits(edit) as Array<{
    uri: string;
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    newText: string;
  }>;
  for (const entry of allEdits) {
    if (editsByUri.has(entry.uri)) continue;
    const bucket = editsByUri.get(entry.uri) ?? {
      expectedVersion: null,
      edits: [],
    };
    bucket.edits.push({ range: entry.range, newText: entry.newText });
    editsByUri.set(entry.uri, bucket);
  }

  for (const [uri, editBucket] of editsByUri) {
    const existingKey = trackedDocumentKeyForUri(documents, uri);
    const version = existingKey == null ? 0 : documents.get(existingKey)!.version;
    if (editBucket.expectedVersion != null && version !== editBucket.expectedVersion) {
      throw new Error(`WorkspaceEdit for ${uri} expected document version ${editBucket.expectedVersion} but tracked version is ${version}.`);
    }
  }

  for (const [uri, editBucket] of editsByUri) {
    const existingKey = trackedDocumentKeyForUri(documents, uri);
    const document = existingKey == null ? {
      uri,
      languageId: languageIdForPath(pathFromFileUri(uri)),
      text: fs.readFileSync(pathFromFileUri(uri), "utf8"),
      version: 0,
    } : documents.get(existingKey)!;
    const sorted = [...editBucket.edits].sort((left, right) =>
      offsetAt(document.text, right.range.start) - offsetAt(document.text, left.range.start)
    );
    let text = document.text;
    for (const row of sorted) {
      const start = offsetAt(text, row.range.start);
      const end = offsetAt(text, row.range.end);
      text = `${text.slice(0, start)}${row.newText}${text.slice(end)}`;
    }
    document.text = text;
    document.version += 1;
    if (existingKey == null) {
      documents.set(uri, document);
    } else {
      if (existingKey !== document.uri) {
        documents.delete(existingKey);
      }
      documents.set(document.uri, document);
    }
    fs.writeFileSync(pathFromFileUri(uri), text, "utf8");
    changed.set(uri, document);
  }
  return [...changed.values()];
}

function trackedDocumentKeyForUri(
  documents: Map<string, TrackedDocument>,
  uri: string,
): string | null {
  const direct = documents.get(uri);
  if (direct != null) {
    return uri;
  }
  const targetPath = normalizedFileIdentity(pathFromFileUri(uri));
  for (const candidate of documents.keys()) {
    if (normalizedFileIdentity(pathFromFileUri(candidate)) === targetPath) {
      return candidate;
    }
  }
  return null;
}

function normalizedFileIdentity(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function languageIdForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
      return "typescript";
    case ".js":
      return "javascript";
    case ".html":
      return "html";
    case ".json":
      return "json";
    default:
      return "plaintext";
  }
}
