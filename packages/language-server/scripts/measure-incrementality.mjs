#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  SemanticRuntimeLspSession,
  isSemanticRuntimeLspRequestAborted,
} from "../out/runtime/semantic-runtime-session.js";
import { WorkspaceDocumentUris } from "../out/utils/document-uri.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = path.resolve(packageRoot, "../..");
const pressureFixtureRoot = path.join(repoRoot, "packages/semantic-runtime/fixtures/pressure");

const sourceExtensions = new Set([".ts", ".js", ".html"]);
const fixtureStatExtensions = new Set([".ts", ".js", ".html", ".json", ".css"]);

class MeasurementDocumentStore {
  documents = new Map();

  add(document) {
    this.documents.set(document.uri, document);
  }

  get(uri) {
    return this.documents.get(uri);
  }

  all() {
    return [...this.documents.values()];
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixtureName = args.fixture === "largest" || args.fixture == null
    ? await largestPressureFixtureName()
    : args.fixture;
  const requestCount = Number.parseInt(args.requests ?? "20", 10);
  if (!Number.isFinite(requestCount) || requestCount < 1) {
    throw new Error("--requests must be a positive integer.");
  }

  const fixtureRoot = path.join(pressureFixtureRoot, fixtureName);
  await assertDirectory(fixtureRoot, `fixture '${fixtureName}'`);
  const fixtureStats = await pressureFixtureStats(fixtureName);
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
  const session = new SemanticRuntimeLspSession({ documents, documentUris });
  const report = {
    fixture: {
      name: fixtureName,
      root: fixtureRoot,
      sourceFiles: sourceFiles.length,
      measuredBytes: fixtureStats.bytes,
      measuredFiles: fixtureStats.files,
      targetDocument: relativePath(fixtureRoot, targetHtmlPath),
    },
    generations: [],
    timings: [],
    cache: [],
    abortPressure: [],
    invariants: [],
  };

  recordGeneration(report, "initial", session.currentGeneration());

  const coldDiagnostics = await timed("cold appDiagnostics", () =>
    session.appDiagnostics(targetHtml, session.requestGuard(null)));
  report.timings.push(timingSummary(coldDiagnostics));
  recordGeneration(report, "after cold diagnostics", session.currentGeneration());
  report.cache.push(await cacheSnapshot("after cold diagnostics", session));

  const warmDiagnostics = await timed("warm same-generation appDiagnostics", () =>
    session.appDiagnostics(targetHtml, session.requestGuard(null)));
  report.timings.push(timingSummary(warmDiagnostics));
  report.cache.push(await cacheSnapshot("after warm diagnostics", session));

  const cursorInfo = await timed("warm same-generation templateCursorInfo", () =>
    session.templateCursorInfo(targetHtml, cursorPositions.member, session.requestGuard(null)));
  report.timings.push(timingSummary(cursorInfo));

  editOpenDocuments(documents, fixtureRoot, sourceFiles);
  const sourceChange = await timed("recordSourceTextChanged after TS+HTML edits", () =>
    session.recordSourceTextChanged());
  report.timings.push(timingSummary(sourceChange));
  recordGeneration(report, "after source change", session.currentGeneration());
  report.cache.push(await cacheSnapshot("after source change clear", session));

  const afterEditDiagnostics = await timed("post-edit appDiagnostics", () =>
    session.appDiagnostics(targetHtml, session.requestGuard(null)));
  report.timings.push(timingSummary(afterEditDiagnostics));
  report.cache.push(await cacheSnapshot("after post-edit diagnostics", session));

  const afterEditCompletion = await timed("post-edit templateCompletions", () =>
    session.templateCompletions(targetHtml, cursorPositions.completion, session.requestGuard(null)));
  report.timings.push(timingSummary(afterEditCompletion));
  report.cache.push(await cacheSnapshot("after post-edit completion", session));

  const stalePressure = await staleAbortPressure(session, targetHtml, cursorPositions.member, requestCount);
  report.abortPressure.push(stalePressure);
  recordGeneration(report, "after stale pressure generation change", session.currentGeneration());

  const cancelledPressure = await cancelledAbortPressure(session, targetHtml, cursorPositions.member, requestCount);
  report.abortPressure.push(cancelledPressure);

  addInvariants(report);

  if (args.json === "true") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(markdownReport(report));
  }

