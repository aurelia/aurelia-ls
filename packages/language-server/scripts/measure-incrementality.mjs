#!/usr/bin/env node
/**
 * Measurement-only LSP journey. Project-input counters and timers wrap the host only in this process, so the
 * production extension pays no instrumentation cost. For sampled call stacks, run this script through Node's
 * `--cpu-prof` and keep the generated profile outside committed source.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeHeapSnapshot } from "node:v8";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  NodeSemanticRuntimeProjectInputHost,
  readSemanticRuntimeMemorySample,
  semanticRuntimeProcessTypeSystemCacheOverview,
} from "@aurelia-ls/semantic-runtime";
import {
  SemanticRuntimeLspSession,
  isSemanticRuntimeLspRequestAborted,
} from "../out/runtime/semantic-runtime-session.js";
import { OpenDocumentSourceTextOverlay } from "../out/runtime/open-document-source-text-overlay.js";
import { WorkspaceDocumentUris } from "../out/utils/document-uri.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = path.resolve(packageRoot, "../..");
const pressureFixtureRoot = path.join(repoRoot, "packages/semantic-runtime/fixtures/pressure");

const sourceExtensions = new Set([".ts", ".js", ".html"]);
const fixtureStatExtensions = new Set([".ts", ".js", ".html", ".json", ".css"]);
const incrementalityJourneys = new Set(["completion-first", "diagnostics-first"]);

export const incrementalityMeasurementSchemaVersion = "aurelia-ls/incrementality/v1";

class MeasurementDocumentStore {
  documents = new Map();
  counters = {
    getCalls: 0,
    allCalls: 0,
    allDocumentsVisited: 0,
  };

  add(document) {
    this.documents.set(document.uri, document);
  }

  get(uri) {
    this.counters.getCalls += 1;
    return this.documents.get(uri);
  }

  all() {
    this.counters.allCalls += 1;
    this.counters.allDocumentsVisited += this.documents.size;
    return [...this.documents.values()];
  }

  snapshot() {
    return { ...this.counters };
  }
}

class MeasuredProjectInputHost {
  operations = new Map();

  constructor(delegate) {
    this.delegate = delegate;
  }

  readFile(fileName) {
    return this.measure("readFile", () => this.delegate.readFile(fileName));
  }

  fileExists(fileName) {
    return this.measure("fileExists", () => this.delegate.fileExists(fileName));
  }

  readDirectory(directoryName) {
    return this.measure("readDirectory", () => this.delegate.readDirectory(directoryName));
  }

  directoryExists(directoryName) {
    return this.measure("directoryExists", () => this.delegate.directoryExists(directoryName));
  }

  realpath(fileName) {
    return this.measure("realpath", () => this.delegate.realpath(fileName));
  }

  matchFiles(rootDir, extensions, excludes, includes, depth) {
    return this.measure("matchFiles", () =>
      this.delegate.matchFiles(rootDir, extensions, excludes, includes, depth));
  }

  snapshot() {
    return Object.fromEntries(
      [...this.operations]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => [name, { ...value }]),
    );
  }

  measure(name, read) {
    const started = performance.now();
    const value = read();
    const elapsedMilliseconds = performance.now() - started;
    const operation = this.operations.get(name) ?? {
      calls: 0,
      elapsedMilliseconds: 0,
      returnedCharacters: 0,
      returnedItems: 0,
    };
    operation.calls += 1;
    operation.elapsedMilliseconds += elapsedMilliseconds;
    if (typeof value === "string") {
      operation.returnedCharacters += value.length;
    } else if (Array.isArray(value)) {
      operation.returnedItems += value.length;
    }
    this.operations.set(name, operation);
    return value;
  }
}

class MeasurementProbe {
  constructor(host, documents) {
    this.host = host;
    this.documents = documents;
  }

  snapshot() {
    return {
      host: this.host.snapshot(),
      documents: this.documents.snapshot(),
      memory: memorySnapshot(),
    };
  }

  delta(before) {
    const after = this.snapshot();
    return {
      host: counterMapDelta(before.host, after.host),
      documents: counterDelta(before.documents, after.documents),
      memory: counterDelta(before.memory, after.memory),
      memoryAfter: after.memory,
    };
  }
}

/** Opt-in inspector sampling for measurement runs; the module is never loaded when profiling is disabled. */
class MeasurementCpuProfiler {
  constructor(directory) {
    this.directory = directory;
    this.capturedLabels = new Set();
  }

  async captureOnce(label, operation) {
    if (this.directory == null || this.capturedLabels.has(label)) {
      return operation();
    }
    this.capturedLabels.add(label);
    const { Session } = await import("node:inspector/promises");
    const session = new Session();
    session.connect();
    await session.post("Profiler.enable");
    await session.post("Profiler.start");
    try {
      return await operation();
    } finally {
      const { profile } = await session.post("Profiler.stop");
      session.disconnect();
      await fs.writeFile(path.join(this.directory, `${label}.cpuprofile`), JSON.stringify(profile));
    }
  }
}

