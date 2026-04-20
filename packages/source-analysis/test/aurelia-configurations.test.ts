import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from './test-harness.js';

import {
  collectAureliaConfigurationGoldens,
  resolveAureliaFrameworkRepoPath,
  type AureliaConfigurationGoldenSuite,
} from '../src/aurelia-configuration-goldens.js';

const repoRoot = resolve(process.cwd());
const packageDir = join(repoRoot, 'packages', 'source-analysis');
const fixturePath = join(packageDir, 'fixtures', 'aurelia-configurations', 'golden.json');

const repoPath = resolveAureliaFrameworkRepoPath({ searchFrom: repoRoot });

if (!repoPath) {
  describe('Aurelia configuration goldens', () => {
    it('skips when the Aurelia framework repo is unavailable', { skip: true }, () => {});
  });
} else if (!existsSync(fixturePath)) {
  describe('Aurelia configuration goldens', () => {
    it('requires generated golden files', () => {
      throw new Error(
        'Missing fixtures/aurelia-configurations/golden.json. Run the aurelia configuration golden generator first.',
      );
    });
  });
} else {
  const expected = readJson<AureliaConfigurationGoldenSuite>(fixturePath);
  const actual = collectAureliaConfigurationGoldens({ repoPath });

  describe('Aurelia configuration goldens', () => {
    it('matches the expected configuration suite', () => {
      expect(actual).toEqual(expected);
    });
  });
}

function readJson<T>(
  path: string,
): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}
