import type { Sha256 } from './contracts.js';
import {
  computeManifestFileSetSha256,
  type AuthoredSourceIdentity,
  type ScenarioManifestEntry,
} from './manifest.js';
import type { TachometerMeasurement } from './tachometer.js';

export const REPEAT_FIXTURE_SOURCE_REVISION = 'd66f2abb25dcb2d7845726d0b02762645ed56c28' as const;
export const REPEAT_FIXTURE_ROOT = 'fixtures/repeat/benchmarks' as const;

const sourceFileHashes = {
  'benchmarks/app-repeat-realistic/heap-lifecycle.json': sha256('d02ac47d2a798fd299782a4615c591e03dbe04cae56b6d996ed27dd559890583'),
  'benchmarks/app-repeat-realistic/heapLifecycle500.html': sha256('d44e113c945895dbb762d6f344a786c1e7a0659cc49d88c9c95a580ef4aad4ce'),
  'benchmarks/app-repeat-realistic/index.js': sha256('867369b976f1d278e0a65daf0bc6f02d546d9b60b458886a5694c60dd5359985'),
  'benchmarks/app-repeat-realistic/mixed.json': sha256('944d3a9ee5eaf502788802e3db7664f97f46ee728c126decface978a153e28db'),
  'benchmarks/app-repeat-realistic/mixed1000.html': sha256('4319d9a1bd09b55f77644afdfc4b19c49efa312a27fe8ef4425e9a4140aff8af'),
  'benchmarks/app-repeat-realistic/refresh.json': sha256('2eb7ed395efc7da38cd7087d1f60678acc3182e24665f5e3b3bd67828071080f'),
  'benchmarks/app-repeat-realistic/refresh1000.html': sha256('ad4e602ec9aef50b25c1d0c202bea87376b084fd4bdb1689ef62d492999ccba9'),
  'benchmarks/app-repeat-realistic/startup.json': sha256('aaf91e24e9a19234ea4b82682f9bea1d14dec9877b24416bb1890d450fff32d7'),
  'benchmarks/app-repeat-realistic/startup1000.html': sha256('6ab3715b32a172e4f8c462edad099ca316d157d347a4333032aaad55682f1266'),
  'benchmarks/app-repeat-view/index.js': sha256('632621b79fd2c5eb5361f047222189710980c82d074f7cae4266c762cb116b88'),
  'benchmarks/app-repeat-view/rerender.json': sha256('cf6749403d574074b2b8bdc44da4b7469ec247fcb45fae5f712f03b129c70cbc'),
  'benchmarks/app-repeat-view/rerender10k.html': sha256('e81c4e622b7a035447e4d6c68b4b08fd4c18aa9f1454558833acf295d7f5299b'),
  'benchmarks/app-repeat-view/startup.json': sha256('49d6bc484b27a9bc2e405d28cebebe15d6025d1f515acf0af27947325838d508'),
  'benchmarks/app-repeat-view/startup10k.html': sha256('ba8bcbcf5cb93bbf108680267cd1dbf9ca0d789b8df30ddefe293d26f8dfc555'),
  'benchmarks/app-repeat-view/update-1k.json': sha256('3079c13a8b9fd460ee89db35f32aca975b5fc8b10e763ccc7a1fdfa208fc3fc8'),
  'benchmarks/app-repeat-view/update1k.html': sha256('fa1b4674fd3e22825643d13ad039c5df67013a9d3f72eff5792808eab87c5a45'),
  'benchmarks/utils/assert-render.js': sha256('3f4e74c353b11c80f2bc9e046253ca4e08d1c411826ba7a5d72f22a804a2a430'),
  'benchmarks/utils/data.js': sha256('cbd27376fd407690fe102977a7a26e07bd4cbaceefa738e2efc31f5da1835a7b'),
  'benchmarks/utils/load-variant.js': sha256('e0ef96b9f607abceb6b9b18bc6451ac02d46c75f6cb69c8ef62fb4c54d9929c8'),
  'benchmarks/utils/measure-used-heap.js': sha256('0de0d1aac2f0d24eab3484d9e3031e3144fc4e4bcc62b9e0a6d36d0fe9194ed6'),
  'benchmarks/utils/publish-measurement.js': sha256('a9216ec0a47ca5a12f63a5b6e652da9e2211e02af36a2f8b7622999705611580'),
  'benchmarks/utils/realistic-data.js': sha256('8b18242079fe25b3280b21631cf80615a2a7fa71e6a3cbe9b523e7375cd51935'),
  'benchmarks/utils/start-application.mjs': sha256('c7e00e45bc4abfc6fd3f979fafb7f23de680b8fafda6abdc823edefa082bf97e'),
} as const;

