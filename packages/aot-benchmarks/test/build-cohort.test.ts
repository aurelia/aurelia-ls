import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  measureBuildCohort,
  writeJoinedAotReceipt,
} from '../src/build-cohort.js';
import type {
  BenchmarkBuildMode,
  BenchmarkLaneBuild,
  BenchmarkOutputAsset,
  BenchmarkOutputChunk,
} from '../src/build.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('measured build cohort', () => {
  test('preserves application prefixes and sums each byte denominator from per-file metrics', async () => {
    const fixture = await createFixture('jit');
    const cohort = await measureBuildCohort([fixture.beta, fixture.alpha]);

    expect(cohort.applications.map(application => application.build.applicationId)).toEqual(['alpha', 'beta']);
    expect(cohort.artifacts.files.map(file => file.path)).toEqual([
      'alpha/entry.js',
      'alpha/lazy.js',
      'alpha/shared.js',
      'alpha/style.css',
      'beta/app.js',
    ]);
    expect(cohort.artifacts.files.find(file => file.path === 'alpha/entry.js')).toMatchObject({
      imports: ['alpha/shared.js'],
      dynamicImports: ['alpha/lazy.js'],
      initialEager: true,
    });
    expect(cohort.artifacts.files.find(file => file.path === 'alpha/lazy.js')).toMatchObject({ initialEager: false });
    expect(cohort.durationMs).toBe(3.333);
    for (const aggregate of ['initialEagerJavaScript', 'totalJavaScript', 'nonJavaScript'] as const) {
      const expected = cohort.applications.reduce((sum, application) => ({
        fileCount: sum.fileCount + application.artifacts[aggregate].fileCount,
        rawBytes: sum.rawBytes + application.artifacts[aggregate].rawBytes,
        gzip9Bytes: sum.gzip9Bytes + application.artifacts[aggregate].gzip9Bytes,
        brotli11Bytes: sum.brotli11Bytes + application.artifacts[aggregate].brotli11Bytes,
      }), { fileCount: 0, rawBytes: 0, gzip9Bytes: 0, brotli11Bytes: 0 });
      expect(cohort.artifacts[aggregate]).toEqual(expected);
    }
  });

  test('refuses empty, mixed-mode, and duplicate application cohorts before measurement', async () => {
    const fixture = await createFixture('jit');
    await expect(measureBuildCohort([])).rejects.toThrow(/cannot be empty/u);
    await expect(measureBuildCohort([
      fixture.alpha,
      { ...fixture.beta, mode: 'aot' },
    ])).rejects.toThrow(/cannot mix JIT and AOT/u);
    await expect(measureBuildCohort([
      fixture.alpha,
      { ...fixture.beta, applicationId: fixture.alpha.applicationId },
    ])).rejects.toThrow(/repeats 'alpha\/jit'/u);
  });

  test('publishes the exact prefixed transitive initial JavaScript set as browser-loaded assets', async () => {
    const fixture = await createFixture('jit');
    const cohort = await measureBuildCohort([fixture.alpha, fixture.beta]);
    expect(cohort.browserLoadedAssets).toEqual(
      cohort.artifacts.files
        .filter(file => file.kind === 'javascript' && file.initialEager)
        .map(file => ({ path: file.path, bytes: file.rawBytes, sha256: file.sha256 })),
    );
    expect(cohort.browserLoadedAssets.map(file => file.path)).toEqual([
      'alpha/entry.js',
      'alpha/shared.js',
      'beta/app.js',
    ]);
  });

  test('writes a deterministic application-ordered joined AOT receipt', async () => {
    const fixture = await createFixture('aot');
    const forward = await measureBuildCohort([fixture.alpha, fixture.beta]);
    const reverse = await measureBuildCohort([fixture.beta, fixture.alpha]);
    expect(reverse.entryGraphSha256).toBe(forward.entryGraphSha256);
    expect(reverse.artifacts.artifactSetSha256).toBe(forward.artifacts.artifactSetSha256);

    const forwardPath = path.join(fixture.root, 'joined', 'forward.json');
    const reversePath = path.join(fixture.root, 'joined', 'reverse.json');
    const forwardIdentity = await writeJoinedAotReceipt({
      cohort: forward,
      outputPath: forwardPath,
      relativeTo: fixture.root,
    });
    const reverseIdentity = await writeJoinedAotReceipt({
      cohort: reverse,
      outputPath: reversePath,
      relativeTo: fixture.root,
    });
    expect(reverseIdentity.sha256).toBe(forwardIdentity.sha256);
    expect(await readFile(reversePath, 'utf8')).toBe(await readFile(forwardPath, 'utf8'));
    const joined = JSON.parse(await readFile(forwardPath, 'utf8')) as {
      version: number;
      receipts: Array<{ applicationId: string }>;
    };
    expect(joined).toMatchObject({ version: 1 });
    expect(joined.receipts.map(receipt => receipt.applicationId)).toEqual(['alpha', 'beta']);
  });

  test('refuses joined receipts for JIT or incomplete AOT cohorts', async () => {
    const jitFixture = await createFixture('jit');
    const jit = await measureBuildCohort([jitFixture.alpha]);
    await expect(writeJoinedAotReceipt({
      cohort: jit,
      outputPath: path.join(jitFixture.root, 'jit.json'),
      relativeTo: jitFixture.root,
    })).rejects.toThrow(/Only an AOT cohort/u);

    const aotFixture = await createFixture('aot');
    const incomplete = await measureBuildCohort([{ ...aotFixture.alpha, aotReceipt: null }]);
    await expect(writeJoinedAotReceipt({
      cohort: incomplete,
      outputPath: path.join(aotFixture.root, 'missing.json'),
      relativeTo: aotFixture.root,
    })).rejects.toThrow(/has no Vite receipt/u);
  });
});

