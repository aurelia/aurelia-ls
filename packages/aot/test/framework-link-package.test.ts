import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AotFrameworkLinkPackageError,
  readAotFrameworkLinkPackage,
} from '../src/framework-link-package.js';

type Fixture = Awaited<ReturnType<typeof createFixture>>;
let fixture: Fixture;

beforeEach(async () => { fixture = await createFixture(); });
afterEach(async () => { await rm(fixture.root, { recursive: true, force: true }); });

describe('published framework link package', () => {
  it('preloads a pinned package graph and its adjacent maps', async () => {
    const result = await readAotFrameworkLinkPackage(fixture.request);
    expect(result).toMatchObject({
      packageName: '@aurelia/kernel', version: '2.0.0-rc.2',
      manifestSha256: fixture.manifest.manifestSha256,
      buildPolicySha256: fixture.manifest.buildPolicy.sha256,
      sourceSetSha256: fixture.manifest.sourceSet.sha256,
      internalDependencies: [{ name: '@aurelia/platform', version: '2.0.0-rc.2' }],
    });
    expect(result.standardEntry.packageRelativePath).toBe('dist/esm/index.mjs');
    expect(result.linkEntry).toBe(path.join(result.packageRoot, 'dist/link/index.mjs'));
    expect(result.modules.map((module) => module.packageRelativePath)).toEqual([
      'dist/link/index.mjs', 'dist/link/value.mjs',
    ]);
    expect(result.modules[1]!.code).toContain('export const value=1;');
    expect(JSON.parse(result.modules[1]!.map.code)).toMatchObject({ version: 3, file: 'value.mjs' });
    // The consumer serves these verified bytes; later filesystem writes cannot alter this snapshot.
    await writeFile(path.join(fixture.root, 'dist/link/value.mjs'), 'changed');
    expect(result.modules[1]!.sha256).toBe(digest(result.modules[1]!.code));
  });

  it.each([
    ['manifest pin', { expectedManifestSha256: 'a'.repeat(64) }],
    ['default-entry pin', { expectedStandardEntrySha256: 'a'.repeat(64) }],
    ['package name', { packageName: '@aurelia/runtime' }],
  ])('rejects an incorrect %s', async (_label, patch) => {
    await expect(readAotFrameworkLinkPackage({ ...fixture.request, ...patch }))
      .rejects.toBeInstanceOf(AotFrameworkLinkPackageError);
  });

  it('rejects a manifest changed without recomputing its self identity', async () => {
    fixture.manifest.package.version = '3.0.0';
    await writeFile(fixture.manifestFile, JSON.stringify(fixture.manifest));
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Manifest identity');
  });

  it.each([
    'package.json', 'src/index.ts', 'dist/esm/index.mjs', 'dist/link/value.mjs', 'dist/link/value.mjs.map',
  ])('rejects changed bytes in %s', async (relativePath) => {
    await writeFile(path.join(fixture.root, relativePath), 'changed');
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('differs from its manifest identity');
  });

  it.each([
    'orphan.mjs', 'orphan.mjs.map', 'nested/extra.txt',
  ])('rejects an unlisted link file %s', async (relativePath) => {
    await mkdir(path.dirname(path.join(fixture.root, 'dist/link', relativePath)), { recursive: true });
    await writeFile(path.join(fixture.root, 'dist/link', relativePath), 'extra');
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('exhaustive module/map inventory');
  });

  it.each(['../outside.mjs', '/absolute.mjs', 'C:/absolute.mjs', 'nested\\value.mjs', './index.mjs'])
  ('rejects unsafe inventory path %s', async (badPath) => {
    fixture.manifest.modules[0]!.path = badPath;
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Invalid file identity');
  });

  it('rejects duplicate or case-aliased module paths', async () => {
    fixture.manifest.modules.push({ ...fixture.manifest.modules[0]!, path: 'Index.mjs' });
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('duplicate paths');
  });

  it('rejects a listed entry whose declared identity differs from the module', async () => {
    fixture.manifest.linkEntry.sha256 = 'a'.repeat(64);
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Link entry is absent');
  });

  it('rejects maps for a different module even when their bytes are correctly hashed', async () => {
    const mapIdentity = fixture.manifest.modules[0]!.map;
    const code = JSON.stringify({ version: 3, file: 'different.mjs', sources: [], names: [], mappings: '' });
    await writeFile(path.join(fixture.root, 'dist/link', mapIdentity.path), code);
    Object.assign(mapIdentity, identity(mapIdentity.path, code));
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Invalid source-map association');
  });

  it('rejects non-adjacent maps', async () => {
    fixture.manifest.modules[0]!.map.path = 'value.mjs.map';
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Non-adjacent map');
  });

  it('rejects malformed map fields even when their bytes are correctly hashed', async () => {
    const mapIdentity = fixture.manifest.modules[0]!.map;
    const code = JSON.stringify({ version: 3, file: 'index.mjs', sources: [42], names: [], mappings: '' });
    await writeFile(path.join(fixture.root, 'dist/link', mapIdentity.path), code);
    Object.assign(mapIdentity, identity(mapIdentity.path, code));
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Invalid source-map association');
  });

  it('rejects unsupported manifest contracts', async () => {
    fixture.manifest.protocol = 'aurelia-framework-link/v2';
    await fixture.publish();
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toThrow('Unsupported link manifest');
  });

  it('reports missing and malformed manifests as typed package errors', async () => {
    await writeFile(fixture.manifestFile, '{');
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toBeInstanceOf(AotFrameworkLinkPackageError);
    await rm(fixture.manifestFile);
    await expect(readAotFrameworkLinkPackage(fixture.request)).rejects.toBeInstanceOf(AotFrameworkLinkPackageError);
  });
});

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aot-link-package-'));
  const source = 'export const value = 1;\n';
  const standard = 'export const value=1;\n';
  const packageJson = JSON.stringify({
    name: '@aurelia/kernel', version: '2.0.0-rc.2', sideEffects: false,
    dependencies: { '@aurelia/platform': '2.0.0-rc.2' },
  });
  const files: Record<string, string> = {
    'package.json': packageJson,
    'src/index.ts': source,
    'dist/esm/index.mjs': standard,
    'dist/link/index.mjs': "export { value } from './value.mjs';\n//# sourceMappingURL=index.mjs.map\n",
    'dist/link/value.mjs': 'export const value=1;\n//# sourceMappingURL=value.mjs.map\n',
    'dist/link/index.mjs.map': JSON.stringify({ version: 3, file: 'index.mjs', sources: [], names: [], mappings: '' }),
    'dist/link/value.mjs.map': JSON.stringify({ version: 3, file: 'value.mjs', sources: [], names: [], mappings: '' }),
  };
  for (const [relativePath, code] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
    await writeFile(path.join(root, relativePath), code);
  }
  const sourceFiles = [identity('src/index.ts', source)];
  const policy = {
    name: 'aurelia-framework-link-preserve-modules/v1', format: 'es',
    preserveModules: true, sourceMaps: 'external-adjacent',
  };
  const manifest = {
    schema: 'aurelia-framework-link-package/v1', protocol: 'aurelia-framework-link/v1',
    package: {
      name: '@aurelia/kernel', version: '2.0.0-rc.2', sideEffects: false,
      packageJsonBytes: Buffer.byteLength(packageJson), packageJsonSha256: digest(packageJson),
      internalDependencies: [{ name: '@aurelia/platform', version: '2.0.0-rc.2' }],
    },
    sourceSet: { files: sourceFiles, sha256: digest(canonicalJson(sourceFiles)) },
    origin: { standardEntry: identity('dist/esm/index.mjs', standard) },
    buildPolicy: { ...policy, sha256: digest(canonicalJson(policy)) },
    linkEntry: identity('dist/link/index.mjs', files['dist/link/index.mjs']!),
    modules: ['index.mjs', 'value.mjs'].map((module) => ({
      ...identity(module, files[`dist/link/${module}`]!),
      map: identity(`${module}.map`, files[`dist/link/${module}.map`]!),
    })),
    manifestSha256: '',
  };
  const request = {
    packageRoot: root, packageName: '@aurelia/kernel',
    expectedStandardEntrySha256: digest(standard), expectedManifestSha256: '',
  };
  const manifestFile = path.join(root, 'dist/link/manifest.json');
  const publish = async () => {
    const { manifestSha256: _excluded, ...body } = manifest;
    manifest.manifestSha256 = digest(canonicalJson(body));
    request.expectedManifestSha256 = manifest.manifestSha256;
    await writeFile(manifestFile, JSON.stringify(manifest));
  };
  await publish();
  return { root, manifestFile, manifest, request, publish };
}

function identity(relativePath: string, code: string) {
  return { path: relativePath, bytes: Buffer.byteLength(code), sha256: digest(code) };
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
