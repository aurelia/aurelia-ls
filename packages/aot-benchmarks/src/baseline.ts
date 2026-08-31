import { execFile } from 'node:child_process';
import { hostname } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  PERFORMANCE_RESULT_SCHEMA_VERSION,
  PERFORMANCE_RUN_SCHEMA_VERSION,
  PERFORMANCE_CONTRACT_VERSION,
  assertPerformanceResult,
  assertPerformanceRun,
  type ApplicationResult,
  type BuildIdentity,
  type HashedFileIdentity,
  type PerformanceResult,
  type PerformanceRun,
  type ScenarioResult,
} from './contracts.js';
import { assertProductionBuildAssurance } from './assurance.js';
import {
  resolveBenchmarkBrowserDriverIdentity,
  resolveBenchmarkBrowserIdentity,
} from './browser.js';
import {
  measureBuildCohort,
  writeJoinedAotReceipt,
  type MeasuredBenchmarkLane,
  type MeasuredBuildCohort,
} from './build-cohort.js';
import { buildBenchmarkLane, type BenchmarkLaneBuild } from './build.js';
import {
  createPerformanceCalibrationManifest,
  validateIdenticalLaneSampleCount,
  type ScenarioCalibrationIdentity,
} from './calibration.js';
import { captureExecutorIdentity, createSamplingIdentity } from './environment.js';
import { prepareFrameworkPackageGraph } from './framework-graph.js';
import {
  createLockedPerformancePortfolio,
  type PortfolioRuntimeScenario,
} from './portfolio.js';
import {
  createMeasuredApplicationResult,
  persistJsonEvidence,
  type ApplicationCorrectnessAdmission,
} from './result-support.js';
import { renderPerformanceReportMarkdown } from './report.js';
import {
  RC2_ALIGNED_GROUNDING_EPOCH,
  captureAotSourceWorldIdentity,
  captureBaselineToolchainIdentity,
  persistScenarioManifestIdentity,
} from './run-identity.js';
import {
  stageLockedBrowserWorkloads,
  type StagedBrowserRoot,
} from './staging.js';
import {
  runTachometerScenario,
  type TachometerMeasurement,
} from './tachometer.js';
import {
  normalizeTachometerAbBaMeasurements,
  type TachometerMetricBinding,
} from './tachometer-result.js';
import { hashedFileIdentity } from './toolchain.js';

const execFileAsync = promisify(execFile);

export interface PromotedBaselineOptions {
  readonly repositoryRoot?: string;
  readonly executorId?: string;
  readonly powerPosture?: string;
}

export interface PromotedBaselineOutcome {
  readonly runId: string;
  readonly runRoot: string;
  readonly runFile: HashedFileIdentity;
  readonly resultFile: HashedFileIdentity;
  readonly reportFile: HashedFileIdentity;
  readonly run: PerformanceRun;
  readonly result: PerformanceResult;
}

