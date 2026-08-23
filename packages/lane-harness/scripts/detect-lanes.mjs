#!/usr/bin/env node

import { spawn } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { supportedLaneNames } from "./run-lane.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const PROBE_SUFFIX = ".probes.json";
const SNAPSHOT_SUFFIX = ".snap.md";

export const laneDetectionConcurrency = 2;
export const laneDetectionFailureOutputLimit = 16 * 1024;
export const laneDetectionPairTimeoutMs = 5 * 60 * 1000;
export const laneDetectionTerminationGraceMs = 2 * 1000;
export const laneDetectionForceKillWaitMs = 2 * 1000;
export const laneDetectionCleanupWaitMs =
  (2 * laneDetectionTerminationGraceMs) + (2 * laneDetectionForceKillWaitMs) + 2 * 1000;

export class LaneDetectionError extends Error {
  constructor(message, failures = []) {
    super(message);
    this.name = "LaneDetectionError";
    this.failures = failures;
  }
}

export function parseLaneDetectionArguments(args) {
  let planOnly = false;
  let help = false;
  for (const argument of args) {
    if (argument === "--plan") {
      if (planOnly) throw new LaneDetectionError("--plan may only be provided once.");
      planOnly = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      if (help) throw new LaneDetectionError("--help may only be provided once.");
      help = true;
      continue;
    }
    throw new LaneDetectionError(
      `Unknown argument ${JSON.stringify(argument)}. Aggregate lane detection never accepts update or probe-selection arguments.`,
    );
  }
  return Object.freeze({ planOnly, help });
}

