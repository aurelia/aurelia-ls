#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
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
import { minimumVSCodeVersion } from "./run-extension-host-tests.mjs";

export const sampleSchemaVersion = "aurelia-ls/extension-host-tail-sample/v3";
export const processSchemaVersion = "aurelia-ls/extension-host-tail-process/v4";
export const cohortSchemaVersion = "aurelia-ls/extension-host-tail-cohort/v4";
export const windowsClientLogPathCharacterBudget = 259;
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
    schemaVersion: "aurelia-ls/extension-host-tail-plan/v2",
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
  const electron = dependencies.electron ?? await import("@vscode/test-electron");
  const prepareWorkspace = dependencies.prepareWorkspace ?? prepareSampleWorkspace;
  const captureEnvironment = dependencies.captureEnvironment ?? captureEnvironmentSnapshot;
  const assertReady = dependencies.assertReady ?? assertMeasurementReady;

  await assertReady(outputRoot, plan);
  mkdirSync(outputRoot, { recursive: true });
  const startedAt = new Date().toISOString();
  const environment = await captureEnvironment(outputRoot);
  const resolutions = new Map();
  const captures = [];

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
      });
      captures.push(capture);
      persistCapture(capture);
      if (capture.validationIssues.length > 0) {
        const summary = buildCohortSummary({
          plan,
          outputRoot,
          startedAt,
          completedAt: new Date().toISOString(),
          environment,
          pathBudget,
          resolutions,
          captures,
          status: plan.smoke ? "discarded-smoke-invalid" : "invalid",
        });
        writeJson(path.join(outputRoot, "summary.json"), summary);
        throw new Error(
          `Host-tail cohort is invalid at ${row.artifactName}; retained without replacement: `
            + capture.validationIssues.join("; "),
        );
      }
    }
  }

  const summary = buildCohortSummary({
    plan,
    outputRoot,
    startedAt,
    completedAt: new Date().toISOString(),
    environment,
    pathBudget,
    resolutions,
    captures,
    status: plan.smoke ? "discarded-smoke" : "valid",
  });
  writeJson(path.join(outputRoot, "summary.json"), summary);
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

