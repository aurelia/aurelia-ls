import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from './test-harness.js';

import {
  collectAureliaFrameworkGoldens,
  resolveAureliaFrameworkRepoPath,
  type AureliaFrameworkGoldenManifest,
  type AureliaFrameworkGoldenPackage,
} from '../src/aurelia-framework-goldens.js';

const repoRoot = resolve(process.cwd());
const packageDir = join(repoRoot, 'packages', 'source-analysis');
const fixtureRoot = join(packageDir, 'fixtures', 'aurelia-framework-exports');
const manifestPath = join(fixtureRoot, 'manifest.json');

const repoPath = resolveAureliaFrameworkRepoPath({ searchFrom: repoRoot });

if (!repoPath) {
  describe('Aurelia framework export goldens', () => {
    it('skips when the Aurelia framework repo is unavailable', { skip: true }, () => {});
  });
} else if (!existsSync(manifestPath)) {
  describe('Aurelia framework export goldens', () => {
    it('requires generated golden files', () => {
      throw new Error(
        'Missing fixtures/aurelia-framework-exports/manifest.json. Run the aurelia framework golden generator first.',
      );
    });
  });
} else {
  const expectedManifest = readJson<AureliaFrameworkGoldenManifest>(manifestPath);
  const actualSuite = collectAureliaFrameworkGoldens({ repoPath });
  const actualPackages = new Map(
    actualSuite.packages.map((pkg) => [pkg.packageName, pkg] as const),
  );

  describe('Aurelia framework export goldens', () => {
    it('matches the expected package manifest', () => {
      expect(actualSuite.manifest).toEqual(expectedManifest);
    });

    for (const manifestPackage of expectedManifest.packages) {
      it(`matches ${manifestPackage.packageName}`, () => {
        const expectedPackage = readJson<AureliaFrameworkGoldenPackage>(
          join(fixtureRoot, 'packages', manifestPackage.file),
        );
        const actualPackage = actualPackages.get(manifestPackage.packageName);

        expect(actualPackage).toBeDefined();
        expect(actualPackage).toEqual(expectedPackage);
      });
    }
  });
}

function readJson<T>(
  path: string,
): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}