export async function discoverLaneDetectionPlan(options = {}) {
  const packageRoot = resolve(options.packageRoot ?? DEFAULT_PACKAGE_ROOT);
  const repoRoot = resolve(options.repoRoot ?? resolve(packageRoot, "..", ".."));
  const probeRoot = resolve(options.probeRoot ?? join(packageRoot, "probes"));
  const snapshotRoot = resolve(options.snapshotRoot ?? join(packageRoot, "snapshots"));
  const runnerPath = resolve(options.runnerPath ?? join(packageRoot, "scripts", "run-lane.mjs"));
  const supportedLanes = new Set(supportedLaneNames);

  await requireDirectory(repoRoot, "repository root");
  const repoRealRoot = await realpath(repoRoot);
  await requireRegularFile(runnerPath, "lane runner");
  const probeEntries = (await readdir(probeRoot, { withFileTypes: true }))
    .filter((entry) => entry.name.endsWith(PROBE_SUFFIX))
    .sort((left, right) => compareText(left.name, right.name));
  if (probeEntries.length === 0) {
    throw new LaneDetectionError(`No ${PROBE_SUFFIX} files were found below ${probeRoot}.`);
  }

  const runs = [];
  const pairOwners = new Map();
  const authenticatedProbeFiles = new Set();
  let probeCount = 0;
  for (const entry of probeEntries) {
    const probeFile = join(probeRoot, entry.name);
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new LaneDetectionError(`Probe sidecar must be a regular non-symbolic file: ${probeFile}`);
    }
    const document = await readJsonObject(probeFile, "probe sidecar");
    const fixture = requireNonemptyString(document.fixture, `${entry.name}.fixture`);
    const fixtureRoot = resolve(repoRoot, fixture);
    if (!pathIsInsideOrEqual(repoRoot, fixtureRoot)) {
      throw new LaneDetectionError(`Fixture escapes the repository root in ${probeFile}: ${fixture}`);
    }
    await requireNonSymbolicPath(repoRoot, fixtureRoot, `${entry.name} fixture`, "directory");
    const fixtureRealRoot = await realpath(fixtureRoot);
    if (!pathIsInsideOrEqual(repoRealRoot, fixtureRealRoot)) {
      throw new LaneDetectionError(
        `Fixture realpath escapes the repository root in ${probeFile}: ${fixtureRealRoot}`,
      );
    }

    const fixtureName = fixtureRoot.split(/[\\/]/u).at(-1);
    if (!isRecord(document.lanes) || Object.keys(document.lanes).length === 0) {
      throw new LaneDetectionError(`${entry.name}.lanes must be a nonempty object.`);
    }

    for (const lane of Object.keys(document.lanes).sort()) {
      if (!supportedLanes.has(lane)) {
        throw new LaneDetectionError(
          `${entry.name} declares unsupported lane ${JSON.stringify(lane)}; supported lanes are ${supportedLaneNames.join(", ")}.`,
        );
      }
      const probes = document.lanes[lane];
      if (!Array.isArray(probes) || probes.length === 0) {
        throw new LaneDetectionError(`${entry.name}.lanes.${lane} must be a nonempty array.`);
      }
      const declaredProbeFiles = validateProbes(probes, entry.name, lane);
      for (const declaredProbeFile of declaredProbeFiles) {
        const sourceFile = resolveProbeSourceFile(fixtureRoot, declaredProbeFile, entry.name, lane);
        const sourceKey = `${normalizePathKey(fixtureRoot)}\u0000${normalizePathKey(sourceFile)}`;
        if (!authenticatedProbeFiles.has(sourceKey)) {
          await authenticateProbeSourceFile({
            repoRoot,
            repoRealRoot,
            fixtureRoot,
            fixtureRealRoot,
            sourceFile,
            declaredProbeFile,
            sidecarName: entry.name,
            lane,
          });
          authenticatedProbeFiles.add(sourceKey);
        }
      }

      const pairKey = `${fixtureName}/${lane}`;
      const previousOwner = pairOwners.get(pairKey);
      if (previousOwner != null) {
        throw new LaneDetectionError(
          `Lane pair ${pairKey} is owned by both ${previousOwner} and ${entry.name}.`,
        );
      }
      pairOwners.set(pairKey, entry.name);
      probeCount += probes.length;
      runs.push(Object.freeze({
        pairKey,
        fixtureName,
        fixtureRoot,
        probeFile,
        lane,
        probeCount: probes.length,
        snapshotPath: join(snapshotRoot, fixtureName, `${lane}${SNAPSHOT_SUFFIX}`),
      }));
    }
  }

  runs.sort((left, right) => compareText(left.pairKey, right.pairKey));
  const actualSnapshots = await collectSnapshotFiles(snapshotRoot);
  const expectedSnapshots = new Set(runs.map((run) => normalizePathKey(run.snapshotPath)));
  const actualSnapshotKeys = new Set(actualSnapshots.map(normalizePathKey));
  const missing = runs
    .filter((run) => !actualSnapshotKeys.has(normalizePathKey(run.snapshotPath)))
    .map((run) => toDisplayPath(repoRoot, run.snapshotPath));
  const orphaned = actualSnapshots
    .filter((snapshotPath) => !expectedSnapshots.has(normalizePathKey(snapshotPath)))
    .map((snapshotPath) => toDisplayPath(repoRoot, snapshotPath));
  if (missing.length > 0 || orphaned.length > 0) {
    throw new LaneDetectionError([
      "Lane probe/snapshot inventory is not bijective.",
      ...missing.map((file) => `Missing snapshot: ${file}`),
      ...orphaned.map((file) => `Orphan snapshot: ${file}`),
    ].join("\n"));
  }

  const lanes = Object.fromEntries(supportedLaneNames
    .map((lane) => [lane, runs.filter((run) => run.lane === lane).length])
    .filter(([, count]) => count > 0));
  return Object.freeze({
    schemaVersion: "aurelia-ls/lane-detection-plan/v1",
    repoRoot,
    packageRoot,
    probeRoot,
    snapshotRoot,
    runnerPath,
    concurrency: laneDetectionConcurrency,
    probeFiles: probeEntries.length,
    probes: probeCount,
    probeSourceFiles: authenticatedProbeFiles.size,
    snapshots: actualSnapshots.length,
    lanes: Object.freeze(lanes),
    runs: Object.freeze(runs),
  });
}

export function laneDetectionPlanReceipt(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    concurrency: plan.concurrency,
    probeFiles: plan.probeFiles,
    pairs: plan.runs.length,
    probes: plan.probes,
    probeSourceFiles: plan.probeSourceFiles,
    snapshots: plan.snapshots,
    lanes: plan.lanes,
    runs: plan.runs.map((run) => ({
      fixture: run.fixtureName,
      lane: run.lane,
      probes: run.probeCount,
      probeFile: toDisplayPath(plan.repoRoot, run.probeFile),
      snapshot: toDisplayPath(plan.repoRoot, run.snapshotPath),
    })),
  };
}

