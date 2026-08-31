import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  captureExecutorIdentity,
  createBrowserIdentity,
  createSamplingIdentity,
} from '../src/environment.js';
import type { Sha256 } from '../src/contracts.js';

describe('benchmark environment identity', () => {
  it('captures stable host-capacity fields without transient free-memory state', () => {
    const executor = captureExecutorIdentity('local-aot-benchmark', 'AC power / performance');
    expect(executor).toMatchObject({
      executorId: 'local-aot-benchmark',
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      powerPosture: 'AC power / performance',
    });
    expect(executor.logicalCpuCount).toBeGreaterThan(0);
    expect(executor.totalMemoryBytes).toBeGreaterThan(0);
    expect(executor).not.toHaveProperty('freeMemoryBytes');
  });

  it('constructs exact browser and frozen sampling identities', () => {
    const browser = createBrowserIdentity({
      name: 'chromium',
      version: '140.0.0.0',
      executableSha256: digest('chrome'),
      flags: ['--js-flags=--expose-gc'],
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      headless: true,
    });
    expect(browser.executableSha256).toMatch(/^[0-9a-f]{64}$/u);

    const sampling = createSamplingIdentity({
      producerVersion: '0.7.1',
      orderPolicy: 'ab-ba',
      latencySamples: { kind: 'adaptive', timeoutMinutes: 5 },
      rawResultFiles: [{ path: 'results/raw.json', bytes: 2, sha256: digest('[]') }],
    });
    expect(sampling).toMatchObject({
      producer: 'tachometer',
      confidenceLevel: 0.95,
      differenceDirection: 'candidate-minus-control',
      forcedGcHeapSamplesPerVariant: 20,
    });
  });

  it('rejects partial browser and sampling identities', () => {
    expect(() => createBrowserIdentity({
      name: 'chromium',
      version: '',
      executableSha256: digest('chrome'),
      flags: [],
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      headless: true,
    })).toThrow(/name and version/u);
    expect(() => createSamplingIdentity({
      producerVersion: '0.7.1',
      orderPolicy: 'randomized-blocks',
      latencySamples: { kind: 'fixed', samplesPerVariant: 0 },
      rawResultFiles: [{ path: 'results/raw.json', bytes: 2, sha256: digest('[]') }],
    })).toThrow(/sample count/u);
  });

  it('constructs calibrated per-scenario counts and rejects unbalanced or ambiguous rows', () => {
    const rawResultFiles = [{ path: 'results/raw.json', bytes: 2, sha256: digest('[]') }];
    const sampling = createSamplingIdentity({
      producerVersion: '0.7.1',
      orderPolicy: 'ab-ba',
      latencySamples: {
        kind: 'fixed-by-scenario',
        calibrationSha256: digest('calibration'),
        scenarios: [
          { scenarioId: 'realistic-keyed-refresh-1k', samplesPerVariant: 40 },
          { scenarioId: 'simple-activation-render-10k', samplesPerVariant: 20 },
        ],
      },
      rawResultFiles,
    });
    expect(sampling.latencySamples).toMatchObject({
      kind: 'fixed-by-scenario',
      calibrationSha256: digest('calibration'),
    });

    expect(() => createSamplingIdentity({
      producerVersion: '0.7.1',
      orderPolicy: 'ab-ba',
      latencySamples: {
        kind: 'fixed-by-scenario',
        calibrationSha256: digest('calibration'),
        scenarios: [
          { scenarioId: 'same', samplesPerVariant: 20 },
          { scenarioId: 'same', samplesPerVariant: 20 },
        ],
      },
      rawResultFiles,
    })).toThrow(/repeats "same"/u);
    expect(() => createSamplingIdentity({
      producerVersion: '0.7.1',
      orderPolicy: 'ab-ba',
      latencySamples: {
        kind: 'fixed-by-scenario',
        calibrationSha256: digest('calibration'),
        scenarios: [{ scenarioId: 'odd', samplesPerVariant: 21 }],
      },
      rawResultFiles,
    })).toThrow(/must be even/u);
  });
});

function digest(value: string): Sha256 {
  return createHash('sha256').update(value).digest('hex') as Sha256;
}
