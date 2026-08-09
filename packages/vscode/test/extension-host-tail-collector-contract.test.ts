import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test } from "vitest";

interface AcquisitionRow {
  readonly lane: "current-stable" | "minimum";
  readonly requestedVersion: "stable" | "1.91.0";
  readonly samplesPerJourney: number;
  readonly pair: number;
  readonly pairPosition: number;
  readonly sequence: number;
  readonly journey: "cold-full-diagnostics" | "first-completion";
  readonly artifactName: string;
}

interface CollectorPlan {
  readonly lanes: readonly ("current-stable" | "minimum")[];
  readonly rows: readonly AcquisitionRow[];
  readonly launchCount: number;
  readonly versionResolutionCount: number;
  readonly smoke: boolean;
  readonly planOnly: boolean;
  readonly outputRoot: string;
}

interface CollectorModule {
  readonly cohortSchemaVersion: string;
  readonly diagnosticReschedulePolicy: Readonly<Record<string, unknown>>;
  readonly processSchemaVersion: string;
  readonly sampleSchemaVersion: string;
  readonly hostLocalReviewGuards: readonly Record<string, any>[];
  readonly windowsClientLogPathCharacterBudget: number;
  readonly parseCollectorArguments: (args: readonly string[]) => CollectorPlan;
  readonly publicPlan: (plan: CollectorPlan) => Record<string, any>;
  readonly collectExtensionHostTails: (
    plan: CollectorPlan,
    dependencies: Record<string, unknown>,
  ) => Promise<Record<string, any>>;
  readonly sampleEnvironment: (input: Record<string, any>) => Readonly<Record<string, string>>;
  readonly sampleWorkspacePaths: (
    row: AcquisitionRow,
    outputRoot: string,
  ) => Record<string, any>;
  readonly prepareWorkspaceDependencies: (
    workspace: Record<string, any>,
    options?: Record<string, unknown>,
  ) => Record<string, any>;
  readonly assertWindowsClientLogPathBudget: (
    plan: CollectorPlan,
    outputRoot: string,
    platform?: NodeJS.Platform,
  ) => Record<string, any>;
  readonly readClientLogEvidence: (
    workspace: Record<string, any>,
    io?: Record<string, unknown>,
  ) => Record<string, any>;
  readonly validateSampleReport: (input: Record<string, any>) => readonly string[];
  readonly assertAuthoritativeLatencyAccepted: (summary: Record<string, any>) => void;
  readonly summarize: (values: readonly number[], includeP95: boolean) => Record<string, any>;
}

interface LaunchRecord {
  readonly extensionTestsPath: string;
  readonly launchArgs: readonly string[];
  readonly extensionTestsEnv: Readonly<Record<string, string>>;
}