export function laneDetectionChildArguments(plan, run) {
  return Object.freeze([
    plan.runnerPath,
    "--fixture",
    run.probeFile,
    "--lane",
    run.lane,
  ]);
}

export async function executeLaneDetectionPlan(plan, dependencies = {}) {
  const executePair = dependencies.executePair ?? ((run, context) =>
    executeLanePair(plan, run, context));
  const logger = dependencies.logger ?? console;
  const pairTimeoutMs = positiveDuration(
    dependencies.pairTimeoutMs ?? laneDetectionPairTimeoutMs,
    "pair timeout",
  );
  const cleanupWaitMs = positiveDuration(
    dependencies.cleanupWaitMs ?? laneDetectionCleanupWaitMs,
    "cleanup wait",
  );
  const terminationGraceMs = positiveDuration(
    dependencies.terminationGraceMs ?? laneDetectionTerminationGraceMs,
    "termination grace",
  );
  const forceKillWaitMs = positiveDuration(
    dependencies.forceKillWaitMs ?? laneDetectionForceKillWaitMs,
    "force-kill wait",
  );
  const terminationRequester = dependencies.requestProcessTreeTermination
    ?? requestProcessTreeTermination;
  const failures = [];
  let cursor = 0;
  let passed = 0;
  let stopScheduling = false;

  const worker = async () => {
    while (!stopScheduling) {
      const index = cursor;
      cursor += 1;
      if (index >= plan.runs.length) return;
      const run = plan.runs[index];
      logger.log(`[lane-detect] ${index + 1}/${plan.runs.length} ${run.pairKey}`);
      const started = performance.now();
      let result;
      try {
        result = await executeLanePairWithWatchdog(executePair, run, {
          index,
          total: plan.runs.length,
          pairTimeoutMs,
          cleanupWaitMs,
          terminationGraceMs,
          forceKillWaitMs,
          terminationRequester,
        });
      } catch (error) {
        result = {
          exitCode: 1,
          output: error instanceof Error ? error.stack ?? error.message : String(error),
        };
      }
      const milliseconds = Math.round(performance.now() - started);
      if (result?.exitCode === 0) {
        passed += 1;
        logger.log(`[lane-detect] ok ${run.pairKey} (${milliseconds}ms)`);
        continue;
      }
      const failure = Object.freeze({
        pairKey: run.pairKey,
        exitCode: result?.exitCode ?? 1,
        output: boundedTail(result?.output ?? "Lane runner failed without output."),
      });
      failures.push(failure);
      stopScheduling = true;
      logger.error(`[lane-detect] failed ${run.pairKey} (${milliseconds}ms)`);
    }
  };

  const workerCount = Math.min(plan.concurrency, plan.runs.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (failures.length > 0) {
    throw new LaneDetectionError([
      `Aggregate lane detection failed after ${passed} matching pair(s).`,
      ...failures.flatMap((failure) => [
        `--- ${failure.pairKey} (exit ${failure.exitCode}) ---`,
        failure.output,
      ]),
    ].join("\n"), failures);
  }
  return Object.freeze({ passed, pairs: plan.runs.length, probes: plan.probes });
}

async function executeLanePairWithWatchdog(executePair, run, context) {
  const abortController = new AbortController();
  const execution = Promise.resolve()
    .then(() => executePair(run, {
      index: context.index,
      total: context.total,
      signal: abortController.signal,
      terminationGraceMs: context.terminationGraceMs,
      forceKillWaitMs: context.forceKillWaitMs,
      terminationRequester: context.terminationRequester,
    }))
    .then(
      (result) => ({ kind: "completed", result }),
      (error) => ({
        kind: "completed",
        result: {
          exitCode: 1,
          output: error instanceof Error ? error.stack ?? error.message : String(error),
        },
      }),
    );
  let timeoutId;
  const timeout = new Promise((resolveTimeout) => {
    timeoutId = setTimeout(() => resolveTimeout({ kind: "timeout" }), context.pairTimeoutMs);
  });
  const winner = await Promise.race([execution, timeout]);
  clearTimeout(timeoutId);
  if (winner.kind === "completed") return winner.result;

  abortController.abort(
    new LaneDetectionError(`Lane pair ${run.pairKey} exceeded ${context.pairTimeoutMs}ms.`),
  );
  const cleanup = await resolveWithin(execution, context.cleanupWaitMs, null);
  const cleanupOutput = cleanup?.kind === "completed"
    ? cleanup.result?.output ?? ""
    : `Runner cleanup did not settle within ${context.cleanupWaitMs}ms.`;
  return {
    exitCode: 1,
    output: boundedTail([
      `Lane pair ${run.pairKey} timed out after ${context.pairTimeoutMs}ms.`,
      cleanupOutput,
    ].filter((value) => value.length > 0).join("\n")),
  };
}

async function executeLanePair(plan, run, context) {
  return await new Promise((resolvePair) => {
    const [runnerPath, ...runnerArguments] = laneDetectionChildArguments(plan, run);
    const child = spawn(process.execPath, [runnerPath, ...runnerArguments], {
      cwd: plan.repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    });
    let output = "";
    let settled = false;
    let aborting = false;
    let resolveClosed;
    const closed = new Promise((resolveExit) => {
      resolveClosed = resolveExit;
    });
    const settle = (value) => {
      if (settled) return;
      settled = true;
      context.signal?.removeEventListener("abort", abort);
      resolvePair(value);
    };
    const append = (chunk) => {
      output = boundedTail(output + chunk.toString("utf8"));
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.once("error", (error) => {
      append(`${error.stack ?? error.message}\n`);
      resolveClosed({ exitCode: 1, signal: null });
      if (!aborting) settle({ exitCode: 1, output });
    });
    child.once("close", (exitCode, signal) => {
      if (signal != null) append(`Lane runner terminated by signal ${signal}.\n`);
      resolveClosed({ exitCode: exitCode ?? 1, signal });
      if (!aborting) settle({ exitCode: exitCode ?? 1, output });
    });
    const abort = () => {
      if (aborting || settled) return;
      aborting = true;
      void terminateChildProcessTree(child, closed, {
        terminationGraceMs: context.terminationGraceMs,
        forceKillWaitMs: context.forceKillWaitMs,
        terminationRequester: context.terminationRequester,
        append,
      }).then(
        () => settle({ exitCode: 1, output }),
        (error) => {
          append(`Process-tree cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`);
          settle({ exitCode: 1, output });
        },
      );
    };
    context.signal?.addEventListener("abort", abort, { once: true });
    if (context.signal?.aborted === true) abort();
  });
}

async function terminateChildProcessTree(child, closed, options) {
  const pid = child.pid;
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    options.append("Runner process did not expose a valid PID for cleanup.\n");
    return;
  }
  if (child.exitCode !== null || child.signalCode !== null) return;
  options.append(`Terminating lane runner process tree rooted at PID ${pid}.\n`);
  await options.terminationRequester(pid, false, options.terminationGraceMs, options.append);
  const gracefulExit = await resolveWithin(
    closed.then(() => true),
    options.terminationGraceMs,
    false,
  );
  if (gracefulExit) return;

  await options.terminationRequester(pid, true, options.forceKillWaitMs, options.append);
  const exit = await resolveWithin(
    closed.then(() => true),
    options.forceKillWaitMs,
    false,
  );
  if (!exit) {
    options.append(`Lane runner PID ${pid} did not report exit after forced process-tree cleanup.\n`);
  }
}

async function requestProcessTreeTermination(pid, force, waitMs, append) {
  if (process.platform === "win32") {
    const args = ["/PID", String(pid), "/T", ...(force ? ["/F"] : [])];
    await runBoundedTerminationCommand("taskkill.exe", args, waitMs, append);
    return;
  }
  try {
    process.kill(-pid, force ? "SIGKILL" : "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") {
      append(`Unable to send ${force ? "SIGKILL" : "SIGTERM"} to process group ${pid}: ${String(error)}\n`);
    }
  }
}

async function runBoundedTerminationCommand(command, args, waitMs, append) {
  await new Promise((resolveCommand) => {
    const helper = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let settled = false;
    let timeoutId = null;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolveCommand();
    };
    helper.stdout?.on("data", append);
    helper.stderr?.on("data", append);
    helper.once("error", (error) => {
      append(`Process-tree termination command failed: ${error.message}\n`);
      settle();
    });
    helper.once("close", settle);
    timeoutId = setTimeout(() => {
      append(`Process-tree termination command exceeded ${waitMs}ms.\n`);
      helper.kill();
      settle();
    }, waitMs);
  });
}