type RepeatSourcePath = keyof typeof sourceFileHashes;
type RepeatApplicationId = 'app-repeat-view' | 'app-repeat-realistic';

export interface RepeatFixtureProvenance {
  readonly repository: 'aurelia/aurelia';
  readonly revision: typeof REPEAT_FIXTURE_SOURCE_REVISION;
  readonly sourcePath: RepeatSourcePath;
  readonly fixturePath: `fixtures/repeat/${RepeatSourcePath}`;
  readonly sourceSha256: Sha256;
  readonly fixtureSha256: Sha256;
}

export interface RepeatScenarioDescriptor {
  readonly manifest: ScenarioManifestEntry;
  readonly applicationId: RepeatApplicationId;
  readonly pagePath: string;
  readonly importedTachometerConfigPath: string;
  readonly tachometer: {
    readonly measurements: readonly TachometerMeasurement[];
    readonly sampleSize?: number;
    readonly timeoutMinutes: number;
    readonly exposeGc: boolean;
  };
}

export const repeatFixtureProvenance: readonly RepeatFixtureProvenance[] = Object.entries(sourceFileHashes).map(
  ([sourcePath, hash]) => ({
    repository: 'aurelia/aurelia',
    revision: REPEAT_FIXTURE_SOURCE_REVISION,
    sourcePath: sourcePath as RepeatSourcePath,
    fixturePath: `fixtures/repeat/${sourcePath as RepeatSourcePath}`,
    sourceSha256: sourcePath === 'benchmarks/utils/data.js'
      ? sha256('3627da8868c55713cc6bc114f355188b9a304c1d2bf74b65e6cc2ada4443a327')
      : hash,
    fixtureSha256: hash,
  }),
);

const simpleAuthoredSources = files(
  'benchmarks/app-repeat-view/index.js',
  'benchmarks/utils/data.js',
  'benchmarks/utils/start-application.mjs',
);
const realisticAuthoredSources = files(
  'benchmarks/app-repeat-realistic/index.js',
  'benchmarks/utils/start-application.mjs',
);
const commonHarness = [
  'benchmarks/utils/assert-render.js',
  'benchmarks/utils/load-variant.js',
] as const satisfies readonly RepeatSourcePath[];
const immediateHeapMetrics = [
  {
    metricId: 'immediate-used-js-heap',
    kind: 'immediate-used-js-heap',
    unit: 'bytes',
    timedBoundary: 'Read immediately after the duration end mark and before authored assertion traversal.',
    primary: false,
  },
] as const;

const hostInput = {
  inputId: 'host',
  source: 'deterministic-harness',
  descriptor: { kind: 'created-div-host', parent: 'document.body', ordinal: 0 },
} as const;

