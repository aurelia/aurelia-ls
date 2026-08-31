import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  PERFORMANCE_PORTFOLIO_VERSION,
  PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION,
  assertPerformanceScenarioManifest,
  computeManifestFileSetSha256,
  type AuthoredSourceIdentity,
  type PerformanceScenarioManifest,
  type ScenarioManifestEntry,
} from '../src/manifest.js';
import { PERFORMANCE_CONTRACT_VERSION, type Sha256 } from '../src/contracts.js';

describe('performance scenario manifest', () => {
  it('admits a versioned scenario with exact authored, harness, entry, input, oracle, and settlement identity', () => {
    const manifest = createManifest();
    expect(() => assertPerformanceScenarioManifest(manifest)).not.toThrow();
    const scenario = manifest.scenarios[0]!;
    expect(computeManifestFileSetSha256([...scenario.harnessFiles].reverse()))
      .toBe(scenario.harnessSha256);
  });

  it('fails closed on schema, harness, scenario, and metric drift', () => {
    const schema = structuredClone(createManifest()) as any;
    schema.schemaVersion = 2;
    expect(() => assertPerformanceScenarioManifest(schema)).toThrow(/Unsupported/u);

    const harness = structuredClone(createManifest()) as any;
    harness.scenarios[0].harnessSha256 = digest('wrong');
    expect(() => assertPerformanceScenarioManifest(harness)).toThrow(/does not match/u);

    const duplicate = structuredClone(createManifest()) as any;
    duplicate.scenarios.push(duplicate.scenarios[0]);
    expect(() => assertPerformanceScenarioManifest(duplicate)).toThrow(/repeats/u);

    const wrongMetric = structuredClone(createManifest()) as any;
    wrongMetric.scenarios[0].metrics[0].unit = 'bytes';
    expect(() => assertPerformanceScenarioManifest(wrongMetric)).toThrow(/milliseconds/u);
  });

  it('rejects non-JSON runtime authority and baseline-absent runtime scenarios', () => {
    const runtimeInput = structuredClone(createManifest()) as any;
    runtimeInput.scenarios[0].runtimeInputs[0].descriptor = { value: undefined };
    expect(() => assertPerformanceScenarioManifest(runtimeInput)).toThrow(/not JSON/u);

    const noPromotion = structuredClone(createManifest()) as any;
    noPromotion.scenarios[0].presets = ['targeted'];
    expect(() => assertPerformanceScenarioManifest(noPromotion)).toThrow(/absent from baseline/u);
  });
});

function createManifest(): PerformanceScenarioManifest {
  return {
    schemaVersion: PERFORMANCE_SCENARIO_MANIFEST_SCHEMA_VERSION,
    contractVersion: PERFORMANCE_CONTRACT_VERSION,
    portfolioVersion: PERFORMANCE_PORTFOLIO_VERSION,
    manifestId: 'repeat-v0.1',
    authoredAt: '2026-08-31T12:00:00.000Z',
    scenarios: [createScenario()],
  };
}

function createScenario(): ScenarioManifestEntry {
  const harnessFiles: AuthoredSourceIdentity[] = [
    { path: 'harness/page.html', sha256: digest('page') },
    { path: 'harness/shared.mjs', sha256: digest('shared') },
  ];
  return {
    scenarioId: 'simple-activation-render-10k',
    workloadId: 'simple-repeat',
    role: 'runtime',
    presets: ['baseline-promotion', 'targeted'],
    authoredSources: [{ path: 'fixture/index.ts', sha256: digest('fixture') }],
    harnessFiles,
    harnessSha256: computeManifestFileSetSha256(harnessFiles),
    entry: { modulePath: 'fixture/index.ts', exportName: 'start', arguments: [], authority: 'product-derived' },
    runtimeInputs: [{
      inputId: 'host',
      source: 'deterministic-harness',
      descriptor: { kind: 'browser-host', selector: '#app' },
    }],
    scales: [{ name: 'rows', value: 10_000 }],
    metrics: [{
      metricId: 'activation-render',
      kind: 'activation-render',
      unit: 'milliseconds',
      timedBoundary: 'Immediately before Aurelia.start through verified first render.',
      primary: true,
    }],
    oracle: { oracleId: 'simple-repeat-10k', description: 'Exactly 10,000 rows with sampled content.' },
    quiescence: { kind: 'synchronous', description: 'Aurelia start and render complete synchronously.' },
    artifact: { chunking: 'single-minified-esm', initialEagerFiles: ['assets/app.js'] },
  };
}

function digest(value: string): Sha256 {
  return createHash('sha256').update(value).digest('hex') as Sha256;
}
