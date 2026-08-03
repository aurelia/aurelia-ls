#!/usr/bin/env node
/**
 * Measurement-only stdio journey for request scheduling and cancellation. The language server runs unchanged in a
 * child process; timing and cancellation probes live entirely in this client process.
 */
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CancellationTokenSource,
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
} from "vscode-languageserver/node";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = path.resolve(packageRoot, "../..");
const serverEntry = path.join(packageRoot, "out/main.js");
const pressureFixtureRoot = path.join(repoRoot, "packages/semantic-runtime/fixtures/pressure");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixtureName = args.fixture ?? "app-pattern-routed-catalog-storefront";
  const workspaceRoot = args.workspace == null
    ? path.join(pressureFixtureRoot, fixtureName)
    : path.resolve(args.workspace);
  const cancellationDelayMilliseconds = positiveInteger(args["cancel-after"] ?? "25", "--cancel-after");
  const cycles = positiveInteger(args.cycles ?? "3", "--cycles");
  const targetPath = await targetHtmlPath(workspaceRoot);
  const targetUri = pathToFileURL(targetPath).toString();
  const originalText = await fs.readFile(targetPath, "utf8");
  const position = completionPosition(originalText);

  const child = spawn(process.execPath, [serverEntry, "--stdio"], {
    cwd: workspaceRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stderr = [];
  child.stderr.on("data", (data) => stderr.push(data.toString()));
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  );
  const serverLogs = [];
  let diagnosticRefreshRequests = 0;
  connection.onNotification("window/logMessage", (params) => {
    serverLogs.push(params?.message ?? "");
  });
  connection.onRequest("workspace/configuration", (params) =>
    (params?.items ?? []).map(() => null));
  connection.onRequest("client/registerCapability", () => null);
  connection.onRequest("workspace/diagnostic/refresh", () => {
    diagnosticRefreshRequests += 1;
    return null;
  });
  connection.onRequest("workspace/inlayHint/refresh", () => null);
  connection.listen();

  const report = {
    workspace: {
      root: workspaceRoot,
      targetDocument: relativePath(workspaceRoot, targetPath),
    },
    cancellationDelayMilliseconds,
    coldDiagnosticMilliseconds: 0,
    warmDiagnosticMilliseconds: 0,
    cycles: [],
    diagnosticRefreshRequests: 0,
    serverLogs,
    stderr,
  };

  try {
    await withTimeout(connection.sendRequest("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(workspaceRoot).toString(),
      capabilities: {
        workspace: {
          configuration: true,
          diagnostics: { refreshSupport: true },
          inlayHint: { refreshSupport: true },
        },
        textDocument: {
          diagnostic: {},
          completion: {},
        },
      },
    }), 10_000, "initialize");
    connection.sendNotification("initialized", {});
    connection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: targetUri,
        languageId: "html",
        version: 1,
        text: originalText,
      },
    });

    report.coldDiagnosticMilliseconds = await elapsed(() => sendDiagnostics(connection, targetUri));
    report.warmDiagnosticMilliseconds = await elapsed(() => sendDiagnostics(connection, targetUri));

    let version = 1;
    for (let index = 0; index < cycles; index += 1) {
      version += 1;
      const editedText = withMeasurementMarker(originalText, index * 2);
      connection.sendNotification("textDocument/didChange", {
        textDocument: { uri: targetUri, version },
        contentChanges: [{ text: editedText }],
      });

      const cancellation = new CancellationTokenSource();
      const requestStarted = performance.now();
      const completion = settled(connection.sendRequest("textDocument/completion", {
        textDocument: { uri: targetUri },
        position,
      }, cancellation.token));

      await delay(cancellationDelayMilliseconds);
      const cancellationSent = performance.now();
      cancellation.cancel();
      version += 1;
      const supersedingText = withMeasurementMarker(originalText, index * 2 + 1);
      connection.sendNotification("textDocument/didChange", {
        textDocument: { uri: targetUri, version },
        contentChanges: [{ text: supersedingText }],
      });
      const probeStarted = performance.now();
      const probe = settled(connection.sendRequest("aurelia/workspaceStatus", null));

      const completionOutcome = await withTimeout(completion, 30_000, `cancelled completion ${index + 1}`);
      const completionSettled = performance.now();
      const probeOutcome = await withTimeout(probe, 30_000, `workspace-status probe ${index + 1}`);
      const probeSettled = performance.now();
      const supersedingCompletionStarted = performance.now();
      const supersedingCompletionOutcome = await withTimeout(settled(connection.sendRequest("textDocument/completion", {
        textDocument: { uri: targetUri },
        position,
      })), 30_000, `superseding completion ${index + 1}`);
      const supersedingCompletionSettled = performance.now();
      cancellation.dispose();

      report.cycles.push({
        index: index + 1,
        requestMilliseconds: completionSettled - requestStarted,
        cancellationToSettlementMilliseconds: completionSettled - cancellationSent,
        probeMilliseconds: probeSettled - probeStarted,
        supersedingCompletionMilliseconds: supersedingCompletionSettled - supersedingCompletionStarted,
        completionOutcome: outcomeSummary(completionOutcome),
        probeOutcome: outcomeSummary(probeOutcome),
        supersedingCompletionOutcome: outcomeSummary(supersedingCompletionOutcome),
      });
    }
    report.diagnosticRefreshRequests = diagnosticRefreshRequests;

    if (args.json === "true") {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(markdownReport(report));
    }
  } finally {
    try {
      await withTimeout(connection.sendRequest("shutdown", null), 2_000, "shutdown");
      connection.sendNotification("exit");
    } catch {}
    connection.dispose();
    if (child.exitCode == null && child.signalCode == null) {
      child.kill("SIGKILL");
    }
  }
}

