import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { URI } from "vscode-uri";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
} from "vscode-languageserver/node.js";
import { fileURLToPath } from "node:url";

const serverEntry = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "out",
  "main.js",
);

test("maps TypeScript diagnostics back to template spans", async () => {
  const fixture = createFixture({
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        types: [],
      },
      files: ["component.ts"],
    }),
    "component.ts": [
      "export class Component {",
      "  existing: number = 1;",
      "}",
    ].join("\n"),
    "diag.html": "<template>${missing}</template>",
  });

  const diagUri = URI.file(path.join(fixture, "diag.html")).toString();
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openDocument(connection, diagUri, "html", fs.readFileSync(path.join(fixture, "diag.html"), "utf8"));

    const diagnostics = await waitForDiagnostics(connection, child, () => getStderr(), diagUri, 5000);
    const tsDiag = diagnostics.find((d) => d.source === "typescript") ?? diagnostics[0];
    assert.ok(tsDiag, "should receive at least one diagnostic");
    assert.equal(tsDiag.range.start.line, 0);
    assert.equal(tsDiag.range.start.character, 12);
    assert.equal(tsDiag.range.end.character, 19);
    assert.ok(/missing/i.test(tsDiag.message), "diagnostic message should mention missing");
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("routes definitions to the view-model via provenance", async () => {
  const fixture = createFixture({
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        types: [],
      },
      files: ["component.ts"],
    }),
    "component.ts": [
      "export class Component {",
      "  existing: number = 1;",
      "}",
    ].join("\n"),
    "defs.html": "<template>${existing}</template>",
  });

  const defsUri = URI.file(path.join(fixture, "defs.html")).toString();
  const vmUri = URI.file(path.join(fixture, "component.ts")).toString();
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openDocument(connection, defsUri, "html", fs.readFileSync(path.join(fixture, "defs.html"), "utf8"));
    await waitForDiagnostics(connection, child, () => getStderr(), defsUri, 5000);

    const position = { line: 0, character: 13 }; // inside "existing"
    const definitions = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: defsUri },
      position,
    });

    assert.ok(Array.isArray(definitions), "definition response should be an array");
    const vmDef = definitions.find?.((def) => def.uri === vmUri);
    if (vmDef) {
      assert.equal(vmDef.range.start.line, 1);
      assert.equal(vmDef.range.start.character, 2);
    }
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

function startServer(cwd) {
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

async function initialize(connection, child, stderr, workspaceRoot) {
  const rootUri = URI.file(workspaceRoot).toString();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`initialize timeout; stderr=${stderr()}`)), 5000);
    const onExit = (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`server exited before initialize (code=${code} signal=${signal}): ${stderr()}`));
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

async function openDocument(connection, uri, languageId, text) {
  connection.sendNotification("textDocument/didOpen", {
    textDocument: {
      uri,
      languageId,
      version: 1,
      text,
    },
  });
}

function waitForDiagnostics(connection, child, stderr, uri, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("diagnostics timeout")), timeoutMs);
    const onExit = (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`server exited (code=${code ?? "null"} signal=${signal ?? "null"}): ${stderr()}`));
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

function createFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-lsp-integ-"));
  for (const [name, contents] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents, "utf8");
  }
  return dir;
}

function waitForExit(child, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