/** Execute the complete, manually promoted v0.1 portfolio against one exact source world. */
export async function runPromotedBaseline(
  options: PromotedBaselineOptions = {},
): Promise<PromotedBaselineOutcome> {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? path.resolve(import.meta.dirname, '../../..'));
  const packageRoot = path.join(repositoryRoot, 'packages', 'aot-benchmarks');
  const createdAt = new Date().toISOString();
  const revision = await git(repositoryRoot, ['rev-parse', '--short=12', 'HEAD']);
  const runId = `${createdAt.replace(/[-:.TZ]/gu, '')}-${revision}`;
  const runsRoot = path.join(repositoryRoot, '.temp', 'aot-benchmarks', 'runs');
  const runRoot = path.join(runsRoot, runId);
  await mkdir(runsRoot, { recursive: true });
  await mkdir(runRoot);

  const portfolio = createLockedPerformancePortfolio(repositoryRoot);
  const manifest = await persistScenarioManifestIdentity({ manifest: portfolio.manifest, runRoot });
  const framework = await prepareFrameworkPackageGraph({
    frameworkRoot: path.join(repositoryRoot, 'aurelia'),
    runRoot,
    rootPackages: ['aurelia', '@aurelia/router'],
  });

  try {
    progress('Capturing exact source, browser, and build-toolchain identity');
    const sourceWorld = await captureAotSourceWorldIdentity({ repositoryRoot, framework });
    const browser = await resolveBenchmarkBrowserIdentity();
    const browserDriver = await resolveBenchmarkBrowserDriverIdentity({
      repositoryRoot,
      browserVersion: browser.identity.version,
    });
    const toolchain = await captureBaselineToolchainIdentity(packageRoot, browserDriver);
    const tachometerVersion = await readPackageVersion(path.join(packageRoot, 'node_modules', 'tachometer'));

    progress('Building all applications through official JIT and current AOT');
    const primaryBuilds = await buildApplications(
      portfolio.applications,
      path.join(runRoot, 'builds', 'primary'),
      framework,
      ['jit', 'aot'],
    );
    const [jitCohort, aotCohort] = await Promise.all([
      measureBuildCohort(primaryBuilds.filter(build => build.mode === 'jit')),
      measureBuildCohort(primaryBuilds.filter(build => build.mode === 'aot')),
    ]);
    const firstAotReceipt = await writeJoinedAotReceipt({
      cohort: aotCohort,
      outputPath: path.join(runRoot, 'receipts', 'aot-primary.json'),
      relativeTo: runRoot,
    });

    progress('Rebuilding AOT independently for deterministic artifact and receipt identity');
    const deterministicBuilds = await buildApplications(
      portfolio.applications,
      path.join(runRoot, 'builds', 'determinism'),
      framework,
      ['aot'],
    );
    const deterministicCohort = await measureBuildCohort(deterministicBuilds);
    const secondAotReceipt = await writeJoinedAotReceipt({
      cohort: deterministicCohort,
      outputPath: path.join(runRoot, 'receipts', 'aot-determinism.json'),
      relativeTo: runRoot,
    });
    assertDeterministicAot(aotCohort, deterministicCohort, firstAotReceipt, secondAotReceipt);

    progress('Running exact minified browser assurance for production size applications');
    const assuranceByApplication = new Map<string, Awaited<ReturnType<typeof assertProductionBuildAssurance>>>();
    const primaryBuildByKey = new Map(primaryBuilds.map(build => [
      `${build.applicationId}/${build.mode}`,
      build,
    ]));
    for (const application of portfolio.applications) {
      if (application.assuranceScenario == null) continue;
      const assurance = await assertProductionBuildAssurance({
        scenario: application.assuranceScenario,
        jit: primaryBuildByKey.get(`${application.id}/jit`)!,
        aot: primaryBuildByKey.get(`${application.id}/aot`)!,
        browserExecutablePath: browser.executablePath,
        browserArguments: browser.identity.flags,
      });
      assuranceByApplication.set(application.id, assurance);
    }
    const runtimeBuilds = primaryBuilds.filter(build =>
      portfolio.applications.find(application => application.id === build.applicationId)?.role === 'runtime'
    );
    const [jitAotStage, aotJitStage, jitJitStage] = await Promise.all([
      stageLockedBrowserWorkloads({
        packageRoot,
        browserRoot: path.join(runRoot, 'browser', 'jit-aot'),
        order: 'jit-aot',
        builds: runtimeBuilds,
      }),
      stageLockedBrowserWorkloads({
        packageRoot,
        browserRoot: path.join(runRoot, 'browser', 'aot-jit'),
        order: 'aot-jit',
        builds: runtimeBuilds,
      }),
      stageLockedBrowserWorkloads({
        packageRoot,
        browserRoot: path.join(runRoot, 'browser', 'jit-jit'),
        order: 'jit-jit',
        builds: runtimeBuilds.filter(build => build.mode === 'jit'),
      }),
    ]);
    const stagingFiles = await Promise.all([
      persistStagingManifest(jitAotStage, runRoot),
      persistStagingManifest(aotJitStage, runRoot),
      persistStagingManifest(jitJitStage, runRoot),
    ]);

    progress('Calibrating identical-lane sample counts');
    const calibration = await calibrateScenarios({
      scenarios: portfolio.runtimeScenarios,
      stage: jitJitStage,
      browserBinary: browser.executablePath,
      runRoot,
    });
    const calibrationManifest = createPerformanceCalibrationManifest(calibration.entries);
    const calibrationManifestFile = await persistJsonEvidence({
      outputPath: path.join(runRoot, 'calibration', 'manifest.json'),
      relativeTo: runRoot,
      value: calibrationManifest,
    });

    progress('Running the counterbalanced JIT/AOT runtime portfolio');
    const measured = await measureScenarios({
      scenarios: portfolio.runtimeScenarios,
      jitAotStage,
      aotJitStage,
      browserBinary: browser.executablePath,
      perOrderSampleCount: calibration.perOrderSampleCount,
      runRoot,
    });

    const evidenceInputs: HashedFileIdentity[] = [
      manifest.file,
      calibrationManifestFile,
      ...stagingFiles,
      ...calibration.rawResults,
      ...calibration.configs,
      ...measured.rawResults,
      ...measured.configs,
    ];
    const semanticEvidence = new Map<string, HashedFileIdentity>();
    const correctnessEvidence = new Map<string, HashedFileIdentity>();
    const measuredJitByApplication = indexMeasuredApplications(jitCohort);
    const measuredAotByApplication = indexMeasuredApplications(aotCohort);
    for (const application of portfolio.applications) {
      const aot = measuredAotByApplication.get(application.id)!;
      const semanticFile = await persistJsonEvidence({
        outputPath: path.join(runRoot, 'evidence', `${application.id}.semantic-aot.json`),
        relativeTo: runRoot,
        value: {
          schemaVersion: 1,
          applicationId: application.id,
          semantic: aot.build.semanticEvidence,
          vite: aot.build.aotReceipt,
        },
      });
      semanticEvidence.set(application.id, semanticFile);
      evidenceInputs.push(semanticFile);

      if (application.assuranceScenario != null) {
        const assurance = assuranceByApplication.get(application.id);
        if (assurance == null) throw new Error(`Application '${application.id}' has no browser assurance evidence.`);
        const evidence = await persistJsonEvidence({
          outputPath: path.join(runRoot, 'evidence', `${application.id}.browser-assurance.json`),
          relativeTo: runRoot,
          value: assurance,
        });
        correctnessEvidence.set(application.id, evidence);
        evidenceInputs.push(evidence);
      }
    }

    const scenarioIdsByApplication = runtimeScenarioIdsByApplication(portfolio.runtimeScenarios);
    for (const [applicationId, scenarioIds] of scenarioIdsByApplication) {
      const rawResults = measured.rawByScenario
        .filter(entry => scenarioIds.includes(entry.scenarioId))
        .flatMap(entry => [entry.jitAot, entry.aotJit]);
      const evidence = await persistJsonEvidence({
        outputPath: path.join(runRoot, 'evidence', `${applicationId}.runtime-oracles.json`),
        relativeTo: runRoot,
        value: {
          schemaVersion: 1,
          applicationId,
          state: 'passed',
          scenarioIds,
          rawResults,
          browserStaging: stagingFiles.slice(0, 2),
        },
      });
      correctnessEvidence.set(applicationId, evidence);
      evidenceInputs.push(evidence);
    }

    const rawResultFiles = sortIdentities([...calibration.rawResults, ...measured.rawResults]);
    const sampling = createSamplingIdentity({
      producerVersion: tachometerVersion,
      orderPolicy: 'ab-ba',
      latencySamples: {
        kind: 'fixed-by-scenario',
        calibrationSha256: calibrationManifestFile.sha256,
        scenarios: [...calibration.perOrderSampleCount]
          .map(([scenarioId, count]) => ({ scenarioId, samplesPerVariant: count * 2 }))
          .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId)),
      },
      rawResultFiles,
    });
    const determinism = {
      firstAotArtifactSetSha256: aotCohort.artifacts.artifactSetSha256,
      secondAotArtifactSetSha256: deterministicCohort.artifacts.artifactSetSha256,
      firstAotReceiptSha256: firstAotReceipt.sha256,
      secondAotReceiptSha256: secondAotReceipt.sha256,
      identical: true,
      identicalLaneCalibration: calibrationManifestFile,
    } as const;
    const run: PerformanceRun = {
      schemaVersion: PERFORMANCE_RUN_SCHEMA_VERSION,
      contractVersion: PERFORMANCE_CONTRACT_VERSION,
      runId,
      createdAt,
      executionProfile: 'baseline-promotion',
      grounding: RC2_ALIGNED_GROUNDING_EPOCH,
      manifest: manifest.identity,
      sources: sourceWorld,
      toolchain,
      comparison: {
        comparisonKind: 'jit-vs-aot-control',
        controlVariantId: 'official-jit',
        candidateVariantId: 'aot-c0-control',
      },
      variants: [
        {
          variantId: 'official-jit',
          profile: { buildMode: 'jit', profileId: 'official-jit' },
          build: cohortBuildIdentity(jitCohort, null),
        },
        {
          variantId: 'aot-c0-control',
          profile: {
            buildMode: 'aot',
            profileId: 'c0-app-aggregate-control',
            coordinates: {
              authorityScope: 'app-root',
              fallback: 'none',
              runtimeConfiguration: 'strict-groups',
              runtimeRealization: 'generic',
              objective: 'control',
              debugPosture: 'performance-no-map',
              frameworkRewrite: 'none',
              inputAuthority: 'user-declared',
            },
          },
          build: cohortBuildIdentity(aotCohort, firstAotReceipt),
        },
      ],
      executor: captureExecutorIdentity(
        options.executorId ?? process.env.AURELIA_AOT_BENCHMARK_EXECUTOR ?? hostname(),
        options.powerPosture ?? process.env.AURELIA_AOT_BENCHMARK_POWER_POSTURE ?? 'unknown',
      ),
      browser: browser.identity,
      sampling,
      determinism,
    };
    assertPerformanceRun(run);
    const runFile = await persistJsonEvidence({
      outputPath: path.join(runRoot, 'run.json'),
      relativeTo: runRoot,
      value: run,
    });

    const applications: ApplicationResult[] = portfolio.applications.map(application => {
      const correctness: ApplicationCorrectnessAdmission = application.assuranceScenario == null
        ? {
            kind: 'runtime-oracle',
            scenarioIds: scenarioIdsByApplication.get(application.id) ?? [],
          }
        : {
            kind: 'browser-assurance',
            assuranceScenarioId: application.assuranceScenario,
          };
      return createMeasuredApplicationResult({
        jit: measuredJitByApplication.get(application.id)!,
        aot: measuredAotByApplication.get(application.id)!,
        semanticEvidence: semanticEvidence.get(application.id)!,
        correctness,
        correctnessEvidence: correctnessEvidence.get(application.id)!,
      });
    });
    const result: PerformanceResult = {
      schemaVersion: PERFORMANCE_RESULT_SCHEMA_VERSION,
      contractVersion: PERFORMANCE_CONTRACT_VERSION,
      runId,
      runSha256: runFile.sha256,
      completedAt: new Date().toISOString(),
      scenarios: measured.scenarios,
      applications,
      resultInputs: sortIdentities(evidenceInputs),
    };
    assertPerformanceResult(result, run);
    const resultFile = await persistJsonEvidence({
      outputPath: path.join(runRoot, 'result.json'),
      relativeTo: runRoot,
      value: result,
    });
    const reportPath = path.join(runRoot, 'report.md');
    await writeFile(reportPath, renderPerformanceReportMarkdown(run, result), 'utf8');
    const reportFile = await hashedFileIdentity(reportPath, runRoot);
    return { runId, runRoot, runFile, resultFile, reportFile, run, result };
  } finally {
    await framework.dispose();
  }
}