export const repeatScenarioDescriptors: readonly RepeatScenarioDescriptor[] = [
  descriptor({
    applicationId: 'app-repeat-view',
    page: 'benchmarks/app-repeat-view/startup10k.html',
    config: 'benchmarks/app-repeat-view/startup.json',
    manifest: manifest({
      scenarioId: 'simple-activation-render-10k',
      workloadId: 'r1-simple-repeat',
      authoredSources: simpleAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/publish-measurement.js',
        'benchmarks/app-repeat-view/startup10k.html',
        'benchmarks/app-repeat-view/startup.json',
      ),
      entryModule: 'benchmarks/app-repeat-view/index.js',
      runtimeInputs: [hostInput, countInput(10_000, 'startup-count')],
      scales: [{ name: 'row-count', value: 10_000 }],
      metrics: [
        {
          metricId: 'activation-render',
          kind: 'activation-render',
          unit: 'milliseconds',
          timedBoundary: 'Immediately before synchronous start(host, 10000) through its synchronous return.',
          primary: true,
        },
        ...immediateHeapMetrics,
      ],
      oracleId: 'simple-repeat-render-10k',
      oracle: 'Exactly 10,000 direct div rows with sampled first, middle, and last text after synchronous startup.',
      quiescenceKind: 'synchronous',
      quiescence: 'Aurelia.start() must return synchronously and the sampled DOM must already be correct.',
    }),
    tachometer: {
      measurements: durationAndImmediateHeap('startup-10k'),
      timeoutMinutes: 0.15,
      exposeGc: false,
    },
  }),
  descriptor({
    applicationId: 'app-repeat-view',
    page: 'benchmarks/app-repeat-view/rerender10k.html',
    config: 'benchmarks/app-repeat-view/rerender.json',
    manifest: manifest({
      scenarioId: 'simple-empty-to-10k-rerender',
      workloadId: 'r1-simple-repeat',
      authoredSources: simpleAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/publish-measurement.js',
        'benchmarks/app-repeat-view/rerender10k.html',
        'benchmarks/app-repeat-view/rerender.json',
      ),
      entryModule: 'benchmarks/app-repeat-view/index.js',
      runtimeInputs: [hostInput, countInput(0, 'startup-count'), countInput(10_000, 'replacement-count')],
      scales: [{ name: 'replacement-row-count', value: 10_000 }],
      metrics: [
        {
          metricId: 'settled-rerender',
          kind: 'settled-duration',
          unit: 'milliseconds',
          timedBoundary: 'Immediately before replacing the empty items array through awaited tasksSettled().',
          primary: true,
        },
        ...immediateHeapMetrics,
      ],
      oracleId: 'simple-repeat-rerender-10k',
      oracle: 'The initial host is empty, then contains exactly 10,000 direct div rows with sampled correct text.',
      quiescenceKind: 'tasks-settled',
      quiescence: 'The end mark follows awaited Aurelia tasksSettled(); the authored DOM oracle runs afterward.',
    }),
    tachometer: {
      measurements: durationAndImmediateHeap('rerender-10k'),
      timeoutMinutes: 0.15,
      exposeGc: false,
    },
  }),
  descriptor({
    applicationId: 'app-repeat-view',
    page: 'benchmarks/app-repeat-view/update1k.html',
    config: 'benchmarks/app-repeat-view/update-1k.json',
    manifest: manifest({
      scenarioId: 'simple-member-update-1k',
      workloadId: 'r1-simple-repeat',
      authoredSources: simpleAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/publish-measurement.js',
        'benchmarks/app-repeat-view/update1k.html',
        'benchmarks/app-repeat-view/update-1k.json',
      ),
      entryModule: 'benchmarks/app-repeat-view/index.js',
      runtimeInputs: [hostInput, countInput(1_000, 'startup-count')],
      scales: [{ name: 'updated-member-count', value: 1_000 }],
      metrics: [
        {
          metricId: 'settled-member-propagation',
          kind: 'settled-duration',
          unit: 'milliseconds',
          timedBoundary: 'Immediately before 1,000 item.message writes through awaited tasksSettled().',
          primary: true,
        },
        ...immediateHeapMetrics,
      ],
      oracleId: 'simple-repeat-member-update-1k',
      oracle: 'All 1,000 rows remain, with first, middle, and last text proving the deterministic member updates.',
      quiescenceKind: 'tasks-settled',
      quiescence: 'The end mark follows awaited Aurelia tasksSettled(); the authored DOM oracle runs afterward.',
    }),
    tachometer: {
      measurements: durationAndImmediateHeap('update-1k'),
      timeoutMinutes: 0.15,
      exposeGc: false,
    },
  }),
  descriptor({
    applicationId: 'app-repeat-realistic',
    page: 'benchmarks/app-repeat-realistic/startup1000.html',
    config: 'benchmarks/app-repeat-realistic/startup.json',
    manifest: manifest({
      scenarioId: 'realistic-activation-render-1k',
      workloadId: 'r2-realistic-keyed-repeat',
      authoredSources: realisticAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/realistic-data.js',
        'benchmarks/utils/publish-measurement.js',
        'benchmarks/app-repeat-realistic/startup1000.html',
        'benchmarks/app-repeat-realistic/startup.json',
      ),
      entryModule: 'benchmarks/app-repeat-realistic/index.js',
      runtimeInputs: [hostInput, realisticRecordsInput(1_000)],
      scales: [{ name: 'row-count', value: 1_000 }],
      metrics: [
        {
          metricId: 'activation-render',
          kind: 'activation-render',
          unit: 'milliseconds',
          timedBoundary: 'Immediately before synchronous start(host, preparedItems) through its synchronous return.',
          primary: true,
        },
        ...immediateHeapMetrics,
      ],
      oracleId: 'realistic-repeat-render-1k',
      oracle: 'Every keyed custom-element row matches its record and controller, and the first click binding fires.',
      quiescenceKind: 'synchronous',
      quiescence: 'Aurelia.start() must return synchronously; full row/controller/event assertions run afterward.',
    }),
    tachometer: {
      measurements: durationAndImmediateHeap('realistic-startup-1000'),
      timeoutMinutes: 0.2,
      exposeGc: false,
    },
  }),
  descriptor({
    applicationId: 'app-repeat-realistic',
    page: 'benchmarks/app-repeat-realistic/refresh1000.html',
    config: 'benchmarks/app-repeat-realistic/refresh.json',
    manifest: manifest({
      scenarioId: 'realistic-keyed-refresh-1k',
      workloadId: 'r2-realistic-keyed-repeat',
      authoredSources: realisticAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/realistic-data.js',
        'benchmarks/utils/publish-measurement.js',
        'benchmarks/app-repeat-realistic/refresh1000.html',
        'benchmarks/app-repeat-realistic/refresh.json',
      ),
      entryModule: 'benchmarks/app-repeat-realistic/index.js',
      runtimeInputs: [hostInput, realisticRecordsInput(1_000)],
      scales: [{ name: 'refreshed-record-count', value: 1_000 }],
      metrics: [
        {
          metricId: 'settled-keyed-refresh',
          kind: 'settled-duration',
          unit: 'milliseconds',
          timedBoundary: 'Immediately before full-record replacement through awaited tasksSettled().',
          primary: true,
        },
        ...immediateHeapMetrics,
      ],
      oracleId: 'realistic-repeat-keyed-refresh-1k',
      oracle: 'All replacement records render in order while every keyed row controller/view-model is retained; click binding still fires.',
      quiescenceKind: 'tasks-settled',
      quiescence: 'The end mark follows awaited Aurelia tasksSettled(); identity, content, and event assertions follow.',
    }),
    tachometer: {
      measurements: durationAndImmediateHeap('realistic-refresh-1000'),
      timeoutMinutes: 0.2,
      exposeGc: false,
    },
  }),
  descriptor({
    applicationId: 'app-repeat-realistic',
    page: 'benchmarks/app-repeat-realistic/mixed1000.html',
    config: 'benchmarks/app-repeat-realistic/mixed.json',
    manifest: manifest({
      scenarioId: 'realistic-mixed-reconciliation-1k',
      workloadId: 'r2-realistic-keyed-repeat',
      authoredSources: realisticAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/realistic-data.js',
        'benchmarks/utils/publish-measurement.js',
        'benchmarks/app-repeat-realistic/mixed1000.html',
        'benchmarks/app-repeat-realistic/mixed.json',
      ),
      entryModule: 'benchmarks/app-repeat-realistic/index.js',
      runtimeInputs: [hostInput, realisticRecordsInput(1_000)],
      scales: [
        { name: 'initial-row-count', value: 1_000 },
        { name: 'removed-row-count', value: 100 },
        { name: 'inserted-row-count', value: 100 },
      ],
      metrics: [
        {
          metricId: 'settled-mixed-reconciliation',
          kind: 'settled-duration',
          unit: 'milliseconds',
          timedBoundary: 'Immediately before deterministic remove/update/move/insert replacement through awaited tasksSettled().',
          primary: true,
        },
        ...immediateHeapMetrics,
      ],
      oracleId: 'realistic-repeat-mixed-reconciliation-1k',
      oracle: 'Removed ids disappear, retained ids keep controllers, inserted ids are new, all content/order is exact, and events still fire.',
      quiescenceKind: 'tasks-settled',
      quiescence: 'The end mark follows awaited Aurelia tasksSettled(); identity, content, removal, insertion, and event assertions follow.',
    }),
    tachometer: {
      measurements: durationAndImmediateHeap('realistic-mixed-1000'),
      timeoutMinutes: 0.2,
      exposeGc: false,
    },
  }),
  descriptor({
    applicationId: 'app-repeat-realistic',
    page: 'benchmarks/app-repeat-realistic/heapLifecycle500.html',
    config: 'benchmarks/app-repeat-realistic/heap-lifecycle.json',
    manifest: manifest({
      scenarioId: 'realistic-heap-lifecycle-500',
      workloadId: 'r2-realistic-keyed-repeat',
      authoredSources: realisticAuthoredSources,
      harnessFiles: files(
        ...commonHarness,
        'benchmarks/utils/realistic-data.js',
        'benchmarks/utils/measure-used-heap.js',
        'benchmarks/app-repeat-realistic/heapLifecycle500.html',
        'benchmarks/app-repeat-realistic/heap-lifecycle.json',
      ),
      entryModule: 'benchmarks/app-repeat-realistic/index.js',
      runtimeInputs: [hostInput, realisticRecordsInput(500)],
      scales: [
        { name: 'row-count', value: 500 },
        { name: 'warmup-lifecycle-count', value: 2 },
        { name: 'major-gc-count-per-reading', value: 2 },
      ],
      metrics: [
        {
          metricId: 'forced-gc-live-list',
          kind: 'forced-gc-live-js-heap',
          unit: 'bytes',
          timedBoundary: 'After mixed reconciliation, oracle traversal, assertion-root release, and two awaited asynchronous major collections.',
          primary: true,
        },
        {
          metricId: 'forced-gc-post-teardown',
          kind: 'forced-gc-post-teardown-js-heap',
          unit: 'bytes',
          timedBoundary: 'After stop(true), empty-host proof, dispose(), host removal, local-root release, and two awaited asynchronous major collections.',
          primary: false,
        },
      ],
      oracleId: 'realistic-repeat-heap-lifecycle-500',
      oracle: 'Each lifecycle preserves keyed identities/events, then stop/dispose removes all DOM and the Aurelia host attachment.',
      quiescenceKind: 'major-gc',
      quiescence: 'Two complete warmup lifecycles each end in two major GCs; measured live and teardown states each use two awaited major GCs.',
    }),
    tachometer: {
      measurements: [
        {
          name: 'used JS heap after GC (live list)',
          mode: 'expression',
          expression: 'window.heapLifecycle?.liveListUsedJSHeapAfterGcBytes',
        },
        {
          name: 'used JS heap after GC (post-teardown)',
          mode: 'expression',
          expression: 'window.heapLifecycle?.postTeardownUsedJSHeapAfterGcBytes',
        },
      ],
      sampleSize: 20,
      timeoutMinutes: 0,
      exposeGc: true,
    },
  }),
];

