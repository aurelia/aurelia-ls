import { execFile } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION,
  prepareFrameworkPackageGraph,
} from '../src/framework-graph.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('framework package graph preparation', () => {
  test('packs and offline-installs the exact requested internal closure', async () => {
    const fixture = await frameworkFixture();
    const prepared = await prepareFrameworkPackageGraph({
      frameworkRoot: fixture.frameworkRoot,
      runRoot: fixture.runRoot,
      rootPackages: ['aurelia', '@aurelia/router'],
    });

    expect(prepared.provenance.schemaVersion).toBe(FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION);
    expect(prepared.provenance.framework).toMatchObject({
      commit: fixture.commit,
      clean: true,
    });
    expect(new Set(prepared.provenance.roots)).toEqual(new Set(['aurelia', '@aurelia/router']));
    expect(prepared.provenance.packages.map(entry => entry.packageName)).toEqual([
      '@aurelia/kernel',
      '@aurelia/router',
      '@aurelia/runtime-html',
      'aurelia',
    ]);
    expect(prepared.provenance.packages.every(entry =>
      entry.version === '2.0.0-rc.2'
      && entry.sourceEsmSha256 === entry.installedEsmSha256
      && entry.archive.integrity.startsWith('sha512-')
      && entry.archive.sha256.length === 64
    )).toBe(true);
    expect(prepared.provenance.graphFingerprint).toHaveLength(64);
    expect(prepared.provenance.packageLockSha256).toHaveLength(64);

    const routerEntry = prepared.entryFor('@aurelia/router');
    expect(await readFile(routerEntry, 'utf8')).toContain('export const identity = "@aurelia/router";');
    expect((await lstat(join(prepared.installRoot, 'node_modules', '@aurelia', 'router'))).isSymbolicLink()).toBe(false);
    await expect(stat(join(prepared.installRoot, 'node_modules', '@aurelia', 'unrelated'))).rejects.toMatchObject({
      code: 'ENOENT',
    });

    const lock = JSON.parse(await readFile(join(prepared.installRoot, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { resolved?: string }>;
    };
    for (const name of ['@aurelia/kernel', '@aurelia/router', '@aurelia/runtime-html', 'aurelia']) {
      expect(lock.packages[`node_modules/${name}`]?.resolved).toMatch(/^file:\.\.\/packs\//u);
    }

    const ownedRoot = prepared.root;
    await prepared.dispose();
    await prepared.dispose();
    await expect(stat(ownedRoot)).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await stat(fixture.runRoot)).isDirectory()).toBe(true);
  }, 30_000);

  test('refuses a dirty framework checkout before packing', async () => {
    const fixture = await frameworkFixture();
    await writeFile(join(fixture.frameworkRoot, 'packages', 'kernel', 'README.md'), 'dirty\n', 'utf8');

    await expect(prepareFrameworkPackageGraph({
      frameworkRoot: fixture.frameworkRoot,
      runRoot: fixture.runRoot,
      rootPackages: ['@aurelia/runtime-html'],
    })).rejects.toThrow(/repository .* is dirty/u);
    expect(await directoryNames(fixture.runRoot)).toEqual([]);
  });

  test('requires every closure member to have its built production ESM entry', async () => {
    const fixture = await frameworkFixture({ omitKernelEsm: true });

    await expect(prepareFrameworkPackageGraph({
      frameworkRoot: fixture.frameworkRoot,
      runRoot: fixture.runRoot,
      rootPackages: ['@aurelia/runtime-html'],
    })).rejects.toThrow(/@aurelia\/kernel built ESM entry is missing/u);
    expect(await directoryNames(fixture.runRoot)).toEqual([]);
  });
});

interface FrameworkFixtureOptions {
  readonly omitKernelEsm?: boolean;
}

async function frameworkFixture(options: FrameworkFixtureOptions = {}): Promise<{
  readonly frameworkRoot: string;
  readonly runRoot: string;
  readonly commit: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'aurelia-framework-graph-test-'));
  temporaryRoots.push(root);
  const frameworkRoot = join(root, 'aurelia');
  const runRoot = join(root, 'run');
  await Promise.all([
    mkdir(frameworkRoot, { recursive: true }),
    mkdir(runRoot, { recursive: true }),
  ]);

  await writePackage(frameworkRoot, '@aurelia/kernel', {}, options.omitKernelEsm === true);
  await writePackage(frameworkRoot, '@aurelia/runtime-html', {
    '@aurelia/kernel': '2.0.0-rc.2',
  });
  await writePackage(frameworkRoot, '@aurelia/router', {
    '@aurelia/runtime-html': '2.0.0-rc.2',
  });
  await writePackage(frameworkRoot, 'aurelia', {
    '@aurelia/runtime-html': '2.0.0-rc.2',
  });
  await writePackage(frameworkRoot, '@aurelia/unrelated', {});

  await run('git', ['init', '--quiet'], frameworkRoot);
  await run('git', ['config', 'user.email', 'framework-graph@example.test'], frameworkRoot);
  await run('git', ['config', 'user.name', 'Framework Graph Test'], frameworkRoot);
  await run('git', ['add', '.'], frameworkRoot);
  await run('git', ['commit', '--quiet', '-m', 'Create framework graph fixture'], frameworkRoot);
  const commit = (await run('git', ['rev-parse', 'HEAD'], frameworkRoot)).trim();
  return { frameworkRoot, runRoot, commit };
}

async function writePackage(
  frameworkRoot: string,
  name: string,
  dependencies: Readonly<Record<string, string>>,
  omitEsm = false,
): Promise<void> {
  const directoryName = name === 'aurelia' ? 'aurelia' : name.slice('@aurelia/'.length);
  const packageRoot = join(frameworkRoot, 'packages', directoryName);
  await mkdir(join(packageRoot, 'dist', 'esm'), { recursive: true });
  await writeFile(join(packageRoot, 'package.json'), `${JSON.stringify({
    name,
    version: '2.0.0-rc.2',
    type: 'module',
    module: 'dist/esm/index.mjs',
    exports: {
      '.': {
        import: './dist/esm/index.mjs',
      },
    },
    files: ['dist'],
    dependencies,
  }, null, 2)}\n`, 'utf8');
  if (!omitEsm) {
    await writeFile(
      join(packageRoot, 'dist', 'esm', 'index.mjs'),
      `export const identity = ${JSON.stringify(name)};\n`,
      'utf8',
    );
  }
}

function run(executable: string, args: readonly string[], cwd: string): Promise<string> {
  return new Promise((resolveRun, rejectRun) => {
    execFile(executable, args, { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error !== null) {
        rejectRun(new Error(`${executable} ${args.join(' ')} failed: ${stderr}`, { cause: error }));
        return;
      }
      resolveRun(stdout);
    });
  });
}

async function directoryNames(root: string): Promise<readonly string[]> {
  return (await readdir(root)).sort((left, right) => left.localeCompare(right));
}