async function buildApplications(
  applications: ReturnType<typeof createLockedPerformancePortfolio>['applications'],
  outputRoot: string,
  framework: Awaited<ReturnType<typeof prepareFrameworkPackageGraph>>,
  modes: readonly ('jit' | 'aot')[],
): Promise<BenchmarkLaneBuild[]> {
  const builds: BenchmarkLaneBuild[] = [];
  for (const application of applications) {
    for (const mode of modes) {
      progress(`  ${application.id}/${mode}`);
      builds.push(await buildBenchmarkLane({ application, mode, outputRoot, framework }));
    }
  }
  return builds;
}

async function calibrateScenarios(request: {
  readonly scenarios: readonly PortfolioRuntimeScenario[];
  readonly stage: StagedBrowserRoot;
  readonly browserBinary: string;
  readonly runRoot: string;
}): Promise<{
  readonly entries: readonly ScenarioCalibrationIdentity[];
  readonly perOrderSampleCount: ReadonlyMap<string, number>;
  readonly rawResults: readonly HashedFileIdentity[];
  readonly configs: readonly HashedFileIdentity[];
}> {
  const entries: ScenarioCalibrationIdentity[] = [];
  const counts = new Map<string, number>();
  const rawResults: HashedFileIdentity[] = [];
  const configs: HashedFileIdentity[] = [];
  for (const scenario of request.scenarios) {
    const execution = scenarioExecution(scenario);
    const scenarioId = scenario.descriptor.manifest.scenarioId;
    if (!scenario.descriptor.manifest.metrics.some(metric => metric.unit === 'milliseconds')) {
      counts.set(scenarioId, execution.sampleSize ?? 20);
      continue;
    }
    const resultPath = path.join(request.runRoot, 'raw', 'jit-jit', `${scenarioId}.json`);
    const configPath = path.join(request.runRoot, 'configs', 'jit-jit', `${scenarioId}.json`);
    progress(`  ${scenarioId}/jit-jit`);
    await runTachometerScenario({
      scenarioId,
      browserRoot: request.stage.browserRoot,
      pagePath: stagedPage(request.stage, scenarioId),
      measurements: execution.measurements,
      order: 'jit-jit',
      resultPath,
      configPath,
      browserBinary: request.browserBinary,
      timeoutMinutes: execution.timeoutMinutes,
      exposeGc: execution.exposeGc,
    });
    const [output, rawResult, config] = await Promise.all([
      readJson(resultPath),
      hashedFileIdentity(resultPath, request.runRoot),
      hashedFileIdentity(configPath, request.runRoot),
    ]);
    const count = validateIdenticalLaneSampleCount({
      scenarioId,
      output,
      metrics: metricBindings(scenario, execution.measurements),
    });
    counts.set(scenarioId, count);
    entries.push({ scenarioId, fixedSamplesPerVariant: count, rawResult });
    rawResults.push(rawResult);
    configs.push(config);
  }
  return {
    entries,
    perOrderSampleCount: counts,
    rawResults: sortIdentities(rawResults),
    configs: sortIdentities(configs),
  };
}

