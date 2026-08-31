import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { describe, expect, test } from 'vitest';

import { assertScenarioManifestEntry, computeManifestFileSetSha256 } from '../src/manifest.js';
import {
  REPEAT_FIXTURE_SOURCE_REVISION,
  repeatFixtureProvenance,
  repeatScenarioDescriptors,
  repeatScenarioManifestEntries,
} from '../src/repeat-scenarios.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('R1/R2 repeat benchmark contract', () => {
  test('imports one exact, provenance-addressed source portfolio', () => {
    expect(REPEAT_FIXTURE_SOURCE_REVISION).toBe('d66f2abb25dcb2d7845726d0b02762645ed56c28');
    expect(repeatFixtureProvenance).toHaveLength(23);
    for (const source of repeatFixtureProvenance) {
      expect(source.repository).toBe('aurelia/aurelia');
      expect(source.revision).toBe(REPEAT_FIXTURE_SOURCE_REVISION);
      expect(sha256(readPackageFile(source.fixturePath))).toBe(source.fixtureSha256);
    }

    const normalized = repeatFixtureProvenance.filter(source => source.sourceSha256 !== source.fixtureSha256);
    expect(normalized.map(source => source.sourcePath)).toEqual(['benchmarks/utils/data.js']);
    expect(readPackageFile(normalized[0]!.fixturePath).endsWith('\n')).toBe(true);
  });

  test('declares the seven locked scenarios with valid per-page harness identity', () => {
    expect(repeatScenarioManifestEntries.map(scenario => scenario.scenarioId)).toEqual([
      'simple-activation-render-10k',
      'simple-empty-to-10k-rerender',
      'simple-member-update-1k',
      'realistic-activation-render-1k',
      'realistic-keyed-refresh-1k',
      'realistic-mixed-reconciliation-1k',
      'realistic-heap-lifecycle-500',
    ]);

    for (const descriptor of repeatScenarioDescriptors) {
      expect(() => assertScenarioManifestEntry(descriptor.manifest)).not.toThrow();
      expect(computeManifestFileSetSha256(descriptor.manifest.harnessFiles)).toBe(
        descriptor.manifest.harnessSha256,
      );
      expect(fs.existsSync(path.join(packageRoot, descriptor.pagePath))).toBe(true);
      expect(fs.existsSync(path.join(packageRoot, descriptor.importedTachometerConfigPath))).toBe(true);
      expect(descriptor.manifest.presets).toEqual(['baseline-promotion', 'targeted']);
      expect(descriptor.manifest.artifact).toEqual({
        chunking: 'single-minified-esm',
        initialEagerFiles: ['app.js'],
      });
    }
  });

  test('preserves exact settlement, identity, events, and heap lifecycle assertions', () => {
    const simpleRerender = readPackageFile('fixtures/repeat/benchmarks/app-repeat-view/rerender10k.html');
    const simpleUpdate = readPackageFile('fixtures/repeat/benchmarks/app-repeat-view/update1k.html');
    const refresh = readPackageFile('fixtures/repeat/benchmarks/app-repeat-realistic/refresh1000.html');
    const mixed = readPackageFile('fixtures/repeat/benchmarks/app-repeat-realistic/mixed1000.html');
    const heap = readPackageFile('fixtures/repeat/benchmarks/app-repeat-realistic/heapLifecycle500.html');
    for (const page of [simpleRerender, simpleUpdate, refresh, mixed, heap]) {
      expect(page).toContain('await tasksSettled();');
    }

    expect(refresh).toContain('after.viewModels[item.id] !== before[item.id]');
    expect(refresh).toContain('assertRealisticOpenEvent');
    expect(mixed).toContain('Mixed reconciliation retained removed row');
    expect(mixed).toContain('Mixed reconciliation replaced retained row');
    expect(mixed).toContain('Mixed reconciliation did not create inserted row');
    expect(heap).toContain('for (let cycle = 0; cycle < 2; cycle++)');
    expect(heap).toContain('await au.stop(true);');
    expect(heap).toContain("host.childNodes.length !== 0 || '$aurelia' in host");
    expect(heap).toContain('liveListUsedJSHeapAfterGcBytes');
    expect(heap).toContain('postTeardownUsedJSHeapAfterGcBytes');

    const gcHelper = readPackageFile('fixtures/repeat/benchmarks/utils/measure-used-heap.js');
    expect(gcHelper.match(/await environment\.collectGarbage\(asyncMajorGc\);/gu)).toHaveLength(2);
  });

  test('keeps imported Tachometer contracts aligned with executable descriptors', () => {
    for (const descriptor of repeatScenarioDescriptors) {
      const config = JSON.parse(readPackageFile(descriptor.importedTachometerConfigPath)) as {
        sampleSize?: number;
        timeout?: number;
        benchmarks: readonly [{
          browser: { addArguments: readonly string[] };
          measurement: readonly unknown[];
        }];
      };
      expect(config.benchmarks[0].measurement).toEqual(descriptor.tachometer.measurements);
      expect(config.sampleSize).toBe(descriptor.tachometer.sampleSize);
      expect(config.timeout ?? 0).toBe(descriptor.tachometer.timeoutMinutes);
      expect(config.benchmarks[0].browser.addArguments.includes('--js-flags=--expose-gc')).toBe(
        descriptor.tachometer.exposeGc,
      );
    }
  });

  test('retains the deterministic realistic refresh and mixed-reconciliation plan', async () => {
    const modulePath = path.join(
      packageRoot,
      'fixtures/repeat/benchmarks/utils/realistic-data.js',
    );
    const data = await import(pathToFileURL(modulePath).href) as {
      createRealisticRecords(count: number): Array<{ id: number; revision: number; label: string }>;
      createRefreshedRealisticRecords(
        records: readonly { id: number; revision: number }[],
      ): Array<{ id: number; revision: number }>;
      createMixedRealisticRecords(
        records: readonly { id: number; revision: number }[],
      ): Array<{ id: number; revision: number }>;
    };
    const initial = data.createRealisticRecords(1_000);
    const refreshed = data.createRefreshedRealisticRecords(initial);
    expect(refreshed.map(record => record.id)).toEqual(initial.map(record => record.id));
    expect(refreshed.every(record => record.revision === 1)).toBe(true);

    const mixed = data.createMixedRealisticRecords(initial);
    expect(mixed).toHaveLength(1_000);
    expect(mixed.slice(0, 10).map(record => record.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 1, 1_000]);
    expect(mixed.some(record => record.id === 0)).toBe(false);
    expect(new Set(mixed.map(record => record.id)).size).toBe(1_000);
  });
});

function readPackageFile(relativePath: string): string {
  return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
