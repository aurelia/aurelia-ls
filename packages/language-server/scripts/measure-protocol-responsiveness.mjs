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
const oldCompletionBase = "state.items.";
const replacementCompletionBase = "state.selection.";
const replacementRequiredLabel = "itemCount";
const replacementForbiddenLabel = "searchText";
export const protocolResponsivenessSchemaVersion = "aurelia-ls/protocol-responsiveness/v2";

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
    schemaVersion: protocolResponsivenessSchemaVersion,
    replacementDispatchedDuringContention: false,
    independentSettlementTimestamps: true,
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
      const measured = await measureCancellationCycle({
        connection,
        targetUri,
        originalText,
        initialVersion: version,
        index,
        cancellationDelayMilliseconds,
      });
      version = measured.version;
      report.cycles.push({ index: index + 1, ...measured.cycle });
    }
    report.replacementDispatchedDuringContention = report.cycles.every(
      (cycle) => cycle.replacementDispatchedDuringContention,
    );
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

/**
 * Run one cancellation/supersession cycle while all three post-cancel requests are genuinely in flight together.
 * The cancelled request remains observational: this harness records its result but does not predeclare success.
 */
export async function measureCancellationCycle(options) {
  const now = options.now ?? (() => performance.now());
  const wait = options.delay ?? delay;
  const cancellation = options.createCancellationSource?.() ?? new CancellationTokenSource();
  const oldVariant = createProtocolCompletionVariant(options.originalText, options.index * 2, "old");
  const oldVersion = options.initialVersion + 1;
  options.connection.sendNotification("textDocument/didChange", {
    textDocument: { uri: options.targetUri, version: oldVersion },
    contentChanges: [{ text: oldVariant.text }],
  });

  const requestStarted = now();
  let oldRequestSettled = false;
  const completion = timedSettlement(
    options.connection.sendRequest("textDocument/completion", {
      textDocument: { uri: options.targetUri },
      position: oldVariant.position,
    }, cancellation.token),
    requestStarted,
    now,
  ).then((measurement) => {
    oldRequestSettled = true;
    return measurement;
  });

  await wait(options.cancellationDelayMilliseconds);
  const cancellationSent = now();
  cancellation.cancel();

  const replacementVariant = createProtocolCompletionVariant(
    options.originalText,
    options.index * 2 + 1,
    "replacement",
  );
  const replacementVersion = oldVersion + 1;
  const replacementDispatchedDuringContention = !oldRequestSettled;
  options.connection.sendNotification("textDocument/didChange", {
    textDocument: { uri: options.targetUri, version: replacementVersion },
    contentChanges: [{ text: replacementVariant.text }],
  });

  const replacementCompletionStarted = now();
  const replacementCompletion = timedSettlement(
    options.connection.sendRequest("textDocument/completion", {
      textDocument: { uri: options.targetUri },
      position: replacementVariant.position,
    }),
    replacementCompletionStarted,
    now,
  );
  const probeStarted = now();
  const probe = timedSettlement(
    options.connection.sendRequest("aurelia/workspaceStatus", null),
    probeStarted,
    now,
  );

  let completionMeasurement;
  let replacementCompletionMeasurement;
  let probeMeasurement;
  try {
    [completionMeasurement, replacementCompletionMeasurement, probeMeasurement] = await Promise.all([
      withTimeout(completion, 30_000, `cancelled completion ${options.index + 1}`),
      withTimeout(replacementCompletion, 30_000, `replacement completion ${options.index + 1}`),
      withTimeout(probe, 30_000, `workspace-status probe ${options.index + 1}`),
    ]);
  } finally {
    cancellation.dispose();
  }

  const replacementCompletionCurrentness = requireCurrentReplacementCompletion(
    replacementCompletionMeasurement.outcome,
  );
  return Object.freeze({
    version: replacementVersion,
    cycle: Object.freeze({
      replacementDispatchedDuringContention,
      requestMilliseconds: completionMeasurement.milliseconds,
      cancellationToSettlementMilliseconds: completionMeasurement.settledAt - cancellationSent,
      probeMilliseconds: probeMeasurement.milliseconds,
      replacementCompletionMilliseconds: replacementCompletionMeasurement.milliseconds,
      completionOutcome: outcomeSummary(completionMeasurement.outcome),
      probeOutcome: outcomeSummary(probeMeasurement.outcome),
      replacementCompletionOutcome: outcomeSummary(replacementCompletionMeasurement.outcome),
      replacementCompletionCurrentness,
      timeline: Object.freeze({
        oldRequestStartedMilliseconds: requestStarted,
        cancellationSentMilliseconds: cancellationSent,
        replacementRequestStartedMilliseconds: replacementCompletionStarted,
        probeRequestStartedMilliseconds: probeStarted,
        replacementRequestSettledMilliseconds: replacementCompletionMeasurement.settledAt,
        probeRequestSettledMilliseconds: probeMeasurement.settledAt,
        oldRequestSettledMilliseconds: completionMeasurement.settledAt,
      }),
    }),
  });
}

