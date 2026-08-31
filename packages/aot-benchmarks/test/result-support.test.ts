import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { measureArtifactSet, type ArtifactSetMetrics } from '../src/artifact-metrics.js';
import type { MeasuredBenchmarkLane } from '../src/build-cohort.js';
import type { BenchmarkLaneBuild } from '../src/build.js';
import type { HashedFileIdentity, Sha256 } from '../src/contracts.js';
import {
  createMeasuredApplicationResult,
  persistJsonEvidence,
} from '../src/result-support.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe('performance result support', () => {
  test('persists canonical JSON bytes and returns their package-relative identity', async () => {
    const root = await mkdtemp(path.join(process.cwd(), '.result-support-'));
    temporaryDirectories.push(root);
    const firstPath = path.join(root, 'evidence', 'first.json');
    const secondPath = path.join(root, 'evidence', 'second.json');
    const first = await persistJsonEvidence({
      outputPath: firstPath,
      relativeTo: root,
      value: { z: 2, nested: { b: true, a: [3, null] }, a: 'first' },
    });
    const second = await persistJsonEvidence({
      outputPath: secondPath,
      relativeTo: root,
      value: { a: 'first', nested: { a: [3, null], b: true }, z: 2 },
    });
    const firstBytes = await readFile(firstPath);
    const secondBytes = await readFile(secondPath);

    expect(first.path).toBe('evidence/first.json');
    expect(first.bytes).toBe(firstBytes.byteLength);
    expect(first.sha256).toBe(createHash('sha256').update(firstBytes).digest('hex'));
    expect(second.sha256).toBe(first.sha256);
    expect(secondBytes).toEqual(firstBytes);
    expect(firstBytes.toString('utf8')).toBe([
      '{',
      '  "a": "first",',
      '  "nested": {',
      '    "a": [',
      '      3,',
      '      null',
      '    ],',
      '    "b": true',
      '  },',
      '  "z": 2',
      '}',
      '',
    ].join('\n'));
  });

  test('rejects non-JSON, cyclic, and escaping evidence outputs', async () => {
    const root = await mkdtemp(path.join(process.cwd(), '.result-support-invalid-'));
    temporaryDirectories.push(root);
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    await expect(persistJsonEvidence({
      outputPath: path.join(root, 'cycle.json'),
      relativeTo: root,
      value: cycle,
    })).rejects.toThrow(/cycle/u);
    await expect(persistJsonEvidence({
      outputPath: path.join(root, 'undefined.json'),
      relativeTo: root,
      value: { value: undefined },
    })).rejects.toThrow(/unsupported/u);
    await expect(persistJsonEvidence({
      outputPath: path.resolve(root, '..', 'escaped.json'),
      relativeTo: root,
      value: {},
    })).rejects.toThrow(/outside/u);
  });

  test('converts one measured application pair into exact independent result lanes', () => {
    const jitArtifacts = artifacts('jit');
    const aotArtifacts = artifacts('aot', true);
    const semanticEvidence = evidence('evidence/app.aot.json', 'semantic');
    const correctnessEvidence = evidence('oracles/app.json', 'oracle');
    const result = createMeasuredApplicationResult({
      jit: lane('example-app', 'jit', jitArtifacts),
      aot: lane('example-app', 'aot', aotArtifacts),
      semanticEvidence,
      correctness: {
        kind: 'runtime-oracle',
        scenarioIds: ['example-activation', 'example-update'],
      },
      correctnessEvidence,
    });

    expect(result).toMatchObject({
      applicationId: 'example-app',
      correctness: {
        kind: 'runtime-oracle',
        state: 'passed',
        scenarioIds: ['example-activation', 'example-update'],
        evidence: correctnessEvidence,
      },
      lanes: [
        {
          buildMode: 'jit',
          semanticEvidence: null,
          build: {
            durationMs: 11,
            entryGraphSha256: jitArtifacts.topologySha256,
            receipt: null,
          },
        },
        {
          buildMode: 'aot',
          semanticEvidence,
          build: {
            durationMs: 17,
            entryGraphSha256: aotArtifacts.topologySha256,
          },
        },
      ],
    });
    expect(result.lanes[0].build.browserLoadedAssets.map(file => file.path)).toEqual(['app.js']);
    expect(result.lanes[1].build.browserLoadedAssets.map(file => file.path)).toEqual(['app.js']);
    const receipt = aotArtifacts.files.find(file => file.kind === 'receipt')!;
    expect(result.lanes[1].build.receipt).toEqual({
      path: receipt.path,
      bytes: receipt.rawBytes,
      sha256: receipt.sha256,
    });
  });

  test('refuses mismatched lanes and incomplete receipt/evidence joins', () => {
    const jit = lane('example-app', 'jit', artifacts('jit'));
    const aot = lane('example-app', 'aot', artifacts('aot', true));
    const request = {
      jit,
      aot,
      semanticEvidence: evidence('evidence/app.aot.json', 'semantic'),
      correctness: { kind: 'browser-assurance', assuranceScenarioId: 'hello-world' } as const,
      correctnessEvidence: evidence('assurance/app.json', 'assurance'),
    };
    expect(() => createMeasuredApplicationResult({
      ...request,
      aot: lane('another-app', 'aot', artifacts('aot-other', true)),
    })).toThrow(/matching AOT lane/u);
    expect(() => createMeasuredApplicationResult({
      ...request,
      aot: lane('example-app', 'aot', artifacts('aot-no-receipt')),
    })).toThrow(/exactly one receipt/u);
    expect(() => createMeasuredApplicationResult({
      ...request,
      jit: lane('example-app', 'jit', artifacts('jit-with-receipt', true)),
    })).toThrow(/JIT lane .* receipt/u);
    expect(() => createMeasuredApplicationResult({
      ...request,
      aot: {
        ...aot,
        build: { ...aot.build, semanticEvidence: null },
      },
    })).toThrow(/no joined semantic\/Vite evidence/u);
  });
});

function artifacts(seed: string, includeReceipt = false): ArtifactSetMetrics {
  return measureArtifactSet([
    {
      path: 'app.js',
      bytes: Buffer.from(`${seed}-entry`),
      kind: 'javascript',
      initialEager: true,
      served: true,
      dynamicImports: ['lazy.js'],
    },
    {
      path: 'lazy.js',
      bytes: Buffer.from(`${seed}-lazy`),
      kind: 'javascript',
      initialEager: false,
      served: true,
    },
    ...(includeReceipt ? [{
      path: 'aurelia-aot-receipt.json',
      bytes: Buffer.from(`{"seed":"${seed}"}`),
      kind: 'receipt' as const,
      initialEager: false,
      served: true,
    }] : []),
  ]);
}

function lane(
  applicationId: string,
  mode: 'jit' | 'aot',
  measuredArtifacts: ArtifactSetMetrics,
): MeasuredBenchmarkLane {
  const build: BenchmarkLaneBuild = {
    applicationId,
    mode,
    outDir: 'unused',
    durationMs: mode === 'jit' ? 11 : 17,
    chunks: [],
    assets: [],
    entryFiles: ['app.js'],
    semanticEvidence: mode === 'aot'
      ? {} as NonNullable<BenchmarkLaneBuild['semanticEvidence']>
      : null,
    aotReceipt: mode === 'aot'
      ? {} as NonNullable<BenchmarkLaneBuild['aotReceipt']>
      : null,
    resolvedFrameworkEntries: {},
  };
  return { build, artifacts: measuredArtifacts };
}

function evidence(filePath: string, seed: string): HashedFileIdentity {
  const bytes = Buffer.from(seed);
  return {
    path: filePath,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex') as Sha256,
  };
}
