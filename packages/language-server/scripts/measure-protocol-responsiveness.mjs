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
const defaultFixtureName = "app-pattern-routed-catalog-storefront";
const valueArgumentNames = new Set(["fixture", "workspace", "cancel-after", "cycles"]);
const booleanArgumentNames = new Set(["json"]);

async function main() {
  const args = parseProtocolResponsivenessArgs(process.argv.slice(2));
  const fixtureName = args.fixture ?? defaultFixtureName;
  const workspaceRoot = args.workspace == null
    ? path.join(pressureFixtureRoot, fixtureName)
    : path.resolve(args.workspace);
  const cancellationDelayMilliseconds = args.cancellationDelayMilliseconds;
  const cycles = args.cycles;
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
    initializeMilliseconds: 0,
    coldFullWithoutPreviousResultIdMilliseconds: 0,
    warmFullWithoutPreviousResultIdMilliseconds: 0,
    previousResultIdUnchangedMilliseconds: 0,
    preEditDiagnosticReports: null,
    cycles: [],
    diagnosticRefreshRequests: 0,
    serverLogs,
    stderr,
  };

  try {
    const initialize = await elapsedResult(
      () => connection.sendRequest("initialize", {
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
      }),
      10_000,
      "initialize",
    );
    report.initializeMilliseconds = initialize.milliseconds;
    connection.sendNotification("initialized", {});
    connection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: targetUri,
        languageId: "html",
        version: 1,
        text: originalText,
      },
    });

    const diagnostics = await measurePreEditDiagnostics(connection, targetUri);
    report.coldFullWithoutPreviousResultIdMilliseconds =
      diagnostics.coldFullWithoutPreviousResultIdMilliseconds;
    report.warmFullWithoutPreviousResultIdMilliseconds =
      diagnostics.warmFullWithoutPreviousResultIdMilliseconds;
    report.previousResultIdUnchangedMilliseconds =
      diagnostics.previousResultIdUnchangedMilliseconds;
    report.preEditDiagnosticReports = diagnostics.reports;

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

    if (args.json) {
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

export async function measurePreEditDiagnostics(connection, uri) {
  const cold = await elapsedResult(
    () => sendDiagnostics(connection, uri),
    30_000,
    "cold full diagnostic without previousResultId",
  );
  const coldReport = requireFullDiagnosticReport(cold.value, "Cold diagnostic");
  const warmFull = await elapsedResult(
    () => sendDiagnostics(connection, uri),
    30_000,
    "warm full diagnostic without previousResultId",
  );
  const warmFullReport = requireFullDiagnosticReport(warmFull.value, "Warm full diagnostic");
  const unchanged = await elapsedResult(
    () => sendDiagnostics(connection, uri, warmFullReport.resultId),
    30_000,
    "diagnostic with previousResultId",
  );
  const unchangedReport = requireUnchangedDiagnosticReport(
    unchanged.value,
    warmFullReport.resultId,
  );

  return Object.freeze({
    coldFullWithoutPreviousResultIdMilliseconds: cold.milliseconds,
    warmFullWithoutPreviousResultIdMilliseconds: warmFull.milliseconds,
    previousResultIdUnchangedMilliseconds: unchanged.milliseconds,
    reports: Object.freeze({
      cold: diagnosticReportSummary(coldReport),
      warmFull: diagnosticReportSummary(warmFullReport),
      previousResultId: diagnosticReportSummary(unchangedReport),
    }),
  });
}

function sendDiagnostics(connection, uri, previousResultId) {
  return connection.sendRequest("textDocument/diagnostic", {
    textDocument: { uri },
    ...(previousResultId == null ? {} : { previousResultId }),
  });
}

function requireFullDiagnosticReport(report, label) {
  if (
    report == null
    || report.kind !== "full"
    || typeof report.resultId !== "string"
    || report.resultId.length === 0
  ) {
    throw new Error(`${label} must return a full report with a resultId.`);
  }
  return report;
}

function requireUnchangedDiagnosticReport(report, previousResultId) {
  if (report?.kind !== "unchanged" || report.resultId !== previousResultId) {
    throw new Error(
      `Diagnostic previousResultId '${previousResultId}' must return an unchanged report with the same resultId.`,
    );
  }
  return report;
}

function diagnosticReportSummary(report) {
  return Object.freeze({
    kind: report.kind,
    resultId: report.resultId,
    itemCount: Array.isArray(report.items) ? report.items.length : null,
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

async function elapsedResult(run, timeoutMilliseconds, label) {
  const started = performance.now();
  const value = await withTimeout(run(), timeoutMilliseconds, label);
  return Object.freeze({
    milliseconds: performance.now() - started,
    value,
  });
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
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${label} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} must be a safe positive integer.`);
  }
  return parsed;
}

export function parseProtocolResponsivenessArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument '${arg}'.`);
    }
    const body = arg.slice(2);
    const separator = body.indexOf("=");
    const key = separator < 0 ? body : body.slice(0, separator);
    const inlineValue = separator < 0 ? null : body.slice(separator + 1);
    if (!valueArgumentNames.has(key) && !booleanArgumentNames.has(key)) {
      throw new Error(`Unknown argument '--${key}'.`);
    }
    if (values.has(key)) {
      throw new Error(`Argument '--${key}' may only be supplied once.`);
    }

    if (booleanArgumentNames.has(key)) {
      let value = inlineValue;
      const next = argv[index + 1];
      if (value == null && next != null && !next.startsWith("--")) {
        value = next;
        index += 1;
      }
      values.set(key, value == null ? true : strictBoolean(value, `--${key}`));
      continue;
    }

    let value = inlineValue;
    if (value == null) {
      const next = argv[index + 1];
      if (next == null || next.startsWith("--")) {
        throw new Error(`Argument '--${key}' requires a value.`);
      }
      value = next;
      index += 1;
    }
    if (value.length === 0) {
      throw new Error(`Argument '--${key}' requires a non-empty value.`);
    }
    values.set(key, value);
  }

  const fixture = values.get("fixture") ?? null;
  const workspace = values.get("workspace") ?? null;
  if (fixture != null && workspace != null) {
    throw new Error("Arguments '--fixture' and '--workspace' are mutually exclusive.");
  }
  return Object.freeze({
    fixture,
    workspace,
    cancellationDelayMilliseconds: positiveInteger(
      values.get("cancel-after") ?? "25",
      "--cancel-after",
    ),
    cycles: positiveInteger(values.get("cycles") ?? "3", "--cycles"),
    json: values.get("json") ?? false,
  });
}

function strictBoolean(value, label) {
  if (value !== "true" && value !== "false") {
    throw new Error(`${label} must be 'true' or 'false'.`);
  }
  return value === "true";
}

function markdownReport(report) {
  return [
    "# Protocol Responsiveness Measurement",
    "",
    `Workspace: \`${report.workspace.root}\``,
    `Target: \`${report.workspace.targetDocument}\``,
    `Cancellation delay: ${report.cancellationDelayMilliseconds}ms`,
    `Initialize handshake: ${report.initializeMilliseconds.toFixed(2)}ms`,
    `Cold full diagnostics (no previousResultId): ${report.coldFullWithoutPreviousResultIdMilliseconds.toFixed(2)}ms`,
    `Warm full diagnostics (no previousResultId): ${report.warmFullWithoutPreviousResultIdMilliseconds.toFixed(2)}ms`,
    `Warm unchanged diagnostics (previousResultId): ${report.previousResultIdUnchangedMilliseconds.toFixed(2)}ms`,
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

if (process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
