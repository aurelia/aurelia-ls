import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  STOREFRONT_BENCHMARK_DETAIL_ITEM_ID,
  STOREFRONT_BENCHMARK_IN_STOCK_COUNT,
  STOREFRONT_BENCHMARK_ITEM_COUNT,
  STOREFRONT_BENCHMARK_SEASONAL_COUNT,
  createStorefrontBenchmarkRecords,
} from '../fixtures/storefront/benchmark-data.js';
import { assertScenarioManifestEntry, computeManifestFileSetSha256 } from '../src/manifest.js';
import {
  storefrontScenarioManifestEntries,
  storefrontScenarioPages,
} from '../src/storefront-scenarios.js';
import { benchmarkPortfolioApplications } from '../src/applications.js';

const workspaceRoot = path.resolve(import.meta.dirname, '../../..');

describe('scaled routed storefront benchmark', () => {
  test('publishes the locked four-scenario R4 manifest and external page descriptors', () => {
    expect(storefrontScenarioManifestEntries.map((entry) => entry.scenarioId)).toEqual([
      'storefront-activation-render-500',
      'storefront-badge-filter-500',
      'storefront-list-to-detail-500',
      'storefront-heap-lifecycle-500',
    ]);
    expect(storefrontScenarioPages.map((descriptor) => descriptor.manifest))
      .toEqual(storefrontScenarioManifestEntries);
    expect(storefrontScenarioPages.map((descriptor) => descriptor.pagePath)).toEqual([
      'fixtures/storefront/pages/activation-render.html',
      'fixtures/storefront/pages/badge-filter.html',
      'fixtures/storefront/pages/list-to-detail.html',
      'fixtures/storefront/pages/heap-lifecycle.html',
    ]);
    for (const entry of storefrontScenarioManifestEntries) {
      expect(() => assertScenarioManifestEntry(entry)).not.toThrow();
      expect(entry.role).toBe('runtime');
      expect(entry.presets).toEqual(['baseline-promotion', 'targeted']);
      expect(entry.entry).toMatchObject({
        modulePath: 'packages/aot-benchmarks/fixtures/storefront/benchmark-entry.ts',
        exportName: 'createStorefrontBenchmarkApplication',
        arguments: [{
          kind: 'host-environment',
          path: "document.querySelector('[data-storefront-benchmark-host]')",
        }],
        authority: 'user-declared',
      });
      expect(entry.artifact).toEqual({
        chunking: 'single-minified-esm',
        initialEagerFiles: ['app.js'],
      });
      expect(entry.harnessSha256).toBe(computeManifestFileSetSha256(entry.harnessFiles));
      expect(entry.runtimeInputs).toContainEqual(expect.objectContaining({
        inputId: 'storefront-catalog-500',
        source: 'deterministic-harness',
      }));
    }
    expect(storefrontScenarioPages.at(-1)).toMatchObject({ exposeGc: true, sampleSize: 20 });
    expect(storefrontScenarioPages.slice(0, -1).every((descriptor) => !descriptor.exposeGc)).toBe(true);
  });

  test('joins the callable overlay and external authored tree into one build application', () => {
    const application = benchmarkPortfolioApplications(workspaceRoot).find((entry) =>
      entry.id === 'routed-storefront-benchmark'
    );
    expect(application).toMatchObject({
      role: 'runtime',
      headlineSize: false,
      input: {
        kind: 'library-single',
        entry: path.join(workspaceRoot, 'packages/aot-benchmarks/fixtures/storefront/benchmark-entry.ts'),
      },
      nominatedEntry: {
        sourceFilePath: path.join(workspaceRoot, 'packages/aot-benchmarks/fixtures/storefront/benchmark-entry.ts'),
        callable: { kind: 'export', name: 'createStorefrontBenchmarkApplication' },
        arguments: [{
          kind: 'host-environment',
          path: "document.querySelector('[data-storefront-benchmark-host]')",
        }],
      },
    });
    expect(application?.root).toBe(path.join(workspaceRoot, 'packages/aot-benchmarks/fixtures/storefront'));
    expect(application?.conventionInclude).toContain('aot-benchmarks/fixtures/storefront');
    expect(application?.conventionInclude).toContain(
      'semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront',
    );
  });

  test('creates one deterministic model-valid catalog without inventing standard items', async () => {
    const first = createStorefrontBenchmarkRecords();
    const second = createStorefrontBenchmarkRecords();
    expect(first).toHaveLength(STOREFRONT_BENCHMARK_ITEM_COUNT);
    expect(first.map(projectItem)).toEqual(second.map(projectItem));
    expect(first[0]?.id).toBe('item-1');
    expect(first.at(-1)?.id).toBe('item-500');
    expect(first[250]?.id).toBe(STOREFRONT_BENCHMARK_DETAIL_ITEM_ID);
    expect(first.filter((item) => item.category === 'seasonal')).toHaveLength(
      STOREFRONT_BENCHMARK_SEASONAL_COUNT,
    );
    expect(first.filter((item) => item.available)).toHaveLength(STOREFRONT_BENCHMARK_IN_STOCK_COUNT);
    expect(new Set(first.map((item) => item.category))).toEqual(new Set(['core', 'featured', 'seasonal']));
    expect(first.some((item) => item.category === ('standard' as never))).toBe(false);
  });

  test('pins every authored and harness file digest to the checked-in source bytes', async () => {
    for (const scenario of storefrontScenarioManifestEntries) {
      for (const file of [...scenario.authoredSources, ...scenario.harnessFiles]) {
        const bytes = await readFile(path.join(workspaceRoot, file.path));
        expect(createHash('sha256').update(bytes).digest('hex'), file.path).toBe(file.sha256);
      }
    }
  });

  test('keeps application construction and every timer/oracle on opposite sides of the entry boundary', async () => {
    const entry = await fixtureText('benchmark-entry.ts');
    expect(entry).toContain("import { App } from '../../../semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/app.js';");
    expect(entry).toContain('Registration.instance(ItemCatalogService, new StorefrontBenchmarkCatalogService())');
    expect(entry).toContain('RouterConfiguration.customize');
    expect(entry).toContain('const aurelia = new Aurelia()');
    expect(entry).toContain('return aurelia');
    expect(entry).not.toMatch(/\.start\s*\(/u);
    expect(entry).not.toContain('performance.');

    const helper = await fixtureText('pages/storefront-page-harness.js');
    expect(helper).not.toContain('semantic-runtime/fixtures');
    expect(helper).not.toContain('benchmark-entry');
    expect(helper).toContain('exactly 500 model and DOM rows');
    expect(helper).toContain('expected exactly 125 model and DOM rows');
    expect(helper).toContain('const detailItemOrdinal = 251');
    expect(helper).toContain("'$aurelia' in host");
  });

  test('keeps the four page boundaries settled, non-debounced, and lifecycle-complete', async () => {
    const activation = await fixtureText('pages/activation-render.html');
    expect(activation).toContain("performance.mark('storefront-activation-render-start')");
    expect(activation).toContain('await aurelia.start()');
    expect(activation).toContain('await settleStorefrontList(module, aurelia, host, 500)');
    expect(activation).toContain("performance.mark('storefront-activation-render-end')");
    expect(activation.lastIndexOf('assertFullStorefront(aurelia, host)'))
      .toBeLessThan(activation.indexOf('publishDurationMeasurement('));

    const filter = await fixtureText('pages/badge-filter.html');
    expect(filter).toContain('dispatchSelectChange(select)');
    expect(filter).toContain('await settleStorefrontList(module, aurelia, host, 125)');
    expect(filter.lastIndexOf('assertSeasonalStorefront(aurelia, host)'))
      .toBeLessThan(filter.indexOf('publishDurationMeasurement('));
    expect(filter).not.toMatch(/debounce|searchText|setTimeout\s*\(\s*[^,]+\s*,\s*150/u);

    const detail = await fixtureText('pages/list-to-detail.html');
    expect(detail).toContain('const detailLink = nominatedDetailLink(host)');
    expect(detail).toContain('detailLink.click()');
    expect(detail).toContain('await settleStorefrontDetail(module, host)');
    expect(detail.lastIndexOf('assertStorefrontDetail(aurelia, host)'))
      .toBeLessThan(detail.indexOf('publishDurationMeasurement('));

    const heap = await fixtureText('pages/heap-lifecycle.html');
    expect(heap).toContain('for (let cycle = 0; cycle < 2; cycle++)');
    expect(heap).toContain('await runLifecycle(false)');
    expect(heap).toContain('await runLifecycle(true)');
    expect(heap).toContain('liveApplicationUsedJSHeapAfterGcBytes');
    expect(heap).toContain('postTeardownUsedJSHeapAfterGcBytes');
  });
});

function projectItem(item: ReturnType<typeof createStorefrontBenchmarkRecords>[number]) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    monthlyPrice: item.monthlyPrice,
    available: item.available,
  };
}

async function fixtureText(relativePath: string): Promise<string> {
  return readFile(
    path.join(workspaceRoot, 'packages/aot-benchmarks/fixtures/storefront', relativePath),
    'utf8',
  );
}
