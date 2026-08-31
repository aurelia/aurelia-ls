import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { measureArtifactSet } from '../src/artifact-metrics.js';
import {
  PERFORMANCE_CONTRACT_VERSION,
  PERFORMANCE_RESULT_SCHEMA_VERSION,
  PERFORMANCE_RUN_SCHEMA_VERSION,
  assertGroundingEpoch,
  assertPerformanceResult,
  assertPerformanceRun,
  assertVariantProfile,
  type ApplicationResult,
  type AotProfileCoordinates,
  type GitObjectId,
  type HashedFileIdentity,
  type PerformanceResult,
  type PerformanceRun,
  type Sha256,
} from '../src/contracts.js';

describe('performance contracts', () => {
  it('distinguishes aligned grounding from a forward probe', () => {
    expect(() => assertGroundingEpoch({
      epochId: 'rc2',
      frameworkUnderTestRevision: git('a'),
      semanticRuntimeFrameworkBasis: git('a'),
      atlasFrameworkBasis: git('a'),
      groundingStatus: 'aligned',
    })).not.toThrow();
    expect(() => assertGroundingEpoch({
      epochId: 'invalid',
      frameworkUnderTestRevision: git('a'),
      semanticRuntimeFrameworkBasis: git('b'),
      atlasFrameworkBasis: git('a'),
      groundingStatus: 'aligned',
    })).toThrow(/requires .* agree/u);
    expect(() => assertGroundingEpoch({
      epochId: 'master-probe',
      frameworkUnderTestRevision: git('b'),
      semanticRuntimeFrameworkBasis: git('a'),
      atlasFrameworkBasis: git('a'),
      groundingStatus: 'forward-probe',
    })).not.toThrow();
  });

  it('keeps JIT identity distinct from complete AOT profile coordinates', () => {
    expect(() => assertVariantProfile({ buildMode: 'jit', profileId: 'official-jit' })).not.toThrow();
    expect(() => assertVariantProfile({ buildMode: 'jit', profileId: 'official-jit', coordinates: controlCoordinates() }))
      .toThrow(/without AOT coordinates/u);
    expect(() => assertVariantProfile({ buildMode: 'aot', profileId: 'c0', coordinates: controlCoordinates() })).not.toThrow();
    expect(() => assertVariantProfile({
      buildMode: 'aot',
      profileId: 'partial',
      coordinates: { ...controlCoordinates(), frameworkRewrite: 'maybe' },
    })).toThrow(/framework rewrite/u);
  });

  it('admits a fully joined pair and requires promotion determinism', () => {
    const run = createRun();
    expect(() => assertPerformanceRun(run)).not.toThrow();
    const noDeterminism = { ...run, determinism: null };
    expect(() => assertPerformanceRun(noDeterminism)).toThrow(/Baseline promotion requires/u);
    expect(() => assertPerformanceRun({ ...run, sources: { ...run.sources, framework: {
      ...run.sources.framework,
      sourceRevision: git('b'),
    } } })).toThrow(/does not match the grounding/u);
  });

  it('requires calibration-derived per-scenario counts for promotion while retaining targeted policies', () => {
    const run = createRun();
    const adaptive = {
      ...run,
      executionProfile: 'targeted',
      sampling: { ...run.sampling, latencySamples: { kind: 'adaptive', timeoutMinutes: 5 } },
      determinism: null,
    };
    expect(() => assertPerformanceRun(adaptive)).not.toThrow();
    expect(() => assertPerformanceRun({
      ...adaptive,
      sampling: { ...adaptive.sampling, latencySamples: { kind: 'fixed', samplesPerVariant: 20 } },
    })).not.toThrow();
    expect(() => assertPerformanceRun({ ...adaptive, executionProfile: 'baseline-promotion' }))
      .toThrow(/requires deterministic AOT rebuild/u);
    expect(() => assertPerformanceRun({
      ...run,
      sampling: { ...run.sampling, latencySamples: { kind: 'adaptive', timeoutMinutes: 5 } },
    })).toThrow(/requires calibrated fixed latency samples/u);
    expect(() => assertPerformanceRun({
      ...run,
      sampling: {
        ...run.sampling,
        latencySamples: { ...run.sampling.latencySamples, calibrationSha256: digest('other-calibration') },
      },
    })).toThrow(/do not name the run identical-lane calibration/u);
  });

  it('requires loaded browser assets to be exact emitted bytes', () => {
    const run = structuredClone(createRun()) as any;
    run.variants[1].build.browserLoadedAssets[0].sha256 = digest('other');
    expect(() => assertPerformanceRun(run)).toThrow(/absent from or differs/u);
  });

  it('requires equal envelopes when comparing AOT profiles', () => {
    const run = structuredClone(createRun()) as any;
    run.comparison = {
      comparisonKind: 'aot-control-vs-candidate',
      controlVariantId: 'control',
      candidateVariantId: 'candidate',
    };
    run.variants[0].profile = { buildMode: 'aot', profileId: 'c0', coordinates: controlCoordinates() };
    run.variants[1].profile = {
      buildMode: 'aot',
      profileId: 'size',
      coordinates: { ...controlCoordinates(), objective: 'size', fallback: 'ordinary' },
    };
    expect(() => assertPerformanceRun(run)).toThrow(/unequal fallback/u);
  });

  it('validates measured and explicitly unmeasured result states', () => {
    const run = createRun();
    const result = createResult(run);
    expect(() => assertPerformanceResult(result, run)).not.toThrow();

    const falseUnresolved = structuredClone(result) as any;
    falseUnresolved.scenarios[0].measurements[0].verdict = 'unresolved';
    expect(() => assertPerformanceResult(falseUnresolved, run)).toThrow(/requires difference intervals containing zero/u);

    const conservativeUnresolved = structuredClone(result) as any;
    conservativeUnresolved.scenarios[0].measurements[0].verdict = 'unresolved';
    conservativeUnresolved.scenarios[0].measurements[0].absoluteDifferenceConfidenceInterval95 = {
      lower: -1,
      upper: 1,
    };
    expect(() => assertPerformanceResult(conservativeUnresolved, run)).not.toThrow();

    const overclaimedImprovement = structuredClone(result) as any;
    overclaimedImprovement.scenarios[0].measurements[0].percentDifferenceConfidenceInterval95 = {
      lower: -10,
      upper: 1,
    };
    expect(() => assertPerformanceResult(overclaimedImprovement, run)).toThrow(/requires negative/u);

    const reversedVerdict = structuredClone(result) as any;
    reversedVerdict.scenarios[0].measurements[0].verdict = 'regressed';
    expect(() => assertPerformanceResult(reversedVerdict, run)).toThrow(/requires positive/u);

    const contaminatedUnmeasured = structuredClone(result) as any;
    contaminatedUnmeasured.scenarios[0].measurements[0].verdict = 'unmeasured';
    expect(() => assertPerformanceResult(contaminatedUnmeasured, run)).toThrow(/cannot contain statistical/u);
  });

  it('owns independent artifact and closure evidence for each exact JIT/AOT application pair', () => {
    const run = createRun();
    const result = createResult(run);
    const duplicate = structuredClone(result) as any;
    duplicate.applications.push(duplicate.applications[0]);
    expect(() => assertPerformanceResult(duplicate, run)).toThrow(/repeats application/u);

    const reversed = structuredClone(result) as any;
    reversed.applications[0].lanes.reverse();
    expect(() => assertPerformanceResult(reversed, run)).toThrow(/requires JIT then AOT/u);

    const missingEvidence = structuredClone(result) as any;
    missingEvidence.applications[0].lanes[1].semanticEvidence = null;
    expect(() => assertPerformanceResult(missingEvidence, run)).toThrow(/semantic evidence/u);

    const wrongReceipt = structuredClone(result) as any;
    wrongReceipt.applications[0].lanes[1].build.receipt.sha256 = digest('wrong-receipt');
    expect(() => assertPerformanceResult(wrongReceipt, run)).toThrow(/receipt identity differs/u);

    const noExecutableBytes = structuredClone(result) as any;
    noExecutableBytes.applications[0].lanes[0].build.artifacts = measureArtifactSet([{
      path: 'build.json',
      bytes: Buffer.from('{}'),
      kind: 'other',
      initialEager: false,
      served: false,
    }]);
    noExecutableBytes.applications[0].lanes[0].build.browserLoadedAssets = [
      file('build.json', 2, digest('{}')),
    ];
    expect(() => assertPerformanceResult(noExecutableBytes, run)).toThrow(/no executable JavaScript bytes/u);
  });

  it('admits a size-only assured application without fabricating a runtime scenario', () => {
    const run = createRun();
    const application = createApplicationResult('hello-world', {
      kind: 'browser-assurance',
      state: 'passed',
      assuranceScenarioId: 'hello-world',
      evidence: file('assurance/hello-world.json', 2, digest('hello-world-assurance')),
    });
    const result: PerformanceResult = {
      schemaVersion: PERFORMANCE_RESULT_SCHEMA_VERSION,
      contractVersion: PERFORMANCE_CONTRACT_VERSION,
      runId: run.runId,
      runSha256: digest('run'),
      completedAt: '2026-08-31T12:30:00.000Z',
      scenarios: [],
      applications: [application],
      resultInputs: [
        application.correctness.evidence,
        application.lanes[1].semanticEvidence,
      ],
    };
    expect(() => assertPerformanceResult(result, run)).not.toThrow();

    const failed = structuredClone(result) as any;
    failed.applications[0].correctness.state = 'failed';
    expect(() => assertPerformanceResult(failed, run)).toThrow(/did not pass/u);
  });

  it('requires every measured scenario to have exactly one application oracle owner', () => {
    const run = createRun();
    const result = createResult(run);
    const absent = structuredClone(result) as any;
    absent.applications[0].correctness.scenarioIds = ['absent-scenario'];
    expect(() => assertPerformanceResult(absent, run)).toThrow(/claims absent scenario/u);

    const unowned = structuredClone(result) as any;
    unowned.applications[0].correctness = {
      kind: 'browser-assurance',
      state: 'passed',
      assuranceScenarioId: 'simple-repeat',
      evidence: unowned.applications[0].correctness.evidence,
    };
    expect(() => assertPerformanceResult(unowned, run)).toThrow(/not owned by an application/u);
  });
});