async function measureScenarios(request: {
  readonly scenarios: readonly PortfolioRuntimeScenario[];
  readonly jitAotStage: StagedBrowserRoot;
  readonly aotJitStage: StagedBrowserRoot;
  readonly browserBinary: string;
  readonly perOrderSampleCount: ReadonlyMap<string, number>;
  readonly runRoot: string;
}): Promise<{
  readonly scenarios: readonly ScenarioResult[];
  readonly rawResults: readonly HashedFileIdentity[];
  readonly configs: readonly HashedFileIdentity[];
  readonly rawByScenario: readonly {
    readonly scenarioId: string;
    readonly jitAot: HashedFileIdentity;
    readonly aotJit: HashedFileIdentity;
  }[];
}> {
  const scenarios: ScenarioResult[] = [];
  const rawResults: HashedFileIdentity[] = [];
  const configs: HashedFileIdentity[] = [];
  const rawByScenario: { scenarioId: string; jitAot: HashedFileIdentity; aotJit: HashedFileIdentity }[] = [];
  for (const scenario of request.scenarios) {
    const execution = scenarioExecution(scenario);
    const scenarioId = scenario.descriptor.manifest.scenarioId;
    const sampleSize = request.perOrderSampleCount.get(scenarioId);
    if (sampleSize == null) throw new Error(`Scenario '${scenarioId}' has no calibrated sample count.`);
    const orderRows = [];
    for (const [order, stage] of [
      ['jit-aot', request.jitAotStage],
      ['aot-jit', request.aotJitStage],
    ] as const) {
      const resultPath = path.join(request.runRoot, 'raw', order, `${scenarioId}.json`);
      const configPath = path.join(request.runRoot, 'configs', order, `${scenarioId}.json`);
      progress(`  ${scenarioId}/${order} (${sampleSize} samples per row)`);
      await runTachometerScenario({
        scenarioId,
        browserRoot: stage.browserRoot,
        pagePath: stagedPage(stage, scenarioId),
        measurements: execution.measurements,
        order,
        resultPath,
        configPath,
        browserBinary: request.browserBinary,
        sampleSize,
        timeoutMinutes: 0,
        exposeGc: execution.exposeGc,
      });
      const [output, rawResult, config] = await Promise.all([
        readJson(resultPath),
        hashedFileIdentity(resultPath, request.runRoot),
        hashedFileIdentity(configPath, request.runRoot),
      ]);
      rawResults.push(rawResult);
      configs.push(config);
      orderRows.push({ order, output, rawResult });
    }
    const jitAot = orderRows[0]!;
    const aotJit = orderRows[1]!;
    scenarios.push({
      scenarioId,
      oraclePassed: true,
      measurements: normalizeTachometerAbBaMeasurements({
        scenarioId,
        jitAot: jitAot.output,
        aotJit: aotJit.output,
        metrics: metricBindings(scenario, execution.measurements),
      }),
    });
    rawByScenario.push({ scenarioId, jitAot: jitAot.rawResult, aotJit: aotJit.rawResult });
  }
  return {
    scenarios,
    rawResults: sortIdentities(rawResults),
    configs: sortIdentities(configs),
    rawByScenario,
  };
}

