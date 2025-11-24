import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
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

export function startServer(cwd) {
  const child = spawn(process.execPath, [serverEntry, "--stdio"], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stderr = [];
  child.stderr.on("data", (data) => {
    stderr.push(data.toString());
    process.stderr.write(data);
  });
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
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

export async function initialize(connection, child, getStderr, workspaceRoot) {
  const rootUri = URI.file(workspaceRoot).toString();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${getStderr()}`)), 5000);
    const onExit = (code, signal) => {
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

export function openDocument(connection, uri, languageId, text, version = 1) {
  connection.sendNotification("textDocument/didOpen", {
    textDocument: {
      uri,
      languageId,
      version,
      text,
    },
  });
}

export function waitForDiagnostics(connection, child, getStderr, uri, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("diagnostics timeout")), timeoutMs);
    const onExit = (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`server exited (code=${code ?? "null"} signal=${signal ?? "null"}): ${getStderr()}`));
    };
    child.once("exit", onExit);
    const sub = connection.onNotification("textDocument/publishDiagnostics", (params) => {
      if (params.uri !== uri) return;
      clearTimeout(timer);
      child.off("exit", onExit);
      if (typeof sub.dispose === "function") sub.dispose();
      resolve(params.diagnostics ?? []);
    });
  });
}

export function positionAt(text, offset) {
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

export function decodeHover(hover) {
  if (!hover) return "";
  const content = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
  return content
    .map((c) => {
      if (!c) return "";
      if (typeof c === "string") return c;
      if ("value" in c && typeof c.value === "string") return c.value;
      if ("language" in c && "value" in c) return `${c.language}: ${c.value}`;
      return "";
    })
    .join("\n");
}

export function collectEdits(renameResult) {
  const edits = [];
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

export function createFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-lsp-integ-"));
  for (const [name, contents] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents, "utf8");
  }
  return dir;
}

export function waitForExit(child, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function fileUri(root, relPath) {
  const normalized = path.join(root, relPath);
  assert.ok(path.isAbsolute(normalized));
  return URI.file(normalized).toString();
}
