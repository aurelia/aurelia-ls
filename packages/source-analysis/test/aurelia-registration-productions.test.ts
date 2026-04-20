import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from './test-harness.js';

import {
  collectAureliaRegistrationProductionGoldens,
  resolveAureliaFrameworkRepoPath,
  type AureliaRegistrationProductionGoldenSuite,
} from '../src/aurelia-registration-production-goldens.js';

const repoRoot = resolve(process.cwd());
const packageDir = join(repoRoot, 'packages', 'source-analysis');
const fixturePath = join(packageDir, 'fixtures', 'aurelia-registration-productions', 'golden.json');

const repoPath = resolveAureliaFrameworkRepoPath({ searchFrom: repoRoot });

if (!repoPath) {
  describe('Aurelia registration production goldens', () => {
    it('skips when the Aurelia framework repo is unavailable', { skip: true }, () => {});
  });
} else if (!existsSync(fixturePath)) {
  describe('Aurelia registration production goldens', () => {
    it('requires generated golden files', () => {
      throw new Error(
        'Missing fixtures/aurelia-registration-productions/golden.json. Run the aurelia registration production golden generator first.',
      );
    });
  });
} else {
  const expected = readJson<AureliaRegistrationProductionGoldenSuite>(fixturePath);
  const actual = collectAureliaRegistrationProductionGoldens({ repoPath });

  describe('Aurelia registration production goldens', () => {
    it('matches the expected production suite', () => {
      expect(actual).toEqual(expected);
    });
  });
}

function readJson<T>(
  path: string,
): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}
