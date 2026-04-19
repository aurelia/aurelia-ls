import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from './test-harness.js';

import {
  collectDiInterfaceGoldens,
} from '../src/aurelia/index.js';
import {
  resolveAureliaFrameworkRepoPath,
} from '../src/aurelia-framework-goldens.js';

const repoRoot = resolve(process.cwd());
const packageDir = join(repoRoot, 'packages', 'source-analysis');
const fixtureRoot = join(packageDir, 'fixtures', 'aurelia-di-interfaces');
const goldenPath = join(fixtureRoot, 'golden.json');

const repoPath = resolveAureliaFrameworkRepoPath({ searchFrom: repoRoot });

if (!repoPath) {
  describe('Aurelia DI interface goldens', () => {
    it('skips when the Aurelia framework repo is unavailable', { skip: true }, () => {});
  });
} else if (!existsSync(goldenPath)) {
  describe('Aurelia DI interface goldens', () => {
    it('requires generated golden files', () => {
      throw new Error(
        'Missing fixtures/aurelia-di-interfaces/golden.json. Run the Aurelia DI interface golden generator first.',
      );
    });
  });
} else {
  const expectedGolden = readJson(goldenPath);
  const actualSuite = collectDiInterfaceGoldens({ repoPath });

  describe('Aurelia DI interface goldens', () => {
    it('matches the expected golden suite', () => {
      expect(actualSuite).toEqual(expectedGolden);
    });
  });
}

function readJson(
  path: string,
) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}