function scenarioExecution(scenario: PortfolioRuntimeScenario): {
  readonly measurements: readonly TachometerMeasurement[];
  readonly exposeGc: boolean;
  readonly sampleSize: number | undefined;
  readonly timeoutMinutes: number;
} {
  if (scenario.family === 'repeat') {
    return {
      measurements: scenario.descriptor.tachometer.measurements,
      exposeGc: scenario.descriptor.tachometer.exposeGc,
      sampleSize: scenario.descriptor.tachometer.sampleSize,
      timeoutMinutes: scenario.descriptor.tachometer.timeoutMinutes,
    };
  }
  if (scenario.family === 'keyed-table') {
    return {
      measurements: scenario.descriptor.measurements,
      exposeGc: scenario.descriptor.exposeGc,
      sampleSize: scenario.descriptor.sampleSize ?? undefined,
      timeoutMinutes: 0.2,
    };
  }
  return {
    measurements: scenario.descriptor.measurements,
    exposeGc: scenario.descriptor.exposeGc,
    sampleSize: scenario.descriptor.sampleSize ?? undefined,
    timeoutMinutes: 0.25,
  };
}

function metricBindings(
  scenario: PortfolioRuntimeScenario,
  measurements: readonly TachometerMeasurement[],
): readonly TachometerMetricBinding[] {
  const metrics = scenario.descriptor.manifest.metrics;
  if (metrics.length !== measurements.length) {
    throw new Error(`Scenario '${scenario.descriptor.manifest.scenarioId}' has unequal manifest and Tachometer metrics.`);
  }
  return metrics.map((metric, index) => ({
    metricId: metric.metricId,
    unit: metric.unit,
    measurement: measurements[index]!,
  }));
}