export const repeatScenarioManifestEntries: readonly ScenarioManifestEntry[] = repeatScenarioDescriptors.map(
  descriptor => descriptor.manifest,
);

interface ManifestArguments {
  readonly scenarioId: string;
  readonly workloadId: string;
  readonly authoredSources: readonly AuthoredSourceIdentity[];
  readonly harnessFiles: readonly AuthoredSourceIdentity[];
  readonly entryModule: RepeatSourcePath;
  readonly runtimeInputs: ScenarioManifestEntry['runtimeInputs'];
  readonly scales: ScenarioManifestEntry['scales'];
  readonly metrics: ScenarioManifestEntry['metrics'];
  readonly oracleId: string;
  readonly oracle: string;
  readonly quiescenceKind: ScenarioManifestEntry['quiescence']['kind'];
  readonly quiescence: string;
}

function manifest(input: ManifestArguments): ScenarioManifestEntry {
  return {
    scenarioId: input.scenarioId,
    workloadId: input.workloadId,
    role: 'runtime',
    presets: ['baseline-promotion', 'targeted'],
    authoredSources: input.authoredSources,
    harnessFiles: input.harnessFiles,
    harnessSha256: computeManifestFileSetSha256(input.harnessFiles),
    entry: {
      modulePath: `fixtures/repeat/${input.entryModule}`,
      exportName: 'start',
      arguments: [],
      authority: 'user-declared',
    },
    runtimeInputs: input.runtimeInputs,
    scales: input.scales,
    metrics: input.metrics,
    oracle: { oracleId: input.oracleId, description: input.oracle },
    quiescence: { kind: input.quiescenceKind, description: input.quiescence },
    artifact: { chunking: 'single-minified-esm', initialEagerFiles: ['app.js'] },
  };
}