async function main() {
  const args = parseIncrementalityArgs(process.argv.slice(2));
  const fixtureName = args.workspace == null
    ? args.fixture === "largest" || args.fixture == null
      ? await largestPressureFixtureName()
      : args.fixture
    : path.basename(path.resolve(args.workspace));
  const requestCount = args.requests;
  const editCycles = args.cycles;
  const forceGc = args.forceGc;
  if (forceGc && typeof globalThis.gc !== "function") {
    throw new Error("--force-gc requires running Node with --expose-gc.");
  }
  const heapSnapshotDirectory = args.heapSnapshots == null
    ? null
    : path.resolve(args.heapSnapshots);
  if (heapSnapshotDirectory != null) {
    await fs.mkdir(heapSnapshotDirectory, { recursive: true });
  }
  const cpuProfileDirectory = args.cpuProfiles == null
    ? null
    : path.resolve(args.cpuProfiles);
  if (cpuProfileDirectory != null) {
    await fs.mkdir(cpuProfileDirectory, { recursive: true });
  }
  const cpuProfiler = new MeasurementCpuProfiler(cpuProfileDirectory);

  const fixtureRoot = args.workspace == null
    ? path.join(pressureFixtureRoot, fixtureName)
    : path.resolve(args.workspace);
  await assertDirectory(fixtureRoot, `workspace '${fixtureName}'`);
  const fixtureStats = await workspaceStats(fixtureRoot, fixtureName);
  const sourceFiles = await collectFiles(path.join(fixtureRoot, "src"), sourceExtensions);
  if (sourceFiles.length === 0) {
    throw new Error(`Fixture ${fixtureName} has no source files under src/.`);
  }

  const documents = new MeasurementDocumentStore();
  for (const filePath of sourceFiles) {
    const text = await fs.readFile(filePath, "utf8");
    documents.add(TextDocument.create(pathToFileURL(filePath).toString(), languageIdForPath(filePath), 1, text));
  }

  const targetHtmlPath = preferredTargetHtmlPath(fixtureRoot, sourceFiles);
  const targetHtml = documents.get(pathToFileURL(targetHtmlPath).toString());
  if (targetHtml == null) {
    throw new Error(`Target document was not opened: ${targetHtmlPath}`);
  }

  const cursorPositions = cursorPositionsForDocument(targetHtml);
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(pathToFileURL(fixtureRoot).toString());
  const sourceTextOverlay = new OpenDocumentSourceTextOverlay(documents, documentUris);
  const projectInputHost = new MeasuredProjectInputHost(
    new NodeSemanticRuntimeProjectInputHost(
      sourceTextOverlay,
    ),
  );
  const measurement = new MeasurementProbe(projectInputHost, documents);
  const session = new SemanticRuntimeLspSession({
    documentUris,
    projectInputHost,
    projectInputCurrentnessPolicy: sourceTextOverlay,
    openDocumentMetadata: (uri) => {
      const document = documents.get(uri);
      return document == null
        ? null
        : {
            uri: document.uri,
            languageId: document.languageId,
            version: document.version,
          };
    },
    publishEffect: () => {},
  });
  const report = {
    schemaVersion: incrementalityMeasurementSchemaVersion,
    fixture: {
      name: fixtureName,
      root: fixtureRoot,
      source: args.workspace == null ? "pressure-fixture" : "workspace",
      sourceFiles: sourceFiles.length,
      measuredBytes: fixtureStats.bytes,
      measuredFiles: fixtureStats.files,
      targetDocument: relativePath(fixtureRoot, targetHtmlPath),
    },
    generations: [],
    timings: [],
    cache: [],
    editJourneys: [],
    abortPressure: [],
    invariants: [],
    measurement: {
      editCycles,
      forceGc,
      journey: args.journey,
      memoryBoundary: forceGc
        ? "cache-overview-derived-then-forced-gc-immediate-sample"
        : "cache-overview-derived-then-unforced-sample",
    },
  };

  const coldDiagnostics = await timed("cold appDiagnostics", measurement, () =>
    runDocumentRequest(session, targetHtml, null, (operation, document) =>
      operation.appDiagnostics(document)));
  report.timings.push(timingSummary(coldDiagnostics));
  recordGeneration(report, "after cold diagnostics", await managedGeneration(session));
  report.cache.push(await cacheSnapshot("after cold diagnostics", session, forceGc));

  const warmDiagnostics = await timed("warm same-generation appDiagnostics", measurement, () =>
    runDocumentRequest(session, targetHtml, null, (operation, document) =>
      operation.appDiagnostics(document)));
  report.timings.push(timingSummary(warmDiagnostics));
  report.cache.push(await cacheSnapshot("after warm diagnostics", session, forceGc));

  const cursorInfo = await timed("warm same-generation templateCursorInfo", measurement, () =>
    runDocumentRequest(session, targetHtml, null, (operation, document) =>
      operation.templateCursorInfo(document, cursorPositions.member)));
  report.timings.push(timingSummary(cursorInfo));

  const initialEditedPaths = editOpenDocuments(documents, fixtureRoot, sourceFiles);
  const sourceChange = await timed("recordSourceTextChanged after TS+HTML edits", measurement, () =>
    session.recordSourceTextChanged(initialEditedPaths));
  report.timings.push(timingSummary(sourceChange));
  recordGeneration(report, "after source change", await managedGeneration(session));
  report.cache.push(await cacheSnapshot("after source change clear", session, forceGc));

  const afterEditDiagnostics = await timed("post-edit appDiagnostics", measurement, () =>
    runDocumentRequest(session, targetHtml, null, (operation, document) =>
      operation.appDiagnostics(document)));
  report.timings.push(timingSummary(afterEditDiagnostics));
  report.cache.push(await cacheSnapshot("after post-edit diagnostics", session, forceGc));

  const afterEditCompletion = await timed("post-edit templateCompletions", measurement, () =>
    runDocumentRequest(session, targetHtml, null, (operation, document) =>
      operation.templateCompletions(document, cursorPositions.completion)));
  report.timings.push(timingSummary(afterEditCompletion));
  const postEditCompletionCache = await cacheSnapshot("after post-edit completion", session, forceGc);
  report.cache.push(postEditCompletionCache);
  writeMeasurementHeapSnapshot(heapSnapshotDirectory, "steady-baseline");

  const editTargets = measurementEditTargets(fixtureRoot, sourceFiles);
  let previousOperationGeneration = await managedGeneration(session);
  for (let index = 0; index < editCycles; index += 1) {
    const target = index % 2 === 0 ? editTargets.html : editTargets.typeScript;
    if (target == null) {
      continue;
    }
    const editedDocument = applyMeasurementMarker(documents, target.filePath, target.kind, index);
    const change = await timed(
      `steady ${target.kind} edit ${index + 1}: recordSourceTextChanged`,
      measurement,
      () => session.recordSourceTextChanged([target.filePath]),
    );
    const operationTimings = args.journey === "diagnostics-first"
      ? await measureDiagnosticsFirstEditJourney({
          session,
          targetHtml,
          editedDocument,
          cursorPositions,
          measurement,
          cpuProfiler,
          kind: target.kind,
          index,
        })
      : await measureCompletionFirstEditJourney({
          session,
          targetHtml,
          editedDocument,
          cursorPositions,
          measurement,
          cpuProfiler,
          kind: target.kind,
          index,
        });
    const currentness = editJourneyCurrentness({
      expectedEditedDocument: editedDocument,
      expectedQueryDocument: requireMeasurementDocument(documents, targetHtmlPath),
      previousGeneration: previousOperationGeneration,
      operations: operationTimings.currentnessOperations,
    });
    previousOperationGeneration = operationTimings.currentnessOperations.at(-1).generation;
    const cache = await cacheSnapshot(`after steady edit ${index + 1}`, session, forceGc);
    report.editJourneys.push({
      index: index + 1,
      kind: target.kind,
      change: timingSummary(change),
      journey: args.journey,
      editedDocument: documentEvidence(editedDocument),
      ...operationTimings.report,
      currentness,
      cache,
    });
  }
  writeMeasurementHeapSnapshot(heapSnapshotDirectory, "steady-final");

  const stalePressure = await staleAbortPressure(session, targetHtml, cursorPositions.member, requestCount);
  report.abortPressure.push(stalePressure);
  recordGeneration(report, "after stale pressure generation change", await managedGeneration(session));

  const cancelledPressure = await cancelledAbortPressure(session, targetHtml, cursorPositions.member, requestCount);
  report.abortPressure.push(cancelledPressure);

  addInvariants(report);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(markdownReport(report));
  }

  const failed = report.invariants.filter((invariant) => invariant.status !== "pass");
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function measureCompletionFirstEditJourney(options) {
  const firstCompletion = await options.cpuProfiler.captureOnce(
    `${options.kind}-first-completion`,
    () => timed(
      `steady ${options.kind} edit ${options.index + 1}: first completion`,
      options.measurement,
      () => runMeasuredDocumentRequest(
        options.session,
        options.targetHtml,
        options.editedDocument,
        (operation, document) => operation.templateCompletions(document, options.cursorPositions.completion),
      ),
    ),
  );
  const warmCompletion = await options.cpuProfiler.captureOnce(
    `${options.kind}-warm-completion`,
    () => timed(
      `steady ${options.kind} edit ${options.index + 1}: warm completion`,
      options.measurement,
      () => runMeasuredDocumentRequest(
        options.session,
        options.targetHtml,
        options.editedDocument,
        (operation, document) => operation.templateCompletions(document, options.cursorPositions.completion),
      ),
    ),
  );
  const warmDiagnostics = await options.cpuProfiler.captureOnce(
    `${options.kind}-warm-diagnostics`,
    () => timed(
      `steady ${options.kind} edit ${options.index + 1}: warm diagnostics`,
      options.measurement,
      () => runMeasuredDocumentRequest(
        options.session,
        options.targetHtml,
        options.editedDocument,
        (operation, document) => operation.appDiagnostics(document),
      ),
    ),
  );
  const firstCompletionSummary = operationTimingSummary(firstCompletion);
  const warmCompletionSummary = operationTimingSummary(warmCompletion);
  const warmDiagnosticsSummary = operationTimingSummary(warmDiagnostics);
  return {
    report: {
      firstQuery: firstCompletionSummary,
      warmQuery: warmCompletionSummary,
      warmDiagnostics: warmDiagnosticsSummary,
    },
    currentnessOperations: [firstCompletionSummary, warmCompletionSummary, warmDiagnosticsSummary],
  };
}

