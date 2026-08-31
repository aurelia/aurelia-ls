import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import type { Sha256 } from '../src/contracts.js';
import { captureBaselineToolchainIdentity } from '../src/run-identity.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const packageRoot = path.join(repositoryRoot, 'packages', 'aot-benchmarks');

describe('benchmark toolchain identity', () => {
  test('captures the RC2 plugin root-conditional legacy module entry exactly', async () => {
    const pluginRoot = await realpath(path.join(packageRoot, 'node_modules', '@aurelia', 'vite-plugin'));
    const entry = path.join(pluginRoot, 'dist', 'esm', 'index.mjs');
    const bytes = await readFile(entry);
    const driver = {
      name: 'chromedriver',
      version: 'test',
      entry: {
        path: 'driver',
        bytes: 1,
        sha256: '1'.repeat(64) as Sha256,
      },
    } as const;
    const identity = await captureBaselineToolchainIdentity(packageRoot, driver);

    expect(identity.officialConventionsProvider).toEqual({
      name: '@aurelia/vite-plugin',
      version: '2.0.0-rc.2',
      entry: {
        path: path.relative(packageRoot, entry).replaceAll('\\', '/'),
        bytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    });
    expect(identity.browserDriver).toBe(driver);
  });
});
