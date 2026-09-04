import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  AOT_FRAMEWORK_LINK_MAP_POSTURE,
  AOT_FRAMEWORK_LINK_PROTOCOL,
  AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS,
  AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
  AOT_RC2_LINK_MODULES_EXPECTATIONS,
  AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT,
} from '@aurelia-ls/aot';
import { afterEach, describe, expect, test } from 'vitest';

import {
  FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION,
  type FrameworkPackageEntryProvenance,
  type FrameworkPackageGraphProvenance,
  type PreparedFrameworkPackageGraph,
} from '../src/framework-graph.js';
import { createRc2FrameworkLinkProfile, createRc2LinkedModulesProfile } from '../src/framework-link-profile.js';

describe('RC2 framework-link benchmark profile', () => {
  test('joins the complete AOT recipe to exact installed graph entries and hashes', () => {
    const framework = graph();
    const profile = createRc2FrameworkLinkProfile({ framework });

    expect(profile).toEqual({
      protocol: AOT_FRAMEWORK_LINK_PROTOCOL,
      graphFingerprint: framework.provenance.graphFingerprint,
      mapPosture: AOT_FRAMEWORK_LINK_MAP_POSTURE,
      policy: 'require-applied',
      modules: AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS.map(expectation => ({
        role: expectation.role,
        packageName: expectation.packageName,
        packageRelativePath: expectation.packageRelativePath,
        resolvedId: framework.entryFor(expectation.packageName),
        expectedSha256: expectation.expectedSha256,
      })),
    });
    expect(createRc2FrameworkLinkProfile({
      framework,
      policy: 'allow-c0-fallback',
    }).policy).toBe('allow-c0-fallback');
  });

  test('refuses incomplete inventory and any source or installed hash drift', () => {
    const missing = graph({
      packages: packageEntries().filter(entry => entry.packageName !== '@aurelia/template-compiler'),
    });
    expect(() => createRc2FrameworkLinkProfile({ framework: missing }))
      .toThrow(/requires '@aurelia\/template-compiler'/u);

    const sourceDrift = graph({
      packages: packageEntries().map(entry => entry.packageName === '@aurelia/expression-parser'
        ? { ...entry, sourceEsmSha256: 'f'.repeat(64) }
        : entry),
    });
    expect(() => createRc2FrameworkLinkProfile({ framework: sourceDrift }))
      .toThrow(/prepared source\/installed hashes/u);

    const installedDrift = graph({
      packages: packageEntries().map(entry => entry.packageName === 'aurelia'
        ? { ...entry, installedEsmSha256: 'e'.repeat(64) }
        : entry),
    });
    expect(() => createRc2FrameworkLinkProfile({ framework: installedDrift }))
      .toThrow(/prepared source\/installed hashes/u);
  });

  test('refuses a well-formed graph fingerprint that is not the AOT-owned RC2 graph', () => {
    const framework = graph({ graphFingerprint: 'a'.repeat(64) });
    expect(() => createRc2FrameworkLinkProfile({ framework }))
      .toThrow(/expects graph .* but the prepared graph is/u);
  });

  test('refuses a prepared entry whose actual resolved path is not the admitted package entry', () => {
    const framework = graph({
      entryOverride: path.join(absoluteRoot(), 'outside', 'index.mjs'),
    });
    expect(() => createRc2FrameworkLinkProfile({ framework }))
      .toThrow(/must end in/u);
  });
});

