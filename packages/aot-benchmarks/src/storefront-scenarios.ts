import type { Sha256 } from './contracts.js';
import {
  computeManifestFileSetSha256,
  type AuthoredSourceIdentity,
  type ScenarioManifestEntry,
} from './manifest.js';
import type { TachometerMeasurement } from './tachometer.js';

export const STOREFRONT_WORKLOAD_ID = 'r4-scaled-routed-storefront' as const;

export interface StorefrontScenarioPageDescriptor {
  readonly manifest: ScenarioManifestEntry;
  readonly pagePath: string;
  readonly measurements: readonly TachometerMeasurement[];
  readonly exposeGc: boolean;
  readonly sampleSize: number | null;
}

const authoredSources: readonly AuthoredSourceIdentity[] = [
  source('packages/aot-benchmarks/fixtures/storefront/aurelia-assets.d.ts', 'ca97f6e02cadc24078fa42d0d0d2a619ccfa6fe003900afa8516051e15f8d23c'),
  source('packages/aot-benchmarks/fixtures/storefront/benchmark-catalog.ts', 'd42eb10f7e301ceee6473021ad121283030e9b7d705d14fd4c8365bc9981ee3a'),
  source('packages/aot-benchmarks/fixtures/storefront/benchmark-data.ts', 'bbc6f63a5fa7883b61831e647f02645e1ccc2db88347248a2355e30a9f22a317'),
  source('packages/aot-benchmarks/fixtures/storefront/benchmark-entry.ts', '84a95df5e2bcd1e380903dc8386a7503b4bccf8ac84605c351c2e92d8c6a131c'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/app.css', 'c09c002231cbbed4dade48cc1bd4420c3aa521eb2e76ac03efbf365f2e39c4bc'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/app.html', '2cfc55834f04ba9b94075ed69adba30c4dded0dc13da5ca3bbf9275f76f5f1a6'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/app.ts', '70a71cc22d24dc7bbbcea2e183294fe16f3c647d80af04dcf06b0ae8ac9f8875'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html', 'f144b13111f217146d4e05635815831a6ffd8595026f1f941127aa9ded1df4c4'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts', '57eb7ce0940624c665a204b529348e6ddb99c19da1830162f9712746c6e5ae53'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/models/item.ts', 'd42cacfb4fba3cfe17c41867984b6ad3278d61d39e16af0e9896049b821caff3'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html', 'ebcad6c3f54d6d595a8a19dcd2d6413c3965f84b3dd27983edf73cc6b52ff0fd'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.ts', '3edec44118a041ab3ba8cf8a75c300fb87ad31082563489d6da4f5e12bba7aff'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html', '5b338334ccf2a8befcb2f61cd3ab8341b9929ad4ef72c3b675c030445a9e0c48'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.ts', 'f6214a88185e9b59541cb38f1a61f1739b55c9a5b19aaf2d160c1ad4b6ca62ec'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/services/item-catalog-service.ts', '56291d77a0442f9925a7de940a74a277d67a0c482f901d076cf0c6b67004356d'),
  source('packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts', '25eb7e1c729d02b5d92104fef62d508167a6c7322284985a0a3ee4246976328b'),
];

const entry = {
  modulePath: 'packages/aot-benchmarks/fixtures/storefront/benchmark-entry.ts',
  exportName: 'createStorefrontBenchmarkApplication',
  arguments: [{
    kind: 'host-environment',
    path: "document.querySelector('[data-storefront-benchmark-host]')",
  }],
  authority: 'user-declared',
} as const;

const commonScales = [
  { name: 'item-count', value: 500 },
  { name: 'seasonal-count', value: 125 },
  { name: 'in-stock-count', value: 400 },
  { name: 'standard-count', value: 0 },
] as const;

const commonArtifact = {
  chunking: 'single-minified-esm',
  initialEagerFiles: ['app.js'],
} as const;

const commonRuntimeInputs = [
  {
    inputId: 'storefront-catalog-500',
    source: 'deterministic-harness',
    descriptor: {
      itemCount: 500,
      categoryPeriod: ['core', 'featured', 'core', 'seasonal'],
      seasonalCount: 125,
      stockRule: 'ordinal-modulo-5-nonzero',
      inStockCount: 400,
      standardCount: 0,
    },
  },
  {
    inputId: 'storefront-initial-route',
    source: 'authored-application',
    descriptor: { routeId: 'items', viewport: 'main' },
  },
] as const;

const activation = scenario({
  scenarioId: 'storefront-activation-render-500',
  harnessFiles: harnessFiles(
    'activation-render.html',
    'a22c459787287f642adaccaccf6c70be9a183433ca4c467a6944b2ab4b1e7028',
  ),
  scales: commonScales,
  metrics: [
    {
      metricId: 'storefront-activation-render-duration',
      kind: 'activation-render',
      unit: 'milliseconds',
      timedBoundary: 'After module import and factory preparation, immediately before Aurelia.start through settled exact 500-row render.',
      primary: true,
    },
    immediateHeap('storefront-activation-render-immediate-heap'),
  ],
  oracle: {
    oracleId: 'storefront-full-list-500',
    description: 'Exactly 500 stable-id model and DOM rows render in provider order, with no item in the filter-only standard category.',
  },
  quiescence: {
    kind: 'router-settled',
    description: 'Aurelia start, router activation, async catalog replacement, task queues, and the exact 500-row DOM must settle.',
  },
});

const badgeFilter = scenario({
  scenarioId: 'storefront-badge-filter-500',
  harnessFiles: harnessFiles(
    'badge-filter.html',
    '2a91e079f09edbffe649cbe7d451fcbc8db89e5a70ff43348238f384791e6d0b',
  ),
  scales: [...commonScales, { name: 'filtered-count', value: 125 }],
  metrics: [
    {
      metricId: 'storefront-badge-filter-settled-duration',
      kind: 'settled-duration',
      unit: 'milliseconds',
      timedBoundary: 'Seasonal select change through settled computed filtering and exact 125-row DOM contraction.',
      primary: true,
    },
    immediateHeap('storefront-badge-filter-immediate-heap'),
  ],
  oracle: {
    oracleId: 'storefront-seasonal-list-125',
    description: 'The existing seasonal badge filter yields item-4 through item-500 in four-step order and exactly 125 model and DOM rows.',
  },
  quiescence: {
    kind: 'tasks-settled',
    description: 'The value binding, computed visibleItems projection, Repeat reconciliation, child rendering, and task queues must settle.',
  },
});

const listToDetail = scenario({
  scenarioId: 'storefront-list-to-detail-500',
  harnessFiles: harnessFiles(
    'list-to-detail.html',
    '319ee6af528f038dba970e8c1ec753eceff4c20060276120d2ee48b22cb24257',
  ),
  scales: [...commonScales, { name: 'detail-item-ordinal', value: 251 }],
  metrics: [
    {
      metricId: 'storefront-list-to-detail-settled-duration',
      kind: 'settled-duration',
      unit: 'milliseconds',
      timedBoundary: 'Click of the nominated item-251 list link through settled detail controller/view and retired list DOM.',
      primary: true,
    },
    immediateHeap('storefront-list-to-detail-immediate-heap'),
  ],
  oracle: {
    oracleId: 'storefront-detail-item-251',
    description: 'Navigation retires the list view and renders item-251 name, summary, category, price, and stock facts in the detail route.',
  },
  quiescence: {
    kind: 'router-settled',
    description: 'Router navigation, controller/view replacement, binding, and framework task queues must settle before the detail boundary.',
  },
});

const heapLifecycle = scenario({
  scenarioId: 'storefront-heap-lifecycle-500',
  harnessFiles: harnessFiles(
    'heap-lifecycle.html',
    '5a04b82abd820dd23aa115c178892f9d2c9ff937d879c3a362e6611448d5c57e',
  ),
  scales: [...commonScales, { name: 'warmup-lifecycles', value: 2 }, { name: 'major-gc-passes', value: 2 }],
  metrics: [
    {
      metricId: 'storefront-live-application-forced-gc-heap',
      kind: 'forced-gc-live-js-heap',
      unit: 'bytes',
      timedBoundary: 'Independent forced-GC reading with the settled 500-card routed application live.',
      primary: true,
    },
    {
      metricId: 'storefront-post-teardown-forced-gc-heap',
      kind: 'forced-gc-post-teardown-js-heap',
      unit: 'bytes',
      timedBoundary: 'Independent forced-GC reading after stop(true), task settlement, dispose, host removal, and local-root release.',
      primary: false,
    },
  ],
  oracle: {
    oracleId: 'storefront-heap-lifecycle-500',
    description: 'Each warmup and measured lifecycle renders all 500 rows; teardown leaves an empty detached host with no Aurelia attachment.',
  },
  quiescence: {
    kind: 'major-gc',
    description: 'Two complete warmup lifecycles precede independent live and post-teardown readings, each after two awaited async major GCs.',
  },
});

export const storefrontScenarioManifestEntries: readonly ScenarioManifestEntry[] = [
  activation,
  badgeFilter,
  listToDetail,
  heapLifecycle,
];

export const storefrontScenarioPages: readonly StorefrontScenarioPageDescriptor[] = [
  page(activation, 'activation-render.html', [
    performanceMeasurement('storefront-activation-render-500'),
    immediateHeapMeasurement(),
  ]),
  page(badgeFilter, 'badge-filter.html', [
    performanceMeasurement('storefront-badge-filter-500'),
    immediateHeapMeasurement(),
  ]),
  page(listToDetail, 'list-to-detail.html', [
    performanceMeasurement('storefront-list-to-detail-500'),
    immediateHeapMeasurement(),
  ]),
  page(heapLifecycle, 'heap-lifecycle.html', [
    {
      name: 'used JS heap after GC (live application)',
      mode: 'expression',
      expression: 'window.heapLifecycle?.liveApplicationUsedJSHeapAfterGcBytes',
    },
    {
      name: 'used JS heap after GC (post-teardown)',
      mode: 'expression',
      expression: 'window.heapLifecycle?.postTeardownUsedJSHeapAfterGcBytes',
    },
  ], true, 20),
];

function scenario(
  value: Pick<
    ScenarioManifestEntry,
    'scenarioId' | 'harnessFiles' | 'scales' | 'metrics' | 'oracle' | 'quiescence'
  >,
): ScenarioManifestEntry {
  return {
    ...value,
    harnessSha256: computeManifestFileSetSha256(value.harnessFiles),
    workloadId: STOREFRONT_WORKLOAD_ID,
    role: 'runtime',
    presets: ['baseline-promotion', 'targeted'],
    authoredSources,
    entry,
    runtimeInputs: commonRuntimeInputs,
    artifact: commonArtifact,
  };
}

function page(
  manifest: ScenarioManifestEntry,
  name: string,
  measurements: readonly TachometerMeasurement[],
  exposeGc = false,
  sampleSize: number | null = null,
): StorefrontScenarioPageDescriptor {
  return {
    manifest,
    pagePath: `fixtures/storefront/pages/${name}`,
    measurements,
    exposeGc,
    sampleSize,
  };
}

function immediateHeap(metricId: string): ScenarioManifestEntry['metrics'][number] {
  return {
    metricId,
    kind: 'immediate-used-js-heap',
    unit: 'bytes',
    timedBoundary: 'Immediate performance.memory.usedJSHeapSize after the settled timed boundary and before full oracle traversal.',
    primary: false,
  };
}

function performanceMeasurement(entryName: string): TachometerMeasurement {
  return { name: 'duration', mode: 'performance', entryName };
}

function immediateHeapMeasurement(): TachometerMeasurement {
  return { name: 'immediate used JS heap', mode: 'expression', expression: 'window.usedJSHeapSizeBytes' };
}

function source(path: string, digest: string): AuthoredSourceIdentity {
  return { path, sha256: sha256(digest) };
}

function harnessFiles(pageName: string, pageDigest: string): readonly AuthoredSourceIdentity[] {
  return [
    source(
      'packages/aot-benchmarks/fixtures/storefront/pages/storefront-page-harness.js',
      '4ae1dc05403734ef3d462d33ac3f07cfae6e57b31d5c0061478190a6eb5e8c60',
    ),
    source(`packages/aot-benchmarks/fixtures/storefront/pages/${pageName}`, pageDigest),
  ];
}

function sha256(value: string): Sha256 {
  return value as Sha256;
}