async function measureDiagnosticsFirstEditJourney(options) {
  const firstDiagnostics = await options.cpuProfiler.captureOnce(
    `${options.kind}-first-diagnostics`,
    () => timed(
      `steady ${options.kind} edit ${options.index + 1}: first diagnostics`,
      options.measurement,
      () => runMeasuredDocumentRequest(
        options.session,
        options.targetHtml,
        options.editedDocument,
        (operation, document) => operation.appDiagnostics(document),
      ),
    ),
  );
  const warmDiagnostics = await options.cpuProfiler.captureOnce(
    `${options.kind}-warm-diagnostics`,
    () => timed(
      `steady ${options.kind} edit ${options.index + 1}: warm diagnostics`,
      options.measurement,
      () => runMeasuredDocumentRequest(
        options.session,
        options.targetHtml,
        options.editedDocument,
        (operation, document) => operation.appDiagnostics(document),
      ),
    ),
  );
  const firstDiagnosticsSummary = operationTimingSummary(firstDiagnostics);
  const warmDiagnosticsSummary = operationTimingSummary(warmDiagnostics);
  return {
    report: {
      firstDiagnostics: firstDiagnosticsSummary,
      warmDiagnostics: warmDiagnosticsSummary,
    },
    currentnessOperations: [firstDiagnosticsSummary, warmDiagnosticsSummary],
  };
}

async function staleAbortPressure(session, document, position, requestCount) {
  return abortPressure("stale managed templateCursorInfo", requestCount, async () => {
    try {
      await session.runRequest(null, async (operation) => {
        session.invalidateRequests();
        const managedDocument = requireOperationDocument(operation, document.uri);
        return operation.templateCursorInfo(managedDocument, position);
      });
      return "completed";
    } catch (error) {
      if (isSemanticRuntimeLspRequestAborted(error)) {
        return error.reason;
      }
      throw error;
    }
  });
}