function runtimeScenarioIdsByApplication(
  scenarios: readonly PortfolioRuntimeScenario[],
): ReadonlyMap<string, readonly string[]> {
  const result = new Map<string, string[]>();
  for (const scenario of scenarios) {
    const applicationId = scenario.family === 'repeat'
      ? scenario.descriptor.applicationId
      : scenario.family === 'keyed-table'
        ? 'keyed-table-optics'
        : 'routed-storefront-benchmark';
    const ids = result.get(applicationId) ?? [];
    ids.push(scenario.descriptor.manifest.scenarioId);
    result.set(applicationId, ids);
  }
  return result;
}

function indexMeasuredApplications(cohort: MeasuredBuildCohort): ReadonlyMap<string, MeasuredBenchmarkLane> {
  return new Map(cohort.applications.map(application => [application.build.applicationId, application]));
}

function cohortBuildIdentity(
  cohort: MeasuredBuildCohort,
  receipt: HashedFileIdentity | null,
): BuildIdentity {
  return {
    durationMs: cohort.durationMs,
    entryGraphSha256: cohort.entryGraphSha256,
    receipt,
    artifacts: cohort.artifacts,
    browserLoadedAssets: cohort.browserLoadedAssets,
  };
}

function assertDeterministicAot(
  first: MeasuredBuildCohort,
  second: MeasuredBuildCohort,
  firstReceipt: HashedFileIdentity,
  secondReceipt: HashedFileIdentity,
): void {
  if (
    first.artifacts.artifactSetSha256 !== second.artifacts.artifactSetSha256
    || firstReceipt.sha256 !== secondReceipt.sha256
  ) {
    throw new Error(
      'Independent AOT rebuild changed executable artifacts or the joined Vite receipt; baseline promotion refused.',
    );
  }
}

