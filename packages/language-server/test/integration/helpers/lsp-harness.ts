import { expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
  type MessageConnection,
} from "vscode-languageserver/node.js";
import { URI } from "vscode-uri";

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
) {
  const rootUri = URI.file(workspaceRoot).toString();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${getStderr()}`)), 5000);
    const onExit = (code: number | null, signal: string | null) => {
      clearTimeout(timer);
      reject(new Error(`server exited before initialize (code=${code} signal=${signal}): ${getStderr()}`));
    };
    child.once("exit", onExit);
    connection.sendRequest("initialize", {
      processId: process.pid,
      rootUri,
      capabilities: {},
    }).then(
      () => {
        clearTimeout(timer);
        child.off("exit", onExit);
        connection.sendNotification("initialized", {});
        resolve();
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

export function waitForDiagnostics(
  connection: MessageConnection,
  child: ChildProcess,
  getStderr: () => string,
  uri: string,
  timeoutMs = 5000,
) {
  return new Promise<unknown[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("diagnostics timeout")), timeoutMs);
    const onExit = (code: number | null, signal: string | null) => {
      clearTimeout(timer);
      reject(new Error(`server exited (code=${code ?? "null"} signal=${signal ?? "null"}): ${getStderr()}`));
    };
    child.once("exit", onExit);
    const sub = connection.onNotification("textDocument/publishDiagnostics", (params: { uri: string; diagnostics?: unknown[] }) => {
      if (params.uri !== uri) return;
      clearTimeout(timer);
      child.off("exit", onExit);
      if (typeof sub.dispose === "function") sub.dispose();
      resolve(params.diagnostics ?? []);
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

interface RenameResult {
  documentChanges?: Array<{
    kind?: string;
    textDocument?: { uri: string };
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

export function waitForExit(child: ChildProcess, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function fileUri(root: string, relPath: string): string {
  const normalized = path.join(root, relPath);
  expect(path.isAbsolute(normalized)).toBe(true);
  return URI.file(normalized).toString();
}