async function cancelledAbortPressure(session, document, position, requestCount) {
  return abortPressure("cancelled managed templateCursorInfo", requestCount, async () => {
    try {
      await runDocumentRequest(session, document, () => true, (operation, managedDocument) =>
        operation.templateCursorInfo(managedDocument, position));
      return "completed";
    } catch (error) {
      if (isSemanticRuntimeLspRequestAborted(error)) {
        return error.reason;
      }
      throw error;
    }
  });
}

function managedGeneration(session) {
  return session.runRequest(null, (operation) => operation.generation);
}

function runDocumentRequest(session, document, isCancellationRequested, run) {
  return session.runRequest(isCancellationRequested, (operation) =>
    run(operation, requireOperationDocument(operation, document.uri)));
}

function runMeasuredDocumentRequest(session, document, editedDocument, run) {
  return session.runRequest(null, async (operation) => {
    const operationDocument = requireOperationDocument(operation, document.uri);
    const operationEditedDocument = requireOperationDocument(operation, editedDocument.uri);
    const answer = await run(operation, operationDocument);
    return {
      answer,
      generation: { ...operation.generation },
      document: documentEvidence(operationDocument),
      editedDocument: documentEvidence(operationEditedDocument),
    };
  });
}

function requireOperationDocument(operation, uri) {
  const document = operation.documents.openDocument(uri);
  if (document == null) {
    throw new Error(`Managed semantic-runtime operation could not read open document '${uri}'.`);
  }
  return document;
}

function requireMeasurementDocument(documents, filePath) {
  const uri = pathToFileURL(filePath).toString();
  const document = documents.get(uri);
  if (document == null) {
    throw new Error(`Measurement document store could not read '${uri}'.`);
  }
  return document;
}

function documentEvidence(document) {
  return {
    uri: document.uri,
    languageId: document.languageId,
    version: document.version,
  };
}

async function abortPressure(label, requestCount, run) {
  const started = performance.now();
  const outcomes = new Map();
  for (let index = 0; index < requestCount; index += 1) {
    const outcome = await run();
    outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
  }
  const elapsedMilliseconds = performance.now() - started;
  return {
    label,
    requestCount,
    elapsedMilliseconds,
    averageMilliseconds: elapsedMilliseconds / requestCount,
    outcomes: Object.fromEntries([...outcomes].sort(([left], [right]) => left.localeCompare(right))),
  };
}

function editOpenDocuments(documents, fixtureRoot, sourceFiles) {
  const targets = measurementEditTargets(fixtureRoot, sourceFiles);
  const editedPaths = [targets.html.filePath];
  applyMeasurementMarker(documents, targets.html.filePath, targets.html.kind, -1);
  const tsPath = targets.typeScript?.filePath ?? null;
  if (tsPath != null) {
    applyMeasurementMarker(documents, tsPath, "typescript", -1);
    editedPaths.push(tsPath);
  }
  return editedPaths;
}

function measurementEditTargets(fixtureRoot, sourceFiles) {
  const typeScriptPath = sourceFiles.find((filePath) => filePath.endsWith(path.normalize("src/state/catalog-state.ts")))
    ?? sourceFiles.find((filePath) => filePath.endsWith(".ts"))
    ?? null;
  return {
    html: { kind: "html", filePath: preferredTargetHtmlPath(fixtureRoot, sourceFiles) },
    typeScript: typeScriptPath == null ? null : { kind: "typescript", filePath: typeScriptPath },
  };
}

function applyMeasurementMarker(documents, filePath, kind, sequence) {
  const state = Math.floor(sequence / 2) % 2 === 0 ? "A" : "B";
  const pattern = kind === "html"
    ? /\n<!-- interactive performance marker: [AB] -->\n?$/
    : /\n\/\/ interactive performance marker: [AB]\n?$/;
  const marker = kind === "html"
    ? `\n<!-- interactive performance marker: ${state} -->\n`
    : `\n// interactive performance marker: ${state}\n`;
  return replaceDocumentText(documents, filePath, (text) => pattern.test(text)
    ? text.replace(pattern, marker)
    : `${text.replace(/\s*$/, "")}\n${marker}`);
}

function replaceDocumentText(documents, filePath, edit) {
  const uri = pathToFileURL(filePath).toString();
  const current = documents.get(uri);
  if (current == null) {
    throw new Error(`Measurement document store could not edit '${uri}'.`);
  }
  const updated = TextDocument.create(uri, current.languageId, current.version + 1, edit(current.getText()));
  documents.add(updated);
  return updated;
}

async function timed(label, measurement, run) {
  const measurementBefore = measurement.snapshot();
  const started = performance.now();
  const value = await run();
  const elapsedMilliseconds = performance.now() - started;
  return {
    label,
    elapsedMilliseconds,
    measurement: measurement.delta(measurementBefore),
    value,
  };
}

function timingSummary(timing) {
  return {
    label: timing.label,
    elapsedMilliseconds: timing.elapsedMilliseconds,
    measurement: timing.measurement,
    summary: timing.value?.summary ?? null,
    outcome: timing.value?.outcome ?? null,
  };
}

function operationTimingSummary(timing) {
  const answer = timing.value.answer;
  return {
    label: timing.label,
    elapsedMilliseconds: timing.elapsedMilliseconds,
    measurement: timing.measurement,
    summary: answer?.summary ?? null,
    outcome: answer?.outcome ?? null,
    projectInput: projectInputSummary(timing.measurement),
    generation: { ...timing.value.generation },
    document: { ...timing.value.document },
    editedDocument: { ...timing.value.editedDocument },
  };
}

