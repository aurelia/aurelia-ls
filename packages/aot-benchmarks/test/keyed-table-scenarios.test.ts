import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

// Vitest executes this exact fixture source; the fixture is intentionally not a
// composite package output and the test project otherwise uses NodeNext imports.
// @ts-expect-error TS5097 -- a no-emit test may import the Vite fixture's TS entry directly.
import { KeyedTableApp } from '../fixtures/keyed-table/src/keyed-table-app.ts';
import { benchmarkPortfolioApplications } from '../src/applications.js';
import { assertScenarioManifestEntry, computeManifestFileSetSha256 } from '../src/manifest.js';
import {
  KEYED_TABLE_CORE_OPERATIONS,
  KEYED_TABLE_PUBLIC_OPERATIONS,
  KEYED_TABLE_WORKLOAD_VERSION,
  keyedTableScenarioManifestEntries,
  keyedTableScenarioPages,
} from '../src/keyed-table-scenarios.js';

const fixtureRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/keyed-table',
);

describe('R3 keyed-table benchmark contract', () => {
  test('locks the bounded core preset and complete public operation order', () => {
    expect(KEYED_TABLE_WORKLOAD_VERSION).toBe('r3-v0.1');
    expect(KEYED_TABLE_PUBLIC_OPERATIONS.map((operation) => operation.upstreamId)).toEqual([
      '01_run1k',
      '02_replace1k',
      '03_update10th1k_x16',
      '04_select1k',
      '05_swap1k',
      '06_remove-one-1k',
      '07_create10k',
      '08_create1k-after1k_x2',
      '09_clear1k_x8',
    ]);
    expect(KEYED_TABLE_CORE_OPERATIONS.map((operation) => operation.id)).toEqual([
      'keyed-create-1k',
      'keyed-update-tenth-10k',
      'keyed-select-1k',
      'keyed-swap-1k',
      'keyed-remove-1k',
    ]);
    expect(new Set(KEYED_TABLE_PUBLIC_OPERATIONS.map((operation) => operation.id)).size).toBe(9);
  });

  test('describes the locked scales and identity laws without timing policy', () => {
    expect(KEYED_TABLE_PUBLIC_OPERATIONS.map((operation) => [
      operation.id,
      operation.preparation.at(-1)?.resultingRowCount ?? null,
      operation.action.resultingRowCount,
      operation.identityLaw,
    ])).toEqual([
      ['keyed-create-1k', 0, 1_000, 'create'],
      ['keyed-replace-1k', 1_000, 1_000, 'replace'],
      ['keyed-update-tenth-10k', 10_000, 10_000, 'preserve-and-update'],
      ['keyed-select-1k', 1_000, 1_000, 'preserve-and-select'],
      ['keyed-swap-1k', 1_000, 1_000, 'preserve-and-swap'],
      ['keyed-remove-1k', 1_000, 999, 'preserve-survivors'],
      ['keyed-create-10k', 0, 10_000, 'create'],
      ['keyed-append-1k-to-10k', 10_000, 11_000, 'append'],
      ['keyed-clear-10k', 10_000, 0, 'clear'],
    ]);
    expect(KEYED_TABLE_PUBLIC_OPERATIONS.every((operation) => !('warmupCount' in operation))).toBe(true);
  });

  test('publishes nine admissible operation manifests over one external page', () => {
    expect(keyedTableScenarioManifestEntries).toHaveLength(9);
    expect(keyedTableScenarioPages.map((page) => page.manifest)).toEqual(keyedTableScenarioManifestEntries);
    expect(keyedTableScenarioPages.map((page) => page.pagePath)).toEqual(
      KEYED_TABLE_PUBLIC_OPERATIONS.map(
        (operation) => `fixtures/keyed-table/pages/operation.html?operation=${operation.id}`,
      ),
    );
    for (const entry of keyedTableScenarioManifestEntries) {
      expect(() => assertScenarioManifestEntry(entry)).not.toThrow();
      expect(entry.entry).toEqual({
        modulePath: 'packages/aot-benchmarks/fixtures/keyed-table/src/main.ts',
        exportName: 'startKeyedTableApplication',
        arguments: [{ kind: 'host-environment', selector: 'keyed-table-app' }],
        authority: 'user-declared',
      });
      expect(entry.harnessSha256).toBe(computeManifestFileSetSha256(entry.harnessFiles));
      expect(entry.artifact).toEqual({ chunking: 'single-minified-esm', initialEagerFiles: ['app.js'] });
    }
    expect(keyedTableScenarioManifestEntries.filter((entry) => entry.presets.includes('targeted')).map(
      (entry) => entry.scenarioId,
    )).toEqual(KEYED_TABLE_CORE_OPERATIONS.map((operation) => operation.id));
  });

  test('nominates one exported synchronous app-world entry and lets each page invoke it once', () => {
    const application = benchmarkPortfolioApplications(path.resolve(fixtureRoot, '../../../..'))
      .find((candidate) => candidate.id === 'keyed-table-optics');
    expect(application?.nominatedEntry).toMatchObject({
      sourceFilePath: path.join(fixtureRoot, 'src/main.ts'),
      callable: { kind: 'export', name: 'startKeyedTableApplication' },
      arguments: [{ kind: 'host-environment', path: "document.querySelector('keyed-table-app')" }],
    });

    const main = readFixture('src/main.ts');
    expect(main).toContain('export function startKeyedTableApplication(host: HTMLElement): Aurelia');
    expect(main).not.toContain('document.querySelector');
    expect(readFixture('index.html')).toContain("startKeyedTableApplication(document.querySelector('keyed-table-app'))");
    expect(readFixture('pages/keyed-table-page-harness.js')).toContain('module.startKeyedTableApplication(host)');
  });

  test('pins authored application and external harness bytes', () => {
    for (const scenario of keyedTableScenarioManifestEntries) {
      for (const file of [...scenario.authoredSources, ...scenario.harnessFiles]) {
        const digest = createHash('sha256').update(fs.readFileSync(path.join(fixtureRoot, relativeFixturePath(file.path)))).digest('hex');
        expect(digest, file.path).toBe(file.sha256);
      }
    }
  });

  test('uses the upstream DOM controls with Aurelia efficient keyed semantics', () => {
    const template = readFixture('src/keyed-table-app.html');
    for (const id of ['run', 'runlots', 'add', 'update', 'clear', 'swaprows']) {
      expect(template.match(new RegExp(`id="${id}"`, 'gu'))).toHaveLength(1);
    }
    expect(template).toContain('repeat.for="row of rows; key: id"');
    expect(template).toContain('class.bind="row.id === selectedId');
    expect(template).toContain('click.trigger="select(row.id)"');
    expect(template).toContain('click.trigger="remove(row)"');
    expect(template).toContain('<table class="table table-hover table-striped test-data">');
    expect(template).toMatch(/<tr[\s\S]*?<td class="col-md-1">[\s\S]*?<td class="col-md-4">[\s\S]*?<td class="col-md-1">[\s\S]*?<td class="col-md-6"><\/td>/u);
  });

  test('keeps benchmark instrumentation and lane choices outside application source', () => {
    const componentSource = [
      readFixture('src/keyed-table-app.ts'),
      readFixture('src/keyed-table-app.html'),
    ].join('\n');
    expect(componentSource).not.toMatch(/requestAnimationFrame|addEventListener|querySelector|innerHTML|createElement/u);
    expect(componentSource).not.toMatch(/__AOT|\bjit\b|\baot\b|performance\.|tachometer/iu);

    const entrySource = readFixture('src/main.ts');
    expect(entrySource).not.toMatch(/requestAnimationFrame|addEventListener|querySelector|innerHTML|createElement|performance\.|tachometer/u);

    const harness = readFixture('pages/keyed-table-page-harness.js');
    expect(harness).toContain('new MutationObserver');
    expect(harness).toContain('performance.measure(operationId');
    expect(harness).toContain('replaced keyed row');
    expect(harness).not.toContain('requestAnimationFrame');
    expect(harness).not.toMatch(/\.innerHTML\s*=|\.textContent\s*=/u);
  });

  test('implements monotonic ids and the nine public data operations', () => {
    const app = new KeyedTableApp();
    app.run();
    expect(app.rows).toHaveLength(1_000);
    expect(app.rows[0]!.id).toBe(1);
    expect(app.rows[999]!.id).toBe(1_000);

    const originalRows = app.rows.slice();
    const originalLabels = originalRows.map((row) => row.label);
    app.update();
    for (let index = 0; index < app.rows.length; ++index) {
      expect(app.rows[index]).toBe(originalRows[index]);
      expect(app.rows[index]!.label).toBe(
        index % 10 === 0 ? `${originalLabels[index]} !!!` : originalLabels[index],
      );
    }

    app.select(app.rows[1]!.id);
    expect(app.selectedId).toBe(2);
    app.swapRows();
    expect(app.rows[1]).toBe(originalRows[998]);
    expect(app.rows[998]).toBe(originalRows[1]);

    const removed = app.rows[4]!;
    app.remove(removed);
    expect(app.rows).toHaveLength(999);
    expect(app.rows).not.toContain(removed);

    app.run();
    expect(app.rows[0]!.id).toBe(1_001);
    expect(app.rows[999]!.id).toBe(2_000);
    app.runLots();
    expect(app.rows).toHaveLength(10_000);
    expect(app.rows[0]!.id).toBe(2_001);
    const originalTenThousand = app.rows.slice();
    app.add();
    expect(app.rows).toHaveLength(11_000);
    expect(app.rows.slice(0, 10_000)).toEqual(originalTenThousand);
    expect(app.rows[10_000]!.id).toBe(12_001);
    app.clear();
    expect(app.rows).toEqual([]);
    expect(app.selectedId).toBeNull();
  });
});

function readFixture(relativePath: string): string {
  return fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8');
}

function relativeFixturePath(workspacePath: string): string {
  const prefix = 'packages/aot-benchmarks/fixtures/keyed-table/';
  if (!workspacePath.startsWith(prefix)) throw new Error(`Unexpected keyed-table file ${workspacePath}.`);
  return workspacePath.slice(prefix.length);
}
