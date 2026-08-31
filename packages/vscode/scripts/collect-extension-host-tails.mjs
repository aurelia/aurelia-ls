#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { minimumVSCodeVersion } from "./extension-host-version-contract.mjs";
import {
  invocationSchemaVersion as electronInvocationSchemaVersion,
  resultSchemaVersion as electronResultSchemaVersion,
} from "./run-extension-host-tail-sample.mjs";

export const sampleSchemaVersion = "aurelia-ls/extension-host-tail-sample/v4";
export const processSchemaVersion = "aurelia-ls/extension-host-tail-process/v6";
export const cohortSchemaVersion = "aurelia-ls/extension-host-tail-cohort/v6";
export const windowsClientLogPathCharacterBudget = 259;
export const outerElectronProcessPolicy = Object.freeze({
  timeoutMilliseconds: 60_000,
  cleanupGraceMilliseconds: 10_000,
  strategy: "isolated Node helper with exact-PID process-tree termination",
  windowsCleanup: "taskkill /PID <exact child pid> /T /F",
  posixCleanup: "SIGKILL to detached child process group",
});
export const bundleAuthenticationPolicy = Object.freeze({
  authoritativeSource: "clean tracked HEAD",
  buildCommands: Object.freeze([
    "pnpm exec tsc -b --force packages/semantic-runtime packages/language-server packages/vscode",
    "pnpm --filter aurelia-2 run bundle",
  ]),
  buildTimeoutMilliseconds: 600_000,
  freezeBoundary: "post-build pre-acquisition through post-acquisition",
  frozenInputs: Object.freeze([
    "tracked HEAD/tree/status/submodules",
    "complete VS Code dist output",
    "pressure fixture",
    "collector, Electron helper, permanent runner, and tail suite",
    "resolved aurelia and @aurelia/router workspace dependency package roots",
  ]),
});
export const diagnosticReschedulePolicy = Object.freeze({
  suiteTriggerCount: 1,
  suiteRetryCount: 0,
  receiptTimeoutMilliseconds: 25_000,
  hostInclusiveMaximumMillisecondsExclusive: 30_000,
  timeoutBoundary: "before sole suite trigger through full response",
  attemptCardinalityLimit: null,
  sequence: "[request, authenticated Canceled failure]* then [request, full response]",
  timing: "first request through final response",
  cancellationCountAcceptanceThreshold: null,
});
export const journeys = Object.freeze([
  "cold-full-diagnostics",
  "first-completion",
]);
export const laneDefinitions = Object.freeze({
  "current-stable": Object.freeze({
    requestedVersion: "stable",
    authoritativeSamplesPerJourney: 20,
  }),
  minimum: Object.freeze({
    requestedVersion: minimumVSCodeVersion,
    authoritativeSamplesPerJourney: 5,
  }),
});
export const hostLocalReviewGuards = Object.freeze([
  guard("current-stable", "cold-full-diagnostics", "requestLocalMilliseconds", "median", "<=", 5_000),
  guard("current-stable", "cold-full-diagnostics", "requestLocalMilliseconds", "p95NearestRank", "<=", 7_500),
  guard("current-stable", "cold-full-diagnostics", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
  guard("current-stable", "cold-full-diagnostics", "launchToProviderStartMilliseconds", "p95NearestRank", "<=", 10_000),
  guard("current-stable", "cold-full-diagnostics", "hostInclusiveMilliseconds", "max", "<", 30_000),
  guard("current-stable", "first-completion", "requestLocalMilliseconds", "median", "<=", 2_500),
  guard("current-stable", "first-completion", "requestLocalMilliseconds", "p95NearestRank", "<=", 4_000),
  guard("current-stable", "first-completion", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
  guard("current-stable", "first-completion", "launchToProviderStartMilliseconds", "p95NearestRank", "<=", 10_000),
  guard("current-stable", "first-completion", "hostInclusiveMilliseconds", "max", "<", 30_000),
  guard("current-stable", "first-completion", "completionSettledHostInclusiveMilliseconds", "max", "<", 30_000),
  guard("minimum", "cold-full-diagnostics", "requestLocalMilliseconds", "median", "<=", 5_000),
  guard("minimum", "cold-full-diagnostics", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
  guard("minimum", "cold-full-diagnostics", "hostInclusiveMilliseconds", "max", "<", 30_000),
  guard("minimum", "first-completion", "requestLocalMilliseconds", "median", "<=", 2_500),
  guard("minimum", "first-completion", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
  guard("minimum", "first-completion", "hostInclusiveMilliseconds", "max", "<", 30_000),
  guard("minimum", "first-completion", "completionSettledHostInclusiveMilliseconds", "max", "<", 30_000),
]);

const latencyGuardScope =
  "preregistered host-local review guards for this repository-and-machine baseline; not universal product SLOs";
const clientLogFileName = "Aurelia LS (Client).log";
const extensionHostLogFileName = "exthost.log";
const aureliaActivationLogPrefix =
  "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2,";
const acceptedWorkspaceContainsActivationEvents = Object.freeze([
  "workspaceContains:node_modules/aurelia/package.json",
  "workspaceContains:node_modules/@aurelia/runtime-html/package.json",
]);
const projectedVSCodeLogSession = "YYYYMMDDTHHMMSS";
const workerFaultMarkers = Object.freeze([
  "[worker-transport.client] Worker stderr",
  "[worker-transport.client] Worker transport failed",
  "[worker-transport.client] Worker transport exited abnormally",
  "[worker-transport.client] Worker transport exceeded its shutdown grace",
]);

function guard(lane, journey, metric, statistic, operator, limit) {
  return Object.freeze({ lane, journey, metric, statistic, operator, limit });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionDevelopmentPath = path.resolve(__dirname, "..");
const extensionTestsPath = path.join(
  extensionDevelopmentPath,
  "test",
  "extension-host",
  "tail-product-support.cjs",
);
const fixtureName = "app-pattern-compact-routed-catalog-storefront";
const sourceWorkspace = path.join(
  repoRoot,
  "packages",
  "semantic-runtime",
  "fixtures",
  "pressure",
  fixtureName,
);
const semanticRuntimeNodeModules = path.join(
  repoRoot,
  "packages",
  "semantic-runtime",
  "node_modules",
);
const requiredWorkspaceModules = Object.freeze(["aurelia", "@aurelia/router"]);
const evidenceParent = path.join(repoRoot, ".temp", "stage4-extension-host-tails");
const collectorPath = fileURLToPath(import.meta.url);
const permanentRunnerPath = path.join(__dirname, "run-extension-host-tests.mjs");
const electronHelperPath = path.join(__dirname, "run-extension-host-tail-sample.mjs");
const extensionDistPath = path.join(extensionDevelopmentPath, "dist");
const usage = [
  "Usage: node scripts/collect-extension-host-tails.mjs",
  "[--lane=all|current-stable|minimum]",
  "[--cohort=<safe-name>]",
  "[--smoke]",
  "[--plan]",
].join(" ");

export function parseCollectorArguments(args) {
  let lane = "all";
  let laneSelected = false;
  let cohort;
  let smoke = false;
  let planOnly = false;

  for (const argument of args) {
    if (argument.startsWith("--lane=")) {
      if (laneSelected) fail("lane may only be selected once.");
      laneSelected = true;
      lane = argument.slice("--lane=".length);
      continue;
    }
    if (argument.startsWith("--cohort=")) {
      if (cohort !== undefined) fail("cohort may only be selected once.");
      cohort = argument.slice("--cohort=".length);
      continue;
    }
    if (argument === "--smoke") {
      if (smoke) fail("--smoke may only be provided once.");
      smoke = true;
      continue;
    }
    if (argument === "--plan") {
      if (planOnly) fail("--plan may only be provided once.");
      planOnly = true;
      continue;
    }
    fail(`Unknown argument: ${argument}`);
  }

  if (lane !== "all" && !Object.hasOwn(laneDefinitions, lane)) {
    fail(`Unknown host-tail lane: ${lane}`);
  }
  if (cohort !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(cohort)) {
    fail("cohort must be 1-80 safe filename characters and start with a letter or digit.");
  }
  if (!planOnly && cohort === undefined) {
    fail("--cohort is required unless --plan is selected.");
  }

  const selectedLanes = lane === "all" ? Object.keys(laneDefinitions) : [lane];
  const effectiveCohort = `${cohort ?? "<required-at-execution>"}${smoke ? "-smoke" : ""}`;
  const rows = buildAcquisitionRows(selectedLanes, smoke);
  return Object.freeze({
    cliArguments: Object.freeze([...args]),
    lane,
    lanes: Object.freeze(selectedLanes),
    cohort: cohort ?? null,
    effectiveCohort,
    smoke,
    authoritative: !smoke,
    planOnly,
    transport: "worker",
    fixture: fixtureName,
    rows,
    launchCount: rows.length,
    versionResolutionCount: selectedLanes.length,
    outputRoot: path.join(evidenceParent, effectiveCohort),
  });
}

export function buildAcquisitionRows(selectedLanes, smoke) {
  const rows = [];
  let sequence = 0;
  for (const lane of selectedLanes) {
    const definition = laneDefinitions[lane];
    if (definition == null) throw new Error(`Unknown host-tail lane: ${lane}`);
    const samplesPerJourney = smoke ? 1 : definition.authoritativeSamplesPerJourney;
    for (let pair = 1; pair <= samplesPerJourney; pair += 1) {
      const pairJourneys = pair % 2 === 1 ? journeys : [journeys[1], journeys[0]];
      for (let index = 0; index < pairJourneys.length; index += 1) {
        sequence += 1;
        const journey = pairJourneys[index];
        rows.push(Object.freeze({
          lane,
          requestedVersion: definition.requestedVersion,
          samplesPerJourney,
          pair,
          pairPosition: index + 1,
          sequence,
          journey,
          artifactName: [
            lane,
            `pair-${pad(pair)}`,
            `position-${index + 1}`,
            journey,
          ].join("-"),
        }));
      }
    }
  }
  return Object.freeze(rows);
}

export function publicPlan(plan) {
  return {
    schemaVersion: "aurelia-ls/extension-host-tail-plan/v4",
    lanes: plan.lanes.map((lane) => ({
      lane,
      requestedVersion: laneDefinitions[lane].requestedVersion,
      samplesPerJourney: plan.smoke ? 1 : laneDefinitions[lane].authoritativeSamplesPerJourney,
    })),
    journeys,
    transport: plan.transport,
    fixture: plan.fixture,
    smoke: plan.smoke,
    authoritative: plan.authoritative,
    order: "serial counterbalanced pairs; odd=diagnostics/completion, even=completion/diagnostics",
    launchCount: plan.launchCount,
    versionResolutionCount: plan.versionResolutionCount,
    effectiveCohort: plan.effectiveCohort,
    cliArguments: plan.cliArguments,
    diagnosticReschedulePolicy,
    outerElectronProcessPolicy,
    bundleAuthenticationPolicy,
    latencyGuardScope,
    hostLocalReviewGuards: hostLocalReviewGuards.filter((entry) => plan.lanes.includes(entry.lane)),
    rows: plan.rows,
  };
}

export async function collectExtensionHostTails(plan, dependencies = {}) {
  if (plan.planOnly) return publicPlan(plan);
  const outputRoot = dependencies.outputRoot ?? plan.outputRoot;
  const pathBudget = assertWindowsClientLogPathBudget(
    plan,
    outputRoot,
    dependencies.platform ?? process.platform,
  );
  const injectedElectron = dependencies.electron ?? null;
  const electron = injectedElectron ?? await import("@vscode/test-electron");
  const prepareWorkspace = dependencies.prepareWorkspace ?? prepareSampleWorkspace;
  const captureEnvironment = dependencies.captureEnvironment ?? captureEnvironmentSnapshot;
  const assertReady = dependencies.assertReady ?? assertMeasurementReady;
  const authenticateInputs = dependencies.authenticateInputs ?? authenticateHeadBundles;
  const captureFrozenInputs = dependencies.captureFrozenInputs ?? captureFrozenMeasurementInputs;
  const launchElectron = dependencies.launchElectron
    ?? (injectedElectron == null
      ? runElectronSampleBounded
      : (input) => runElectronSampleInProcess(input, electron));

  await assertReady(outputRoot, plan);
  const buildAuthenticationRaw = await authenticateInputs({ plan, outputRoot });
  const frozenBefore = await captureFrozenInputs();
  if (
    buildAuthenticationRaw?.outputs != null
    && stableJson(buildAuthenticationRaw.outputs) !== stableJson(frozenBefore?.outputs?.extensionDist)
  ) {
    throw new Error("IDE build outputs changed before the host-tail acquisition freeze boundary.");
  }
  if (plan.authoritative && buildAuthenticationRaw?.headAuthenticated !== true) {
    throw new Error("Authoritative host-tail acquisition did not authenticate its bundles to clean HEAD.");
  }
  mkdirSync(outputRoot, { recursive: true });
  const startedAt = new Date().toISOString();
  const resolutions = new Map();
  const captures = [];
  let buildAuthentication = null;
  let environment = null;
  let finalizationPromise = null;

  const finalize = (requestedStatus) => {
    finalizationPromise ??= (async () => {
      const frozenAfter = await captureFrozenInputs();
      const inputIntegrity = compareFrozenMeasurementInputs(frozenBefore, frozenAfter);
      const status = inputIntegrity.status === "passed"
        ? requestedStatus
        : plan.smoke ? "discarded-smoke-invalid" : "invalid";
      const summary = buildCohortSummary({
        plan,
        outputRoot,
        startedAt,
        completedAt: new Date().toISOString(),
        environment,
        pathBudget,
        resolutions,
        captures,
        status,
        buildAuthentication,
        inputIntegrity,
      });
      writeJson(path.join(outputRoot, "summary.json"), summary);
      return summary;
    })();
    return finalizationPromise;
  };

  try {
    buildAuthentication = persistBuildAuthentication(outputRoot, buildAuthenticationRaw);
    environment = await captureEnvironment(outputRoot);
    for (const lane of plan.lanes) {
      const resolution = await resolveVSCode(lane, electron);
      resolutions.set(lane, resolution);
      for (const row of plan.rows.filter((candidate) => candidate.lane === lane)) {
        process.stdout.write(
          `[aurelia-host-tail] ${lane} pair ${row.pair}/${row.samplesPerJourney} `
            + `position ${row.pairPosition} ${row.journey}\n`,
        );
        const workspace = prepareWorkspace(row, outputRoot);
        const capture = await runSample({
          row,
          resolution,
          workspace,
          electron,
          launchElectron,
        });
        captures.push(capture);
        persistCapture(capture);
        if (capture.validationIssues.length > 0) {
          throw new Error(
            `Host-tail cohort is invalid at ${row.artifactName}; retained without replacement: `
              + capture.validationIssues.join("; "),
          );
        }
      }
    }
  } catch (error) {
    try {
      await finalize(plan.smoke ? "discarded-smoke-invalid" : "invalid");
    } catch (finalizationError) {
      throw new AggregateError(
        [error, finalizationError],
        `${error instanceof Error ? error.message : String(error)}; `
          + `host-tail invalid-evidence finalization also failed: `
          + `${finalizationError instanceof Error ? finalizationError.message : String(finalizationError)}`,
        { cause: error },
      );
    }
    throw error;
  }

  const summary = await finalize(plan.smoke ? "discarded-smoke" : "valid");
  if (summary.inputIntegrity.status !== "passed") {
    throw new Error(
      `Host-tail acquisition inputs drifted; retained invalid cohort: `
        + summary.inputIntegrity.validationIssues.join("; "),
    );
  }
  return summary;
}

async function resolveVSCode(lane, electron) {
  const reports = [];
  const errors = [];
  const requestedVersion = laneDefinitions[lane].requestedVersion;
  const vscodeExecutablePath = await electron.downloadAndUnzipVSCode({
    version: requestedVersion,
    extensionDevelopmentPath,
    reporter: {
      report: (report) => reports.push(report),
      error: (error) => errors.push(error instanceof Error ? error.message : String(error)),
    },
  });
  const resolvedRows = reports.filter((report) =>
    report.stage === electron.ProgressReportStage.ResolvedVersion);
  if (resolvedRows.length !== 1) {
    throw new Error(
      `VS Code ${lane} resolution reported ${resolvedRows.length} exact versions; expected one.`,
    );
  }
  if (errors.length > 0) {
    throw new Error(`VS Code ${lane} resolution reported errors: ${errors.join("; ")}`);
  }
  const resolvedVersion = resolvedRows[0].version;
  assertResolvedVersion(lane, resolvedVersion);
  return Object.freeze({
    lane,
    requestedVersion,
    resolvedVersion,
    vscodeExecutablePath,
    progressStages: reports.map((report) => report.stage),
  });
}

function assertResolvedVersion(lane, version) {
  const actual = parseStableVersion(version, `${lane} resolved version`);
  const minimum = parseStableVersion(minimumVSCodeVersion, "minimum VS Code version");
  if (lane === "minimum" && version !== minimumVSCodeVersion) {
    throw new Error(`Minimum lane resolved ${version}; expected exactly ${minimumVSCodeVersion}.`);
  }
  if (lane === "current-stable" && compareVersions(actual, minimum) < 0) {
    throw new Error(`Current stable ${version} is below ${minimumVSCodeVersion}.`);
  }
}

async function runSample({ row, resolution, workspace, launchElectron }) {
  const launchEpochMilliseconds = Date.now();
  const startedAt = new Date(launchEpochMilliseconds).toISOString();
  const started = performance.now();
  const extensionTestsEnv = sampleEnvironment({
    row,
    resolution,
    workspace,
    launchEpochMilliseconds,
  });
  const launchArgs = [
    workspace.testWorkspace,
    `--user-data-dir=${workspace.userDataDirectory}`,
    `--extensions-dir=${workspace.extensionsDirectory}`,
    "--disable-extensions",
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
  ];
  const invocation = {
    vscodeExecutablePath: resolution.vscodeExecutablePath,
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs,
    extensionTestsEnv,
  };

  let execution;
  try {
    execution = await launchElectron({ invocation, workspace });
  } catch (error) {
    execution = {
      runTestsReturn: null,
      exitCode: typeof error?.code === "number" ? error.code : null,
      signal: typeof error?.signal === "string" ? error.signal : null,
      runTestsError: errorEvidence(error),
      stdout: "",
      stderr: "",
      outerProcess: {
        mode: "launch-failed-before-process-evidence",
        timeoutMilliseconds: outerElectronProcessPolicy.timeoutMilliseconds,
        timedOut: false,
        cleanup: null,
      },
    };
  }

  const completedAt = new Date().toISOString();
  const wallMilliseconds = performance.now() - started;
  const {
    runTestsReturn,
    exitCode,
    signal,
    runTestsError,
    stdout,
    stderr,
    outerProcess,
  } = execution;
  const parsed = readSampleReport(workspace.reportPath);
  const clientLog = readClientLogEvidence(workspace);
  const extensionHostLog = readExtensionHostLogEvidence(workspace);
  const validationIssues = validateCapture({
    row,
    resolution,
    workspace,
    exitCode,
    signal,
    runTestsError,
    parsed,
    clientLog,
    extensionHostLog,
    launchEpochMilliseconds,
  });

  return {
    row,
    resolution,
    workspace,
    process: {
      schemaVersion: processSchemaVersion,
      startedAt,
      completedAt,
      wallMilliseconds,
      runTestsReturn,
      exitCode,
      signal,
      runTestsError,
      invocation,
      outerProcess,
    },
    stdout,
    stderr,
    clientLog,
    extensionHostLog,
    reportRaw: parsed.raw,
    report: parsed.report,
    reportParseIssue: parsed.issue,
    validationIssues,
  };
}

async function runElectronSampleInProcess({ invocation }, electron) {
  const stdoutCapture = captureWritable();
  const stderrCapture = captureWritable();
  let runTestsReturn = null;
  let exitCode = null;
  let signal = null;
  let runTestsError = null;
  try {
    runTestsReturn = await electron.runTests({
      ...invocation,
      stdout: stdoutCapture.stream,
      stderr: stderrCapture.stream,
    });
    exitCode = runTestsReturn;
  } catch (error) {
    exitCode = typeof error?.code === "number" ? error.code : null;
    signal = typeof error?.signal === "string" ? error.signal : null;
    runTestsError = errorEvidence(error);
  }
  return {
    runTestsReturn,
    exitCode,
    signal,
    runTestsError,
    stdout: stdoutCapture.text(),
    stderr: stderrCapture.text(),
    outerProcess: {
      mode: "injected-in-process-test-seam",
      timeoutMilliseconds: outerElectronProcessPolicy.timeoutMilliseconds,
      timedOut: false,
      cleanup: null,
    },
  };
}

export async function runElectronSampleBounded({ invocation, workspace }, options = {}) {
  const invocationPath = workspace.electronInvocationPath
    ?? path.join(workspace.sampleRoot, "electron.invocation.json");
  const resultPath = workspace.electronResultPath
    ?? path.join(workspace.sampleRoot, "electron.result.json");
  assertInside(workspace.sampleRoot, invocationPath);
  assertInside(workspace.sampleRoot, resultPath);
  writeFileSync(invocationPath, `${JSON.stringify({
    schemaVersion: electronInvocationSchemaVersion,
    resultPath,
    invocation,
  }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  const bounded = await runBoundedChildProcess({
    command: process.execPath,
    args: [electronHelperPath, invocationPath],
    cwd: repoRoot,
    env: process.env,
    timeoutMilliseconds: options.timeoutMilliseconds
      ?? outerElectronProcessPolicy.timeoutMilliseconds,
    cleanupGraceMilliseconds: options.cleanupGraceMilliseconds
      ?? outerElectronProcessPolicy.cleanupGraceMilliseconds,
    platform: options.platform ?? process.platform,
    spawnProcess: options.spawnProcess,
    killTree: options.killTree,
  });
  const helper = readElectronHelperResult(resultPath);
  let runTestsError = helper.result?.runTestsError ?? null;
  if (bounded.timedOut) {
    runTestsError = {
      name: "ExtensionHostTailOuterTimeoutError",
      message: `Extension Host Electron process tree exceeded ${bounded.timeoutMilliseconds}ms.`,
      stack: null,
    };
  } else if (bounded.interruptedSignal != null) {
    runTestsError = {
      name: "ExtensionHostTailInterruptedError",
      message: `Extension Host Electron process tree was interrupted by ${bounded.interruptedSignal}.`,
      stack: null,
    };
  } else if (bounded.spawnError != null) {
    runTestsError = bounded.spawnError;
  } else if (bounded.exitCode !== 0) {
    runTestsError = {
      name: "ExtensionHostTailHelperProcessError",
      message: `Extension Host Electron helper exited with ${String(bounded.exitCode ?? bounded.signal)}.`,
      stack: null,
    };
  } else if (helper.issue != null) {
    runTestsError = {
      name: "ExtensionHostTailHelperEvidenceError",
      message: helper.issue,
      stack: null,
    };
  }

  return {
    runTestsReturn: helper.result?.runTestsReturn ?? null,
    exitCode: helper.result?.exitCode ?? bounded.exitCode,
    signal: helper.result?.signal ?? bounded.signal,
    runTestsError,
    stdout: bounded.stdout,
    stderr: bounded.stderr,
    outerProcess: {
      mode: "bounded-isolated-node-helper",
      helperPath: electronHelperPath,
      helperInvocationPath: invocationPath,
      helperInvocationSha256: await fileSha256(invocationPath),
      helperResultPath: helper.result == null ? null : resultPath,
      helperResultSha256: helper.result == null ? null : await fileSha256(resultPath),
      helperResultIssue: helper.issue,
      pid: bounded.pid,
      wallMilliseconds: bounded.wallMilliseconds,
      timeoutMilliseconds: bounded.timeoutMilliseconds,
      timedOut: bounded.timedOut,
      interruptedSignal: bounded.interruptedSignal,
      helperExitCode: bounded.exitCode,
      helperSignal: bounded.signal,
      cleanup: bounded.cleanup,
    },
  };
}

export async function runBoundedChildProcess(options) {
  const timeoutMilliseconds = options.timeoutMilliseconds;
  const cleanupGraceMilliseconds = options.cleanupGraceMilliseconds ?? 10_000;
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
    throw new Error("Bounded child timeout must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(cleanupGraceMilliseconds) || cleanupGraceMilliseconds <= 0) {
    throw new Error("Bounded child cleanup grace must be a positive safe integer.");
  }
  const platform = options.platform ?? process.platform;
  const spawnProcess = options.spawnProcess ?? spawn;
  const killTree = options.killTree ?? terminateProcessTree;
  const started = performance.now();
  const stdoutChunks = [];
  const stderrChunks = [];
  const child = spawnProcess(options.command, options.args ?? [], {
    cwd: options.cwd,
    env: options.env,
    detached: platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout?.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

  const processOutcome = new Promise((resolve) => {
    child.once("error", (error) => resolve({ kind: "spawn-error", error }));
    child.once("close", (exitCode, signal) => resolve({ kind: "closed", exitCode, signal }));
  });
  let timeoutHandle;
  const timeoutOutcome = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ kind: "timeout" }), timeoutMilliseconds);
  });
  let interruptResolve;
  const interruptOutcome = new Promise((resolve) => {
    interruptResolve = resolve;
  });
  const signalHandlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => interruptResolve({ kind: "interrupted", signal });
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }

  let first;
  let cleanup = null;
  let final;
  try {
    first = await Promise.race([processOutcome, timeoutOutcome, interruptOutcome]);
    final = first;
    if (first.kind === "timeout" || first.kind === "interrupted") {
      const cleanupStarted = performance.now();
      let killTreeTimeoutHandle;
      const killTreeOutcome = Promise.resolve()
        .then(() => killTree(child.pid, platform, cleanupGraceMilliseconds))
        .then(
          (value) => ({ kind: "tree-termination-completed", value }),
          (error) => ({ kind: "tree-termination-failed", error }),
        );
      const killTreeTimeout = new Promise((resolve) => {
        killTreeTimeoutHandle = setTimeout(
          () => resolve({ kind: "tree-termination-timeout" }),
          cleanupGraceMilliseconds,
        );
        killTreeTimeoutHandle.unref?.();
      });
      const killTreeResult = await Promise.race([killTreeOutcome, killTreeTimeout]);
      clearTimeout(killTreeTimeoutHandle);
      if (killTreeResult.kind === "tree-termination-completed") {
        cleanup = killTreeResult.value;
      } else if (killTreeResult.kind === "tree-termination-failed") {
        cleanup = {
          status: "failed",
          strategy: "process-tree-termination",
          pid: child.pid ?? null,
          issue: errorEvidence(killTreeResult.error).message,
        };
      } else {
        cleanup = {
          status: "failed",
          strategy: "process-tree-termination",
          pid: child.pid ?? null,
          issue: `Process-tree termination did not settle within ${cleanupGraceMilliseconds}ms.`,
        };
      }
      const remainingCleanupGrace = Math.max(
        0,
        cleanupGraceMilliseconds - (performance.now() - cleanupStarted),
      );
      let cleanupGraceHandle;
      const cleanupGraceOutcome = new Promise((resolve) => {
        cleanupGraceHandle = setTimeout(
          () => resolve({ kind: "cleanup-grace-expired" }),
          remainingCleanupGrace,
        );
        cleanupGraceHandle.unref?.();
      });
      const cleanupWait = await Promise.race([
        processOutcome,
        cleanupGraceOutcome,
      ]);
      clearTimeout(cleanupGraceHandle);
      final = cleanupWait;
      if (cleanupWait.kind === "cleanup-grace-expired") {
        cleanup = {
          ...cleanup,
          status: "failed",
          issue: [
            cleanup?.issue,
            `Child process did not close within ${cleanupGraceMilliseconds}ms after tree termination.`,
          ].filter((value) => value != null && value !== "").join(" "),
        };
      }
    }
  } finally {
    clearTimeout(timeoutHandle);
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
  }

  const spawnError = final.kind === "spawn-error" ? errorEvidence(final.error) : null;
  return {
    pid: child.pid ?? null,
    wallMilliseconds: performance.now() - started,
    timeoutMilliseconds,
    timedOut: first.kind === "timeout",
    interruptedSignal: first.kind === "interrupted" ? first.signal : null,
    exitCode: final.kind === "closed" ? final.exitCode : null,
    signal: final.kind === "closed" ? final.signal : null,
    spawnError,
    cleanup,
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
  };
}

async function terminateProcessTree(pid, platform, timeoutMilliseconds = 10_000) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return { status: "failed", strategy: "none", issue: "Child process had no valid PID." };
  }
  try {
    if (platform === "win32") {
      const { execFile } = await import("node:child_process");
      await new Promise((resolve, reject) => {
        execFile(
          "taskkill.exe",
          ["/PID", String(pid), "/T", "/F"],
          { windowsHide: true, timeout: timeoutMilliseconds, killSignal: "SIGKILL" },
          (error) => error == null ? resolve() : reject(error),
        );
      });
      return { status: "passed", strategy: "windows-taskkill-tree", pid };
    }
    process.kill(-pid, "SIGKILL");
    return { status: "passed", strategy: "posix-process-group-sigkill", pid };
  } catch (error) {
    return {
      status: "failed",
      strategy: platform === "win32" ? "windows-taskkill-tree" : "posix-process-group-sigkill",
      pid,
      issue: error instanceof Error ? error.message : String(error),
    };
  }
}

function readElectronHelperResult(resultPath) {
  if (!existsSync(resultPath)) {
    return { result: null, issue: "Extension Host Electron helper produced no result evidence." };
  }
  try {
    const result = JSON.parse(readFileSync(resultPath, "utf8"));
    if (!isRecord(result) || result.schemaVersion !== electronResultSchemaVersion) {
      return { result: null, issue: "Extension Host Electron helper result schema drifted." };
    }
    return { result, issue: null };
  } catch (error) {
    return {
      result: null,
      issue: `Extension Host Electron helper result was not exact JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function errorEvidence(error) {
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack ?? null : null,
  };
}

export function sampleEnvironment({ row, resolution, workspace, launchEpochMilliseconds }) {
  return Object.freeze({
    AURELIA_LS_EXTENSION_HOST_TAIL_JOURNEY: row.journey,
    AURELIA_LS_EXTENSION_HOST_TAIL_REPORT_PATH: workspace.reportPath,
    AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE: workspace.workspaceRoot,
    AURELIA_LS_EXTENSION_HOST_TAIL_LAUNCH_EPOCH_MS: String(launchEpochMilliseconds),
    AURELIA_LS_EXTENSION_HOST_TAIL_LANE: row.lane,
    AURELIA_LS_EXTENSION_HOST_TAIL_REQUESTED_VERSION: row.requestedVersion,
    AURELIA_LS_EXTENSION_HOST_TAIL_RESOLVED_VERSION: resolution.resolvedVersion,
    AURELIA_LS_EXTENSION_HOST_TAIL_PAIR: String(row.pair),
    AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE: String(row.sequence),
    AURELIA_LS_EXTENSION_HOST_TAIL_PAIR_POSITION: String(row.pairPosition),
    AURELIA_LS_EXTENSION_HOST_OBSERVATION: "1",
    AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION: "1",
    AURELIA_LS_FORCE_IPC_TRANSPORT: "0",
    AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT: "worker",
  });
}

export function validateCapture(input) {
  const issues = [];
  if (input.exitCode !== 0) issues.push(`process exit code was ${String(input.exitCode)} instead of 0`);
  if (input.signal != null) issues.push(`process exited from signal ${input.signal}`);
  if (input.runTestsError != null) issues.push(`runTests failed: ${input.runTestsError.message}`);
  issues.push(...input.clientLog.validationIssues);
  issues.push(...input.extensionHostLog.validationIssues);
  if (input.parsed.issue != null) issues.push(input.parsed.issue);
  if (input.parsed.report != null) {
    issues.push(...validateSampleReport({
      report: input.parsed.report,
      row: input.row,
      resolution: input.resolution,
      workspace: input.workspace,
      launchEpochMilliseconds: input.launchEpochMilliseconds,
    }));
  }
  return Object.freeze(issues);
}

export function validateSampleReport({
  report,
  row,
  resolution,
  workspace,
  launchEpochMilliseconds,
}) {
  const issues = [];
  expectEqual(issues, report.schemaVersion, sampleSchemaVersion, "schemaVersion");
  expectEqual(issues, report.journey, row.journey, "journey");
  expectEqual(issues, report.lane, row.lane, "lane");
  expectEqual(issues, report.requestedVersion, row.requestedVersion, "requestedVersion");
  expectEqual(issues, report.resolvedVersion, resolution.resolvedVersion, "resolvedVersion");
  expectEqual(issues, report.actualVersion, resolution.resolvedVersion, "actualVersion");
  expectEqual(issues, report.transport, "worker", "transport");
  expectEqual(issues, report.pair, row.pair, "pair");
  expectEqual(issues, report.sequence, row.sequence, "sequence");
  expectEqual(issues, report.pairPosition, row.pairPosition, "pairPosition");
  if (!isRecord(report.method)) {
    issues.push("method must be an object");
  } else {
    expectEqual(
      issues,
      report.method.activation,
      "shipping-workspaceContains-eager-activation",
      "method.activation",
    );
    expectEqual(issues, report.method.activationMode, "auto", "method.activationMode");
    expectEqual(
      issues,
      report.method.activeAtTestEntry,
      true,
      "method.activeAtTestEntry",
    );
    expectEqual(
      issues,
      report.method.readiness,
      "already-active-api-readiness-check",
      "method.readiness",
    );
    expectEqual(
      issues,
      report.method.providerObservationScope,
      "test-entry-through-receipt",
      "method.providerObservationScope",
    );
    expectEqual(issues, report.method.targetUnopenedAtTestEntry, true, "method.targetUnopenedAtTestEntry");
    expectEqual(issues, report.method.targetUnshownAtTestEntry, true, "method.targetUnshownAtTestEntry");
    expectEqual(
      issues,
      report.method.zeroObservedDocumentProviderRequestsBeforeTrigger,
      true,
      "method.zeroObservedDocumentProviderRequestsBeforeTrigger",
    );
    validateDiagnosticReschedulePolicy(
      issues,
      report.method.diagnosticReschedulePolicy,
      "method.diagnosticReschedulePolicy",
    );
    for (const legacyField of [
      "zeroPriorDocumentProviderRequests",
      "extensionActiveAtTestEntry",
      "providerColdAtSuiteEntry",
      "zeroObservedDocumentProviderRequestsSinceTestEntry",
    ]) {
      if (Object.hasOwn(report.method, legacyField)) {
        issues.push(`method.${legacyField} is not permitted by the v4 sample schema`);
      }
    }
  }
  if (typeof report.workspace !== "string" || path.resolve(report.workspace) !== path.resolve(workspace.workspaceRoot)) {
    issues.push("workspace did not identify the exact isolated sample root");
  }
  expectFiniteNonNegative(issues, report.timing?.hostInclusiveMilliseconds, "timing.hostInclusiveMilliseconds");
  expectFiniteNonNegative(issues, report.timing?.requestLocalMilliseconds, "timing.requestLocalMilliseconds");
  expectEqual(
    issues,
    report.timing?.launchEpochMilliseconds,
    launchEpochMilliseconds,
    "timing.launchEpochMilliseconds",
  );
  const receipt = report.timing?.receiptEpochMilliseconds;
  expectFiniteNonNegative(issues, receipt, "timing.receiptEpochMilliseconds");
  if (Number.isFinite(receipt) && receipt < launchEpochMilliseconds) {
    issues.push("receipt preceded host launch");
  }
  validateDocumentIdentity(issues, report.document, workspace.workspaceRoot);
  validateTiming(issues, report.timing, launchEpochMilliseconds, row.journey);
  validateWitness(issues, report.witness, row.journey, report.document, report.timing);
  if (report.validation?.status !== "passed") issues.push("sample validation status was not passed");
  if (!Array.isArray(report.validation?.errors)) {
    issues.push("sample validation errors must be an array");
  } else if (report.validation.errors.length > 0) {
    issues.push(`sample reported validation errors: ${report.validation.errors.join("; ")}`);
  }
  expectEqual(issues, report.error, null, "error");
  return issues;
}

function validateDiagnosticReschedulePolicy(issues, policy, label) {
  if (!isRecord(policy)) {
    issues.push(`${label} must be an object`);
    return;
  }
  const expectedKeys = Object.keys(diagnosticReschedulePolicy).sort();
  const actualKeys = Object.keys(policy).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    issues.push(`${label} keys did not match the preregistered policy`);
  }
  for (const [field, expected] of Object.entries(diagnosticReschedulePolicy)) {
    expectEqual(issues, policy[field], expected, `${label}.${field}`);
  }
}

function validateDocumentIdentity(issues, document, workspaceRoot) {
  if (!isRecord(document)) {
    issues.push("document must identify the measured source");
    return;
  }
  const expectedRelativePath = "src/routes/service-plan-list-route.html";
  expectEqual(issues, document.relativePath, expectedRelativePath, "document.relativePath");
  expectEqual(issues, document.version, 1, "document.version");
  try {
    const actualPath = fileURLToPath(document.uri);
    const expectedPath = path.join(workspaceRoot, ...expectedRelativePath.split("/"));
    if (path.relative(path.resolve(actualPath), path.resolve(expectedPath)) !== "") {
      issues.push("document.uri did not identify the exact measured source");
    }
  } catch {
    issues.push("document.uri was not a file URI");
  }
}

function validateTiming(issues, timing, launchEpochMilliseconds, journey) {
  if (!isRecord(timing)) {
    issues.push("timing must be an object");
    return;
  }
  for (const legacyField of [
    "activationStartEpochMilliseconds",
    "activationCompleteEpochMilliseconds",
    "activationStartMonotonicMilliseconds",
    "activationCompleteMonotonicMilliseconds",
    "activationMilliseconds",
    "suiteReadinessAwaitStartEpochMilliseconds",
    "suiteReadinessAwaitCompleteEpochMilliseconds",
    "suiteReadinessAwaitStartMonotonicMilliseconds",
    "suiteReadinessAwaitCompleteMonotonicMilliseconds",
    "suiteReadinessAwaitMilliseconds",
  ]) {
    if (Object.hasOwn(timing, legacyField)) {
      issues.push(`timing.${legacyField} is not permitted by the v4 sample schema`);
    }
  }
  for (const field of [
    "testEntryEpochMilliseconds",
    "readinessStartEpochMilliseconds",
    "readinessCompleteEpochMilliseconds",
    "triggerEpochMilliseconds",
    "requestEpochMilliseconds",
    "receiptEpochMilliseconds",
    "testEntryMonotonicMilliseconds",
    "readinessStartMonotonicMilliseconds",
    "readinessCompleteMonotonicMilliseconds",
    "triggerMonotonicMilliseconds",
    "requestMonotonicMilliseconds",
    "receiptMonotonicMilliseconds",
    "readinessWaitMilliseconds",
    "requestLocalMilliseconds",
    "hostInclusiveMilliseconds",
  ]) {
    expectFiniteNonNegative(issues, timing[field], `timing.${field}`);
  }
  if (journey === "first-completion") {
    expectFiniteNonNegative(
      issues,
      timing.completionSettledEpochMilliseconds,
      "timing.completionSettledEpochMilliseconds",
    );
    expectFiniteNonNegative(
      issues,
      timing.completionSettledMonotonicMilliseconds,
      "timing.completionSettledMonotonicMilliseconds",
    );
    expectFiniteNonNegative(
      issues,
      timing.completionSettledHostInclusiveMilliseconds,
      "timing.completionSettledHostInclusiveMilliseconds",
    );
  }
  const epochOrder = [
    launchEpochMilliseconds,
    timing.testEntryEpochMilliseconds,
    timing.readinessStartEpochMilliseconds,
    timing.readinessCompleteEpochMilliseconds,
    timing.triggerEpochMilliseconds,
    timing.requestEpochMilliseconds,
    timing.receiptEpochMilliseconds,
  ];
  if (epochOrder.every(Number.isFinite) && !isNonDecreasing(epochOrder)) {
    issues.push("epoch timing order was not monotonic");
  }
  const monotonicOrder = [
    timing.testEntryMonotonicMilliseconds,
    timing.readinessStartMonotonicMilliseconds,
    timing.readinessCompleteMonotonicMilliseconds,
    timing.triggerMonotonicMilliseconds,
    timing.requestMonotonicMilliseconds,
    timing.receiptMonotonicMilliseconds,
  ];
  if (monotonicOrder.every(Number.isFinite) && !isNonDecreasing(monotonicOrder)) {
    issues.push("host monotonic timing order was not monotonic");
  }
  if (journey === "first-completion") {
    if (
      Number.isFinite(timing.completionSettledEpochMilliseconds)
      && Number.isFinite(timing.receiptEpochMilliseconds)
      && timing.completionSettledEpochMilliseconds < timing.receiptEpochMilliseconds
    ) {
      issues.push("completion settlement epoch preceded its semantic receipt");
    }
    if (
      Number.isFinite(timing.completionSettledMonotonicMilliseconds)
      && Number.isFinite(timing.receiptMonotonicMilliseconds)
      && timing.completionSettledMonotonicMilliseconds < timing.receiptMonotonicMilliseconds
    ) {
      issues.push("completion settled before its semantic receipt");
    }
  } else {
    expectEqual(
      issues,
      timing.completionSettledEpochMilliseconds,
      null,
      "timing.completionSettledEpochMilliseconds",
    );
    expectEqual(
      issues,
      timing.completionSettledMonotonicMilliseconds,
      null,
      "timing.completionSettledMonotonicMilliseconds",
    );
    expectEqual(
      issues,
      timing.completionSettledHostInclusiveMilliseconds,
      null,
      "timing.completionSettledHostInclusiveMilliseconds",
    );
  }
  expectDerivedTiming(
    issues,
    timing.hostInclusiveMilliseconds,
    timing.receiptEpochMilliseconds - launchEpochMilliseconds,
    "timing.hostInclusiveMilliseconds",
  );
  expectDerivedTiming(
    issues,
    timing.readinessWaitMilliseconds,
    timing.readinessCompleteMonotonicMilliseconds - timing.readinessStartMonotonicMilliseconds,
    "timing.readinessWaitMilliseconds",
  );
  expectDerivedTiming(
    issues,
    timing.requestLocalMilliseconds,
    timing.receiptMonotonicMilliseconds - timing.requestMonotonicMilliseconds,
    "timing.requestLocalMilliseconds",
  );
  if (journey === "first-completion") {
    expectDerivedTiming(
      issues,
      timing.completionSettledHostInclusiveMilliseconds,
      timing.completionSettledEpochMilliseconds - launchEpochMilliseconds,
      "timing.completionSettledHostInclusiveMilliseconds",
    );
  }
}

function validateWitness(issues, witness, journey, document, timing) {
  if (!isRecord(witness)) {
    issues.push("witness must be an object");
    return;
  }
  if (typeof witness.observationId !== "string" || witness.observationId.length === 0) {
    issues.push("witness.observationId must be non-empty");
  }
  if (journey === "cold-full-diagnostics") {
    expectEqual(issues, witness.kind, "diagnostics", "witness.kind");
    validateDiagnosticAttempts(issues, witness, document, timing);
    expectEqual(issues, witness.previousResultIdPresent, false, "witness.previousResultIdPresent");
    expectEqual(issues, witness.reportKind, "full", "witness.reportKind");
    expectEqual(issues, witness.resultIdPresent, true, "witness.resultIdPresent");
    expectEqual(issues, witness.cancellationRequested, false, "witness.cancellationRequested");
    if (!Number.isSafeInteger(witness.itemCount) || witness.itemCount < 0) {
      issues.push("witness.itemCount must be a non-negative safe integer");
    }
    return;
  }
  expectEqual(issues, witness.kind, "completion", "witness.kind");
  expectEqual(issues, witness.providerRequestCount, 1, "witness.providerRequestCount");
  expectEqual(issues, witness.providerResponseCount, 1, "witness.providerResponseCount");
  expectEqual(issues, witness.providerFailureCount, 0, "witness.providerFailureCount");
  expectEqual(issues, witness.cancellationRequested, false, "witness.cancellationRequested");
  expectEqual(issues, witness.expectedLabel, "searchText", "witness.expectedLabel");
  if (!Number.isSafeInteger(witness.itemCount) || witness.itemCount < 1) {
    issues.push("witness.itemCount must be a positive safe integer");
  }
  expectEqual(issues, witness.completionKind, 9, "witness.completionKind");
  expectEqual(issues, witness.insertText, "searchText", "witness.insertText");
  expectEqual(issues, witness.replacementText, "searchText", "witness.replacementText");
  expectEqual(
    issues,
    witness.detailIncludesTypeMember,
    true,
    "witness.detailIncludesTypeMember",
  );
  expectEqual(
    issues,
    witness.diagnosticRequestsBeforeReceipt,
    0,
    "witness.diagnosticRequestsBeforeReceipt",
  );
}

function validateDiagnosticAttempts(issues, witness, document, timing) {
  const attempts = witness.diagnosticAttempts;
  if (!Array.isArray(attempts) || attempts.length < 1) {
    issues.push(
      "witness.diagnosticAttempts must contain serialized cancellations followed by one success",
    );
    return;
  }
  const canceledAttempts = attempts.length - 1;
  expectEqual(
    issues,
    witness.providerRequestCount,
    attempts.length,
    "witness.providerRequestCount",
  );
  expectEqual(issues, witness.providerResponseCount, 1, "witness.providerResponseCount");
  expectEqual(
    issues,
    witness.providerFailureCount,
    canceledAttempts,
    "witness.providerFailureCount",
  );
  expectEqual(
    issues,
    witness.canceledAttemptsBeforeReceipt,
    canceledAttempts,
    "witness.canceledAttemptsBeforeReceipt",
  );

  const expectedUri = document?.uri;
  const expectedVersion = document?.version;
  const observationIds = new Set();
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const label = `witness.diagnosticAttempts[${index}]`;
    if (!isRecord(attempt)) {
      issues.push(`${label} must be an object`);
      continue;
    }
    if (typeof attempt.observationId !== "string" || attempt.observationId.length === 0) {
      issues.push(`${label}.observationId must be non-empty`);
    } else if (observationIds.has(attempt.observationId)) {
      issues.push("witness diagnostic reschedule reused its observation id");
    } else {
      observationIds.add(attempt.observationId);
    }
    validateDiagnosticRequestLedger(
      issues,
      attempt.request,
      `${label}.request`,
      expectedUri,
      expectedVersion,
    );
    validateDiagnosticTerminalLedger(
      issues,
      attempt.terminal,
      `${label}.terminal`,
      expectedUri,
      expectedVersion,
      index < attempts.length - 1,
    );
    if (isRecord(attempt.request) && isRecord(attempt.terminal)) {
      validateAttemptOrder(issues, attempt.request, attempt.terminal, label);
    }
    if (
      index > 0
      && isRecord(attempts[index - 1])
      && isRecord(attempts[index - 1].terminal)
      && isRecord(attempt.request)
    ) {
      validateAttemptOrder(
        issues,
        attempts[index - 1].terminal,
        attempt.request,
        `witness diagnostic reschedule boundary ${index}`,
      );
    }
  }
  const firstRequest = attempts[0]?.request;
  const finalAttempt = attempts.at(-1);
  const finalTerminal = finalAttempt?.terminal;
  expectEqual(
    issues,
    witness.observationId,
    finalAttempt?.observationId,
    "witness.observationId",
  );
  expectEqual(
    issues,
    witness.reportKind,
    finalTerminal?.reportKind,
    "witness.reportKind final diagnostic response",
  );
  expectEqual(
    issues,
    witness.itemCount,
    finalTerminal?.itemCount,
    "witness.itemCount final diagnostic response",
  );
  expectEqual(
    issues,
    witness.resultIdPresent,
    finalTerminal?.resultIdPresent,
    "witness.resultIdPresent final diagnostic response",
  );
  expectEqual(
    issues,
    witness.cancellationRequested,
    finalTerminal?.cancellationRequested,
    "witness.cancellationRequested final diagnostic response",
  );
  expectEqual(
    issues,
    timing?.requestEpochMilliseconds,
    firstRequest?.epochMilliseconds,
    "timing.requestEpochMilliseconds first diagnostic attempt",
  );
  expectEqual(
    issues,
    timing?.requestMonotonicMilliseconds,
    firstRequest?.monotonicMilliseconds,
    "timing.requestMonotonicMilliseconds first diagnostic attempt",
  );
  expectEqual(
    issues,
    timing?.receiptEpochMilliseconds,
    finalTerminal?.epochMilliseconds,
    "timing.receiptEpochMilliseconds final diagnostic response",
  );
  expectEqual(
    issues,
    timing?.receiptMonotonicMilliseconds,
    finalTerminal?.monotonicMilliseconds,
    "timing.receiptMonotonicMilliseconds final diagnostic response",
  );
}

function validateDiagnosticRequestLedger(issues, request, label, expectedUri, expectedVersion) {
  if (!isRecord(request)) {
    issues.push(`${label} must be an object`);
    return;
  }
  expectEqual(issues, request.source, "language-client-provider", `${label}.source`);
  expectEqual(issues, request.operation, "diagnostics", `${label}.operation`);
  expectEqual(issues, request.phase, "request", `${label}.phase`);
  expectFileUriIdentity(issues, request.uri, expectedUri, `${label}.uri`);
  expectEqual(issues, request.documentVersion, expectedVersion, `${label}.documentVersion`);
  expectEqual(issues, request.previousResultIdPresent, false, `${label}.previousResultIdPresent`);
  expectFiniteNonNegative(issues, request.epochMilliseconds, `${label}.epochMilliseconds`);
  expectFiniteNonNegative(issues, request.monotonicMilliseconds, `${label}.monotonicMilliseconds`);
}

function validateDiagnosticTerminalLedger(
  issues,
  terminal,
  label,
  expectedUri,
  expectedVersion,
  canceled,
) {
  if (!isRecord(terminal)) {
    issues.push(`${label} must be an object`);
    return;
  }
  expectEqual(issues, terminal.source, "language-client-provider", `${label}.source`);
  expectEqual(issues, terminal.operation, "diagnostics", `${label}.operation`);
  expectFileUriIdentity(issues, terminal.uri, expectedUri, `${label}.uri`);
  expectEqual(issues, terminal.documentVersion, expectedVersion, `${label}.documentVersion`);
  expectFiniteNonNegative(issues, terminal.epochMilliseconds, `${label}.epochMilliseconds`);
  expectFiniteNonNegative(issues, terminal.monotonicMilliseconds, `${label}.monotonicMilliseconds`);
  if (canceled) {
    expectEqual(issues, terminal.phase, "failed", `${label}.phase`);
    expectEqual(issues, terminal.errorName, "Canceled", `${label}.errorName`);
    if (typeof terminal.cancellationRequested !== "boolean") {
      issues.push(`${label}.cancellationRequested must be boolean`);
    }
    if (typeof terminal.serverRetriggerRequested !== "boolean") {
      issues.push(`${label}.serverRetriggerRequested must be boolean`);
    }
    if (terminal.cancellationRequested !== true && terminal.serverRetriggerRequested !== true) {
      issues.push(`${label} must authenticate client cancellation or server retrigger`);
    }
    expectEqual(issues, terminal.reportKind, null, `${label}.reportKind`);
    expectEqual(issues, terminal.itemCount, null, `${label}.itemCount`);
    expectEqual(issues, terminal.resultIdPresent, null, `${label}.resultIdPresent`);
    return;
  }
  expectEqual(issues, terminal.phase, "response", `${label}.phase`);
  expectEqual(issues, terminal.cancellationRequested, false, `${label}.cancellationRequested`);
  expectEqual(issues, terminal.errorName, null, `${label}.errorName`);
  expectEqual(issues, terminal.serverRetriggerRequested, false, `${label}.serverRetriggerRequested`);
  expectEqual(issues, terminal.reportKind, "full", `${label}.reportKind`);
  if (!Number.isSafeInteger(terminal.itemCount) || terminal.itemCount < 0) {
    issues.push(`${label}.itemCount must be a non-negative safe integer`);
  }
  expectEqual(issues, terminal.resultIdPresent, true, `${label}.resultIdPresent`);
}

function validateAttemptOrder(issues, before, after, label) {
  const epoch = [before.epochMilliseconds, after.epochMilliseconds];
  if (epoch.every(Number.isFinite) && !isNonDecreasing(epoch)) {
    issues.push(`${label} epoch order was inverted`);
  }
  const monotonic = [before.monotonicMilliseconds, after.monotonicMilliseconds];
  if (monotonic.every(Number.isFinite) && !isNonDecreasing(monotonic)) {
    issues.push(`${label} monotonic order was inverted`);
  }
}

export function buildCohortSummary(input) {
  const resolutionRows = Array.from(input.resolutions.values()).map((resolution) => ({
    lane: resolution.lane,
    requestedVersion: resolution.requestedVersion,
    resolvedVersion: resolution.resolvedVersion,
    progressStages: resolution.progressStages,
    vscodeExecutablePath: resolution.vscodeExecutablePath,
  }));
  const validCaptures = input.captures.filter((capture) => capture.validationIssues.length === 0);
  const complete = input.captures.length === input.plan.launchCount
    && validCaptures.length === input.plan.launchCount;
  const laneSummaries = {};
  if (input.status === "valid" && complete && input.plan.authoritative) {
    for (const lane of input.plan.lanes) {
      laneSummaries[lane] = {};
      for (const journey of journeys) {
        const rows = input.captures.filter((capture) =>
          capture.row.lane === lane && capture.row.journey === journey);
        const expected = laneDefinitions[lane].authoritativeSamplesPerJourney;
        if (rows.length !== expected) {
          throw new Error(`${lane}/${journey} retained ${rows.length} samples; expected ${expected}.`);
        }
        const metrics = {
          hostInclusiveMilliseconds: summarize(
            rows.map((capture) => capture.report.timing.hostInclusiveMilliseconds),
            expected === 20,
          ),
          launchToProviderStartMilliseconds: summarize(
            rows.map((capture) => (
              capture.report.timing.requestEpochMilliseconds
                - capture.report.timing.launchEpochMilliseconds
            )),
            expected === 20,
          ),
          requestLocalMilliseconds: summarize(
            rows.map((capture) => capture.report.timing.requestLocalMilliseconds),
            expected === 20,
          ),
        };
        if (journey === "cold-full-diagnostics") {
          metrics.diagnosticCancellationCount = summarizeCancellationCounts(
            rows.map((capture) => capture.report.witness.canceledAttemptsBeforeReceipt),
          );
        }
        if (journey === "first-completion") {
          metrics.completionSettledHostInclusiveMilliseconds = summarize(
            rows.map((capture) => (
              capture.report.timing.completionSettledHostInclusiveMilliseconds
            )),
            expected === 20,
          );
        }
        laneSummaries[lane][journey] = {
          metrics,
        };
      }
    }
  }
  const latencyAcceptance = adjudicateLatency({
    plan: input.plan,
    structuralStatus: input.status,
    complete,
    laneSummaries,
  });

  return {
    schemaVersion: cohortSchemaVersion,
    evidenceKind: input.plan.smoke ? "discarded-smoke" : "authoritative-host-tail-cohort",
    status: input.status,
    authoritative: input.plan.authoritative,
    latencyAcceptance,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    environment: input.environment,
    buildAuthentication: input.buildAuthentication ?? null,
    inputIntegrity: input.inputIntegrity ?? null,
    method: {
      fixture: fixtureName,
      journeys,
      transport: "worker",
      lanes: input.plan.lanes.map((lane) => ({
        lane,
        requestedVersion: laneDefinitions[lane].requestedVersion,
        samplesPerJourney: input.plan.smoke
          ? 1
          : laneDefinitions[lane].authoritativeSamplesPerJourney,
      })),
      freshHostPerObservation: true,
      sequential: true,
      overlappingProcesses: false,
      activation: "shipping-workspaceContains-eager-activation",
      readiness: "already-active-api-readiness-check",
      providerObservationScope: "test-entry-through-receipt",
      diagnosticReschedulePolicy,
      outerElectronProcessPolicy,
      bundleAuthenticationPolicy,
      pairOrder: "odd=diagnostics/completion; even=completion/diagnostics",
      exclusionsPermitted: false,
      excludedSamples: 0,
      invalidSamplePolicy: "retain, invalidate the complete cohort, abort, and never replace",
      stderrPolicy: "raw child stderr is descriptive retained/hashed evidence, not a structural validity input",
      workerHealthPolicy: "exact own Client.log start/stop identity and absence of four Worker transport fault markers",
      activationEvidencePolicy: "exactly one post-exit exthost.log with one Aurelia startup:true activation from an accepted package-manifest workspaceContains event",
      samplePathPolicy: "deterministic short per-sequence sNN roots with w/u/e workspace and profile paths; descriptive acquisition names remain evidence metadata",
      workspaceDependencyPolicy: {
        source: semanticRuntimeNodeModules,
        requiredModules: requiredWorkspaceModules,
        strategy: "direct package junctions on Windows; direct package directory symbolic links on other hosts",
        validation: "resolved sample/workspace containment, canonical package link targets, and copied-workspace module identity before launch",
      },
      windowsClientLogPathBudget: input.pathBudget,
      percentilePolicy: "nearest-rank p95 only for authoritative n=20 rows; n=5 and smoke omit percentiles",
      latencyGuardScope,
      hostLocalReviewGuards: hostLocalReviewGuards.filter((entry) =>
        input.plan.lanes.includes(entry.lane)),
      metric: "fresh-host first-target-provider tail under automatic admission",
      coldBoundary: "workspaceContains eagerly activates the extension before test entry; the target is unopened and unshown with zero observed document-provider requests from test entry until its first trigger",
      collectorInvocation: {
        executable: process.execPath,
        argv: [collectorPath, ...input.plan.cliArguments],
        cwd: process.cwd(),
      },
    },
    resolutions: resolutionRows,
    integrity: {
      outputRoot: input.outputRoot,
      plannedCaptures: input.plan.launchCount,
      retainedCaptures: input.captures.length,
      passingCaptures: validCaptures.length,
      invalidCaptures: input.captures.length - validCaptures.length,
      complete,
      inputIntegrityPassed: input.inputIntegrity?.status === "passed",
      captures: input.captures.map((capture) => ({
        artifactName: capture.row.artifactName,
        sampleId: capture.workspace.sampleId,
        lane: capture.row.lane,
        journey: capture.row.journey,
        pair: capture.row.pair,
        pairPosition: capture.row.pairPosition,
        sequence: capture.row.sequence,
        workspaceDependencies: capture.workspace.workspaceDependencies ?? null,
        extensionHostActivation: {
          path: capture.extensionHostLog.path == null
            ? null
            : relativeRepoPath(capture.extensionHostLog.path),
          sha256: capture.extensionHostLog.sha256,
          rawActivationLine: capture.extensionHostLog.rawActivationLine,
          startup: capture.extensionHostLog.startup,
          activationEvent: capture.extensionHostLog.activationEvent,
          validationIssues: capture.extensionHostLog.validationIssues,
        },
        validationIssues: capture.validationIssues,
        files: capture.persistedFiles ?? null,
      })),
    },
    lanes: laneSummaries,
  };
}

export function adjudicateLatency({ plan, structuralStatus, complete, laneSummaries }) {
  const base = {
    scope: latencyGuardScope,
    universalProductSlo: false,
    checks: [],
  };
  if (!plan.authoritative) {
    return {
      ...base,
      status: "unadjudicated",
      reason: "discarded smoke cohorts are never latency-accepted",
    };
  }
  if (structuralStatus !== "valid" || !complete) {
    return {
      ...base,
      status: "unadjudicated",
      reason: "only complete structurally valid authoritative cohorts are latency-adjudicated",
    };
  }
  const checks = hostLocalReviewGuards
    .filter((guardRow) => plan.lanes.includes(guardRow.lane))
    .map((guardRow) => {
      const actual = laneSummaries[guardRow.lane]?.[guardRow.journey]
        ?.metrics?.[guardRow.metric]?.[guardRow.statistic];
      if (!Number.isFinite(actual)) {
        throw new Error(
          `Cannot adjudicate ${guardRow.lane}/${guardRow.journey} `
            + `${guardRow.metric}.${guardRow.statistic}; summary value is not finite.`,
        );
      }
      return {
        ...guardRow,
        actual,
        pass: guardRow.operator === "<" ? actual < guardRow.limit : actual <= guardRow.limit,
      };
    });
  return {
    ...base,
    status: checks.every((check) => check.pass) ? "passed" : "failed",
    checks,
  };
}

export function assertAuthoritativeLatencyAccepted(summary) {
  if (summary.authoritative && summary.latencyAcceptance?.status === "failed") {
    const failures = summary.latencyAcceptance.checks.filter((check) => !check.pass);
    throw new Error(
      `Host-tail latency acceptance failed ${failures.length} preregistered host-local `
        + `review guard${failures.length === 1 ? "" : "s"}; retained summary: `
        + path.join(summary.integrity.outputRoot, "summary.json"),
    );
  }
}

export function summarize(values, includeP95) {
  if (values.length === 0 || !values.every(Number.isFinite)) {
    throw new Error("Cannot summarize an empty or non-finite sample.");
  }
  if (includeP95 && values.length !== 20) {
    throw new Error(`Nearest-rank p95 is permitted only for n=20, received n=${values.length}.`);
  }
  const sorted = [...values].sort((left, right) => left - right);
  const center = median(sorted);
  const result = {
    n: sorted.length,
    median: center,
    unscaledMad: median(sorted.map((value) => Math.abs(value - center))),
    min: sorted[0],
    max: sorted.at(-1),
    valuesInAcquisitionOrder: [...values],
  };
  if (includeP95) result.p95NearestRank = sorted[Math.ceil(0.95 * sorted.length) - 1];
  return result;
}

export function summarizeCancellationCounts(values) {
  if (values.length === 0 || !values.every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("Cannot summarize empty or invalid diagnostic cancellation counts.");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const frequencies = new Map();
  for (const value of sorted) frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  return {
    descriptiveOnly: true,
    acceptanceThreshold: null,
    n: values.length,
    totalCanceledAttempts: values.reduce((total, value) => total + value, 0),
    median: median(sorted),
    min: sorted[0],
    max: sorted.at(-1),
    valuesInAcquisitionOrder: [...values],
    frequency: Array.from(frequencies, ([canceledAttempts, count]) => ({
      canceledAttempts,
      count,
    })),
  };
}

export function sampleWorkspacePaths(row, outputRoot) {
  const sampleId = sampleIdForSequence(row.sequence);
  const sampleRoot = path.join(outputRoot, sampleId);
  return Object.freeze({
    outputRoot: path.resolve(outputRoot),
    sampleId,
    sampleRoot,
    workspaceRoot: path.join(sampleRoot, "w"),
    testWorkspace: path.join(sampleRoot, "w.code-workspace"),
    userDataDirectory: path.join(sampleRoot, "u"),
    extensionsDirectory: path.join(sampleRoot, "e"),
    reportPath: path.join(sampleRoot, "sample.report.json"),
    stdoutPath: path.join(sampleRoot, "sample.stdout.txt"),
    stderrPath: path.join(sampleRoot, "sample.stderr.txt"),
    processPath: path.join(sampleRoot, "sample.process.json"),
    electronInvocationPath: path.join(sampleRoot, "electron.invocation.json"),
    electronResultPath: path.join(sampleRoot, "electron.result.json"),
  });
}

export function assertWindowsClientLogPathBudget(
  plan,
  outputRoot,
  platform = process.platform,
) {
  if (platform !== "win32") {
    return Object.freeze({
      applicable: false,
      maximumCharacters: windowsClientLogPathCharacterBudget,
      projectedLongestCharacters: null,
      projectedLongestPath: null,
      sequence: null,
      artifactName: null,
    });
  }
  const projections = plan.rows.map((row) => {
    const sampleRoot = path.win32.join(outputRoot, sampleIdForSequence(row.sequence));
    const projectedPath = path.win32.join(
      sampleRoot,
      "u",
      "logs",
      projectedVSCodeLogSession,
      "window1",
      "exthost",
      "AureliaEffect.aurelia-2",
      clientLogFileName,
    );
    return {
      projectedPath,
      projectedCharacters: projectedPath.length,
      sequence: row.sequence,
      artifactName: row.artifactName,
    };
  });
  const longest = projections.reduce((current, candidate) => (
    current == null || candidate.projectedCharacters > current.projectedCharacters
      ? candidate
      : current
  ), null);
  if (longest == null) throw new Error("Host-tail plan must contain at least one sample row.");
  const result = Object.freeze({
    applicable: true,
    maximumCharacters: windowsClientLogPathCharacterBudget,
    projectedLongestCharacters: longest.projectedCharacters,
    projectedLongestPath: longest.projectedPath,
    sequence: longest.sequence,
    artifactName: longest.artifactName,
  });
  if (longest.projectedCharacters > windowsClientLogPathCharacterBudget) {
    throw new Error(
      `Projected Windows own Client.log path is ${longest.projectedCharacters} characters; `
        + `the fail-closed spdlog budget is ${windowsClientLogPathCharacterBudget}. `
        + `Shorten the cohort or repository path before launch: ${longest.projectedPath}`,
    );
  }
  return result;
}

export function prepareWorkspaceDependencies(workspace, options = {}) {
  const platform = options.platform ?? process.platform;
  const dependencyRoot = options.dependencyRoot ?? semanticRuntimeNodeModules;
  const expectedDependencyRoot = options.expectedDependencyRoot ?? semanticRuntimeNodeModules;
  const outputRootResolved = resolveExistingPath(workspace.outputRoot, "cohort output root");
  const sampleRootResolved = resolveExistingPath(workspace.sampleRoot, "sample root");
  const workspaceRootResolved = resolveExistingPath(workspace.workspaceRoot, "copied workspace root");
  const dependencyRootResolved = resolveExistingPath(
    dependencyRoot,
    "workspace dependency target",
  );
  const expectedDependencyRootResolved = resolveExistingPath(
    expectedDependencyRoot,
    "expected workspace dependency target",
  );
  if (!lstatSync(dependencyRootResolved).isDirectory()) {
    throw new Error(`Workspace dependency target is not a directory: ${dependencyRootResolved}`);
  }
  if (!isInside(outputRootResolved, sampleRootResolved)) {
    throw new Error("Resolved sample root escaped the cohort output root.");
  }
  if (!isInside(sampleRootResolved, workspaceRootResolved)) {
    throw new Error("Resolved copied workspace escaped the isolated sample root.");
  }
  if (!samePath(dependencyRootResolved, expectedDependencyRootResolved)) {
    throw new Error(
      `Workspace dependency target resolved to ${dependencyRootResolved}; `
        + `expected exactly ${expectedDependencyRootResolved}.`,
    );
  }

  const nodeModulesPath = path.join(workspaceRootResolved, "node_modules");
  assertInside(workspaceRootResolved, nodeModulesPath);
  if (existsSync(nodeModulesPath)) {
    throw new Error(`Refusing pre-existing copied-workspace dependency path: ${nodeModulesPath}`);
  }
  mkdirSync(nodeModulesPath);
  for (const specifier of requiredWorkspaceModules) {
    const sourcePackageRoot = resolveExistingPath(
      path.join(dependencyRootResolved, ...specifier.split("/")),
      `workspace dependency package ${specifier}`,
    );
    if (!lstatSync(sourcePackageRoot).isDirectory()) {
      throw new Error(`Workspace dependency package is not a directory: ${sourcePackageRoot}`);
    }
    const packageLinkPath = path.join(nodeModulesPath, ...specifier.split("/"));
    assertInside(nodeModulesPath, packageLinkPath);
    mkdirSync(path.dirname(packageLinkPath), { recursive: true });
    symlinkSync(
      sourcePackageRoot,
      packageLinkPath,
      platform === "win32" ? "junction" : "dir",
    );
  }

  return validateWorkspaceDependencies(workspaceRootResolved, {
    platform,
    dependencyRoot: dependencyRootResolved,
    expectedDependencyRoot: expectedDependencyRootResolved,
  });
}

export function validateWorkspaceDependencies(workspaceRoot, options = {}) {
  const platform = options.platform ?? process.platform;
  const dependencyRoot = options.dependencyRoot ?? semanticRuntimeNodeModules;
  const expectedDependencyRoot = options.expectedDependencyRoot ?? semanticRuntimeNodeModules;
  const workspaceRootResolved = resolveExistingPath(workspaceRoot, "copied workspace root");
  const dependencyRootResolved = resolveExistingPath(
    dependencyRoot,
    "workspace dependency target",
  );
  const expectedDependencyRootResolved = resolveExistingPath(
    expectedDependencyRoot,
    "expected workspace dependency target",
  );
  if (!samePath(dependencyRootResolved, expectedDependencyRootResolved)) {
    throw new Error(
      `Workspace dependency target resolved to ${dependencyRootResolved}; `
        + `expected exactly ${expectedDependencyRootResolved}.`,
    );
  }

  const nodeModulesPath = path.join(workspaceRootResolved, "node_modules");
  assertInside(workspaceRootResolved, nodeModulesPath);
  const nodeModulesStat = lstatSync(nodeModulesPath);
  if (!nodeModulesStat.isDirectory() || nodeModulesStat.isSymbolicLink()) {
    throw new Error(`Copied-workspace node_modules must be a real directory: ${nodeModulesPath}`);
  }
  const expectedRootEntries = new Set();
  const expectedScopeEntries = new Map();
  for (const specifier of requiredWorkspaceModules) {
    const [rootEntry, scopedEntry] = specifier.split("/");
    expectedRootEntries.add(rootEntry);
    if (scopedEntry != null) {
      const entries = expectedScopeEntries.get(rootEntry) ?? [];
      entries.push(scopedEntry);
      expectedScopeEntries.set(rootEntry, entries);
    }
  }
  assertExactDirectoryEntries(nodeModulesPath, [...expectedRootEntries], "copied-workspace node_modules");
  for (const [scope, entries] of expectedScopeEntries) {
    const scopePath = path.join(nodeModulesPath, scope);
    const scopeStat = lstatSync(scopePath);
    if (!scopeStat.isDirectory() || scopeStat.isSymbolicLink()) {
      throw new Error(`Copied-workspace dependency scope must be a real directory: ${scopePath}`);
    }
    assertExactDirectoryEntries(scopePath, entries, `copied-workspace dependency scope ${scope}`);
  }
  const workspaceRequire = createRequire(path.join(workspaceRootResolved, "package.json"));
  const targetRequire = createRequire(path.join(path.dirname(dependencyRootResolved), "package.json"));
  const resolvedModules = requiredWorkspaceModules.map((specifier) => {
    const sourcePackageRoot = resolveExistingPath(
      path.join(dependencyRootResolved, ...specifier.split("/")),
      `workspace dependency package ${specifier}`,
    );
    const packageLinkPath = path.join(nodeModulesPath, ...specifier.split("/"));
    assertInside(nodeModulesPath, packageLinkPath);
    const packageLinkStat = lstatSync(packageLinkPath);
    if (!packageLinkStat.isSymbolicLink()) {
      throw new Error(`Copied-workspace dependency package is not a link: ${packageLinkPath}`);
    }
    const resolvedLinkTarget = resolveExistingPath(
      packageLinkPath,
      `copied-workspace dependency package ${specifier}`,
    );
    if (!samePath(resolvedLinkTarget, sourcePackageRoot)) {
      throw new Error(
        `Copied-workspace dependency package ${specifier} target changed to ${resolvedLinkTarget}; `
          + `expected exactly ${sourcePackageRoot}.`,
      );
    }
    let resolvedPath;
    let expectedResolvedPath;
    try {
      resolvedPath = workspaceRequire.resolve(specifier);
    } catch (error) {
      throw new Error(
        `Copied workspace could not resolve required module ${specifier}: `
          + `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    try {
      expectedResolvedPath = targetRequire.resolve(specifier);
    } catch (error) {
      throw new Error(
        `Dependency target could not resolve required module ${specifier}: `
          + `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const resolvedRealPath = resolveExistingPath(
      resolvedPath,
      `copied-workspace module ${specifier}`,
    );
    const expectedResolvedRealPath = resolveExistingPath(
      expectedResolvedPath,
      `dependency-target module ${specifier}`,
    );
    if (!samePath(resolvedRealPath, expectedResolvedRealPath)) {
      throw new Error(
        `Copied workspace resolved ${specifier} to ${resolvedRealPath}; `
          + `expected ${expectedResolvedRealPath}.`,
      );
    }
    return Object.freeze({
      specifier,
      packageLinkPath,
      sourcePackageRoot,
      resolvedLinkTarget,
      resolvedPath,
      resolvedRealPath,
    });
  });
  return Object.freeze({
    status: "passed",
    strategy: platform === "win32"
      ? "direct-package-junctions"
      : "direct-package-directory-symbolic-links",
    nodeModulesPath,
    dependencyRoot: dependencyRootResolved,
    resolvedModules: Object.freeze(resolvedModules),
  });
}

function assertExactDirectoryEntries(directory, expectedEntries, label) {
  const actual = readdirSync(directory).sort((left, right) => left.localeCompare(right));
  const expected = [...expectedEntries].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} entries changed; expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }
}

function prepareSampleWorkspace(row, outputRoot) {
  const workspace = sampleWorkspacePaths(row, outputRoot);
  const {
    sampleRoot,
    workspaceRoot,
    testWorkspace,
    userDataDirectory,
    extensionsDirectory,
    reportPath,
  } = workspace;

  for (const target of [sampleRoot, workspaceRoot, testWorkspace, userDataDirectory, extensionsDirectory, reportPath]) {
    assertInside(outputRoot, target);
  }
  if (existsSync(sampleRoot)) throw new Error(`Refusing to overwrite sample evidence: ${sampleRoot}`);
  mkdirSync(sampleRoot, { recursive: true });
  mkdirSync(userDataDirectory, { recursive: true });
  mkdirSync(extensionsDirectory, { recursive: true });
  cpSync(sourceWorkspace, workspaceRoot, { recursive: true });
  writeFileSync(testWorkspace, `${JSON.stringify({
    folders: [{ name: fixtureName, path: "w" }],
  }, null, 2)}\n`);
  const workspaceDependencies = prepareWorkspaceDependencies(workspace);
  return Object.freeze({ ...workspace, workspaceDependencies });
}

function persistCapture(capture) {
  writeFileSync(capture.workspace.stdoutPath, capture.stdout, "utf8");
  writeFileSync(capture.workspace.stderrPath, capture.stderr, "utf8");
  const reportSha256 = capture.reportRaw == null ? null : sha256(capture.reportRaw);
  const processEvidence = {
    ...capture.process,
    artifactName: capture.row.artifactName,
    sampleId: capture.workspace.sampleId,
    workspaceDependencies: capture.workspace.workspaceDependencies ?? null,
    lane: capture.row.lane,
    requestedVersion: capture.row.requestedVersion,
    resolvedVersion: capture.resolution.resolvedVersion,
    journey: capture.row.journey,
    pair: capture.row.pair,
    pairPosition: capture.row.pairPosition,
    sequence: capture.row.sequence,
    stdoutBytes: Buffer.byteLength(capture.stdout),
    stderrBytes: Buffer.byteLength(capture.stderr),
    stderrPolicy: {
      role: "descriptive-retained-and-hashed",
      structuralValidityInput: false,
    },
    reportBytes: capture.reportRaw == null ? 0 : Buffer.byteLength(capture.reportRaw),
    stdoutSha256: sha256(capture.stdout),
    stderrSha256: sha256(capture.stderr),
    reportSha256,
    reportParseIssue: capture.reportParseIssue,
    clientLog: {
      candidatePaths: capture.clientLog.candidatePaths.map(relativeRepoPath),
      path: capture.clientLog.path == null ? null : relativeRepoPath(capture.clientLog.path),
      bytes: capture.clientLog.bytes,
      sha256: capture.clientLog.sha256,
      startedWorkspaceUris: capture.clientLog.startedWorkspaceUris,
      stoppedCount: capture.clientLog.stoppedCount,
      workerFaults: capture.clientLog.workerFaults,
      validationIssues: capture.clientLog.validationIssues,
    },
    extensionHostLog: {
      candidatePaths: capture.extensionHostLog.candidatePaths.map(relativeRepoPath),
      path: capture.extensionHostLog.path == null
        ? null
        : relativeRepoPath(capture.extensionHostLog.path),
      bytes: capture.extensionHostLog.bytes,
      sha256: capture.extensionHostLog.sha256,
      rawActivationLine: capture.extensionHostLog.rawActivationLine,
      startup: capture.extensionHostLog.startup,
      activationEvent: capture.extensionHostLog.activationEvent,
      validationIssues: capture.extensionHostLog.validationIssues,
    },
    validationIssues: capture.validationIssues,
  };
  writeJson(capture.workspace.processPath, processEvidence);
  const processSha256 = sha256(readFileSync(capture.workspace.processPath));
  capture.persistedFiles = {
    report: capture.reportRaw == null ? null : relativeRepoPath(capture.workspace.reportPath),
    stdout: relativeRepoPath(capture.workspace.stdoutPath),
    stderr: relativeRepoPath(capture.workspace.stderrPath),
    process: relativeRepoPath(capture.workspace.processPath),
    clientLog: capture.clientLog.path == null ? null : relativeRepoPath(capture.clientLog.path),
    extensionHostLog: capture.extensionHostLog.path == null
      ? null
      : relativeRepoPath(capture.extensionHostLog.path),
    electronInvocation: capture.process.outerProcess?.helperInvocationPath == null
      ? null
      : relativeRepoPath(capture.process.outerProcess.helperInvocationPath),
    electronResult: capture.process.outerProcess?.helperResultPath == null
      ? null
      : relativeRepoPath(capture.process.outerProcess.helperResultPath),
    reportSha256,
    stdoutSha256: processEvidence.stdoutSha256,
    stderrSha256: processEvidence.stderrSha256,
    processSha256,
    clientLogSha256: capture.clientLog.sha256,
    extensionHostLogSha256: capture.extensionHostLog.sha256,
    electronInvocationSha256: capture.process.outerProcess?.helperInvocationSha256 ?? null,
    electronResultSha256: capture.process.outerProcess?.helperResultSha256 ?? null,
  };
}

export function readClientLogEvidence(workspace, io = {}) {
  const logsRoot = path.join(workspace.userDataDirectory, "logs");
  const validationIssues = [];
  let candidates;
  try {
    candidates = existsSync(logsRoot)
      ? (io.listFiles ?? recursiveFiles)(logsRoot)
        .filter((filePath) => isOwnClientLogPath(logsRoot, filePath))
      : [];
  } catch (error) {
    return emptyClientLogEvidence(
      logsRoot,
      [],
      `own Client.log discovery failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (candidates.length !== 1) {
    return emptyClientLogEvidence(
      logsRoot,
      candidates,
      `own Client.log discovery found ${candidates.length} files; expected exactly one`,
    );
  }

  const clientLogPath = path.resolve(candidates[0]);
  if (!isInside(workspace.sampleRoot, clientLogPath)) {
    validationIssues.push("own Client.log resolved outside the isolated sample root");
  }
  let raw;
  try {
    raw = (io.readText ?? ((filePath) => readFileSync(filePath, "utf8")))(clientLogPath);
  } catch (error) {
    return emptyClientLogEvidence(
      logsRoot,
      candidates,
      `own Client.log read failed: ${error instanceof Error ? error.message : String(error)}`,
      clientLogPath,
    );
  }
  const messages = raw.split(/\r?\n/gu).map(ownLogMessage).filter((message) => message != null);
  const startedWorkspaceUris = messages
    .filter((message) => message.startsWith("[client] started ") && message.endsWith(" from package-manifest"))
    .map((message) => message.slice("[client] started ".length, -" from package-manifest".length));
  if (startedWorkspaceUris.length !== 1) {
    validationIssues.push(
      `own Client.log recorded ${startedWorkspaceUris.length} package-manifest starts; expected exactly one`,
    );
  } else if (!fileUriIdentifiesPath(startedWorkspaceUris[0], workspace.workspaceRoot)) {
    validationIssues.push("own Client.log did not start the exact isolated workspace");
  }
  const stoppedCount = messages.filter((message) => message === "[client] stopped").length;
  if (stoppedCount !== 1) {
    validationIssues.push(`own Client.log recorded ${stoppedCount} stops; expected exactly one`);
  }
  const workerFaults = workerFaultMarkers.flatMap((marker) => messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.startsWith(marker))
    .map(({ index }) => ({ marker, messageIndex: index })));
  if (workerFaults.length > 0) {
    validationIssues.push(
      `own Client.log recorded ${workerFaults.length} Worker transport fault marker(s)`,
    );
  }
  return {
    logsRoot,
    candidatePaths: candidates,
    path: clientLogPath,
    raw,
    bytes: Buffer.byteLength(raw),
    sha256: sha256(raw),
    startedWorkspaceUris,
    stoppedCount,
    workerFaults,
    validationIssues: Object.freeze(validationIssues),
  };
}

export function readExtensionHostLogEvidence(workspace) {
  const logsRoot = path.join(workspace.userDataDirectory, "logs");
  let candidates;
  try {
    candidates = existsSync(logsRoot)
      ? recursiveFiles(logsRoot).filter((filePath) => isExtensionHostLogPath(logsRoot, filePath))
      : [];
  } catch (error) {
    return emptyExtensionHostLogEvidence(
      [],
      `Extension Host log discovery failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (candidates.length !== 1) {
    return emptyExtensionHostLogEvidence(
      candidates,
      `Extension Host log discovery found ${candidates.length} files; expected exactly one`,
    );
  }
  const logPath = path.resolve(candidates[0]);
  const validationIssues = [];
  if (!isInside(workspace.sampleRoot, logPath)) {
    validationIssues.push("Extension Host log resolved outside the isolated sample root");
  }
  let raw;
  try {
    raw = readFileSync(logPath, "utf8");
  } catch (error) {
    return emptyExtensionHostLogEvidence(
      candidates,
      `Extension Host log read failed: ${error instanceof Error ? error.message : String(error)}`,
      logPath,
    );
  }
  const activationRows = raw.split(/\r?\n/gu)
    .map((line) => ({ line, message: ownLogMessage(line) }))
    .filter(({ message }) => message?.startsWith(aureliaActivationLogPrefix));
  if (activationRows.length !== 1) {
    validationIssues.push(
      `Extension Host log recorded ${activationRows.length} Aurelia activation records; expected exactly one`,
    );
  }
  const activationRow = activationRows.length === 1 ? activationRows[0] : null;
  const match = activationRow == null
    ? null
    : /^ExtensionService#_doActivateExtension AureliaEffect\.aurelia-2, startup: (true|false), activationEvent: '([^']+)'$/u
      .exec(activationRow.message);
  if (activationRow != null && match == null) {
    validationIssues.push("Extension Host Aurelia activation record had an unexpected format");
  }
  const startup = match == null ? null : match[1] === "true";
  const activationEvent = match?.[2] ?? null;
  if (startup !== true) {
    validationIssues.push("Extension Host Aurelia activation was not startup:true");
  }
  if (!acceptedWorkspaceContainsActivationEvents.includes(activationEvent)) {
    validationIssues.push(
      `Extension Host Aurelia activation event was ${JSON.stringify(activationEvent)}; `
        + "expected an accepted workspaceContains package-manifest event",
    );
  }
  return {
    candidatePaths: candidates,
    path: logPath,
    bytes: Buffer.byteLength(raw),
    sha256: sha256(raw),
    rawActivationLine: activationRow?.line ?? null,
    startup,
    activationEvent,
    validationIssues: Object.freeze(validationIssues),
  };
}

function emptyExtensionHostLogEvidence(candidates, issue, logPath = null) {
  return {
    candidatePaths: candidates,
    path: logPath,
    bytes: 0,
    sha256: null,
    rawActivationLine: null,
    startup: null,
    activationEvent: null,
    validationIssues: Object.freeze([issue]),
  };
}

function isExtensionHostLogPath(logsRoot, filePath) {
  const parts = path.relative(logsRoot, filePath).split(path.sep);
  return parts.length === 4
    && parts[0].length > 0
    && parts[1] === "window1"
    && parts[2] === "exthost"
    && parts[3] === extensionHostLogFileName;
}

function emptyClientLogEvidence(logsRoot, candidates, issue, clientLogPath = null) {
  return {
    logsRoot,
    candidatePaths: candidates,
    path: clientLogPath,
    raw: null,
    bytes: 0,
    sha256: null,
    startedWorkspaceUris: [],
    stoppedCount: 0,
    workerFaults: [],
    validationIssues: Object.freeze([issue]),
  };
}

function isOwnClientLogPath(logsRoot, filePath) {
  const parts = path.relative(logsRoot, filePath).split(path.sep);
  return parts.length >= 5
    && /^window\d+$/u.test(parts.at(-4))
    && parts.at(-3) === "exthost"
    && parts.at(-2) === "AureliaEffect.aurelia-2"
    && parts.at(-1) === clientLogFileName;
}

function ownLogMessage(line) {
  return /^\S+ \S+ \[(?:trace|debug|info|warning|error)\] (.*)$/u.exec(line)?.[1] ?? null;
}

function fileUriIdentifiesPath(uri, expectedPath) {
  try {
    return path.relative(path.resolve(fileURLToPath(uri)), path.resolve(expectedPath)) === "";
  } catch {
    return false;
  }
}

function readSampleReport(reportPath) {
  if (!existsSync(reportPath)) {
    return { raw: null, report: null, issue: "sample report file was not written" };
  }
  const raw = readFileSync(reportPath, "utf8");
  try {
    const report = JSON.parse(raw);
    if (!isRecord(report)) return { raw, report: null, issue: "sample report JSON was not an object" };
    return { raw, report, issue: null };
  } catch (error) {
    return {
      raw,
      report: null,
      issue: `sample report was not exact JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function captureWritable() {
  const chunks = [];
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    }),
    text: () => Buffer.concat(chunks).toString("utf8"),
  };
}

async function assertMeasurementReady(outputRoot, plan) {
  const trackedStatus = await gitText([
    "status",
    "--porcelain=v1",
    "--untracked-files=no",
    "--ignore-submodules=none",
  ]);
  if (!plan.smoke && trackedStatus.length > 0) {
    throw new Error(`Tracked worktree must be clean before host-tail measurement:\n${trackedStatus}`);
  }
  for (const [label, target] of [
    ["measurement suite", extensionTestsPath],
    ["pressure fixture", sourceWorkspace],
    ["semantic-runtime dependency target", semanticRuntimeNodeModules],
    ["Electron helper", electronHelperPath],
  ]) {
    if (!existsSync(target)) throw new Error(`Missing ${label}: ${target}`);
  }
  assertInside(evidenceParent, outputRoot);
  if (existsSync(outputRoot)) throw new Error(`Refusing to overwrite cohort evidence: ${outputRoot}`);
}

export async function authenticateHeadBundles({ plan }, dependencies = {}) {
  const readState = dependencies.readRepositoryState ?? repositoryState;
  const before = await readState();
  if (plan.authoritative && before.trackedStatusPorcelain !== "") {
    throw new Error(
      `Authoritative bundle authentication requires a clean tracked HEAD:\n${before.trackedStatusPorcelain}`,
    );
  }
  const pnpm = dependencies.pnpmEntrypoint ?? resolvePnpmEntrypoint();
  const runBuild = dependencies.runBuild ?? ((input) => runBoundedChildProcess(input));
  const buildCommands = [
    {
      label: "forced-ide-types",
      argv: [
        "exec",
        "tsc",
        "-b",
        "--force",
        "packages/semantic-runtime",
        "packages/language-server",
        "packages/vscode",
      ],
    },
    {
      label: "vscode-bundles",
      argv: ["--filter", "aurelia-2", "run", "bundle"],
    },
  ];
  const buildResults = [];
  for (const command of buildCommands) {
    const result = await runBuild({
      command: process.execPath,
      args: [pnpm, ...command.argv],
      cwd: repoRoot,
      env: process.env,
      timeoutMilliseconds: bundleAuthenticationPolicy.buildTimeoutMilliseconds,
      cleanupGraceMilliseconds: outerElectronProcessPolicy.cleanupGraceMilliseconds,
    });
    buildResults.push({ command, result });
    if (
      result.timedOut
      || result.interruptedSignal != null
      || result.spawnError != null
      || result.exitCode !== 0
    ) {
      throw new Error(
        `IDE build authentication step ${command.label} failed before host-tail acquisition `
          + `(exit=${String(result.exitCode)}, signal=${String(result.signal)}, timedOut=${String(result.timedOut)}).\n`
          + `${result.stderr ?? ""}`,
      );
    }
  }
  const after = await readState();
  const repositoryIssues = compareRepositoryState(before, after);
  if (repositoryIssues.length > 0) {
    throw new Error(`Repository changed while authenticating IDE bundles: ${repositoryIssues.join("; ")}`);
  }
  for (const [label, target] of [
    ["extension bundle", path.join(extensionDistPath, "extension.cjs")],
    ["server bundle", path.join(extensionDistPath, "server", "main.cjs")],
  ]) {
    if (!existsSync(target)) throw new Error(`IDE build produced no ${label}: ${target}`);
  }
  const outputs = await directoryEvidence(extensionDistPath);
  return {
    status: plan.authoritative ? "authenticated-clean-head-build" : "discarded-smoke-working-tree-build",
    headAuthenticated: plan.authoritative,
    policy: bundleAuthenticationPolicy,
    commands: buildCommands.map((command) => ({
      label: command.label,
      executable: process.execPath,
      pnpmEntrypoint: pnpm,
      argv: command.argv,
      cwd: repoRoot,
    })),
    repositoryBefore: before,
    repositoryAfter: after,
    outputs,
    processes: buildResults.map(({ command, result }) => ({
      label: command.label,
      pid: result.pid,
      wallMilliseconds: result.wallMilliseconds,
      timeoutMilliseconds: result.timeoutMilliseconds,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      interruptedSignal: result.interruptedSignal,
      cleanup: result.cleanup,
    })),
    stdout: buildResults.map(({ command, result }) => (
      `[${command.label}]\n${result.stdout ?? ""}`
    )).join("\n"),
    stderr: buildResults.map(({ command, result }) => (
      `[${command.label}]\n${result.stderr ?? ""}`
    )).join("\n"),
  };
}

function persistBuildAuthentication(outputRoot, authentication) {
  const stdout = authentication?.stdout ?? "";
  const stderr = authentication?.stderr ?? "";
  const stdoutPath = path.join(outputRoot, "build.stdout.txt");
  const stderrPath = path.join(outputRoot, "build.stderr.txt");
  writeFileSync(stdoutPath, stdout, { encoding: "utf8", flag: "wx" });
  writeFileSync(stderrPath, stderr, { encoding: "utf8", flag: "wx" });
  const evidence = Object.fromEntries(
    Object.entries(authentication ?? {}).filter(([key]) => key !== "stdout" && key !== "stderr"),
  );
  return {
    ...evidence,
    stdout: {
      path: relativeRepoPath(stdoutPath),
      bytes: Buffer.byteLength(stdout),
      sha256: sha256(stdout),
    },
    stderr: {
      path: relativeRepoPath(stderrPath),
      bytes: Buffer.byteLength(stderr),
      sha256: sha256(stderr),
    },
  };
}

export async function captureFrozenMeasurementInputs() {
  const workspaceDependencyPackages = [];
  for (const specifier of requiredWorkspaceModules) {
    const packagePath = path.join(semanticRuntimeNodeModules, ...specifier.split("/"));
    const packageRoot = resolveExistingPath(packagePath, `workspace dependency package ${specifier}`);
    workspaceDependencyPackages.push({
      specifier,
      packageRoot,
      evidence: await directoryEvidence(packageRoot),
    });
  }
  return {
    schemaVersion: "aurelia-ls/extension-host-tail-frozen-inputs/v1",
    repository: await repositoryState(),
    outputs: {
      extensionDist: await directoryEvidence(extensionDistPath),
    },
    fixture: {
      path: sourceWorkspace,
      evidence: await directoryEvidence(sourceWorkspace),
    },
    harness: {
      collectorSha256: await fileSha256(collectorPath),
      electronHelperSha256: await fileSha256(electronHelperPath),
      permanentRunnerSha256: await fileSha256(permanentRunnerPath),
      suiteSha256: await fileSha256(extensionTestsPath),
      pnpmLockSha256: await fileSha256(path.join(repoRoot, "pnpm-lock.yaml")),
    },
    workspaceDependencies: {
      linkRoot: resolveExistingPath(semanticRuntimeNodeModules, "semantic-runtime dependency target"),
      packages: workspaceDependencyPackages,
    },
  };
}

export function compareFrozenMeasurementInputs(before, after) {
  const validationIssues = [];
  for (const section of [
    "schemaVersion",
    "repository",
    "outputs",
    "fixture",
    "harness",
    "workspaceDependencies",
  ]) {
    if (stableJson(before?.[section]) !== stableJson(after?.[section])) {
      validationIssues.push(`${section} changed across the host-tail acquisition boundary`);
    }
  }
  return {
    schemaVersion: "aurelia-ls/extension-host-tail-input-integrity/v1",
    status: validationIssues.length === 0 ? "passed" : "failed",
    policy: bundleAuthenticationPolicy,
    validationIssues,
    before,
    after,
  };
}

async function repositoryState() {
  return {
    head: await gitText(["rev-parse", "HEAD"]),
    tree: await gitText(["rev-parse", "HEAD^{tree}"]),
    trackedStatusPorcelain: await gitText([
      "status",
      "--porcelain=v1",
      "--untracked-files=no",
      "--ignore-submodules=none",
    ]),
    submodules: await gitText(["submodule", "status", "--recursive"]),
  };
}

function compareRepositoryState(before, after) {
  const issues = [];
  for (const key of ["head", "tree", "trackedStatusPorcelain", "submodules"]) {
    if (before?.[key] !== after?.[key]) issues.push(`${key} changed`);
  }
  return issues;
}

function resolvePnpmEntrypoint() {
  const candidate = process.env.npm_execpath;
  if (candidate == null || candidate === "") {
    throw new Error(
      "Host-tail bundle authentication requires the pnpm lifecycle; run pnpm measure:ide:host-tails.",
    );
  }
  const resolved = resolveExistingPath(candidate, "pnpm lifecycle entrypoint");
  const info = lstatSync(resolved);
  if (!info.isFile() || !/^pnpm\.(?:c?js|mjs)$/iu.test(path.basename(resolved))) {
    throw new Error(`Unsupported pnpm lifecycle entrypoint: ${resolved}`);
  }
  return resolved;
}

async function captureEnvironmentSnapshot(outputRoot) {
  const cpu = os.cpus()[0] ?? null;
  const extensionBundle = path.join(extensionDevelopmentPath, "dist", "extension.cjs");
  const serverBundle = path.join(extensionDevelopmentPath, "dist", "server", "main.cjs");
  return {
    gitHead: await gitText(["rev-parse", "HEAD"]),
    trackedGitStatusPorcelain: await gitText(["status", "--porcelain=v1", "--untracked-files=no"]),
    repoRoot,
    outputRoot,
    nodeExecutable: process.execPath,
    nodeVersion: process.version,
    nodeVersions: process.versions,
    nodeOptions: process.env.NODE_OPTIONS ?? null,
    platform: process.platform,
    architecture: process.arch,
    operatingSystemRelease: os.release(),
    operatingSystemVersion: os.version(),
    cpuModel: cpu?.model ?? null,
    logicalCpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    inputHashes: {
      collectorSha256: await fileSha256(collectorPath),
      permanentRunnerSha256: await fileSha256(permanentRunnerPath),
      electronHelperSha256: await fileSha256(electronHelperPath),
      suiteSha256: await fileSha256(extensionTestsPath),
      extensionBundleSha256: await fileSha256(extensionBundle),
      serverBundleSha256: await fileSha256(serverBundle),
      fixtureSha256: await directorySha256(sourceWorkspace),
      pnpmLockSha256: await fileSha256(path.join(repoRoot, "pnpm-lock.yaml")),
    },
  };
}

async function directorySha256(root) {
  return (await directoryEvidence(root)).sha256;
}

async function directoryEvidence(root) {
  const resolvedRoot = resolveExistingPath(root, "directory evidence root");
  const hash = createHash("sha256");
  let fileCount = 0;
  let directoryCount = 0;
  let symbolicLinkCount = 0;
  let bytes = 0;
  const visit = async (directory) => {
    directoryCount += 1;
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const target = path.join(directory, entry.name);
      const relative = path.relative(resolvedRoot, target).replace(/\\/gu, "/");
      if (entry.isDirectory()) {
        hash.update(`directory\0${relative}\0`);
        await visit(target);
      } else if (entry.isFile()) {
        const content = await fs.readFile(target);
        fileCount += 1;
        bytes += content.byteLength;
        hash.update(`file\0${relative}\0`);
        hash.update(content);
        hash.update("\0");
      } else if (entry.isSymbolicLink()) {
        symbolicLinkCount += 1;
        hash.update(`symlink\0${relative}\0${readlinkSync(target)}\0`);
      } else {
        hash.update(`other\0${relative}\0`);
      }
    }
  };
  await visit(resolvedRoot);
  return {
    path: resolvedRoot,
    sha256: hash.digest("hex"),
    fileCount,
    directoryCount,
    symbolicLinkCount,
    bytes,
    policy: "sorted relative paths, regular-file bytes, and symbolic-link targets",
  };
}

function stableJson(value) {
  const normalize = (candidate) => {
    if (Array.isArray(candidate)) return candidate.map(normalize);
    if (isRecord(candidate)) {
      return Object.fromEntries(
        Object.keys(candidate)
          .sort((left, right) => left.localeCompare(right))
          .map((key) => [key, normalize(candidate[key])]),
      );
    }
    return candidate;
  };
  return JSON.stringify(normalize(value));
}

function recursiveFiles(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...recursiveFiles(target));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}

function expectEqual(issues, actual, expected, label) {
  if (!Object.is(actual, expected)) {
    issues.push(`${label} was ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
  }
}

function expectFileUriIdentity(issues, actual, expected, label) {
  let matches = false;
  if (typeof actual === "string" && typeof expected === "string") {
    try {
      matches = fileUriIdentifiesPath(actual, fileURLToPath(expected));
    } catch {
      matches = false;
    }
  }
  if (!matches) {
    issues.push(`${label} was ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
  }
}

function expectFiniteNonNegative(issues, value, label) {
  if (!Number.isFinite(value) || value < 0) issues.push(`${label} must be a finite non-negative number`);
}

function expectDerivedTiming(issues, actual, expected, label) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return;
  if (Math.abs(actual - expected) > 0.01) {
    issues.push(`${label} did not equal its recorded boundary difference`);
  }
}

function isNonDecreasing(values) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[index - 1]) return false;
  }
  return true;
}

function parseStableVersion(value, label) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(value);
  if (match == null) throw new Error(`${label} must be a stable numeric version, received ${value}.`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function median(values) {
  if (values.length === 0) throw new Error("Cannot take the median of an empty sample.");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function assertInside(parent, child) {
  if (isInside(parent, child)) return;
  throw new Error(`Refusing path outside ${path.resolve(parent)}: ${path.resolve(child)}`);
}

function resolveExistingPath(target, label) {
  try {
    return realpathSync(target);
  } catch (error) {
    throw new Error(
      `Missing or unreadable ${label}: ${path.resolve(target)}: `
        + `${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function samePath(left, right) {
  return path.relative(path.resolve(left), path.resolve(right)) === "";
}

function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function gitText(args) {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true }, (error, stdout, stderr) => {
      if (error != null) {
        reject(new Error(`git ${args.join(" ")} failed: ${stderr}`));
        return;
      }
      resolve(stdout.trimEnd());
    });
  });
}

async function fileSha256(filePath) {
  return sha256(await fs.readFile(filePath));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relativeRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/gu, "/");
}

function isRecord(value) {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function sampleIdForSequence(sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error(`Sample sequence must be a positive safe integer, received ${String(sequence)}.`);
  }
  return `s${pad(sequence)}`;
}

function fail(message) {
  throw new Error(`${message}\n${usage}`);
}

async function main() {
  const plan = parseCollectorArguments(process.argv.slice(2));
  if (plan.planOnly) {
    process.stdout.write(`${JSON.stringify(publicPlan(plan))}\n`);
    return;
  }
  const summary = await collectExtensionHostTails(plan);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  assertAuthoritativeLatencyAccepted(summary);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