async function createFixture(mode: BenchmarkBuildMode): Promise<{
  root: string;
  alpha: BenchmarkLaneBuild;
  beta: BenchmarkLaneBuild;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'aot-build-cohort-'));
  temporaryRoots.push(root);
  const alpha = await writeBuild({
    root,
    applicationId: 'alpha',
    mode,
    durationMs: 1.111,
    chunks: [
      chunk('entry.js', true, ['./shared.js'], ['./lazy.js']),
      chunk('shared.js'),
      chunk('lazy.js'),
    ],
    assets: [{ fileName: 'style.css' }],
    contents: {
      'entry.js': 'import "./shared.js"; import("./lazy.js");',
      'shared.js': 'export const shared = 1;',
      'lazy.js': 'export const lazy = 1;',
      'style.css': 'body{color:red}',
    },
  });
  const beta = await writeBuild({
    root,
    applicationId: 'beta',
    mode,
    durationMs: 2.222,
    chunks: [chunk('app.js', true)],
    assets: [],
    contents: { 'app.js': 'export const beta = 1;' },
  });
  return { root, alpha, beta };
}

async function writeBuild(input: {
  root: string;
  applicationId: string;
  mode: BenchmarkBuildMode;
  durationMs: number;
  chunks: readonly BenchmarkOutputChunk[];
  assets: readonly BenchmarkOutputAsset[];
  contents: Readonly<Record<string, string>>;
}): Promise<BenchmarkLaneBuild> {
  const outDir = path.join(input.root, input.applicationId, input.mode);
  await mkdir(outDir, { recursive: true });
  const assets = [...input.assets];
  const contents = { ...input.contents };
  const receipt = input.mode === 'aot'
    ? {
        version: 1 as const,
        environmentName: 'client',
        artifacts: [],
        graph: [],
        chunks: [],
      }
    : null;
  if (receipt !== null) {
    assets.push({ fileName: 'aurelia-aot-receipt.json' });
    contents['aurelia-aot-receipt.json'] = `${JSON.stringify(receipt, null, 2)}\n`;
  }
  for (const [file, content] of Object.entries(contents)) {
    await writeFile(path.join(outDir, file), content);
  }
  return {
    applicationId: input.applicationId,
    mode: input.mode,
    outputLabel: null,
    outDir,
    durationMs: input.durationMs,
    chunks: input.chunks,
    assets,
    entryFiles: input.chunks.filter(value => value.isEntry).map(value => value.fileName),
    semanticEvidence: null,
    aotReceipt: receipt,
    resolvedFrameworkEntries: {},
  };
}

function chunk(
  fileName: string,
  isEntry = false,
  imports: readonly string[] = [],
  dynamicImports: readonly string[] = [],
): BenchmarkOutputChunk {
  return { fileName, isEntry, imports, dynamicImports, moduleIds: [`module:${fileName}`] };
}