function descriptor(input: {
  readonly manifest: ScenarioManifestEntry;
  readonly applicationId: RepeatApplicationId;
  readonly page: RepeatSourcePath;
  readonly config: RepeatSourcePath;
  readonly tachometer: RepeatScenarioDescriptor['tachometer'];
}): RepeatScenarioDescriptor {
  return {
    manifest: input.manifest,
    applicationId: input.applicationId,
    pagePath: `fixtures/repeat/${input.page}`,
    importedTachometerConfigPath: `fixtures/repeat/${input.config}`,
    tachometer: input.tachometer,
  };
}

function files(...paths: readonly RepeatSourcePath[]): readonly AuthoredSourceIdentity[] {
  return paths.map(path => ({ path: `fixtures/repeat/${path}`, sha256: sourceFileHashes[path] }));
}

function durationAndImmediateHeap(entryName: string): readonly TachometerMeasurement[] {
  return [
    { name: 'perf', mode: 'performance', entryName },
    { name: 'used JS heap', mode: 'expression', expression: 'window.usedJSHeapSizeBytes' },
  ];
}

function countInput(count: number, inputId: string): ScenarioManifestEntry['runtimeInputs'][number] {
  return {
    inputId,
    source: 'deterministic-harness',
    descriptor: { kind: 'integer-count', value: count },
  };
}

function realisticRecordsInput(count: number): ScenarioManifestEntry['runtimeInputs'][number] {
  return {
    inputId: 'initial-items',
    source: 'deterministic-harness',
    descriptor: {
      kind: 'createRealisticRecords',
      count,
      revision: 0,
      firstId: 0,
    },
  };
}

function sha256(value: string): Sha256 {
  return value as Sha256;
}