async function runSample({ row, resolution, workspace, electron }) {
  const stdoutCapture = captureWritable();
  const stderrCapture = captureWritable();
  const launchEpochMilliseconds = Date.now();
  const startedAt = new Date(launchEpochMilliseconds).toISOString();
  const started = performance.now();
  let runTestsReturn = null;
  let exitCode = null;
  let signal = null;
  let runTestsError = null;
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
    runTestsError = {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
  }

  const completedAt = new Date().toISOString();
  const wallMilliseconds = performance.now() - started;
  const stdout = stdoutCapture.text();
  const stderr = stderrCapture.text();
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
    for (const legacyField of [
      "zeroPriorDocumentProviderRequests",
      "extensionActiveAtTestEntry",
      "providerColdAtSuiteEntry",
      "zeroObservedDocumentProviderRequestsSinceTestEntry",
    ]) {
      if (Object.hasOwn(report.method, legacyField)) {
        issues.push(`method.${legacyField} is not permitted by the v3 sample schema`);
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
      issues.push(`timing.${legacyField} is not permitted by the v3 sample schema`);
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
  if (!Array.isArray(attempts) || (attempts.length !== 1 && attempts.length !== 2)) {
    issues.push("witness.diagnosticAttempts must contain one success or one cancellation followed by success");
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
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const label = `witness.diagnosticAttempts[${index}]`;
    if (!isRecord(attempt)) {
      issues.push(`${label} must be an object`);
      continue;
    }
    if (typeof attempt.observationId !== "string" || attempt.observationId.length === 0) {
      issues.push(`${label}.observationId must be non-empty`);
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
  }
  if (
    attempts.length === 2
    && isRecord(attempts[0])
    && isRecord(attempts[1])
  ) {
    if (attempts[0].observationId === attempts[1].observationId) {
      issues.push("witness diagnostic reschedule reused its observation id");
    }
    if (isRecord(attempts[0].terminal) && isRecord(attempts[1].request)) {
      validateAttemptOrder(
        issues,
        attempts[0].terminal,
        attempts[1].request,
        "witness diagnostic reschedule boundary",
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
        strategy: "junction on Windows; directory symbolic link on other hosts",
        validation: "resolved sample/workspace containment, exact resolved link target, and copied-workspace module identity before launch",
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

  const linkPath = path.join(workspaceRootResolved, "node_modules");
  assertInside(workspaceRootResolved, linkPath);
  if (existsSync(linkPath)) {
    throw new Error(`Refusing pre-existing copied-workspace dependency path: ${linkPath}`);
  }
  const strategy = platform === "win32" ? "junction" : "directory-symbolic-link";
  symlinkSync(
    dependencyRootResolved,
    linkPath,
    platform === "win32" ? "junction" : "dir",
  );
  const linkStat = lstatSync(linkPath);
  if (!linkStat.isSymbolicLink()) {
    throw new Error(`Copied-workspace dependency path is not a link: ${linkPath}`);
  }
  const resolvedLinkTarget = resolveExistingPath(linkPath, "copied-workspace dependency link");
  if (!samePath(resolvedLinkTarget, dependencyRootResolved)) {
    throw new Error(
      `Copied-workspace dependency link resolved to ${resolvedLinkTarget}; `
        + `expected exactly ${dependencyRootResolved}.`,
    );
  }

  const workspaceRequire = createRequire(path.join(workspaceRootResolved, "package.json"));
  const targetRequire = createRequire(path.join(path.dirname(dependencyRootResolved), "package.json"));
  const resolvedModules = requiredWorkspaceModules.map((specifier) => {
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
      resolvedPath,
      resolvedRealPath,
    });
  });
  return Object.freeze({
    status: "passed",
    strategy,
    linkPath,
    linkTarget: dependencyRootResolved,
    resolvedLinkTarget,
    resolvedModules: Object.freeze(resolvedModules),
  });
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
    reportSha256,
    stdoutSha256: processEvidence.stdoutSha256,
    stderrSha256: processEvidence.stderrSha256,
    processSha256,
    clientLogSha256: capture.clientLog.sha256,
    extensionHostLogSha256: capture.extensionHostLog.sha256,
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
  const trackedStatus = await gitText(["status", "--porcelain=v1", "--untracked-files=no"]);
  if (!plan.smoke && trackedStatus.length > 0) {
    throw new Error(`Tracked worktree must be clean before host-tail measurement:\n${trackedStatus}`);
  }
  for (const [label, target] of [
    ["measurement suite", extensionTestsPath],
    ["pressure fixture", sourceWorkspace],
    ["semantic-runtime dependency target", semanticRuntimeNodeModules],
    ["extension bundle", path.join(extensionDevelopmentPath, "dist", "extension.cjs")],
    ["server bundle", path.join(extensionDevelopmentPath, "dist", "server", "main.cjs")],
  ]) {
    if (!existsSync(target)) throw new Error(`Missing ${label}: ${target}`);
  }
  assertInside(evidenceParent, outputRoot);
  if (existsSync(outputRoot)) throw new Error(`Refusing to overwrite cohort evidence: ${outputRoot}`);
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
      suiteSha256: await fileSha256(extensionTestsPath),
      extensionBundleSha256: await fileSha256(extensionBundle),
      serverBundleSha256: await fileSha256(serverBundle),
      fixtureSha256: await directorySha256(sourceWorkspace),
      pnpmLockSha256: await fileSha256(path.join(repoRoot, "pnpm-lock.yaml")),
    },
  };
}

async function directorySha256(root) {
  const hash = createHash("sha256");
  for (const filePath of recursiveFiles(root)) {
    const relative = path.relative(root, filePath).replace(/\\/gu, "/");
    hash.update(relative);
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
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