  const failed = report.invariants.filter((invariant) => invariant.status !== "pass");
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function staleAbortPressure(session, document, position, requestCount) {
  const guard = session.requestGuard(null);
  await session.recordSourceTextChanged();
  return abortPressure("stale templateCursorInfo", requestCount, async () => {
    try {
      await session.templateCursorInfo(document, position, guard);
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
  const guard = session.requestGuard(() => true);
  return abortPressure("cancelled templateCursorInfo", requestCount, async () => {
    try {
      await session.templateCursorInfo(document, position, guard);
      return "completed";
    } catch (error) {
      if (isSemanticRuntimeLspRequestAborted(error)) {
        return error.reason;
      }
      throw error;
    }
  });
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
  const htmlPath = preferredTargetHtmlPath(fixtureRoot, sourceFiles);
  replaceDocumentText(documents, htmlPath, (text) => `${text}\n<!-- incrementality measurement edit -->\n`);
  const tsPath = sourceFiles.find((filePath) => filePath.endsWith(path.normalize("src/state/catalog-state.ts")))
    ?? sourceFiles.find((filePath) => filePath.endsWith(".ts"));
  if (tsPath != null) {
    replaceDocumentText(documents, tsPath, (text) => `${text}\n// incrementality measurement edit\n`);
  }
}

function replaceDocumentText(documents, filePath, edit) {
  const uri = pathToFileURL(filePath).toString();
  const current = documents.get(uri);
  if (current == null) {
    return;
  }
  documents.add(TextDocument.create(uri, current.languageId, current.version + 1, edit(current.getText())));
}

async function timed(label, run) {
  const started = performance.now();
  const value = await run();
  const elapsedMilliseconds = performance.now() - started;
  return { label, elapsedMilliseconds, value };
}

function timingSummary(timing) {
  return {
    label: timing.label,
    elapsedMilliseconds: timing.elapsedMilliseconds,
    summary: timing.value?.summary ?? null,
    outcome: timing.value?.outcome ?? null,
  };
}

async function cacheSnapshot(label, session) {
  const runtime = await session.runtime;
  const answer = runtime.analysisCacheOverview({ rowLimit: 3 });
  const firstApp = answer.value.cachedApps[0] ?? null;
  return {
    label,
    cachedAppCount: answer.value.cachedAppCount,
    workspaceKernelRecords: answer.value.workspaceKernel.totalRecords,
    runtimeQueryClaimProfiles: answer.value.runtimeQueryClaimProfiles.length,
    typeSystemDependencyCache: {
      entries: answer.value.typeSystemDependencyCache.entries,
      hits: answer.value.typeSystemDependencyCache.hits,
      misses: answer.value.typeSystemDependencyCache.misses,
      writes: answer.value.typeSystemDependencyCache.writes,
      clearOperations: answer.value.typeSystemDependencyCache.clearOperations,
    },
    firstCachedApp: firstApp == null
      ? null
      : {
          projectKey: firstApp.projectKey,
          analysisDepth: firstApp.analysisDepth,
          totalMilliseconds: firstApp.profile.totalMilliseconds,
          topPhases: firstApp.profile.topPhases.slice(0, 3).map((phase) => ({
            name: phase.name,
            milliseconds: phase.milliseconds,
            itemCount: phase.itemCount ?? null,
          })),
        },
  };
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

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue == null && value != null && !value.startsWith("--")) {
      index += 1;
    }
    args[rawKey] = value == null || value.startsWith("--") ? "true" : value;
  }
  return args;
}

function markdownReport(report) {
  return [
    "# Incrementality Bridge Measurement",
    "",
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
        String(row.sourceGeneration),
        row.fingerprint,
      ]),
    ),
    "",
    "## Timings",
    "",
    table(
      ["operation", "ms", "outcome"],
      report.timings.map((row) => [
        row.label,
        row.elapsedMilliseconds.toFixed(2),
        row.outcome ?? "",
      ]),
    ),
    "",
    "## Cache",
    "",
    table(
      ["label", "apps", "kernel records", "ts dep entries", "ts hits", "ts misses", "first app ms"],
      report.cache.map((row) => [
        row.label,
        String(row.cachedAppCount),
        String(row.workspaceKernelRecords),
        String(row.typeSystemDependencyCache.entries),
        String(row.typeSystemDependencyCache.hits),
        String(row.typeSystemDependencyCache.misses),
        row.firstCachedApp == null ? "" : row.firstCachedApp.totalMilliseconds.toFixed(2),
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

function relativePath(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