function stagedPage(stage: StagedBrowserRoot, scenarioId: string): string {
  const row = stage.manifest.scenarioPages.find(candidate => candidate.scenarioId === scenarioId);
  if (row == null) throw new Error(`Staged browser root has no page for '${scenarioId}'.`);
  return row.pagePath;
}

function persistStagingManifest(stage: StagedBrowserRoot, runRoot: string): Promise<HashedFileIdentity> {
  return persistJsonEvidence({
    outputPath: path.join(runRoot, 'inputs', `browser-staging-${stage.manifest.order}.json`),
    relativeTo: runRoot,
    value: stage.manifest,
  });
}

function sortIdentities(values: readonly HashedFileIdentity[]): HashedFileIdentity[] {
  const result = [...values].sort((left, right) => left.path.localeCompare(right.path));
  const paths = new Set<string>();
  for (const value of result) {
    if (paths.has(value.path)) throw new Error(`Result input '${value.path}' is repeated.`);
    paths.add(value.path);
  }
  return result;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}

async function readPackageVersion(packageRoot: string): Promise<string> {
  const manifest = await readJson(path.join(packageRoot, 'package.json'));
  const version = typeof manifest === 'object' && manifest != null && !Array.isArray(manifest)
    ? (manifest as { version?: unknown }).version
    : null;
  if (typeof version !== 'string' || version.length === 0) throw new Error(`${packageRoot} has no package version.`);
  return version;
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim();
}

function progress(message: string): void {
  process.stdout.write(`[aot-benchmark] ${message}\n`);
}