describe('RC2 published linked-modules benchmark profile', () => {
  const temporaryRoots: string[] = [];
  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
  });

  test('joins five targets and one guard to all three installed package manifests', async () => {
    const framework = await fixture();
    const profile = await createRc2LinkedModulesProfile({ framework });
    expect(profile.graphFingerprint).toBe(AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT);
    expect(profile.policy).toBe('require-applied');
    expect(profile.modules.filter(module => module.role === 'target')).toHaveLength(5);
    expect(profile.modules.filter(module => module.role === 'guard').map(module => module.packageName))
      .toEqual(['aurelia']);
    expect(profile.packages).toEqual([
      '@aurelia/kernel', '@aurelia/runtime', '@aurelia/runtime-html',
    ].map(packageName => ({
      packageName,
      packageRoot: path.resolve(path.dirname(framework.entryFor(packageName)), '../..'),
      expectedManifestSha256: 'c'.repeat(64),
      expectedStandardEntrySha256: framework.provenance.packages
        .find(entry => entry.packageName === packageName)!.installedEsmSha256,
    })));
    expect((await createRc2LinkedModulesProfile({ framework, policy: 'allow-c0-fallback' })).policy)
      .toBe('allow-c0-fallback');
  });

  test('does not relabel the original RC2 graph or admit a different derived graph', async () => {
    await expect(createRc2LinkedModulesProfile({ framework: graph() }))
      .rejects.toThrow(/linked-modules recipe expects graph/u);
    await expect(createRc2LinkedModulesProfile({ framework: graph({ graphFingerprint: 'a'.repeat(64) }) }))
      .rejects.toThrow(/linked-modules recipe expects graph/u);
  });

  test('refuses a missing, mismatched, or malformed linked-package manifest', async () => {
    const framework = await fixture();
    const manifestPath = path.resolve(path.dirname(framework.entryFor('@aurelia/runtime')), '../link/manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifestFor(framework, '@aurelia/kernel')));
    await expect(createRc2LinkedModulesProfile({ framework }))
      .rejects.toThrow(/does not describe the prepared package entry/u);
    await writeFile(manifestPath, JSON.stringify({
      ...manifestFor(framework, '@aurelia/runtime'), manifestSha256: 'not-a-hash',
    }));
    await expect(createRc2LinkedModulesProfile({ framework }))
      .rejects.toThrow(/canonical manifest hash/u);
    await rm(manifestPath);
    await expect(createRc2LinkedModulesProfile({ framework })).rejects.toThrow(/ENOENT/u);
  });

  test('checks flat core entries before trusting their alternate link manifests', async () => {
    const entries = packageEntries(AOT_RC2_LINK_MODULES_EXPECTATIONS)
      .map(entry => entry.packageName === '@aurelia/kernel'
        ? { ...entry, installedEsmSha256: 'b'.repeat(64) } : entry);
    await expect(createRc2LinkedModulesProfile({ framework: graph({
      packages: entries,
      graphFingerprint: AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT,
    }) })).rejects.toThrow(/prepared source\/installed hashes/u);
  });

  async function fixture(): Promise<PreparedFrameworkPackageGraph> {
    const root = await mkdtemp(path.join(os.tmpdir(), 'aot-linked-modules-profile-'));
    temporaryRoots.push(root);
    const framework = graph({
      root,
      graphFingerprint: AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT,
      packages: packageEntries(AOT_RC2_LINK_MODULES_EXPECTATIONS),
    });
    for (const packageName of ['@aurelia/kernel', '@aurelia/runtime', '@aurelia/runtime-html']) {
      const linkRoot = path.resolve(path.dirname(framework.entryFor(packageName)), '../link');
      await mkdir(linkRoot, { recursive: true });
      await writeFile(path.join(linkRoot, 'manifest.json'), JSON.stringify(manifestFor(framework, packageName)));
    }
    return framework;
  }

  function manifestFor(framework: PreparedFrameworkPackageGraph, packageName: string) {
    const entry = framework.provenance.packages.find(entry => entry.packageName === packageName)!;
    return {
      schema: 'aurelia-framework-link-package/v1',
      protocol: 'aurelia-framework-link/v1',
      package: { name: packageName, version: entry.version },
      origin: { standardEntry: { path: entry.esmEntry, sha256: entry.installedEsmSha256 } },
      manifestSha256: 'c'.repeat(64),
    };
  }
});

function graph(options: {
  readonly root?: string;
  readonly packages?: readonly FrameworkPackageEntryProvenance[];
  readonly entryOverride?: string;
  readonly graphFingerprint?: string;
} = {}): PreparedFrameworkPackageGraph {
  const root = options.root ?? absoluteRoot();
  const installRoot = path.join(root, 'prepared', 'install');
  const packages = options.packages ?? packageEntries();
  const provenance: FrameworkPackageGraphProvenance = {
    schemaVersion: FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION,
    createdAt: '2026-09-01T00:00:00.000Z',
    framework: {
      repositoryRoot: path.join(root, 'framework'),
      commit: '1'.repeat(40),
      tree: '2'.repeat(40),
      clean: true,
    },
    roots: ['aurelia'],
    graphFingerprint: options.graphFingerprint ?? AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
    graphRoot: path.join(root, 'prepared'),
    installRoot,
    toolchain: { node: 'v22.13.0', npm: '11.0.0' },
    rootManifestSha256: '4'.repeat(64),
    packageLockSha256: '5'.repeat(64),
    packages,
  };
  return {
    root: provenance.graphRoot,
    installRoot,
    provenance,
    entryFor(packageName) {
      if (!packages.some(entry => entry.packageName === packageName)) {
        throw new Error(`missing ${packageName}`);
      }
      return options.entryOverride
        ?? path.join(installRoot, 'node_modules', ...packageName.split('/'), 'dist', 'esm', 'index.mjs');
    },
    async dispose() {},
  };
}

function packageEntries(
  expectations: typeof AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS = AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS,
): readonly FrameworkPackageEntryProvenance[] {
  return expectations.map(expectation => ({
    packageName: expectation.packageName,
    version: '2.0.0-rc.2',
    sourceDirectory: `packages/${expectation.packageName.replace(/^@aurelia\//u, '')}`,
    sourceManifestSha256: '6'.repeat(64),
    internalDependencies: [],
    esmEntry: expectation.packageRelativePath,
    sourceEsmSha256: expectation.expectedSha256,
    installedEsmSha256: expectation.expectedSha256,
    archive: {
      fileName: `${expectation.packageName.replaceAll('/', '-')}.tgz`,
      bytes: 1,
      sha1: '7'.repeat(40),
      sha256: '8'.repeat(64),
      integrity: 'sha512-fixture',
    },
  }));
}

function absoluteRoot(): string {
  return path.join(path.parse(process.cwd()).root, 'aot-framework-link-profile-test');
}
