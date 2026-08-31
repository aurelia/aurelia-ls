import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import type { BenchmarkLaneBuild, BenchmarkBuildMode } from '../src/build.js';
import {
  assertBrowserStagingManifest,
  stageLockedBrowserWorkloads,
  verifyStagedBrowserRoot,
} from '../src/staging.js';

const packageRoot = path.resolve(import.meta.dirname, '..');
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('locked browser workload staging', () => {
  test('preserves authored page topology and maps JIT/AOT to base/candidate', async () => {
    const setup = await fixtureBuilds();
    const browserRoot = path.join(setup.root, 'browser-jit-aot');
    const staged = await stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot,
      order: 'jit-aot',
      builds: setup.builds,
    });

    expect(await text(browserRoot, 'benchmarks/results/variants/base/app-repeat-view/app.js')).toBe('app-repeat-view/jit');
    expect(await text(browserRoot, 'benchmarks/results/variants/candidate/app-repeat-realistic/app.js')).toBe('app-repeat-realistic/aot');
    expect(await text(browserRoot, 'keyed-table/results/variants/base/keyed-table/app.js')).toBe('keyed-table-optics/jit');
    expect(await text(browserRoot, 'storefront/results/variants/candidate/storefront/app.js')).toBe('routed-storefront-benchmark/aot');
    expect(await text(browserRoot, 'benchmarks/utils/load-variant.js')).toContain('../results/variants/${variant}/${fixture}/app.js');
    expect(await text(browserRoot, 'keyed-table/pages/keyed-table-page-harness.js')).toContain('../results/variants/${variant}/keyed-table/app.js');
    expect(await text(browserRoot, 'storefront/pages/storefront-page-harness.js')).toContain('../results/variants/${variant}/storefront/app.js');
    expect(staged.manifest.files.every(file => file.sourceSha256 === file.destinationSha256)).toBe(true);
    expect(() => assertBrowserStagingManifest(staged.manifest)).not.toThrow();
  });

  test('counterbalances lane mapping without changing authored browser semantics', async () => {
    const setup = await fixtureBuilds();
    const first = await stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: path.join(setup.root, 'browser-a'),
      order: 'jit-aot',
      builds: setup.builds,
    });
    const second = await stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: path.join(setup.root, 'browser-b'),
      order: 'aot-jit',
      builds: [...setup.builds].reverse(),
    });

    expect(await text(second.browserRoot, 'benchmarks/results/variants/base/app-repeat-view/app.js')).toBe('app-repeat-view/aot');
    expect(await text(second.browserRoot, 'benchmarks/results/variants/candidate/app-repeat-view/app.js')).toBe('app-repeat-view/jit');
    const authored = (manifest: typeof first.manifest) => manifest.files
      .filter(file => file.kind === 'authored')
      .map(file => [file.destinationPath, file.destinationSha256]);
    expect(authored(second.manifest)).toEqual(authored(first.manifest));
    expect(second.manifest.scenarioPages).toEqual(first.manifest.scenarioPages);
    expect(second.manifest.scenarioPages).toHaveLength(20);
  });

  test('produces byte-identical manifests for the same order and build inputs', async () => {
    const setup = await fixtureBuilds();
    const first = await stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: path.join(setup.root, 'browser-one'),
      order: 'jit-aot',
      builds: setup.builds,
    });
    const second = await stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: path.join(setup.root, 'browser-two'),
      order: 'jit-aot',
      builds: setup.builds,
    });
    expect(second.manifest).toEqual(first.manifest);
  });

  test('refuses incomplete, duplicate, unexpected, and non-single-entry build cohorts', async () => {
    const setup = await fixtureBuilds();
    const request = (name: string, builds: readonly BenchmarkLaneBuild[]) => stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: path.join(setup.root, name),
      order: 'jit-aot',
      builds,
    });
    await expect(request('missing', setup.builds.slice(1))).rejects.toThrow(/missing builds/u);
    await expect(request('duplicate', [...setup.builds, setup.builds[0]!])).rejects.toThrow(/duplicate build/u);
    await expect(request('unexpected', [...setup.builds, { ...setup.builds[0]!, applicationId: 'other' }]))
      .rejects.toThrow(/unexpected build/u);
    const multiEntry = setup.builds.map((build, index) => index === 0
      ? { ...build, entryFiles: ['app.js', 'other.js'] }
      : build);
    await expect(request('multi', multiEntry)).rejects.toThrow(/one app\.js entry/u);
  });

  test('requires a fresh root and detects staged-byte drift', async () => {
    const setup = await fixtureBuilds();
    const occupied = path.join(setup.root, 'occupied');
    await mkdir(occupied);
    await expect(stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: occupied,
      order: 'jit-aot',
      builds: setup.builds,
    })).rejects.toMatchObject({ code: 'EEXIST' });

    const staged = await stageLockedBrowserWorkloads({
      packageRoot,
      browserRoot: path.join(setup.root, 'browser'),
      order: 'jit-aot',
      builds: setup.builds,
    });
    await writeFile(path.join(staged.browserRoot, 'benchmarks/results/variants/base/app-repeat-view/app.js'), 'drift');
    await expect(verifyStagedBrowserRoot(staged.browserRoot, staged.manifest)).rejects.toThrow(/no longer matches/u);
  });
});

async function fixtureBuilds(): Promise<{ root: string; builds: readonly BenchmarkLaneBuild[] }> {
  const root = await mkdtemp(path.join(tmpdir(), 'aot-benchmark-staging-'));
  temporaryRoots.push(root);
  const builds: BenchmarkLaneBuild[] = [];
  for (const applicationId of [
    'app-repeat-view',
    'app-repeat-realistic',
    'keyed-table-optics',
    'routed-storefront-benchmark',
  ]) {
    for (const mode of ['jit', 'aot'] as const) {
      const outDir = path.join(root, 'builds', applicationId, mode);
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, 'app.js'), `${applicationId}/${mode}`);
      builds.push(build(applicationId, mode, outDir));
    }
  }
  return { root, builds };
}

function build(applicationId: string, mode: BenchmarkBuildMode, outDir: string): BenchmarkLaneBuild {
  return {
    applicationId,
    mode,
    outDir,
    durationMs: 1,
    chunks: [{ fileName: 'app.js', isEntry: true, imports: [], dynamicImports: [], moduleIds: ['fixture'] }],
    assets: [],
    entryFiles: ['app.js'],
    semanticEvidence: null,
    aotReceipt: null,
    resolvedFrameworkEntries: {},
  };
}

async function text(root: string, relativePath: string): Promise<string> {
  return readFile(path.join(root, ...relativePath.split('/')), 'utf8');
}