function createRun(): PerformanceRun {
  const artifacts = measureArtifactSet([
    { path: 'app.js', bytes: Buffer.from('export default 1'), kind: 'javascript', initialEager: true, served: true },
  ]);
  const emittedEntry = artifacts.files[0]!;
  const loaded = file('app.js', emittedEntry.rawBytes, emittedEntry.sha256);
  const repository = (id: string) => ({
    repositoryId: id,
    revision: git('c'),
    tree: git('d'),
    dirty: false as const,
    lockSha256: digest(`${id}-lock`),
    sourceSha256: digest(`${id}-source`),
    builtOutputSha256: digest(`${id}-out`),
  });
  const jit = {
    variantId: 'control',
    profile: { buildMode: 'jit' as const, profileId: 'official-jit' as const },
    build: { durationMs: 10, entryGraphSha256: digest('entry'), receipt: null, artifacts, browserLoadedAssets: [loaded] },
  };
  const aotReceipt = file('receipts/aot.json', 2, digest('aot-receipt'));
  const aot = {
    variantId: 'candidate',
    profile: { buildMode: 'aot' as const, profileId: 'c0', coordinates: controlCoordinates() },
    build: { durationMs: 20, entryGraphSha256: digest('entry'), receipt: aotReceipt, artifacts, browserLoadedAssets: [loaded] },
  };
  return {
    schemaVersion: PERFORMANCE_RUN_SCHEMA_VERSION,
    contractVersion: PERFORMANCE_CONTRACT_VERSION,
    runId: 'run-001',
    createdAt: '2026-08-31T12:00:00.000Z',
    executionProfile: 'baseline-promotion',
    grounding: {
      epochId: 'rc2',
      frameworkUnderTestRevision: git('a'),
      semanticRuntimeFrameworkBasis: git('a'),
      atlasFrameworkBasis: git('a'),
      groundingStatus: 'aligned',
    },
    manifest: { manifestSchemaVersion: 1, manifestVersion: '0.1', manifestSha256: digest('manifest') },
    sources: {
      framework: {
        sourceRevision: git('a'),
        sourceTree: git('b'),
        dirty: false,
        packageGraphSha256: digest('package-graph'),
        packages: [{ packageName: '@aurelia/runtime-html', integrity: 'sha512-test', runtimeEntries: [file('index.mjs', 1, digest('runtime'))] }],
      },
      semanticRuntime: repository('semantic-runtime'),
      aot: repository('aot'),
      aotVite: repository('aot-vite'),
      harness: repository('harness'),
    },
    toolchain: {
      node: process.version,
      vite: { name: 'vite', version: '8.2.2' },
      rolldown: { name: 'rolldown', version: '1.2.6' },
      oxc: { name: 'oxc', version: '0.99.0' },
      officialConventionsProvider: { name: '@aurelia/vite-plugin', version: '2.0.0-rc.2' },
      buildMode: 'production',
      sourceMap: false,
      target: 'es2023',
      defineSha256: digest('defines'),
      optionsSha256: digest('options'),
    },
    comparison: { comparisonKind: 'jit-vs-aot-control', controlVariantId: 'control', candidateVariantId: 'candidate' },
    variants: [jit, aot],
    executor: {
      executorId: 'local', platform: process.platform, architecture: process.arch, osRelease: 'test', osBuild: 'test',
      cpuModel: 'test cpu', logicalCpuCount: 8, totalMemoryBytes: 1024, nodeVersion: process.version, powerPosture: 'test',
    },
    browser: {
      name: 'chromium', version: '140', executableSha256: digest('browser'), flags: [],
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 }, headless: true,
    },
    sampling: {
      producer: 'tachometer', producerVersion: '0.7.1', confidenceLevel: 0.95,
      differenceDirection: 'candidate-minus-control', orderPolicy: 'ab-ba',
      latencySamples: {
        kind: 'fixed-by-scenario',
        calibrationSha256: digest('aa'),
        scenarios: [{ scenarioId: 'simple-activation-render-10k', samplesPerVariant: 20 }],
      },
      forcedGcHeapSamplesPerVariant: 20,
      rawResultFiles: [file('raw.json', 2, digest('raw'))],
    },
    determinism: {
      firstAotArtifactSetSha256: artifacts.artifactSetSha256,
      secondAotArtifactSetSha256: artifacts.artifactSetSha256,
      firstAotReceiptSha256: aotReceipt.sha256,
      secondAotReceiptSha256: aotReceipt.sha256,
      identical: true,
      identicalLaneCalibration: file('aa.json', 2, digest('aa')),
    },
  };
}

