import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import type {
  FrameworkBenchmarkRootPackage,
  FrameworkPackageEntryProvenance,
  PreparedFrameworkPackageGraph,
} from '../src/framework-graph.js';
import {
  preflightSemanticFrameworkEntries,
  SEMANTIC_FRAMEWORK_PREFLIGHT_VERSION,
} from '../src/semantic-framework-preflight.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('semantic framework entry preflight', () => {
  test('proves every app resolves the prepared closure with deterministic evidence', async () => {
    const fixture = await createFixture();
    const first = await preflightSemanticFrameworkEntries({
      repositoryRoot: fixture.repositoryRoot,
      applications: [fixture.applications[1]!, fixture.applications[0]!],
      framework: fixture.framework,
    });
    const second = await preflightSemanticFrameworkEntries({
      repositoryRoot: fixture.repositoryRoot,
      applications: fixture.applications,
      framework: fixture.framework,
    });

    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe(SEMANTIC_FRAMEWORK_PREFLIGHT_VERSION);
    expect(first.evidenceSha256).toHaveLength(64);
    expect(first.applications.map(application => application.applicationId)).toEqual(['app-a', 'app-b']);
    for (const application of first.applications) {
      expect(application.packages.map(entry => entry.packageName)).toEqual([
        '@aurelia/runtime-html',
        'aurelia',
      ]);
      expect(application.packages.every(entry =>
        entry.identical
        && entry.semanticEntrySha256 === entry.preparedEntrySha256
        && !path.isAbsolute(entry.semanticEntryPath)
      )).toBe(true);
      expect(application.packages.find(entry => entry.packageName === 'aurelia')?.resolutionIssuers)
        .toEqual(['application-root']);
      expect(application.packages.find(entry => entry.packageName === '@aurelia/runtime-html')?.resolutionIssuers)
        .toEqual(['aurelia']);
    }
  });

  test('refuses semantic framework bytes that differ from the prepared graph', async () => {
    const fixture = await createFixture({ semanticRuntimeHtml: 'export const identity = "workspace-drift";\n' });

    await expect(preflightSemanticFrameworkEntries({
      repositoryRoot: fixture.repositoryRoot,
      applications: [fixture.applications[0]!],
      framework: fixture.framework,
    })).rejects.toThrow(/app-a resolves different semantic and Vite bytes for @aurelia\/runtime-html/u);
  });

  test('refuses byte-identical split package copies reached through two issuers', async () => {
    const fixture = await createFixture({
      roots: ['aurelia', '@aurelia/runtime-html'],
      nestedRuntimeHtml: true,
    });

    await expect(preflightSemanticFrameworkEntries({
      repositoryRoot: fixture.repositoryRoot,
      applications: [fixture.applications[0]!],
      framework: fixture.framework,
    })).rejects.toThrow(/app-a resolves split copies of @aurelia\/runtime-html/u);
  });
});

interface FixtureOptions {
  readonly semanticRuntimeHtml?: string;
  readonly nestedRuntimeHtml?: boolean;
  readonly roots?: readonly FrameworkBenchmarkRootPackage[];
}