export function editJourneyCurrentness(input) {
  const operations = Array.isArray(input.operations) ? input.operations : [];
  const first = operations[0] ?? null;
  const expectedEditedDocument = documentEvidence(input.expectedEditedDocument);
  const expectedQueryDocument = documentEvidence(input.expectedQueryDocument);
  const requestEpochAdvanced = first != null
    && Number.isSafeInteger(first.generation?.requestEpoch)
    && Number.isSafeInteger(input.previousGeneration?.requestEpoch)
    && first.generation.requestEpoch > input.previousGeneration.requestEpoch;
  const queryDocumentCurrent = operations.length > 0 && operations.every((operation) =>
    operation.document?.uri === expectedQueryDocument.uri
      && operation.document?.languageId === expectedQueryDocument.languageId
      && operation.document?.version === expectedQueryDocument.version);
  const editedDocumentCurrent = operations.length > 0 && operations.every((operation) =>
    operation.editedDocument?.uri === expectedEditedDocument.uri
      && operation.editedDocument?.languageId === expectedEditedDocument.languageId
      && operation.editedDocument?.version === expectedEditedDocument.version);
  const sameGeneration = operations.length > 0 && operations.every((operation) =>
    sameOperationGeneration(operation.generation, first?.generation));
  const status = requestEpochAdvanced && queryDocumentCurrent && editedDocumentCurrent && sameGeneration
    ? "pass"
    : "fail";
  return {
    status,
    requestEpochAdvanced,
    queryDocumentCurrent,
    editedDocumentCurrent,
    sameGeneration,
    editedDocument: expectedEditedDocument,
    queryDocument: expectedQueryDocument,
    previousGeneration: { ...input.previousGeneration },
    operationGeneration: first == null ? null : { ...first.generation },
  };
}

function sameOperationGeneration(left, right) {
  return left != null
    && right != null
    && left.requestEpoch === right.requestEpoch
    && left.workspaceGeneration === right.workspaceGeneration
    && left.sourceWorldRevision === right.sourceWorldRevision
    && left.fingerprint === right.fingerprint;
}

function memorySnapshot() {
  return readSemanticRuntimeMemorySample();
}

function counterMapDelta(before, after) {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Object.fromEntries(
    [...names]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => [name, counterDelta(before[name] ?? {}, after[name] ?? {})]),
  );
}

function counterDelta(before, after) {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Object.fromEntries(
    [...names]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => [name, (after[name] ?? 0) - (before[name] ?? 0)]),
  );
}

function projectInputSummary(measurement) {
  const operations = Object.entries(measurement.host)
    .filter(([, value]) => value.calls > 0);
  const calls = operations.reduce((total, [, value]) => total + value.calls, 0);
  const elapsedMilliseconds = operations.reduce(
    (total, [, value]) => total + value.elapsedMilliseconds,
    0,
  );
  return {
    calls,
    elapsedMilliseconds,
    detail: operations
      .map(([name, value]) => `${name}=${value.calls}`)
      .join(", "),
  };
}

async function cacheSnapshot(label, session, forceGc) {
  const structure = await cacheStructureSnapshot(label, session);
  // The primary live-memory boundary is immediately after collection. Derive the telemetry projection first so the
  // overview's temporary answer graph is no longer retained on this stack when GC runs.
  if (forceGc) globalThis.gc();
  return {
    ...structure,
    processMemory: memorySnapshot(),
  };
}

async function cacheStructureSnapshot(label, session) {
  const overview = await session.analysisCacheOverview({ rowLimit: 10 });
  const typeSystemDependencyCache = semanticRuntimeProcessTypeSystemCacheOverview({ rowLimit: 10 });
  const firstApp = overview.cachedApps[0] ?? null;
  return {
    label,
    cachedAppCount: overview.cachedAppCount,
    typeSystemProjectCount: overview.typeSystemProjectCount,
    workspaceKernelRecords: overview.workspaceKernel.totalRecords,
    workspaceKernelHandleCharacters: overview.workspaceKernel.handleCharacters,
    runtimeQueryClaimProfiles: overview.runtimeQueryClaimProfiles.length,
    runtimeQueryClaims: queryClaimSummary(overview.runtimeQueryClaimProfiles),
    typeSystemDependencyCache: {
      entries: typeSystemDependencyCache.entries,
      hits: typeSystemDependencyCache.hits,
      misses: typeSystemDependencyCache.misses,
      writes: typeSystemDependencyCache.writes,
      clearOperations: typeSystemDependencyCache.clearOperations,
    },
    firstCachedApp: firstApp == null
      ? null
      : {
          projectKey: firstApp.projectKey,
          analysisDepth: firstApp.analysisDepth,
          totalMilliseconds: firstApp.profile.totalMilliseconds,
          topPhases: firstApp.profile.topPhases.map((phase) => ({
            name: phase.name,
            milliseconds: phase.milliseconds,
            itemCount: phase.itemCount ?? null,
          })),
          templatePhases: firstApp.profile.templatePhases.map((phase) => ({
            name: phase.name,
            milliseconds: phase.milliseconds,
            itemCount: phase.itemCount ?? null,
          })),
          templateRuntimePhases: firstApp.profile.templateRuntimePhases.map((phase) => ({
            name: phase.name,
            milliseconds: phase.milliseconds,
            itemCount: phase.itemCount ?? null,
          })),
          staticEvaluationAcquisitions: firstApp.profile.staticEvaluationAcquisitions.map((entry) => ({ ...entry })),
          typeSystemAcquisition: { ...firstApp.profile.typeSystemAcquisition },
          queryClaims: queryClaimSummary(firstApp.queryClaimProfiles),
        },
  };
}