function createResult(run: PerformanceRun): PerformanceResult {
  const correctness = file('oracles/simple-repeat.json', 2, digest('simple-repeat-oracle'));
  const application = createApplicationResult('app-repeat-view', {
    kind: 'runtime-oracle',
    state: 'passed',
    scenarioIds: ['simple-activation-render-10k'],
    evidence: correctness,
  });
  return {
    schemaVersion: PERFORMANCE_RESULT_SCHEMA_VERSION,
    contractVersion: PERFORMANCE_CONTRACT_VERSION,
    runId: run.runId,
    runSha256: digest('run'),
    completedAt: '2026-08-31T12:30:00.000Z',
    scenarios: [{
      scenarioId: 'simple-activation-render-10k',
      oraclePassed: true,
      measurements: [{
        scenarioId: 'simple-activation-render-10k', metricId: 'activation-render', unit: 'milliseconds',
        control: { samples: 20, mean: 10, meanConfidenceInterval95: { lower: 9, upper: 11 } },
        candidate: { samples: 20, mean: 8, meanConfidenceInterval95: { lower: 7, upper: 9 } },
        absoluteDifferenceConfidenceInterval95: { lower: -3, upper: -1 },
        percentDifferenceConfidenceInterval95: { lower: -30, upper: -10 }, verdict: 'improved',
      }],
    }],
    applications: [application],
    resultInputs: [
      file('raw.json', 2, digest('raw')),
      correctness,
      application.lanes[1].semanticEvidence,
    ],
  };
}

