import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { writeTachometerScenarioConfig } from '../src/tachometer.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('Tachometer configuration', () => {
  test('addresses a staged page from an external immutable config directory', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'aot-tachometer-config-'));
    temporaryRoots.push(root);
    const browserRoot = path.join(root, 'browser', 'jit-aot');
    const configPath = path.join(root, 'configs', 'jit-aot', 'scenario.json');
    await writeTachometerScenarioConfig({
      scenarioId: 'scenario',
      browserRoot,
      pagePath: 'keyed-table/pages/operation.html?operation=keyed-create-1k',
      measurements: [{ name: 'duration', mode: 'performance', entryName: 'keyed-create-1k' }],
      order: 'jit-aot',
      resultPath: path.join(root, 'raw.json'),
      configPath,
      browserBinary: path.join(root, 'chrome'),
    });

    const config = JSON.parse(await readFile(configPath, 'utf8')) as any;
    expect(config.benchmarks[0].expand.map((entry: any) => entry.url)).toEqual([
      '../../browser/jit-aot/keyed-table/pages/operation.html?operation=keyed-create-1k&variant=base&buildMode=jit&order=jit-aot',
      '../../browser/jit-aot/keyed-table/pages/operation.html?operation=keyed-create-1k&variant=candidate&buildMode=aot&order=jit-aot',
    ]);
  });
});