async function createFixture(options: FixtureOptions = {}): Promise<{
  readonly repositoryRoot: string;
  readonly applications: readonly { readonly applicationId: string; readonly root: string }[];
  readonly framework: PreparedFrameworkPackageGraph;
}> {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'aurelia-semantic-framework-preflight-'));
  temporaryRoots.push(repositoryRoot);
  const appA = path.join(repositoryRoot, 'apps', 'a');
  const appB = path.join(repositoryRoot, 'apps', 'b');
  await Promise.all([mkdir(appA, { recursive: true }), mkdir(appB, { recursive: true })]);

  const semanticAurelia = await writePackage(
    path.join(repositoryRoot, 'node_modules', 'aurelia'),
    'aurelia',
    'export const identity = "aurelia";\n',
  );
  await writePackage(
    path.join(repositoryRoot, 'node_modules', '@aurelia', 'runtime-html'),
    '@aurelia/runtime-html',
    options.semanticRuntimeHtml ?? 'export const identity = "runtime-html";\n',
  );
  if (options.nestedRuntimeHtml === true) {
    await writePackage(
      path.join(repositoryRoot, 'node_modules', 'aurelia', 'node_modules', '@aurelia', 'runtime-html'),
      '@aurelia/runtime-html',
      'export const identity = "runtime-html";\n',
    );
  }

  const preparedAurelia = await writePackage(
    path.join(repositoryRoot, 'prepared', 'aurelia'),
    'aurelia',
    await readFile(semanticAurelia, 'utf8'),
  );
  const preparedRuntimeHtml = await writePackage(
    path.join(repositoryRoot, 'prepared', '@aurelia', 'runtime-html'),
    '@aurelia/runtime-html',
    'export const identity = "runtime-html";\n',
  );
  const entries = new Map([
    ['aurelia', preparedAurelia],
    ['@aurelia/runtime-html', preparedRuntimeHtml],
  ]);
  const packages = [
    packageEvidence('aurelia', ['@aurelia/runtime-html']),
    packageEvidence('@aurelia/runtime-html', []),
  ].sort((left, right) => left.packageName.localeCompare(right.packageName));
  const roots = options.roots ?? ['aurelia'];
  const framework: PreparedFrameworkPackageGraph = {
    root: path.join(repositoryRoot, 'prepared'),
    installRoot: path.join(repositoryRoot, 'prepared'),
    provenance: {
      schemaVersion: 'aurelia-framework-package-graph/v1',
      createdAt: '2026-08-31T00:00:00.000Z',
      framework: {
        repositoryRoot,
        commit: '1'.repeat(40),
        tree: '2'.repeat(40),
        clean: true,
      },
      roots,
      graphFingerprint: '3'.repeat(64),
      graphRoot: path.join(repositoryRoot, 'prepared'),
      installRoot: path.join(repositoryRoot, 'prepared'),
      toolchain: { node: process.version, npm: 'test' },
      rootManifestSha256: '4'.repeat(64),
      packageLockSha256: '5'.repeat(64),
      packages,
    },
    entryFor(packageName) {
      const entry = entries.get(packageName);
      if (entry === undefined) throw new Error(`Missing prepared package ${packageName}.`);
      return entry;
    },
    dispose() {
      return Promise.resolve();
    },
  };
  return {
    repositoryRoot,
    applications: [
      { applicationId: 'app-a', root: appA },
      { applicationId: 'app-b', root: appB },
    ],
    framework,
  };
}

async function writePackage(root: string, name: string, esm: string): Promise<string> {
  const esmEntry = path.join(root, 'dist', 'esm', 'index.mjs');
  const cjsEntry = path.join(root, 'dist', 'cjs', 'index.cjs');
  await Promise.all([
    mkdir(path.dirname(esmEntry), { recursive: true }),
    mkdir(path.dirname(cjsEntry), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(esmEntry, esm, 'utf8'),
    writeFile(cjsEntry, 'module.exports = {};\n', 'utf8'),
    writeFile(path.join(root, 'package.json'), `${JSON.stringify({
      name,
      version: '2.0.0-rc.2',
      module: 'dist/esm/index.mjs',
      main: 'dist/cjs/index.cjs',
      exports: {
        '.': {
          import: './dist/esm/index.mjs',
          require: './dist/cjs/index.cjs',
        },
      },
    }, null, 2)}\n`, 'utf8'),
  ]);
  return esmEntry;
}

function packageEvidence(
  packageName: string,
  dependencies: readonly string[],
): FrameworkPackageEntryProvenance {
  const entrySha256 = fixtureEntrySha256(packageName);
  return {
    packageName,
    version: '2.0.0-rc.2',
    sourceDirectory: `packages/${packageName}`,
    sourceManifestSha256: '6'.repeat(64),
    internalDependencies: dependencies,
    esmEntry: 'dist/esm/index.mjs',
    sourceEsmSha256: entrySha256,
    installedEsmSha256: entrySha256,
    archive: {
      fileName: `${packageName.replaceAll('/', '-')}.tgz`,
      bytes: 1,
      sha1: '7'.repeat(40),
      sha256: '8'.repeat(64),
      integrity: 'sha512-test',
    },
  };
}

function fixtureEntrySha256(packageName: string): string {
  const name = packageName === '@aurelia/runtime-html' ? 'runtime-html' : 'aurelia';
  const text = `export const identity = "${name}";\n`;
  return createHash('sha256').update(text).digest('hex');
}