function validateProbes(probes, sidecarName, lane) {
  const ids = new Set();
  const files = [];
  for (const [index, probe] of probes.entries()) {
    if (!isRecord(probe)) {
      throw new LaneDetectionError(`${sidecarName}.lanes.${lane}[${index}] must be an object.`);
    }
    const id = requireNonemptyString(probe.id, `${sidecarName}.lanes.${lane}[${index}].id`);
    const file = requireNonemptyString(
      probe.file,
      `${sidecarName}.lanes.${lane}[${index}].file`,
    );
    if (probe.verdict !== "correct") {
      throw new LaneDetectionError(
        `${sidecarName}.lanes.${lane}[${index}].verdict must be exactly "correct" for aggregate admission; received ${JSON.stringify(probe.verdict)}.`,
      );
    }
    if (ids.has(id)) {
      throw new LaneDetectionError(`${sidecarName}.lanes.${lane} repeats probe id ${JSON.stringify(id)}.`);
    }
    ids.add(id);
    files.push(file);
  }
  return files;
}

function resolveProbeSourceFile(fixtureRoot, declaredProbeFile, sidecarName, lane) {
  const portablePath = declaredProbeFile.replaceAll("\\", "/");
  if (
    portablePath.startsWith("/") ||
    portablePath.startsWith("//") ||
    /^[A-Za-z]:\//u.test(portablePath)
  ) {
    throw new LaneDetectionError(
      `${sidecarName}.lanes.${lane} probe file must be fixture-relative: ${declaredProbeFile}`,
    );
  }
  const sourceFile = resolve(fixtureRoot, ...portablePath.split("/"));
  if (!pathIsInsideOrEqual(fixtureRoot, sourceFile)) {
    throw new LaneDetectionError(
      `${sidecarName}.lanes.${lane} probe file escapes its fixture lexically: ${declaredProbeFile}`,
    );
  }
  return sourceFile;
}