function queryClaimSummary(profiles) {
  return profiles.reduce((summary, profile) => {
    summary.profiles += 1;
    summary.createdRecords += profile.queryClaims.createdRecords;
    summary.retainedRecords += profile.queryClaims.retainedRecords;
    summary.disposedRecords += profile.queryClaims.disposed;
    summary.budgetDisposedRecords += profile.queryClaims.budgetDisposedRecords;
    summary.retainedQueryKeyCharacters += profile.queryClaims.retainedQueryKeyCharacters;
    return summary;
  }, {
    profiles: 0,
    createdRecords: 0,
    retainedRecords: 0,
    disposedRecords: 0,
    budgetDisposedRecords: 0,
    retainedQueryKeyCharacters: 0,
  });
}

function writeMeasurementHeapSnapshot(directory, label) {
  if (directory == null) {
    return null;
  }
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
  return writeHeapSnapshot(path.join(directory, `${label}.heapsnapshot`));
}

function addInvariants(report) {
  const afterCold = cacheByLabel(report, "after cold diagnostics");
  const afterClear = cacheByLabel(report, "after source change clear");
  const afterPostEdit = cacheByLabel(report, "after post-edit diagnostics");
  const stale = report.abortPressure.find((entry) => entry.label.startsWith("stale"));
  const cancelled = report.abortPressure.find((entry) => entry.label.startsWith("cancelled"));
  report.invariants.push({
    name: "cold diagnostics retained one app epoch",
    status: afterCold?.cachedAppCount > 0 ? "pass" : "fail",
  });
  report.invariants.push({
    name: "source change cleared retained app epochs",
    status: afterClear?.cachedAppCount === 0 ? "pass" : "fail",
  });
  report.invariants.push({
    name: "post-edit diagnostics rebuilt a retained app epoch",
    status: afterPostEdit?.cachedAppCount > 0 ? "pass" : "fail",
  });
  report.invariants.push({
    name: "stale guards abort every sampled request",
    status: stale?.outcomes?.stale === stale?.requestCount ? "pass" : "fail",
  });
  report.invariants.push({
    name: "cancelled guards abort every sampled request",
    status: cancelled?.outcomes?.cancelled === cancelled?.requestCount ? "pass" : "fail",
  });
  const allMeasuredOperations = [
    ...report.timings,
    ...report.editJourneys.flatMap((journey) => [
      journey.change,
      journey.firstQuery,
      journey.warmQuery,
      journey.firstDiagnostics,
      journey.warmDiagnostics,
    ].filter((operation) => operation != null)),
  ];
  report.invariants.push({
    name: "measurement never falls back to full open-document scans",
    status: allMeasuredOperations.every((operation) => operation.measurement.documents.allCalls === 0) ? "pass" : "fail",
  });
  report.invariants.push({
    name: "steady edit operations prove current query and edited documents in one exact generation",
    status: report.editJourneys.every((journey) => journey.currentness.status === "pass") ? "pass" : "fail",
  });
  report.invariants.push({
    name: "steady edit cycles retain at most one app epoch",
    status: report.editJourneys.every((journey) => journey.cache.cachedAppCount <= 1) ? "pass" : "fail",
  });
  report.invariants.push({
    name: "measurement retains no detached V8 contexts",
    status: report.cache.every((entry) => entry.processMemory.v8DetachedContextCount === 0)
      && report.editJourneys.every((journey) => journey.cache.processMemory.v8DetachedContextCount === 0)
      ? "pass"
      : "fail",
  });
}

function cacheByLabel(report, label) {
  return report.cache.find((entry) => entry.label === label) ?? null;
}

function recordGeneration(report, label, generation) {
  report.generations.push({ label, ...generation });
}

function cursorPositionsForDocument(document) {
  const text = document.getText();
  const memberOffset = offsetForAny(text, ["searchText", "visibleItems", "state"]) ?? 0;
  const completionBase = "state.items.";
  const completionOffset = text.includes(completionBase)
    ? text.indexOf(completionBase) + completionBase.length
    : memberOffset;
  return {
    member: document.positionAt(memberOffset),
    completion: document.positionAt(completionOffset),
  };
}

function offsetForAny(text, markers) {
  for (const marker of markers) {
    const offset = text.indexOf(marker);
    if (offset >= 0) {
      return offset;
    }
  }
  return null;
}

function preferredTargetHtmlPath(fixtureRoot, sourceFiles) {
  const preferred = path.join(fixtureRoot, "src/routes/item-list-route.html");
  if (sourceFiles.includes(preferred)) {
    return preferred;
  }
  const html = sourceFiles.find((filePath) => filePath.endsWith(".html"));
  if (html == null) {
    throw new Error("Measurement needs at least one HTML source file.");
  }
  return html;
}

async function largestPressureFixtureName() {
  const names = await fixtureNames();
  const stats = await Promise.all(names.map((name) => pressureFixtureStats(name)));
  stats.sort((left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name));
  return stats[0]?.name ?? "app-pattern-routed-catalog-storefront";
}

async function fixtureNames() {
  const entries = await fs.readdir(pressureFixtureRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function pressureFixtureStats(name) {
  const root = path.join(pressureFixtureRoot, name);
  return workspaceStats(root, name);
}

async function workspaceStats(root, name) {
  const files = await collectFiles(root, fixtureStatExtensions);
  const sizes = await Promise.all(files.map(async (filePath) => (await fs.stat(filePath)).size));
  return {
    name,
    files: files.length,
    bytes: sizes.reduce((total, size) => total + size, 0),
  };
}

async function collectFiles(root, extensions) {
  const result = [];
  await collectFilesInto(root, extensions, result);
  result.sort((left, right) => left.localeCompare(right));
  return result;
}

async function collectFilesInto(root, extensions, result) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "out" || entry.name === "dist") {
        continue;
      }
      await collectFilesInto(fullPath, extensions, result);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      result.push(fullPath);
    }
  }
}