function sendDiagnostics(connection, uri) {
  return connection.sendRequest("textDocument/diagnostic", {
    textDocument: { uri },
  });
}

async function targetHtmlPath(workspaceRoot) {
  const preferred = path.join(workspaceRoot, "src/routes/item-list-route.html");
  if (await isFile(preferred)) {
    return preferred;
  }
  const sourceRoot = path.join(workspaceRoot, "src");
  const entries = await fs.readdir(sourceRoot, { recursive: true, withFileTypes: true });
  const html = entries.find((entry) => entry.isFile() && entry.name.endsWith(".html"));
  if (html == null) {
    throw new Error(`No HTML document found under ${sourceRoot}.`);
  }
  return path.join(html.parentPath, html.name);
}

async function isFile(filePath) {
  const stats = await fs.stat(filePath).catch(() => null);
  return stats?.isFile() === true;
}

function completionPosition(text) {
  const completionBase = "state.items.";
  const marker = text.includes(completionBase) ? completionBase : "state";
  const offset = Math.max(0, text.indexOf(marker)) + marker.length;
  const prefix = text.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return {
    line: lines.length - 1,
    character: lines.at(-1).length,
  };
}

function withMeasurementMarker(text, index) {
  const marker = `<!-- protocol responsiveness marker: ${index % 2 === 0 ? "A" : "B"} -->`;
  return `${text.replace(/\s*$/, "")}\n${marker}\n`;
}

async function elapsed(run) {
  const started = performance.now();
  await withTimeout(run(), 30_000, "timed request");
  return performance.now() - started;
}

function settled(promise) {
  return promise.then(
    (value) => ({ status: "fulfilled", value }),
    (error) => ({ status: "rejected", error }),
  );
}

function outcomeSummary(outcome) {
  if (outcome.status === "fulfilled") {
    return { status: "fulfilled" };
  }
  return {
    status: "rejected",
    code: typeof outcome.error?.code === "number" ? outcome.error.code : null,
    message: outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function withTimeout(promise, milliseconds, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} did not settle within ${milliseconds}ms.`)),
      milliseconds,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function positiveInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const next = inlineValue ?? argv[index + 1];
    if (inlineValue == null && next != null && !next.startsWith("--")) index += 1;
    args[key] = next == null || next.startsWith("--") ? "true" : next;
  }
  return args;
}

function markdownReport(report) {
  return [
    "# Protocol Responsiveness Measurement",
    "",
    `Workspace: \`${report.workspace.root}\``,
    `Target: \`${report.workspace.targetDocument}\``,
    `Cancellation delay: ${report.cancellationDelayMilliseconds}ms`,
    `Cold diagnostics: ${report.coldDiagnosticMilliseconds.toFixed(2)}ms`,
    `Warm diagnostics: ${report.warmDiagnosticMilliseconds.toFixed(2)}ms`,
    `Diagnostic refresh requests: ${report.diagnosticRefreshRequests}`,
    "",
    table(
      ["cycle", "request ms", "cancel -> settle ms", "probe ms", "new completion ms", "old completion", "new completion"],
      report.cycles.map((cycle) => [
        String(cycle.index),
        cycle.requestMilliseconds.toFixed(2),
        cycle.cancellationToSettlementMilliseconds.toFixed(2),
        cycle.probeMilliseconds.toFixed(2),
        cycle.supersedingCompletionMilliseconds.toFixed(2),
        describeOutcome(cycle.completionOutcome),
        describeOutcome(cycle.supersedingCompletionOutcome),
      ]),
    ),
  ].join("\n");
}

function describeOutcome(outcome) {
  return outcome.status === "fulfilled"
    ? "fulfilled"
    : `rejected (${outcome.code ?? "no code"})`;
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