async function authenticateProbeSourceFile(input) {
  if (!pathIsInsideOrEqual(input.repoRoot, input.sourceFile)) {
    throw new LaneDetectionError(
      `${input.sidecarName}.lanes.${input.lane} probe file escapes the repository lexically: ${input.declaredProbeFile}`,
    );
  }
  await requireNonSymbolicPath(
    input.repoRoot,
    input.sourceFile,
    `${input.sidecarName}.lanes.${input.lane} probe file ${input.declaredProbeFile}`,
    "file",
  );
  const sourceRealPath = await realpath(input.sourceFile);
  if (
    !pathIsInsideOrEqual(input.fixtureRealRoot, sourceRealPath) ||
    !pathIsInsideOrEqual(input.repoRealRoot, sourceRealPath)
  ) {
    throw new LaneDetectionError(
      `${input.sidecarName}.lanes.${input.lane} probe file realpath escapes its fixture or repository: ${input.declaredProbeFile} -> ${sourceRealPath}`,
    );
  }
}

async function collectSnapshotFiles(snapshotRoot) {
  const files = [];
  const visit = async (directory) => {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      const entryPath = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new LaneDetectionError(`Lane snapshot inventory must not contain symbolic links: ${entryPath}`);
      }
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(SNAPSHOT_SUFFIX)) {
        files.push(entryPath);
      }
    }
  };
  await visit(snapshotRoot);
  return files.sort(compareText);
}