function languageIdForPath(filePath) {
  switch (path.extname(filePath)) {
    case ".html":
      return "html";
    case ".js":
      return "javascript";
    case ".ts":
      return "typescript";
    default:
      return "plaintext";
  }
}

async function assertDirectory(directory, label) {
  const stats = await fs.stat(directory).catch(() => null);
  if (stats == null || !stats.isDirectory()) {
    throw new Error(`Missing ${label}: ${directory}`);
  }
}

export function parseIncrementalityArgs(argv) {
  const valueOptions = new Set([
    "workspace", "fixture", "requests", "cycles", "journey", "heap-snapshots", "cpu-profiles",
  ]);
  const booleanOptions = new Set(["force-gc", "json"]);
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
    if (!valueOptions.has(key) && !booleanOptions.has(key)) {
      throw new Error(`Unknown argument '--${key}'.`);
    }
    if (values.has(key)) {
      throw new Error(`Argument '--${key}' may only be supplied once.`);
    }
    if (booleanOptions.has(key)) {
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
  const journey = values.get("journey") ?? "completion-first";
  if (!incrementalityJourneys.has(journey)) {
    throw new Error("--journey must be 'completion-first' or 'diagnostics-first'.");
  }
  return Object.freeze({
    fixture,
    workspace,
    requests: positiveInteger(values.get("requests") ?? "20", "--requests"),
    cycles: nonNegativeInteger(values.get("cycles") ?? "8", "--cycles"),
    journey,
    forceGc: values.get("force-gc") ?? false,
    heapSnapshots: values.get("heap-snapshots") ?? null,
    cpuProfiles: values.get("cpu-profiles") ?? null,
    json: values.get("json") ?? false,
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

function nonNegativeInteger(value, label) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} must be a safe non-negative integer.`);
  }
  return parsed;
}

function strictBoolean(value, label) {
  if (value !== "true" && value !== "false") {
    throw new Error(`${label} must be 'true' or 'false'.`);
  }
  return value === "true";
}

function markdownReport(report) {
  return [
    "# Interactive Performance Measurement",
    "",
    `Schema: \`${report.schemaVersion}\``,
    `Journey: \`${report.measurement.journey}\``,
    `Fixture: \`${report.fixture.name}\``,
    `Target: \`${report.fixture.targetDocument}\``,
    `Files: ${report.fixture.measuredFiles} measured fixture file(s), ${report.fixture.sourceFiles} opened source document(s), ${report.fixture.measuredBytes} byte(s).`,
    "",
    "## Generations",
    "",
    table(
      ["label", "workspace", "source", "fingerprint"],
      report.generations.map((row) => [
        row.label,
        String(row.workspaceGeneration),
        row.sourceWorldRevision,
        row.fingerprint,
      ]),
    ),
    "",
    "## Timings",
    "",
    table(
      ["operation", "ms", "host calls", "host ms", "heap delta", "outcome"],
      report.timings.map((row) => {
        const projectInput = projectInputSummary(row.measurement);
        return [
          row.label,
          row.elapsedMilliseconds.toFixed(2),
          String(projectInput.calls),
          projectInput.elapsedMilliseconds.toFixed(2),
          formatBytes(row.measurement.memory.heapUsedBytes),
          row.outcome ?? "",
        ];
      }),
    ),
    "",
    "## Project Input",
    "",
    table(
      ["operation", "host operations", "document get", "document scans", "documents visited"],
      report.timings.map((row) => [
        row.label,
        projectInputSummary(row.measurement).detail,
        String(row.measurement.documents.getCalls),
        String(row.measurement.documents.allCalls),
        String(row.measurement.documents.allDocumentsVisited),
      ]),
    ),
    "",
    "## Cache",
    "",
    table(
      ["label", "apps", "kernel records", "app claims", "heap", "rss", "ts dep entries", "first app ms"],
      report.cache.map((row) => [
        row.label,
        String(row.cachedAppCount),
        String(row.workspaceKernelRecords),
        String(row.firstCachedApp?.queryClaims.retainedRecords ?? 0),
        formatAbsoluteBytes(row.processMemory.heapUsedBytes),
        formatAbsoluteBytes(row.processMemory.rssBytes),
        String(row.typeSystemDependencyCache.entries),
        row.firstCachedApp == null ? "" : row.firstCachedApp.totalMilliseconds.toFixed(2),
      ]),
    ),
    "",
    "## Steady Edit Journeys",
    "",
    table(...steadyEditJourneyTable(report)),
    "",
    "## Steady Compiler Acquisitions",
    "",
    table(
      ["cycle", "source", "type system", "type-system ms", "type-system build ms", "static evaluations"],
      report.editJourneys.map((journey) => {
        const app = journey.cache.firstCachedApp;
        return [
          String(journey.index),
          journey.kind,
          app?.typeSystemAcquisition.acquisitionKind ?? "",
          app?.typeSystemAcquisition.acquisitionMilliseconds.toFixed(2) ?? "",
          app?.typeSystemAcquisition.constructionMilliseconds.toFixed(2) ?? "",
          app?.staticEvaluationAcquisitions.map((acquisition) =>
            `${acquisition.profileKey}:${acquisition.acquisitionKind}=${acquisition.acquisitionMilliseconds.toFixed(2)}ms`
          ).join("; ") ?? "",
        ];
      }),
    ),
    "",
    "## Steady Top Phases",
    "",
    table(
      ["cycle", "source", "phase", "ms", "items"],
      report.editJourneys.flatMap((journey) =>
        (journey.cache.firstCachedApp?.topPhases ?? []).map((phase) => [
          String(journey.index),
          journey.kind,
          phase.name,
          phase.milliseconds.toFixed(2),
          phase.itemCount == null ? "" : String(phase.itemCount),
        ])),
    ),
    "",
    "## Steady Template Phases",
    "",
    table(
      ["cycle", "source", "phase", "ms", "items"],
      report.editJourneys.flatMap((journey) =>
        (journey.cache.firstCachedApp?.templatePhases ?? []).map((phase) => [
          String(journey.index),
          journey.kind,
          phase.name,
          phase.milliseconds.toFixed(2),
          phase.itemCount == null ? "" : String(phase.itemCount),
        ])),
    ),
    "",
    "## Steady Template Runtime Phases",
    "",
    table(
      ["cycle", "source", "phase", "ms", "items"],
      report.editJourneys.flatMap((journey) =>
        (journey.cache.firstCachedApp?.templateRuntimePhases ?? []).map((phase) => [
          String(journey.index),
          journey.kind,
          phase.name,
          phase.milliseconds.toFixed(2),
          phase.itemCount == null ? "" : String(phase.itemCount),
        ])),
    ),
    "",
    "## Steady Distributions",
    "",
    table(
      ["source", "operation", "samples", "min ms", "p50 ms", "p90 ms", "p95 ms", "max ms"],
      editJourneyDistributions(report.editJourneys).map((row) => [
        row.kind,
        row.operation,
        String(row.samples),
        row.min.toFixed(2),
        row.p50.toFixed(2),
        row.p90.toFixed(2),
        row.p95.toFixed(2),
        row.max.toFixed(2),
      ]),
    ),
    "",
    "## Abort Pressure",
    "",
    table(
      ["label", "requests", "ms", "avg ms", "outcomes"],
      report.abortPressure.map((row) => [
        row.label,
        String(row.requestCount),
        row.elapsedMilliseconds.toFixed(2),
        row.averageMilliseconds.toFixed(3),
        Object.entries(row.outcomes).map(([key, value]) => `${key}=${value}`).join(", "),
      ]),
    ),
    "",
    "## Invariants",
    "",
    table(
      ["status", "invariant"],
      report.invariants.map((row) => [row.status, row.name]),
    ),
  ].join("\n");
}

function steadyEditJourneyTable(report) {
  const shared = (journey) => [
    String(journey.index),
    journey.kind,
  ];
  const suffix = (journey) => [
    journey.cache.firstCachedApp?.totalMilliseconds.toFixed(2) ?? "",
    journey.warmDiagnostics.elapsedMilliseconds.toFixed(2),
    journey.currentness.status,
    String(journey.cache.workspaceKernelRecords),
    String(journey.cache.firstCachedApp?.queryClaims.retainedRecords ?? 0),
    formatAbsoluteBytes(journey.cache.processMemory.heapUsedBytes),
    formatAbsoluteBytes(journey.cache.processMemory.rssBytes),
  ];
  if (report.measurement.journey === "diagnostics-first") {
    return [[
      "cycle", "source", "first diagnostics ms", "app build ms", "warm diagnostics ms", "current", "kernel records",
      "app claims", "heap", "rss",
    ], report.editJourneys.map((journey) => [
      ...shared(journey),
      journey.firstDiagnostics.elapsedMilliseconds.toFixed(2),
      ...suffix(journey),
    ])];
  }
  return [[
    "cycle", "source", "first completion ms", "app build ms", "warm completion ms", "warm diagnostics ms", "current",
    "kernel records", "app claims", "heap", "rss",
  ], report.editJourneys.map((journey) => [
    ...shared(journey),
    journey.firstQuery.elapsedMilliseconds.toFixed(2),
    journey.cache.firstCachedApp?.totalMilliseconds.toFixed(2) ?? "",
    journey.warmQuery.elapsedMilliseconds.toFixed(2),
    journey.warmDiagnostics.elapsedMilliseconds.toFixed(2),
    journey.currentness.status,
    String(journey.cache.workspaceKernelRecords),
    String(journey.cache.firstCachedApp?.queryClaims.retainedRecords ?? 0),
    formatAbsoluteBytes(journey.cache.processMemory.heapUsedBytes),
    formatAbsoluteBytes(journey.cache.processMemory.rssBytes),
  ])];
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`),
  ].join("\n");
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatBytes(value) {
  const sign = value < 0 ? "-" : "+";
  const absolute = Math.abs(value);
  if (absolute < 1024) {
    return `${sign}${absolute} B`;
  }
  if (absolute < 1024 * 1024) {
    return `${sign}${(absolute / 1024).toFixed(1)} KiB`;
  }
  return `${sign}${(absolute / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatAbsoluteBytes(value) {
  return formatBytes(value).replace(/^\+/, "");
}

export function editJourneyDistributions(journeys) {
  const rows = [];
  for (const kind of ["html", "typescript"]) {
    const selected = journeys.filter((journey) => journey.kind === kind);
    for (const [operation, read] of [
      ["first completion", (journey) => journey.firstQuery?.elapsedMilliseconds],
      ["warm completion", (journey) => journey.warmQuery?.elapsedMilliseconds],
      ["first diagnostics", (journey) => journey.firstDiagnostics?.elapsedMilliseconds],
      ["warm diagnostics", (journey) => journey.warmDiagnostics?.elapsedMilliseconds],
    ]) {
      const values = selected.map(read).filter(Number.isFinite).sort((left, right) => left - right);
      if (values.length === 0) {
        continue;
      }
      rows.push({
        kind,
        operation,
        samples: values.length,
        min: values[0],
        p50: percentile(values, 0.5),
        p90: percentile(values, 0.9),
        p95: percentile(values, 0.95),
        max: values[values.length - 1],
      });
    }
  }
  return rows;
}

function percentile(sortedValues, fraction) {
  const index = Math.max(0, Math.ceil(sortedValues.length * fraction) - 1);
  return sortedValues[index];
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