/** Build one source version whose completion locus distinguishes the old and replacement requests. */
export function createProtocolCompletionVariant(originalText, index, kind) {
  if (kind !== "old" && kind !== "replacement") {
    throw new Error(`Unsupported protocol completion variant '${kind}'.`);
  }
  const targetOffset = originalText.indexOf(oldCompletionBase);
  if (targetOffset < 0) {
    throw new Error(`Protocol responsiveness source must contain '${oldCompletionBase}'.`);
  }
  const completionBase = kind === "old" ? oldCompletionBase : replacementCompletionBase;
  const targetedText = kind === "old"
    ? originalText
    : `${originalText.slice(0, targetOffset)}${replacementCompletionBase}${originalText.slice(targetOffset + oldCompletionBase.length)}`;
  const text = withMeasurementMarker(targetedText, index);
  return Object.freeze({
    text,
    position: completionPosition(text, completionBase),
  });
}

/** Require the replacement response to carry semantic evidence from the replacement document version. */
export function requireCurrentReplacementCompletion(outcome) {
  if (outcome.status !== "fulfilled") {
    throw new Error("Replacement completion must fulfill before its currentness can be verified.");
  }
  const items = Array.isArray(outcome.value) ? outcome.value : outcome.value?.items;
  if (!Array.isArray(items)) {
    throw new Error("Replacement completion must return a completion list or completion-item array.");
  }
  const labels = new Set(items.flatMap((item) =>
    typeof item?.label === "string" ? [item.label] : []));
  if (!labels.has(replacementRequiredLabel)) {
    throw new Error(
      `Replacement completion must contain current-version label '${replacementRequiredLabel}'.`,
    );
  }
  if (labels.has(replacementForbiddenLabel)) {
    throw new Error(
      `Replacement completion must not contain stale-version label '${replacementForbiddenLabel}'.`,
    );
  }
  return Object.freeze({
    requiredLabel: replacementRequiredLabel,
    requiredLabelPresent: true,
    forbiddenLabel: replacementForbiddenLabel,
    forbiddenLabelAbsent: true,
  });
}

/** Capture the settlement instant inside the promise's own continuation, independent of later await order. */
export function timedSettlement(promise, startedAt, now = () => performance.now()) {
  return settled(promise).then((outcome) => {
    const settledAt = now();
    return Object.freeze({
      startedAt,
      settledAt,
      milliseconds: settledAt - startedAt,
      outcome,
    });
  });
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

function completionPosition(text, completionBase) {
  const markerOffset = text.indexOf(completionBase);
  if (markerOffset < 0) {
    throw new Error(`Protocol responsiveness source must contain '${completionBase}'.`);
  }
  const offset = markerOffset + completionBase.length;
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
    `Schema: \`${report.schemaVersion}\``,
    `Replacement dispatched during contention: ${report.replacementDispatchedDuringContention}`,
    `Independent settlement timestamps: ${report.independentSettlementTimestamps}`,
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
      [
        "cycle",
        "request ms",
        "cancel -> settle ms",
        "probe ms",
        "replacement ms",
        "replacement during old",
        "old completion",
        "replacement completion",
        "replacement current",
      ],
      report.cycles.map((cycle) => [
        String(cycle.index),
        cycle.requestMilliseconds.toFixed(2),
        cycle.cancellationToSettlementMilliseconds.toFixed(2),
        cycle.probeMilliseconds.toFixed(2),
        cycle.replacementCompletionMilliseconds.toFixed(2),
        cycle.replacementDispatchedDuringContention ? "yes" : "no",
        describeOutcome(cycle.completionOutcome),
        describeOutcome(cycle.replacementCompletionOutcome),
        cycle.replacementCompletionCurrentness.requiredLabelPresent
          && cycle.replacementCompletionCurrentness.forbiddenLabelAbsent
          ? "yes"
          : "no",
      ]),
    ),
    "",
    "Monotonic request timeline (milliseconds):",
    "",
    table(
      [
        "cycle",
        "old start",
        "cancel sent",
        "replacement start",
        "probe start",
        "replacement settled",
        "probe settled",
        "old settled",
      ],
      report.cycles.map((cycle) => [
        String(cycle.index),
        cycle.timeline.oldRequestStartedMilliseconds.toFixed(2),
        cycle.timeline.cancellationSentMilliseconds.toFixed(2),
        cycle.timeline.replacementRequestStartedMilliseconds.toFixed(2),
        cycle.timeline.probeRequestStartedMilliseconds.toFixed(2),
        cycle.timeline.replacementRequestSettledMilliseconds.toFixed(2),
        cycle.timeline.probeRequestSettledMilliseconds.toFixed(2),
        cycle.timeline.oldRequestSettledMilliseconds.toFixed(2),
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