const collectorUrl = new URL("../scripts/collect-extension-host-tails.mjs", import.meta.url);
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Extension Host tail collector", () => {
  test("fixes authoritative counts and counterbalances serial journey pairs", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments(["--cohort=contract"]);

    expect(collector.sampleSchemaVersion).toBe("aurelia-ls/extension-host-tail-sample/v4");
    expect(collector.processSchemaVersion).toBe("aurelia-ls/extension-host-tail-process/v5");
    expect(collector.cohortSchemaVersion).toBe("aurelia-ls/extension-host-tail-cohort/v5");
    expect(collector.publicPlan(plan).schemaVersion)
      .toBe("aurelia-ls/extension-host-tail-plan/v3");
    expect(collector.publicPlan(plan).diagnosticReschedulePolicy)
      .toEqual(collector.diagnosticReschedulePolicy);
    expect(collector.diagnosticReschedulePolicy).toEqual({
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
    expect(plan.versionResolutionCount).toBe(2);
    expect(plan.launchCount).toBe(50);
    expect(countRows(plan.rows, "current-stable", "cold-full-diagnostics")).toBe(20);
    expect(countRows(plan.rows, "current-stable", "first-completion")).toBe(20);
    expect(countRows(plan.rows, "minimum", "cold-full-diagnostics")).toBe(5);
    expect(countRows(plan.rows, "minimum", "first-completion")).toBe(5);

    for (const lane of plan.lanes) {
      const rows = plan.rows.filter((row) => row.lane === lane);
      for (let index = 0; index < rows.length; index += 2) {
        const pair = rows[index]!.pair;
        expect(rows[index]!.pairPosition).toBe(1);
        expect(rows[index + 1]!.pairPosition).toBe(2);
        expect(rows.slice(index, index + 2).map((row) => row.journey)).toEqual(
          pair % 2 === 1
            ? ["cold-full-diagnostics", "first-completion"]
            : ["first-completion", "cold-full-diagnostics"],
        );
      }
    }
  });

  test("uses short sequence roots and fails an over-budget Windows Client.log before resolution", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments(["--cohort=contract"]);
    const layouts = plan.rows.map((row) => collector.sampleWorkspacePaths(row, plan.outputRoot));

    expect(path.basename(layouts[0]!.sampleRoot)).toBe("s01");
    expect(path.basename(layouts.at(-1)!.sampleRoot)).toBe("s50");
    expect(new Set(layouts.map((layout) => layout.sampleRoot))).toHaveLength(50);
    expect(layouts[0]).toMatchObject({
      workspaceRoot: expect.stringMatching(/[\\/]s01[\\/]w$/u),
      testWorkspace: expect.stringMatching(/[\\/]s01[\\/]w\.code-workspace$/u),
      userDataDirectory: expect.stringMatching(/[\\/]s01[\\/]u$/u),
      extensionsDirectory: expect.stringMatching(/[\\/]s01[\\/]e$/u),
    });
    expect(plan.rows[0]!.artifactName)
      .toBe("current-stable-pair-01-position-1-cold-full-diagnostics");

    const longestSupportedName = "x".repeat(80);
    const longestSupported = collector.parseCollectorArguments([
      "--lane=current-stable",
      `--cohort=${longestSupportedName}`,
      "--smoke",
    ]);
    const supportedRoot = path.win32.join(
      "C:\\projects\\aurelia-ls2\\.temp\\stage4-extension-host-tails",
      `${longestSupportedName}-smoke`,
    );
    const supportedBudget = collector.assertWindowsClientLogPathBudget(
      longestSupported,
      supportedRoot,
      "win32",
    );
    expect(supportedBudget).toMatchObject({
      applicable: true,
      maximumCharacters: collector.windowsClientLogPathCharacterBudget,
      projectedLongestCharacters: expect.any(Number),
    });
    expect(supportedBudget.projectedLongestCharacters)
      .toBeLessThanOrEqual(collector.windowsClientLogPathCharacterBudget);

    const overlongRoot = path.win32.join(
      "C:\\path-budget-contract",
      "y".repeat(200),
    );
    let readinessChecked = false;
    let resolutionAttempted = false;
    await expect(collector.collectExtensionHostTails(longestSupported, {
      outputRoot: overlongRoot,
      platform: "win32",
      assertReady: async () => {
        readinessChecked = true;
      },
      electron: {
        downloadAndUnzipVSCode: async () => {
          resolutionAttempted = true;
        },
      },
    })).rejects.toThrow(/Projected Windows own Client\.log path is \d+ characters/u);
    expect(readinessChecked).toBe(false);
    expect(resolutionAttempted).toBe(false);
  });

  test("links the copied workspace to the exact dependency target and resolves required modules", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments(["--cohort=dependency-link", "--smoke"]);
    const root = temporaryRoot("aurelia-host-tail-dependency-link-");
    const workspace = createBareWorkspace(collector, plan.rows[0]!, path.join(root, "out"));
    const dependencyRoot = createMockDependencyRoot(root, ["aurelia", "@aurelia/router"]);

    const evidence = collector.prepareWorkspaceDependencies(workspace, {
      dependencyRoot,
      expectedDependencyRoot: dependencyRoot,
    });

    expect(evidence).toMatchObject({
      status: "passed",
      strategy: process.platform === "win32" ? "junction" : "directory-symbolic-link",
      linkPath: path.join(workspace.workspaceRoot, "node_modules"),
      linkTarget: realpathSync(dependencyRoot),
      resolvedLinkTarget: realpathSync(dependencyRoot),
      resolvedModules: [
        { specifier: "aurelia", resolvedRealPath: expect.any(String) },
        { specifier: "@aurelia/router", resolvedRealPath: expect.any(String) },
      ],
    });
    expect(lstatSync(evidence.linkPath).isSymbolicLink()).toBe(true);
  });

  test("fails closed for a missing or unresolvable copied-workspace dependency target", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments(["--cohort=dependency-failure", "--smoke"]);
    const root = temporaryRoot("aurelia-host-tail-dependency-failure-");
    const missingWorkspace = createBareWorkspace(
      collector,
      plan.rows[0]!,
      path.join(root, "missing-out"),
    );
    const missingRoot = path.join(root, "missing-node-modules");
    expect(() => collector.prepareWorkspaceDependencies(missingWorkspace, {
      dependencyRoot: missingRoot,
      expectedDependencyRoot: missingRoot,
    })).toThrow(/Missing or unreadable workspace dependency target/u);

    const unresolvedWorkspace = createBareWorkspace(
      collector,
      plan.rows[1]!,
      path.join(root, "unresolved-out"),
    );
    const unresolvedRoot = createMockDependencyRoot(root, ["aurelia"], "partial-owner");
    expect(() => collector.prepareWorkspaceDependencies(unresolvedWorkspace, {
      dependencyRoot: unresolvedRoot,
      expectedDependencyRoot: unresolvedRoot,
    })).toThrow(/could not resolve required module @aurelia\/router/u);
  });

  test("rejects unsafe or pre-existing copied-workspace link layouts", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments(["--cohort=dependency-layout", "--smoke"]);
    const root = temporaryRoot("aurelia-host-tail-dependency-layout-");
    const dependencyRoot = createMockDependencyRoot(root, ["aurelia", "@aurelia/router"]);
    const occupied = createBareWorkspace(
      collector,
      plan.rows[0]!,
      path.join(root, "occupied-out"),
    );
    mkdirSync(path.join(occupied.workspaceRoot, "node_modules"));
    expect(() => collector.prepareWorkspaceDependencies(occupied, {
      dependencyRoot,
      expectedDependencyRoot: dependencyRoot,
    })).toThrow(/Refusing pre-existing copied-workspace dependency path/u);

    const escaped = createBareWorkspace(
      collector,
      plan.rows[1]!,
      path.join(root, "escaped-out"),
    );
    const outsideWorkspace = path.join(root, "outside-workspace");
    mkdirSync(outsideWorkspace);
    writeFileSync(path.join(outsideWorkspace, "package.json"), "{}\n");
    expect(() => collector.prepareWorkspaceDependencies({
      ...escaped,
      workspaceRoot: outsideWorkspace,
    }, {
      dependencyRoot,
      expectedDependencyRoot: dependencyRoot,
    })).toThrow(/Resolved copied workspace escaped the isolated sample root/u);
  });

  test("resolves once per lane and serially retains isolated authenticated samples", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments(["--cohort=contract"]);
    const outputRoot = temporaryRoot("aurelia-host-tail-valid-");
    const harness = fakeHarness(collector, outputRoot, {
      mutateReport: (report) => {
        if (report.witness.kind === "diagnostics") {
          addNativeDiagnosticCancellations(report, (report.pair - 1) % 4);
        }
      },
    });

    const summary = await collector.collectExtensionHostTails(plan, harness.dependencies);

    expect(harness.downloads).toEqual(["stable", "1.91.0"]);
    expect(harness.maxConcurrentLaunches()).toBe(1);
    expect(harness.launches).toHaveLength(50);
    expect(new Set(harness.launches.map(workspaceArgument))).toHaveLength(50);
    expect(new Set(harness.launches.map(userDataArgument))).toHaveLength(50);
    expect(harness.launches.every((launch) =>
      launch.extensionTestsPath.endsWith("test\\extension-host\\tail-product-support.cjs")
        || launch.extensionTestsPath.endsWith("test/extension-host/tail-product-support.cjs"))).toBe(true);

    for (const launch of harness.launches) {
      expect(Object.keys(launch.extensionTestsEnv).sort()).toEqual([
        "AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT",
        "AURELIA_LS_EXTENSION_HOST_OBSERVATION",
        "AURELIA_LS_EXTENSION_HOST_TAIL_JOURNEY",
        "AURELIA_LS_EXTENSION_HOST_TAIL_LANE",
        "AURELIA_LS_EXTENSION_HOST_TAIL_LAUNCH_EPOCH_MS",
        "AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION",
        "AURELIA_LS_EXTENSION_HOST_TAIL_PAIR",
        "AURELIA_LS_EXTENSION_HOST_TAIL_PAIR_POSITION",
        "AURELIA_LS_EXTENSION_HOST_TAIL_REPORT_PATH",
        "AURELIA_LS_EXTENSION_HOST_TAIL_REQUESTED_VERSION",
        "AURELIA_LS_EXTENSION_HOST_TAIL_RESOLVED_VERSION",
        "AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE",
        "AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE",
        "AURELIA_LS_FORCE_IPC_TRANSPORT",
      ]);
      expect(launch.extensionTestsEnv).toMatchObject({
        AURELIA_LS_EXTENSION_HOST_OBSERVATION: "1",
        AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION: "1",
        AURELIA_LS_FORCE_IPC_TRANSPORT: "0",
        AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT: "worker",
      });
      expect(Number(launch.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_TAIL_PAIR)).toBeGreaterThan(0);
      expect(Number(launch.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE)).toBeGreaterThan(0);
      expect(["1", "2"]).toContain(
        launch.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_TAIL_PAIR_POSITION,
      );
    }

    expect(summary.status).toBe("valid");
    expect(summary.authoritative).toBe(true);
    expect(summary.latencyAcceptance).toMatchObject({
      status: "passed",
      universalProductSlo: false,
      checks: expect.any(Array),
    });
    expect(summary.latencyAcceptance.checks).toHaveLength(18);
    expect(summary.method.hostLocalReviewGuards).toEqual(collector.hostLocalReviewGuards);
    expect(summary.method.workspaceDependencyPolicy).toMatchObject({
      requiredModules: ["aurelia", "@aurelia/router"],
      strategy: "junction on Windows; directory symbolic link on other hosts",
    });
    expect(summary.method).toMatchObject({
      activation: "shipping-workspaceContains-eager-activation",
      readiness: "already-active-api-readiness-check",
      providerObservationScope: "test-entry-through-receipt",
      metric: "fresh-host first-target-provider tail under automatic admission",
      diagnosticReschedulePolicy: collector.diagnosticReschedulePolicy,
    });
    expect(summary.integrity).toMatchObject({
      plannedCaptures: 50,
      retainedCaptures: 50,
      passingCaptures: 50,
      invalidCaptures: 0,
      complete: true,
    });
    for (const journey of ["cold-full-diagnostics", "first-completion"]) {
      for (const metric of [
        "hostInclusiveMilliseconds",
        "launchToProviderStartMilliseconds",
        "requestLocalMilliseconds",
      ]) {
        expect(summary.lanes["current-stable"][journey].metrics[metric]).toMatchObject({
          n: 20,
          p95NearestRank: expect.any(Number),
        });
        expect(summary.lanes.minimum[journey].metrics[metric]).toMatchObject({ n: 5 });
        expect(summary.lanes.minimum[journey].metrics[metric]).not.toHaveProperty("p95NearestRank");
      }
      expect(summary.lanes["current-stable"][journey].metrics)
        .not.toHaveProperty("readinessWaitMilliseconds");
      if (journey === "first-completion") {
        expect(summary.lanes["current-stable"][journey].metrics)
          .toHaveProperty("completionSettledHostInclusiveMilliseconds.p95NearestRank");
        expect(summary.lanes.minimum[journey].metrics)
          .not.toHaveProperty("completionSettledHostInclusiveMilliseconds.p95NearestRank");
      }
    }
    expect(summary.lanes["current-stable"]["cold-full-diagnostics"].metrics)
      .toMatchObject({
        diagnosticCancellationCount: {
          descriptiveOnly: true,
          acceptanceThreshold: null,
          n: 20,
          totalCanceledAttempts: 30,
          median: 1.5,
          min: 0,
          max: 3,
          valuesInAcquisitionOrder: [
            0, 1, 2, 3, 0, 1, 2, 3, 0, 1,
            2, 3, 0, 1, 2, 3, 0, 1, 2, 3,
          ],
          frequency: [
            { canceledAttempts: 0, count: 5 },
            { canceledAttempts: 1, count: 5 },
            { canceledAttempts: 2, count: 5 },
            { canceledAttempts: 3, count: 5 },
          ],
        },
      });

    const first = summary.integrity.captures[0];
    expect(first).toMatchObject({
      artifactName: "current-stable-pair-01-position-1-cold-full-diagnostics",
      sampleId: "s01",
      workspaceDependencies: {
        status: "passed",
        resolvedModules: [
          { specifier: "aurelia" },
          { specifier: "@aurelia/router" },
        ],
      },
      extensionHostActivation: {
        startup: true,
        activationEvent: "workspaceContains:node_modules/aurelia/package.json",
        rawActivationLine: expect.stringContaining("AureliaEffect.aurelia-2"),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        validationIssues: [],
      },
    });
    const processEvidence = JSON.parse(readFileSync(
      path.resolve(process.cwd(), first.files.process),
      "utf8",
    ));
    expect(processEvidence.invocation).toMatchObject({
      vscodeExecutablePath: "mock-vscode-current-stable",
      extensionDevelopmentPath: expect.any(String),
      extensionTestsPath: expect.stringContaining("tail-product-support.cjs"),
      launchArgs: expect.arrayContaining([expect.stringContaining("--user-data-dir=")]),
      extensionTestsEnv: expect.objectContaining({
        AURELIA_LS_EXTENSION_HOST_TAIL_JOURNEY: "cold-full-diagnostics",
      }),
    });
    expect(processEvidence).toMatchObject({
      schemaVersion: "aurelia-ls/extension-host-tail-process/v5",
      artifactName: "current-stable-pair-01-position-1-cold-full-diagnostics",
      sampleId: "s01",
      workspaceDependencies: {
        status: "passed",
        strategy: process.platform === "win32" ? "junction" : "directory-symbolic-link",
        resolvedModules: [
          { specifier: "aurelia" },
          { specifier: "@aurelia/router" },
        ],
      },
      exitCode: 0,
      stderrBytes: 0,
      stderrPolicy: {
        role: "descriptive-retained-and-hashed",
        structuralValidityInput: false,
      },
      clientLog: {
        path: expect.stringContaining("Aurelia LS (Client).log"),
        bytes: expect.any(Number),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        startedWorkspaceUris: [expect.stringMatching(/^file:/u)],
        stoppedCount: 1,
        workerFaults: [],
        validationIssues: [],
      },
      extensionHostLog: {
        path: expect.stringContaining("exthost.log"),
        bytes: expect.any(Number),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        rawActivationLine: expect.stringContaining(
          "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2",
        ),
        startup: true,
        activationEvent: "workspaceContains:node_modules/aurelia/package.json",
        validationIssues: [],
      },
      reportSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      stdoutSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      stderrSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      validationIssues: [],
    });
    expect(first.files.processSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.files.clientLog).toContain("Aurelia LS (Client).log");
    expect(first.files.clientLogSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.files.extensionHostLog).toContain("exthost.log");
    expect(first.files.extensionHostLogSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  test("preregisters exact host-local guards and fails latency independently of structure", async () => {
    const collector = await loadCollector();
    expect(collector.hostLocalReviewGuards).toEqual([
      reviewGuard("current-stable", "cold-full-diagnostics", "requestLocalMilliseconds", "median", "<=", 5_000),
      reviewGuard("current-stable", "cold-full-diagnostics", "requestLocalMilliseconds", "p95NearestRank", "<=", 7_500),
      reviewGuard("current-stable", "cold-full-diagnostics", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
      reviewGuard("current-stable", "cold-full-diagnostics", "launchToProviderStartMilliseconds", "p95NearestRank", "<=", 10_000),
      reviewGuard("current-stable", "cold-full-diagnostics", "hostInclusiveMilliseconds", "max", "<", 30_000),
      reviewGuard("current-stable", "first-completion", "requestLocalMilliseconds", "median", "<=", 2_500),
      reviewGuard("current-stable", "first-completion", "requestLocalMilliseconds", "p95NearestRank", "<=", 4_000),
      reviewGuard("current-stable", "first-completion", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
      reviewGuard("current-stable", "first-completion", "launchToProviderStartMilliseconds", "p95NearestRank", "<=", 10_000),
      reviewGuard("current-stable", "first-completion", "hostInclusiveMilliseconds", "max", "<", 30_000),
      reviewGuard("current-stable", "first-completion", "completionSettledHostInclusiveMilliseconds", "max", "<", 30_000),
      reviewGuard("minimum", "cold-full-diagnostics", "requestLocalMilliseconds", "median", "<=", 5_000),
      reviewGuard("minimum", "cold-full-diagnostics", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
      reviewGuard("minimum", "cold-full-diagnostics", "hostInclusiveMilliseconds", "max", "<", 30_000),
      reviewGuard("minimum", "first-completion", "requestLocalMilliseconds", "median", "<=", 2_500),
      reviewGuard("minimum", "first-completion", "launchToProviderStartMilliseconds", "median", "<=", 7_500),
      reviewGuard("minimum", "first-completion", "hostInclusiveMilliseconds", "max", "<", 30_000),
      reviewGuard("minimum", "first-completion", "completionSettledHostInclusiveMilliseconds", "max", "<", 30_000),
    ]);

    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=latency-failure",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-latency-failure-");
    const harness = fakeHarness(collector, outputRoot, {
      mutateReport: (report) => {
        if (report.sequence === 1) {
          report.timing.receiptEpochMilliseconds =
            report.timing.launchEpochMilliseconds + 30_000;
          report.timing.hostInclusiveMilliseconds = 30_000;
          report.witness.diagnosticAttempts[0].terminal.epochMilliseconds =
            report.timing.receiptEpochMilliseconds;
        }
      },
    });

    const summary = await collector.collectExtensionHostTails(plan, harness.dependencies);

    expect(summary.status).toBe("valid");
    expect(summary.integrity).toMatchObject({
      passingCaptures: 40,
      invalidCaptures: 0,
      complete: true,
    });
    expect(summary.latencyAcceptance.status).toBe("failed");
    expect(summary.latencyAcceptance.checks.filter((check: Record<string, any>) => !check.pass))
      .toEqual([{
        lane: "current-stable",
        journey: "cold-full-diagnostics",
        metric: "hostInclusiveMilliseconds",
        statistic: "max",
        operator: "<",
        actual: 30_000,
        limit: 30_000,
        pass: false,
      }]);
    expect(() => collector.assertAuthoritativeLatencyAccepted(summary))
      .toThrow("latency acceptance failed 1 preregistered host-local review guard");
    expect(JSON.parse(readFileSync(path.join(outputRoot, "summary.json"), "utf8")))
      .toMatchObject({ status: "valid", latencyAcceptance: { status: "failed" } });
  });

  test("retains the first invalid smoke sample without retry, replacement, or accepted aggregation", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=invalid",
      "--smoke",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-invalid-");
    const harness = fakeHarness(collector, outputRoot, {
      stderrOnSequence: 1,
      exitCodeOnSequence: 1,
    });

    await expect(collector.collectExtensionHostTails(plan, harness.dependencies))
      .rejects.toThrow("retained without replacement");

    expect(harness.downloads).toEqual(["stable"]);
    expect(harness.launches).toHaveLength(1);
    const summary = JSON.parse(readFileSync(path.join(outputRoot, "summary.json"), "utf8"));
    expect(summary).toMatchObject({
      schemaVersion: collector.cohortSchemaVersion,
      status: "discarded-smoke-invalid",
      evidenceKind: "discarded-smoke",
      authoritative: false,
      latencyAcceptance: {
        status: "unadjudicated",
        checks: [],
      },
      lanes: {},
      integrity: {
        plannedCaptures: 2,
        retainedCaptures: 1,
        passingCaptures: 0,
        invalidCaptures: 1,
        complete: false,
      },
    });
    const capture = summary.integrity.captures[0];
    expect(readFileSync(path.resolve(process.cwd(), capture.files.stderr), "utf8")).toContain("forced stderr");
    expect(JSON.parse(readFileSync(path.resolve(process.cwd(), capture.files.report), "utf8")))
      .toMatchObject({ schemaVersion: collector.sampleSchemaVersion });
  });

  test("retains ambient child stderr as descriptive evidence without invalidating a sample", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=ambient-stderr",
      "--smoke",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-ambient-stderr-");
    const harness = fakeHarness(collector, outputRoot, { stderrOnSequence: 1 });

    const summary = await collector.collectExtensionHostTails(plan, harness.dependencies);

    expect(summary).toMatchObject({
      status: "discarded-smoke",
      authoritative: false,
      integrity: {
        retainedCaptures: 2,
        passingCaptures: 2,
        invalidCaptures: 0,
        complete: true,
      },
    });
    const first = summary.integrity.captures[0];
    expect(first.validationIssues).toEqual([]);
    expect(readFileSync(path.resolve(process.cwd(), first.files.stderr), "utf8"))
      .toContain("forced stderr");
  });

  test("rejects an own Client.log Worker fault while retaining its exact evidence", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=worker-fault",
      "--smoke",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-worker-fault-");
    const marker = "[worker-transport.client] Worker transport failed";
    const harness = fakeHarness(collector, outputRoot, { clientLogFault: marker });

    await expect(collector.collectExtensionHostTails(plan, harness.dependencies))
      .rejects.toThrow("Worker transport fault marker");

    const summary = JSON.parse(readFileSync(path.join(outputRoot, "summary.json"), "utf8"));
    const capture = summary.integrity.captures[0];
    const processEvidence = JSON.parse(readFileSync(
      path.resolve(process.cwd(), capture.files.process),
      "utf8",
    ));
    expect(capture.validationIssues).toContain(
      "own Client.log recorded 1 Worker transport fault marker(s)",
    );
    expect(processEvidence.clientLog.workerFaults).toEqual([{
      marker,
      messageIndex: 1,
    }]);
    expect(capture.files.clientLogSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  test.each([0, 2])(
    "rejects %i discovered own Client.log files",
    async (clientLogCount) => {
      const collector = await loadCollector();
      const plan = collector.parseCollectorArguments([
        "--lane=current-stable",
        `--cohort=client-log-count-${clientLogCount}`,
        "--smoke",
      ]);
      const outputRoot = temporaryRoot(`aurelia-host-tail-client-log-${clientLogCount}-`);
      const harness = fakeHarness(collector, outputRoot, { clientLogCount });

      await expect(collector.collectExtensionHostTails(plan, harness.dependencies))
        .rejects.toThrow(`own Client.log discovery found ${clientLogCount} files`);
      expect(harness.launches).toHaveLength(1);
    },
  );

  test.each([
    ["missing log", { extensionHostLogCount: 0 }, "Extension Host log discovery found 0 files"],
    ["multiple logs", { extensionHostLogCount: 2 }, "Extension Host log discovery found 2 files"],
    ["missing activation", { extensionHostActivationRecords: [] }, "recorded 0 Aurelia activation records"],
    ["duplicate activation", {
      extensionHostActivationRecords: [
        "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: 'workspaceContains:node_modules/aurelia/package.json'",
        "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: 'workspaceContains:node_modules/aurelia/package.json'",
      ],
    }, "recorded 2 Aurelia activation records"],
    ["api activation", {
      extensionHostActivationRecords: [
        "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: 'api'",
      ],
    }, "activation event was \"api\""],
    ["onLanguage activation", {
      extensionHostActivationRecords: [
        "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: 'onLanguage:html'",
      ],
    }, "activation event was \"onLanguage:html\""],
    ["non-startup workspace activation", {
      extensionHostActivationRecords: [
        "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: false, activationEvent: 'workspaceContains:node_modules/aurelia/package.json'",
      ],
    }, "activation was not startup:true"],
  ] as const)("rejects %s Extension Host activation evidence", async (_label, options, issue) => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      `--cohort=exthost-${_label.replaceAll(" ", "-")}`,
      "--smoke",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-exthost-");
    const harness = fakeHarness(collector, outputRoot, options);

    await expect(collector.collectExtensionHostTails(plan, harness.dependencies))
      .rejects.toThrow(issue);
    expect(harness.launches).toHaveLength(1);
  });

  test.each([
    "workspaceContains:node_modules/aurelia/package.json",
    "workspaceContains:node_modules/@aurelia/runtime-html/package.json",
  ])("accepts eager startup activation from %s", async (activationEvent) => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      `--cohort=activation-${activationEvent.includes("runtime-html") ? "runtime" : "facade"}`,
      "--smoke",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-activation-event-");
    const harness = fakeHarness(collector, outputRoot, {
      extensionHostActivationRecords: [
        `ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: '${activationEvent}'`,
      ],
    });

    const summary = await collector.collectExtensionHostTails(plan, harness.dependencies);
    expect(summary.status).toBe("discarded-smoke");
    const processEvidence = JSON.parse(readFileSync(
      path.resolve(process.cwd(), summary.integrity.captures[0].files.process),
      "utf8",
    ));
    expect(processEvidence.extensionHostLog).toMatchObject({
      startup: true,
      activationEvent,
      validationIssues: [],
    });
  });

  test("turns an own Client.log read failure into retained validation evidence", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=client-log-read-failure",
      "--smoke",
    ]);
    const workspace = prepareFakeWorkspace(
      collector,
      plan.rows[0]!,
      temporaryRoot("aurelia-host-tail-client-log-read-failure-"),
    );
    writeFakeClientLogs({
      launchArgs: [`--user-data-dir=${workspace.userDataDirectory}`],
      extensionTestsEnv: {
        AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE: workspace.workspaceRoot,
      },
    }, 1, undefined);

    const evidence = collector.readClientLogEvidence(workspace, {
      readText: () => { throw new Error("forced read failure"); },
    });

    expect(evidence).toMatchObject({
      path: expect.stringContaining("Aurelia LS (Client).log"),
      raw: null,
      sha256: null,
      validationIssues: ["own Client.log read failed: forced read failure"],
    });
  });

  test("independently rejects an uncorrelated provider witness", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=invalid-report",
      "--smoke",
    ]);
    const outputRoot = temporaryRoot("aurelia-host-tail-invalid-report-");
    const harness = fakeHarness(collector, outputRoot, {
      mutateReport: (report) => {
        report.witness.providerResponseCount = 0;
        report.witness.cancellationRequested = true;
      },
    });

    await expect(collector.collectExtensionHostTails(plan, harness.dependencies))
      .rejects.toThrow("witness.providerResponseCount");
    expect(harness.launches).toHaveLength(1);
    const summary = JSON.parse(readFileSync(path.join(outputRoot, "summary.json"), "utf8"));
    expect(summary.integrity.captures[0].validationIssues).toEqual(expect.arrayContaining([
      expect.stringContaining("witness.providerResponseCount"),
      expect.stringContaining("witness.cancellationRequested"),
    ]));
  });

  test("requires eager activation at entry and rejects legacy activation timing fields", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=activation-contract",
      "--smoke",
    ]);
    const row = plan.rows[0]!;
    const workspace = prepareFakeWorkspace(
      collector,
      row,
      temporaryRoot("aurelia-host-tail-activation-contract-"),
    );
    const resolution = {
      lane: "current-stable",
      requestedVersion: "stable",
      resolvedVersion: "1.123.4",
      vscodeExecutablePath: "mock-vscode",
    };
    const launchEpochMilliseconds = Date.now();
    const env = collector.sampleEnvironment({ row, resolution, workspace, launchEpochMilliseconds });
    const report = fakeReport(collector, env);
    report.method.activeAtTestEntry = false;
    (report.method as Record<string, any>).zeroPriorDocumentProviderRequests = true;
    (report.method as Record<string, any>)
      .zeroObservedDocumentProviderRequestsSinceTestEntry = true;
    (report.timing as Record<string, any>).activationStartEpochMilliseconds =
      launchEpochMilliseconds + 2;
    (report.timing as Record<string, any>).activationCompleteEpochMilliseconds =
      launchEpochMilliseconds + 3;
    (report.timing as Record<string, any>).activationMilliseconds = 1;

    expect(collector.validateSampleReport({
      report,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("method.activeAtTestEntry"),
      expect.stringContaining("method.zeroPriorDocumentProviderRequests is not permitted"),
      expect.stringContaining(
        "method.zeroObservedDocumentProviderRequestsSinceTestEntry is not permitted",
      ),
      expect.stringContaining("timing.activationStartEpochMilliseconds is not permitted"),
      expect.stringContaining("timing.activationCompleteEpochMilliseconds is not permitted"),
      expect.stringContaining("timing.activationMilliseconds is not permitted"),
    ]));

    const suiteSource = readFileSync(
      new URL("./extension-host/tail-product-support.cjs", import.meta.url),
      "utf8",
    );
    const activeAtEntryIndex = suiteSource.indexOf(
      "state.method.activeAtTestEntry = extension.isActive",
    );
    const readinessAwaitIndex = suiteSource.indexOf("await extension.activate()");
    expect(activeAtEntryIndex).toBeGreaterThanOrEqual(0);
    expect(readinessAwaitIndex).toBeGreaterThanOrEqual(0);
    expect(activeAtEntryIndex).toBeLessThan(readinessAwaitIndex);
    expect(suiteSource).not.toContain("extension.isActive, false");
    expect(suiteSource.match(/vscode\.window\.showTextDocument\(targetUri,/gu) ?? [])
      .toHaveLength(1);
    expect(suiteSource).not.toContain("requestCount > 2");
    expect(suiteSource).not.toContain("canceledCount > 1");
  });

  test("accepts finite serialized diagnostic reschedules and rejects malformed ledgers", async () => {
    const collector = await loadCollector();
    const plan = collector.parseCollectorArguments([
      "--lane=current-stable",
      "--cohort=diagnostic-ledger",
      "--smoke",
    ]);
    const row = plan.rows[0]!;
    const workspace = prepareFakeWorkspace(
      collector,
      row,
      temporaryRoot("aurelia-host-tail-ledger-"),
    );
    const resolution = {
      lane: "current-stable",
      requestedVersion: "stable",
      resolvedVersion: "1.123.4",
      vscodeExecutablePath: "mock-vscode",
    };
    const launchEpochMilliseconds = Date.now();
    const env = collector.sampleEnvironment({ row, resolution, workspace, launchEpochMilliseconds });
    const valid = fakeReport(collector, env);
    addNativeDiagnosticCancellations(valid, 3);

    expect(collector.validateSampleReport({
      report: valid,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual([]);

    const cappedPolicy = structuredClone(valid);
    cappedPolicy.method.diagnosticReschedulePolicy.attemptCardinalityLimit = 2;
    expect(collector.validateSampleReport({
      report: cappedPolicy,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("diagnosticReschedulePolicy.attemptCardinalityLimit"),
    ]));

    const serverRetriggered = structuredClone(valid);
    serverRetriggered.witness.diagnosticAttempts[0].terminal.cancellationRequested = false;
    serverRetriggered.witness.diagnosticAttempts[0].terminal.serverRetriggerRequested = true;
    expect(collector.validateSampleReport({
      report: serverRetriggered,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual([]);

    const unauthenticated = structuredClone(valid);
    unauthenticated.witness.diagnosticAttempts[0].terminal.cancellationRequested = false;
    unauthenticated.witness.diagnosticAttempts[0].terminal.serverRetriggerRequested = false;
    expect(collector.validateSampleReport({
      report: unauthenticated,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("must authenticate client cancellation or server retrigger"),
    ]));

    const reusedId = structuredClone(valid);
    reusedId.witness.diagnosticAttempts[2].observationId =
      reusedId.witness.diagnosticAttempts[0].observationId;
    expect(reusedId.witness.diagnosticAttempts.map((attempt) => attempt.observationId))
      .toEqual([
        valid.witness.diagnosticAttempts[0].observationId,
        valid.witness.diagnosticAttempts[1].observationId,
        valid.witness.diagnosticAttempts[0].observationId,
        valid.witness.diagnosticAttempts[3].observationId,
      ]);
    expect(reusedId.witness.observationId).toBe(valid.witness.observationId);
    expect(collector.validateSampleReport({
      report: reusedId,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("reschedule reused its observation id"),
    ]));

    const overlap = structuredClone(valid);
    overlap.witness.diagnosticAttempts[1].request.epochMilliseconds =
      overlap.witness.diagnosticAttempts[0].terminal.epochMilliseconds - 1;
    overlap.witness.diagnosticAttempts[1].request.monotonicMilliseconds =
      overlap.witness.diagnosticAttempts[0].terminal.monotonicMilliseconds - 1;
    expect(collector.validateSampleReport({
      report: overlap,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("diagnostic reschedule boundary 1 epoch order was inverted"),
      expect.stringContaining("diagnostic reschedule boundary 1 monotonic order was inverted"),
    ]));

    const nonCanceled = structuredClone(valid);
    nonCanceled.witness.diagnosticAttempts[1].terminal.errorName = "Failure";
    expect(collector.validateSampleReport({
      report: nonCanceled,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("diagnosticAttempts[1].terminal.errorName"),
    ]));

    const uncorrelated = structuredClone(valid);
    uncorrelated.witness.observationId = "unrelated-final-receipt";
    expect(collector.validateSampleReport({
      report: uncorrelated,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("witness.observationId"),
    ]));

    const missingFinal = structuredClone(valid);
    missingFinal.witness.diagnosticAttempts.at(-1)!.terminal = null;
    expect(collector.validateSampleReport({
      report: missingFinal,
      row,
      resolution,
      workspace,
      launchEpochMilliseconds,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("diagnosticAttempts[3].terminal must be an object"),
    ]));
  });

  test("permits nearest-rank p95 only for twenty authoritative observations", async () => {
    const collector = await loadCollector();
    const twenty = Array.from({ length: 20 }, (_, index) => index + 1);

    expect(collector.summarize(twenty, true)).toMatchObject({
      n: 20,
      median: 10.5,
      p95NearestRank: 19,
      min: 1,
      max: 20,
      valuesInAcquisitionOrder: twenty,
    });
    expect(collector.summarize([5, 1, 4, 2, 3], false)).not.toHaveProperty("p95NearestRank");
    expect(() => collector.summarize([1, 2, 3, 4, 5], true)).toThrow("only for n=20");
  });

  test("keeps smoke explicit and rejects mutable cohort or transport controls", async () => {
    const collector = await loadCollector();
    const smoke = collector.parseCollectorArguments(["--cohort=probe", "--smoke"]);
    expect(smoke).toMatchObject({ smoke: true, launchCount: 4 });

    expect(() => collector.parseCollectorArguments([])).toThrow("--cohort is required");
    expect(() => collector.parseCollectorArguments(["--cohort=bad/name"])).toThrow("safe filename");
    expect(() => collector.parseCollectorArguments(["--cohort=x", "--samples=2"]))
      .toThrow("Unknown argument");
    expect(() => collector.parseCollectorArguments(["--cohort=x", "--ipc"]))
      .toThrow("Unknown argument");

    const planOnly = collector.parseCollectorArguments(["--plan"]);
    expect(planOnly).toMatchObject({ planOnly: true, launchCount: 50 });
    const extensionManifest = JSON.parse(readFileSync(
      new URL("../package.json", import.meta.url),
      "utf8",
    ));
    const rootManifest = JSON.parse(readFileSync(
      new URL("../../../package.json", import.meta.url),
      "utf8",
    ));
    expect(extensionManifest.scripts["measure:extension-host:tails"])
      .toBe("node scripts/collect-extension-host-tails.mjs");
    expect(rootManifest.scripts["measure:ide:host-tails"])
      .toBe("pnpm --filter aurelia-2 measure:extension-host:tails");
    expect(readFileSync(
      new URL("../scripts/run-extension-host-tests.mjs", import.meta.url),
      "utf8",
    )).not.toContain("tail-product-support.cjs");
    expect(readFileSync(
      new URL("./extension-host/suite/index.cjs", import.meta.url),
      "utf8",
    )).not.toContain("tail-product-support.cjs");
  });

  test.runIf(process.platform === "win32")(
    "treats drive-letter-only URI casing as the same Windows document",
    async () => {
      const collector = await loadCollector();
      const plan = collector.parseCollectorArguments([
        "--lane=current-stable",
        "--cohort=drive-case",
        "--smoke",
      ]);
      const row = plan.rows[0]!;
      const workspace = prepareFakeWorkspace(
        collector,
        row,
        temporaryRoot("aurelia-host-tail-drive-case-"),
      );
      const resolution = {
        lane: "current-stable",
        requestedVersion: "stable",
        resolvedVersion: "1.123.4",
        vscodeExecutablePath: "mock-vscode",
      };
      const launchEpochMilliseconds = Date.now();
      const env = collector.sampleEnvironment({ row, resolution, workspace, launchEpochMilliseconds });
      const report = fakeReport(collector, env);
      report.document.uri = report.document.uri.replace(
        /^file:\/\/\/[A-Z](?=:)/u,
        (prefix: string) => prefix.toLowerCase(),
      );

      expect(collector.validateSampleReport({
        report,
        row,
        resolution,
        workspace,
        launchEpochMilliseconds,
      })).toEqual([]);
    },
  );
});

async function loadCollector(): Promise<CollectorModule> {
  return await import(collectorUrl.href) as CollectorModule;
}

function countRows(
  rows: readonly AcquisitionRow[],
  lane: AcquisitionRow["lane"],
  journey: AcquisitionRow["journey"],
): number {
  return rows.filter((row) => row.lane === lane && row.journey === journey).length;
}

function reviewGuard(
  lane: AcquisitionRow["lane"],
  journey: AcquisitionRow["journey"],
  metric: string,
  statistic: string,
  operator: "<" | "<=",
  limit: number,
): Record<string, string | number> {
  return { lane, journey, metric, statistic, operator, limit };
}

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

function fakeHarness(
  collector: CollectorModule,
  outputRoot: string,
  options: {
    readonly stderrOnSequence?: number;
    readonly exitCodeOnSequence?: number;
    readonly clientLogCount?: number;
    readonly clientLogFault?: string;
    readonly extensionHostLogCount?: number;
    readonly extensionHostActivationRecords?: readonly string[];
    readonly mutateReport?: (report: ReturnType<typeof fakeReport>) => void;
  } = {},
) {
  const downloads: string[] = [];
  const launches: LaunchRecord[] = [];
  let activeLaunches = 0;
  let maximumConcurrentLaunches = 0;
  const dependencies = {
    outputRoot,
    assertReady: async () => {},
    captureEnvironment: async () => ({ fixture: "contract" }),
    prepareWorkspace: (row: AcquisitionRow) => prepareFakeWorkspace(collector, row, outputRoot),
    electron: {
      ProgressReportStage: { ResolvedVersion: "resolvedVersion" },
      downloadAndUnzipVSCode: async ({ version, reporter }: Record<string, any>) => {
        downloads.push(version);
        const lane = version === "stable" ? "current-stable" : "minimum";
        reporter.report({
          stage: "resolvedVersion",
          version: version === "stable" ? "1.123.4" : "1.91.0",
        });
        return `mock-vscode-${lane}`;
      },
      runTests: async (invocation: Record<string, any>) => {
        activeLaunches += 1;
        maximumConcurrentLaunches = Math.max(maximumConcurrentLaunches, activeLaunches);
        launches.push(invocation as LaunchRecord);
        const env = invocation.extensionTestsEnv as Record<string, string>;
        const report = fakeReport(collector, env);
        options.mutateReport?.(report);
        writeFileSync(env.AURELIA_LS_EXTENSION_HOST_TAIL_REPORT_PATH!, `${JSON.stringify(report)}\n`);
        writeFakeClientLogs(invocation, options.clientLogCount ?? 1, options.clientLogFault);
        writeFakeExtensionHostLogs(
          invocation,
          options.extensionHostLogCount ?? 1,
          options.extensionHostActivationRecords,
        );
        invocation.stdout.write("fake extension host stdout\n");
        if (Number(env.AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE) === options.stderrOnSequence) {
          invocation.stderr.write("forced stderr\n");
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
        activeLaunches -= 1;
        return Number(env.AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE) === options.exitCodeOnSequence
          ? 1
          : 0;
      },
    },
  };
  return {
    dependencies,
    downloads,
    launches,
    maxConcurrentLaunches: () => maximumConcurrentLaunches,
  };
}

function writeFakeClientLogs(
  invocation: Record<string, any>,
  count: number,
  fault: string | undefined,
): void {
  const env = invocation.extensionTestsEnv as Record<string, string>;
  const userDataArgument = (invocation.launchArgs as string[])
    .find((argument) => argument.startsWith("--user-data-dir="));
  if (userDataArgument == null) throw new Error("Fake launch omitted --user-data-dir.");
  const userDataDirectory = userDataArgument.slice("--user-data-dir=".length);
  for (let index = 1; index <= count; index += 1) {
    const clientLogDirectory = path.join(
      userDataDirectory,
      "logs",
      `fake-session-${index}`,
      "window1",
      "exthost",
      "AureliaEffect.aurelia-2",
    );
    mkdirSync(clientLogDirectory, { recursive: true });
    const lines = [
      `2026-08-09 12:00:00.000 [info] [client] started ${pathToFileURL(env.AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE!).href} from package-manifest`,
      ...(fault == null ? [] : [`2026-08-09 12:00:00.001 [error] ${fault}`]),
      "2026-08-09 12:00:00.002 [info] [client] stopped",
      "2026-08-09 12:00:00.003 [error] [client] context reset failed Canceled",
    ];
    writeFileSync(path.join(clientLogDirectory, "Aurelia LS (Client).log"), `${lines.join("\n")}\n`);
  }
}

function writeFakeExtensionHostLogs(
  invocation: Record<string, any>,
  count: number,
  records: readonly string[] = [
    "ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: 'workspaceContains:node_modules/aurelia/package.json'",
  ],
): void {
  const userDataArgument = (invocation.launchArgs as string[])
    .find((argument) => argument.startsWith("--user-data-dir="));
  if (userDataArgument == null) throw new Error("Fake launch omitted --user-data-dir.");
  const userDataDirectory = userDataArgument.slice("--user-data-dir=".length);
  for (let index = 1; index <= count; index += 1) {
    const extensionHostLogDirectory = path.join(
      userDataDirectory,
      "logs",
      `fake-session-${index}`,
      "window1",
      "exthost",
    );
    mkdirSync(extensionHostLogDirectory, { recursive: true });
    const lines = records.length === 0
      ? ["2026-08-09 12:00:00.000 [info] Extension Host started"]
      : records.map((record, recordIndex) =>
        `2026-08-09 12:00:00.00${recordIndex} [info] ${record}`
      );
    writeFileSync(
      path.join(extensionHostLogDirectory, "exthost.log"),
      `${lines.join("\n")}\n`,
    );
  }
}

function prepareFakeWorkspace(
  collector: CollectorModule,
  row: AcquisitionRow,
  outputRoot: string,
): Record<string, any> {
  const workspace = collector.sampleWorkspacePaths(row, outputRoot);
  const { sampleRoot, workspaceRoot, userDataDirectory, extensionsDirectory } = workspace;
  mkdirSync(path.join(workspaceRoot, "src", "routes"), { recursive: true });
  mkdirSync(userDataDirectory, { recursive: true });
  mkdirSync(extensionsDirectory, { recursive: true });
  writeFileSync(path.join(workspaceRoot, "src", "routes", "service-plan-list-route.html"), "searchText\n");
  writeFileSync(workspace.testWorkspace, "{}\n");
  return {
    ...workspace,
    workspaceDependencies: collector.prepareWorkspaceDependencies(workspace),
  };
}

function createBareWorkspace(
  collector: CollectorModule,
  row: AcquisitionRow,
  outputRoot: string,
): Record<string, any> {
  const workspace = collector.sampleWorkspacePaths(row, outputRoot);
  mkdirSync(workspace.workspaceRoot, { recursive: true });
  writeFileSync(path.join(workspace.workspaceRoot, "package.json"), "{}\n");
  return workspace;
}

function createMockDependencyRoot(
  root: string,
  specifiers: readonly string[],
  owner = "dependency-owner",
): string {
  const dependencyOwner = path.join(root, owner);
  const dependencyRoot = path.join(dependencyOwner, "node_modules");
  mkdirSync(dependencyRoot, { recursive: true });
  writeFileSync(path.join(dependencyOwner, "package.json"), "{}\n");
  for (const specifier of specifiers) {
    const packageRoot = path.join(dependencyRoot, ...specifier.split("/"));
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(path.join(packageRoot, "package.json"), `${JSON.stringify({
      name: specifier,
      main: "index.cjs",
    })}\n`);
    writeFileSync(path.join(packageRoot, "index.cjs"), "module.exports = {};\n");
  }
  return dependencyRoot;
}

function fakeReport(collector: CollectorModule, env: Record<string, string>) {
  const launch = Number(env.AURELIA_LS_EXTENSION_HOST_TAIL_LAUNCH_EPOCH_MS);
  const sequence = Number(env.AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE);
  const monotonic = sequence * 100;
  const journey = env.AURELIA_LS_EXTENSION_HOST_TAIL_JOURNEY;
  const workspace = env.AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE!;
  return {
    schemaVersion: collector.sampleSchemaVersion,
    validation: { status: "passed", errors: [] },
    journey,
    lane: env.AURELIA_LS_EXTENSION_HOST_TAIL_LANE,
    requestedVersion: env.AURELIA_LS_EXTENSION_HOST_TAIL_REQUESTED_VERSION,
    resolvedVersion: env.AURELIA_LS_EXTENSION_HOST_TAIL_RESOLVED_VERSION,
    actualVersion: env.AURELIA_LS_EXTENSION_HOST_TAIL_RESOLVED_VERSION,
    transport: "worker",
    pair: Number(env.AURELIA_LS_EXTENSION_HOST_TAIL_PAIR),
    sequence,
    pairPosition: Number(env.AURELIA_LS_EXTENSION_HOST_TAIL_PAIR_POSITION),
    workspace,
    method: {
      activation: "shipping-workspaceContains-eager-activation",
      activationMode: "auto",
      activeAtTestEntry: true,
      readiness: "already-active-api-readiness-check",
      providerObservationScope: "test-entry-through-receipt",
      targetUnopenedAtTestEntry: true,
      targetUnshownAtTestEntry: true,
      zeroObservedDocumentProviderRequestsBeforeTrigger: true,
      diagnosticReschedulePolicy: {
        suiteTriggerCount: 1,
        suiteRetryCount: 0,
        receiptTimeoutMilliseconds: 25_000,
        hostInclusiveMaximumMillisecondsExclusive: 30_000,
        timeoutBoundary: "before sole suite trigger through full response",
        attemptCardinalityLimit: null,
        sequence: "[request, authenticated Canceled failure]* then [request, full response]",
        timing: "first request through final response",
        cancellationCountAcceptanceThreshold: null,
      },
    },
    document: {
      uri: pathToFileURL(path.join(workspace, "src", "routes", "service-plan-list-route.html")).href,
      relativePath: "src/routes/service-plan-list-route.html",
      version: 1,
    },
    timing: {
      launchEpochMilliseconds: launch,
      testEntryEpochMilliseconds: launch + 1,
      readinessStartEpochMilliseconds: launch + 2,
      readinessCompleteEpochMilliseconds: launch + 3,
      triggerEpochMilliseconds: launch + 4,
      requestEpochMilliseconds: launch + 5,
      receiptEpochMilliseconds: launch + 10,
      completionSettledEpochMilliseconds: journey === "first-completion" ? launch + 11 : null,
      testEntryMonotonicMilliseconds: monotonic,
      readinessStartMonotonicMilliseconds: monotonic + 1,
      readinessCompleteMonotonicMilliseconds: monotonic + 2,
      triggerMonotonicMilliseconds: monotonic + 3,
      requestMonotonicMilliseconds: monotonic + 4,
      receiptMonotonicMilliseconds: monotonic + 9,
      completionSettledMonotonicMilliseconds: journey === "first-completion" ? monotonic + 10 : null,
      hostInclusiveMilliseconds: 10,
      readinessWaitMilliseconds: 1,
      requestLocalMilliseconds: 5,
      completionSettledHostInclusiveMilliseconds: journey === "first-completion" ? 11 : null,
    },
    witness: journey === "cold-full-diagnostics"
      ? {
          kind: "diagnostics",
          observationId: `diagnostics:${sequence}`,
          previousResultIdPresent: false,
          reportKind: "full",
          itemCount: 0,
          resultIdPresent: true,
          providerRequestCount: 1,
          providerResponseCount: 1,
          providerFailureCount: 0,
          canceledAttemptsBeforeReceipt: 0,
          diagnosticAttempts: [{
            observationId: `diagnostics:${sequence}`,
            request: {
              source: "language-client-provider",
              operation: "diagnostics",
              phase: "request",
              uri: pathToFileURL(path.join(
                workspace,
                "src",
                "routes",
                "service-plan-list-route.html",
              )).href,
              documentVersion: 1,
              epochMilliseconds: launch + 5,
              monotonicMilliseconds: monotonic + 4,
              previousResultIdPresent: false,
            },
            terminal: {
              source: "language-client-provider",
              operation: "diagnostics",
              phase: "response",
              uri: pathToFileURL(path.join(
                workspace,
                "src",
                "routes",
                "service-plan-list-route.html",
              )).href,
              documentVersion: 1,
              epochMilliseconds: launch + 10,
              monotonicMilliseconds: monotonic + 9,
              cancellationRequested: false,
              errorName: null,
              serverRetriggerRequested: false,
              reportKind: "full",
              itemCount: 0,
              resultIdPresent: true,
            },
          }],
          cancellationRequested: false,
        }
      : {
          kind: "completion",
          observationId: `completion:${sequence}`,
          itemCount: 1,
          expectedLabel: "searchText",
          completionKind: 9,
          insertText: "searchText",
          replacementText: "searchText",
          detailIncludesTypeMember: true,
          diagnosticRequestsBeforeReceipt: 0,
          providerRequestCount: 1,
          providerResponseCount: 1,
          providerFailureCount: 0,
          cancellationRequested: false,
        },
    error: null,
  };
}

function addNativeDiagnosticCancellations(
  report: ReturnType<typeof fakeReport>,
  canceledAttempts: number,
): void {
  const template = report.witness.diagnosticAttempts[0];
  const attempts = Array.from({ length: canceledAttempts + 1 }, (_, index) => {
    const attempt = structuredClone(template);
    attempt.observationId = `${template.observationId}:attempt-${index + 1}`;
    attempt.request.epochMilliseconds = template.request.epochMilliseconds + index * 2;
    attempt.request.monotonicMilliseconds = template.request.monotonicMilliseconds + index * 2;
    attempt.terminal.epochMilliseconds = attempt.request.epochMilliseconds + 1;
    attempt.terminal.monotonicMilliseconds = attempt.request.monotonicMilliseconds + 1;
    if (index < canceledAttempts) {
      attempt.terminal = {
        ...attempt.terminal,
        phase: "failed",
        cancellationRequested: index % 2 === 0,
        errorName: "Canceled",
        serverRetriggerRequested: index % 2 === 1,
        reportKind: null,
        itemCount: null,
        resultIdPresent: null,
      };
    }
    return attempt;
  });
  const final = attempts.at(-1)!;
  report.witness.observationId = final.observationId;
  report.witness.providerRequestCount = attempts.length;
  report.witness.providerResponseCount = 1;
  report.witness.providerFailureCount = canceledAttempts;
  report.witness.canceledAttemptsBeforeReceipt = canceledAttempts;
  report.witness.diagnosticAttempts = attempts;
  report.timing.requestEpochMilliseconds = attempts[0]!.request.epochMilliseconds;
  report.timing.requestMonotonicMilliseconds = attempts[0]!.request.monotonicMilliseconds;
  report.timing.receiptEpochMilliseconds = final.terminal.epochMilliseconds;
  report.timing.receiptMonotonicMilliseconds = final.terminal.monotonicMilliseconds;
  report.timing.hostInclusiveMilliseconds =
    final.terminal.epochMilliseconds - report.timing.launchEpochMilliseconds;
  report.timing.requestLocalMilliseconds =
    final.terminal.monotonicMilliseconds - attempts[0]!.request.monotonicMilliseconds;
}

function workspaceArgument(launch: LaunchRecord): string {
  return launch.launchArgs[0]!;
}

function userDataArgument(launch: LaunchRecord): string {
  return launch.launchArgs.find((argument) => argument.startsWith("--user-data-dir="))!;
}