function createApplicationResult(
  applicationId: string,
  correctness: ApplicationResult['correctness'],
): ApplicationResult {
  const jitArtifacts = measureArtifactSet([
    { path: 'app.js', bytes: Buffer.from('jit'), kind: 'javascript', initialEager: true, served: true },
  ]);
  const aotArtifacts = measureArtifactSet([
    { path: 'app.js', bytes: Buffer.from('aot'), kind: 'javascript', initialEager: true, served: true },
    {
      path: 'aurelia-aot-receipt.json',
      bytes: Buffer.from('{}'),
      kind: 'receipt',
      initialEager: false,
      served: false,
    },
  ]);
  const jitEntry = jitArtifacts.files.find(artifact => artifact.path === 'app.js')!;
  const aotEntry = aotArtifacts.files.find(artifact => artifact.path === 'app.js')!;
  const receipt = aotArtifacts.files.find(artifact => artifact.kind === 'receipt')!;
  return {
    applicationId,
    lanes: [
      {
        buildMode: 'jit',
        build: {
          durationMs: 10,
          entryGraphSha256: digest(`${applicationId}-entry`),
          receipt: null,
          artifacts: jitArtifacts,
          browserLoadedAssets: [file(jitEntry.path, jitEntry.rawBytes, jitEntry.sha256)],
        },
        semanticEvidence: null,
      },
      {
        buildMode: 'aot',
        build: {
          durationMs: 20,
          entryGraphSha256: digest(`${applicationId}-entry`),
          receipt: file(receipt.path, receipt.rawBytes, receipt.sha256),
          artifacts: aotArtifacts,
          browserLoadedAssets: [file(aotEntry.path, aotEntry.rawBytes, aotEntry.sha256)],
        },
        semanticEvidence: file(
          `evidence/${applicationId}.aot.json`,
          2,
          digest(`${applicationId}-semantic-evidence`),
        ),
      },
    ],
    correctness,
  };
}

function controlCoordinates(): AotProfileCoordinates {
  return {
    authorityScope: 'app-root', fallback: 'none', runtimeConfiguration: 'exact-leaves', runtimeRealization: 'generic',
    objective: 'control', debugPosture: 'performance-no-map', frameworkRewrite: 'none', inputAuthority: 'product-derived',
  };
}

function file(path: string, bytes: number, sha256: Sha256): HashedFileIdentity {
  return { path, bytes, sha256 };
}

function digest(value: string): Sha256 {
  return createHash('sha256').update(value).digest('hex') as Sha256;
}

function git(character: string): GitObjectId {
  return character.repeat(40) as GitObjectId;
}