async function readJsonObject(filePath, label) {
  let value;
  try {
    value = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new LaneDetectionError(
      `Unable to read ${label} ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isRecord(value)) throw new LaneDetectionError(`${label} must contain a JSON object: ${filePath}`);
  return value;
}

async function requireRegularFile(filePath, label) {
  let record;
  try {
    record = await lstat(filePath);
  } catch (error) {
    throw new LaneDetectionError(`Missing ${label} ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!record.isFile() || record.isSymbolicLink()) {
    throw new LaneDetectionError(`${label} must be a regular non-symbolic file: ${filePath}`);
  }
}

async function requireDirectory(directory, label) {
  let record;
  try {
    record = await lstat(directory);
  } catch (error) {
    throw new LaneDetectionError(`Missing ${label} ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!record.isDirectory() || record.isSymbolicLink()) {
    throw new LaneDetectionError(`${label} must be a regular non-symbolic directory: ${directory}`);
  }
}

async function requireNonSymbolicPath(root, target, label, finalKind) {
  const relativePath = relative(root, target);
  if (!pathIsInsideOrEqual(root, target)) {
    throw new LaneDetectionError(`${label} escapes ${root}: ${target}`);
  }
  const segments = relativePath === "" ? [] : relativePath.split(/[\\/]/u);
  let current = root;
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    let record;
    try {
      record = await lstat(current);
    } catch (error) {
      throw new LaneDetectionError(
        `Missing ${label} path ${current}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (record.isSymbolicLink()) {
      throw new LaneDetectionError(`${label} must not traverse a symbolic link: ${current}`);
    }
    const isFinal = index === segments.length - 1;
    if (!isFinal && !record.isDirectory()) {
      throw new LaneDetectionError(`${label} ancestor must be a directory: ${current}`);
    }
    if (isFinal) {
      if (finalKind === "file" && !record.isFile()) {
        throw new LaneDetectionError(`${label} must be a regular file: ${current}`);
      }
      if (finalKind === "directory" && !record.isDirectory()) {
        throw new LaneDetectionError(`${label} must be a directory: ${current}`);
      }
    }
  }
  if (segments.length === 0) {
    if (finalKind === "file") await requireRegularFile(target, label);
    else await requireDirectory(target, label);
  }
}

function requireNonemptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LaneDetectionError(`${label} must be a nonempty string.`);
  }
  return value;
}

function positiveDuration(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new LaneDetectionError(`${label} must be a positive integer number of milliseconds.`);
  }
  return value;
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pathIsInsideOrEqual(parent, child) {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath === ""
    || (!isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`));
}

function normalizePathKey(filePath) {
  const normalized = resolve(filePath);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function toDisplayPath(repoRoot, filePath) {
  const relativePath = relative(repoRoot, filePath);
  return (relativePath === "" ? "." : relativePath).replaceAll("\\", "/");
}

function boundedTail(value) {
  const text = String(value);
  if (text.length <= laneDetectionFailureOutputLimit) return text;
  const omitted = text.length - laneDetectionFailureOutputLimit;
  return `[... ${omitted} earlier character(s) omitted ...]\n${text.slice(-laneDetectionFailureOutputLimit)}`;
}

async function resolveWithin(promise, milliseconds, timeoutValue) {
  let timeoutId;
  const timeout = new Promise((resolveTimeout) => {
    timeoutId = setTimeout(() => resolveTimeout(timeoutValue), milliseconds);
  });
  const result = await Promise.race([promise, timeout]);
  clearTimeout(timeoutId);
  return result;
}

function usage() {
  return [
    "Usage: node packages/lane-harness/scripts/detect-lanes.mjs [--plan]",
    "",
    "Without --plan, runs every admitted fixture/lane pair in snapshot detection mode.",
    "--plan validates the complete probe/snapshot inventory without launching the language server.",
    "Snapshot update and single-probe arguments are intentionally unsupported.",
  ].join("\n");
}

async function main() {
  const options = parseLaneDetectionArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const plan = await discoverLaneDetectionPlan();
  if (options.planOnly) {
    console.log(JSON.stringify(laneDetectionPlanReceipt(plan), null, 2));
    return;
  }
  const summary = await executeLaneDetectionPlan(plan);
  console.log(`Aggregate lane detection matched ${summary.pairs} pair(s) and ${summary.probes} probe(s).`);
}

const invokedPath = process.argv[1] == null ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
