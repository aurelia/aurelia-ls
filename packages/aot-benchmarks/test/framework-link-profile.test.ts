import path from 'node:path';

import {
  AOT_FRAMEWORK_LINK_MAP_POSTURE,
  AOT_FRAMEWORK_LINK_PROTOCOL,
  AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS,
  AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
} from '@aurelia-ls/aot';
import { describe, expect, test } from 'vitest';

import {
  FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION,
  type FrameworkPackageEntryProvenance,
  type FrameworkPackageGraphProvenance,
  type PreparedFrameworkPackageGraph,
} from '../src/framework-graph.js';
import { createRc2FrameworkLinkProfile } from '../src/framework-link-profile.js';

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

function graph(options: {
  readonly packages?: readonly FrameworkPackageEntryProvenance[];
  readonly entryOverride?: string;
  readonly graphFingerprint?: string;
} = {}): PreparedFrameworkPackageGraph {
  const installRoot = path.join(absoluteRoot(), 'prepared', 'install');
  const packages = options.packages ?? packageEntries();
  const provenance: FrameworkPackageGraphProvenance = {
    schemaVersion: FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION,
    createdAt: '2026-09-01T00:00:00.000Z',
    framework: {
      repositoryRoot: path.join(absoluteRoot(), 'framework'),
      commit: '1'.repeat(40),
      tree: '2'.repeat(40),
      clean: true,
    },
    roots: ['aurelia'],
    graphFingerprint: options.graphFingerprint ?? AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
    graphRoot: path.join(absoluteRoot(), 'prepared'),
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

function packageEntries(): readonly FrameworkPackageEntryProvenance[] {
  return AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS.map(expectation => ({
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
