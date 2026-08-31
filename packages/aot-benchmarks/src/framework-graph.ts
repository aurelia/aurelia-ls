import { execFile } from 'node:child_process';
import { createHash, type BinaryLike } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION = 'aurelia-framework-package-graph/v1' as const;

export type FrameworkBenchmarkRootPackage =
  | 'aurelia'
  | '@aurelia/runtime-html'
  | '@aurelia/router';

export interface FrameworkPackageGraphRequest {
  /** Root of the checked-out Aurelia framework repository. */
  readonly frameworkRoot: string;
  /** Existing run directory beneath which this preparation owns one unique child. */
  readonly runRoot: string;
  readonly rootPackages: readonly FrameworkBenchmarkRootPackage[];
  readonly npmExecutable?: string;
}

export interface FrameworkPackageArchiveProvenance {
  readonly fileName: string;
  readonly bytes: number;
  readonly sha1: string;
  readonly sha256: string;
  readonly integrity: string;
}

export interface FrameworkPackageEntryProvenance {
  readonly packageName: string;
  readonly version: string;
  readonly sourceDirectory: string;
  readonly sourceManifestSha256: string;
  readonly internalDependencies: readonly string[];
  readonly esmEntry: string;
  readonly sourceEsmSha256: string;
  readonly installedEsmSha256: string;
  readonly archive: FrameworkPackageArchiveProvenance;
}

export interface FrameworkPackageGraphProvenance {
  readonly schemaVersion: typeof FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION;
  readonly createdAt: string;
  readonly framework: {
    readonly repositoryRoot: string;
    readonly commit: string;
    readonly tree: string;
    readonly clean: true;
  };
  readonly roots: readonly FrameworkBenchmarkRootPackage[];
  readonly graphFingerprint: string;
  readonly graphRoot: string;
  readonly installRoot: string;
  readonly toolchain: {
    readonly node: string;
    readonly npm: string;
  };
  readonly rootManifestSha256: string;
  readonly packageLockSha256: string;
  readonly packages: readonly FrameworkPackageEntryProvenance[];
}

interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly module?: string;
  readonly exports?: unknown;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

interface SourcePackage {
  readonly manifest: PackageManifest;
  readonly directory: string;
  readonly relativeDirectory: string;
  readonly manifestSha256: string;
  readonly esmEntry: string;
  readonly esmSha256: string;
  readonly internalDependencies: readonly string[];
}

interface PackedPackage {
  readonly source: SourcePackage;
  readonly fileName: string;
  readonly path: string;
  readonly bytes: number;
  readonly sha1: string;
  readonly sha256: string;
  readonly integrity: string;
}

interface NpmPackRecord {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly filename?: unknown;
  readonly size?: unknown;
  readonly shasum?: unknown;
  readonly integrity?: unknown;
}

interface PackageLock {
  readonly lockfileVersion?: unknown;
  readonly packages?: Readonly<Record<string, PackageLockEntry>>;
}

interface PackageLockEntry {
  readonly version?: unknown;
  readonly resolved?: unknown;
  readonly integrity?: unknown;
  readonly dependencies?: unknown;
}

interface RepositoryIdentity {
  readonly root: string;
  readonly commit: string;
  readonly tree: string;
  readonly clean: boolean;
}

interface CommandInvocation {
  readonly executable: string;
  readonly prefixArguments: readonly string[];
}

const allowedRoots = new Set<FrameworkBenchmarkRootPackage>([
  'aurelia',
  '@aurelia/runtime-html',
  '@aurelia/router',
]);

export interface PreparedFrameworkPackageGraph {
  readonly root: string;
  readonly installRoot: string;
  readonly provenance: FrameworkPackageGraphProvenance;
  entryFor(packageName: string): string;
  dispose(): Promise<void>;
}

class OwnedFrameworkPackageGraph implements PreparedFrameworkPackageGraph {
  readonly root: string;
  readonly installRoot: string;
  readonly provenance: FrameworkPackageGraphProvenance;

  readonly #entries: ReadonlyMap<string, string>;
  #disposed = false;

  constructor(
    root: string,
    installRoot: string,
    provenance: FrameworkPackageGraphProvenance,
    entries: ReadonlyMap<string, string>,
  ) {
    this.root = root;
    this.installRoot = installRoot;
    this.provenance = provenance;
    this.#entries = entries;
  }

  entryFor(packageName: string): string {
    const entry = this.#entries.get(packageName);
    if (entry === undefined) {
      throw new Error(`Framework package '${packageName}' is not present in this prepared graph.`);
    }
    return entry;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    await rm(this.root, { recursive: true, force: true });
  }
}

/**
 * Pack and install the exact production Aurelia package closure represented by
 * one clean framework checkout. The returned object owns only its unique child
 * of `runRoot`; disposing it never removes the caller-owned run directory.
 */
export async function prepareFrameworkPackageGraph(
  request: FrameworkPackageGraphRequest,
): Promise<PreparedFrameworkPackageGraph> {
  const roots = normalizeRoots(request.rootPackages);
  const frameworkRoot = await realpath(resolve(request.frameworkRoot));
  const repository = await inspectRepository(frameworkRoot);
  if (!repository.clean) {
    throw new Error(`Aurelia framework repository '${frameworkRoot}' is dirty.`);
  }

  const catalog = await readPackageCatalog(frameworkRoot);
  const closure = await resolvePackageClosure(frameworkRoot, roots, catalog);

  const runRoot = resolve(request.runRoot);
  await mkdir(runRoot, { recursive: true });
  const graphRoot = await mkdtemp(join(runRoot, 'framework-package-graph-'));
  const packsRoot = join(graphRoot, 'packs');
  const installRoot = join(graphRoot, 'install');
  const cacheRoot = join(graphRoot, 'npm-cache');
  await Promise.all([
    mkdir(packsRoot, { recursive: true }),
    mkdir(installRoot, { recursive: true }),
    mkdir(cacheRoot, { recursive: true }),
  ]);

  try {
    const npm = npmInvocation(request.npmExecutable);
    const npmVersion = (await command(
      npm.executable,
      [...npm.prefixArguments, '--version'],
      graphRoot,
    )).stdout.trim();
    const packed: PackedPackage[] = [];
    for (const source of closure) {
      packed.push(await packPackage(npm, source, packsRoot));
    }

    const rootManifest = createInstallManifest(packed);
    const rootManifestText = `${JSON.stringify(rootManifest, null, 2)}\n`;
    await writeFile(join(installRoot, 'package.json'), rootManifestText, 'utf8');
    await command(npm.executable, [...npm.prefixArguments,
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=true',
      '--install-strategy=hoisted',
      '--strict-peer-deps',
      '--cache',
      cacheRoot,
    ], installRoot);

    const packageLockPath = join(installRoot, 'package-lock.json');
    const packageLockText = await readFile(packageLockPath, 'utf8');
    const packageLock = parseJson<PackageLock>(packageLockText, packageLockPath);
    validatePackageLock(packageLock, graphRoot, installRoot, packed);
    await assertContainedTreeWithoutLinks(installRoot);

    const packageProvenance: FrameworkPackageEntryProvenance[] = [];
    const entries = new Map<string, string>();
    for (const packedPackage of packed) {
      const installed = await validateInstalledPackage(installRoot, packedPackage);
      entries.set(packedPackage.source.manifest.name, installed.entry);
      packageProvenance.push({
        packageName: packedPackage.source.manifest.name,
        version: packedPackage.source.manifest.version,
        sourceDirectory: packedPackage.source.relativeDirectory,
        sourceManifestSha256: packedPackage.source.manifestSha256,
        internalDependencies: packedPackage.source.internalDependencies,
        esmEntry: packedPackage.source.esmEntry,
        sourceEsmSha256: packedPackage.source.esmSha256,
        installedEsmSha256: installed.sha256,
        archive: {
          fileName: packedPackage.fileName,
          bytes: packedPackage.bytes,
          sha1: packedPackage.sha1,
          sha256: packedPackage.sha256,
          integrity: packedPackage.integrity,
        },
      });
    }
    await assertExactInstalledInternalSet(installRoot, new Set(entries.keys()));

    const completionRepository = await inspectRepository(frameworkRoot);
    if (
      !completionRepository.clean
      || completionRepository.commit !== repository.commit
      || completionRepository.tree !== repository.tree
    ) {
      throw new Error('Aurelia framework repository changed while preparing the package graph.');
    }

    const graphFingerprint = sha256(JSON.stringify({
      commit: repository.commit,
      tree: repository.tree,
      roots,
      packages: packageProvenance.map((entry) => ({
        name: entry.packageName,
        version: entry.version,
        dependencies: entry.internalDependencies,
        manifest: entry.sourceManifestSha256,
        sourceEsm: entry.sourceEsmSha256,
        archive: entry.archive.sha256,
        installedEsm: entry.installedEsmSha256,
      })),
      packageLock: sha256(packageLockText),
    }));
    const provenance: FrameworkPackageGraphProvenance = {
      schemaVersion: FRAMEWORK_PACKAGE_GRAPH_PROVENANCE_VERSION,
      createdAt: new Date().toISOString(),
      framework: {
        repositoryRoot: frameworkRoot,
        commit: repository.commit,
        tree: repository.tree,
        clean: true,
      },
      roots,
      graphFingerprint,
      graphRoot,
      installRoot,
      toolchain: {
        node: process.version,
        npm: npmVersion,
      },
      rootManifestSha256: sha256(rootManifestText),
      packageLockSha256: sha256(packageLockText),
      packages: packageProvenance,
    };
    return new OwnedFrameworkPackageGraph(graphRoot, installRoot, provenance, entries);
  } catch (error) {
    await rm(graphRoot, { recursive: true, force: true });
    throw error;
  }
}

function normalizeRoots(
  requested: readonly FrameworkBenchmarkRootPackage[],
): readonly FrameworkBenchmarkRootPackage[] {
  if (requested.length === 0) {
    throw new Error('At least one Aurelia framework root package is required.');
  }
  const roots = [...new Set(requested)].sort((left, right) => left.localeCompare(right));
  for (const root of roots) {
    if (!allowedRoots.has(root)) throw new Error(`Unsupported Aurelia benchmark root package '${root}'.`);
  }
  return roots;
}

async function inspectRepository(frameworkRoot: string): Promise<RepositoryIdentity> {
  const [reportedRoot, commit, tree, status] = await Promise.all([
    git(frameworkRoot, ['rev-parse', '--show-toplevel']),
    git(frameworkRoot, ['rev-parse', 'HEAD']),
    git(frameworkRoot, ['rev-parse', 'HEAD^{tree}']),
    git(frameworkRoot, ['status', '--porcelain=v1', '--untracked-files=all']),
  ]);
  const repositoryRoot = await realpath(reportedRoot.trim());
  if (repositoryRoot !== frameworkRoot) {
    throw new Error(`Framework root '${frameworkRoot}' is inside Git repository '${repositoryRoot}', not its root.`);
  }
  return {
    root: repositoryRoot,
    commit: commit.trim(),
    tree: tree.trim(),
    clean: status.trim().length === 0,
  };
}

async function readPackageCatalog(frameworkRoot: string): Promise<ReadonlyMap<string, SourcePackage>> {
  const packagesRoot = join(frameworkRoot, 'packages');
  const catalog = new Map<string, SourcePackage>();
  for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(packagesRoot, entry.name);
    const manifestPath = join(directory, 'package.json');
    let text: string;
    try {
      text = await readFile(manifestPath, 'utf8');
    } catch (error) {
      if (hasCode(error, 'ENOENT')) continue;
      throw error;
    }
    const manifest = readPackageManifest(text, manifestPath);
    if (catalog.has(manifest.name)) {
      throw new Error(`Duplicate framework package name '${manifest.name}'.`);
    }
    catalog.set(manifest.name, {
      manifest,
      directory,
      relativeDirectory: toPosix(relative(frameworkRoot, directory)),
      manifestSha256: sha256(text),
      esmEntry: '',
      esmSha256: '',
      internalDependencies: [],
    });
  }
  return catalog;
}

async function resolvePackageClosure(
  frameworkRoot: string,
  roots: readonly FrameworkBenchmarkRootPackage[],
  catalog: ReadonlyMap<string, SourcePackage>,
): Promise<readonly SourcePackage[]> {
  const selected = new Map<string, SourcePackage>();
  const pending: string[] = [...roots];
  while (pending.length > 0) {
    const name = pending.pop();
    if (name === undefined || selected.has(name)) continue;
    const candidate = catalog.get(name);
    if (candidate === undefined) {
      throw new Error(`Framework package '${name}' is not present below '${join(frameworkRoot, 'packages')}'.`);
    }
    const internalDependencies = internalDependenciesFor(candidate.manifest, catalog);
    const esmEntry = productionEsmEntry(candidate.manifest, candidate.directory);
    const esmPath = resolve(candidate.directory, esmEntry);
    assertInside(candidate.directory, esmPath, `${candidate.manifest.name} ESM entry`);
    const esmRealPath = await requireFile(esmPath, `${candidate.manifest.name} built ESM entry`);
    assertInside(candidate.directory, esmRealPath, `${candidate.manifest.name} real ESM entry`);
    selected.set(name, {
      ...candidate,
      esmEntry,
      esmSha256: sha256(await readFile(esmRealPath)),
      internalDependencies,
    });
    pending.push(...internalDependencies);
  }
  return [...selected.values()].sort((left, right) =>
    left.manifest.name.localeCompare(right.manifest.name)
  );
}

function internalDependenciesFor(
  manifest: PackageManifest,
  catalog: ReadonlyMap<string, SourcePackage>,
): readonly string[] {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  };
  const internal: string[] = [];
  for (const [name, requirement] of Object.entries(dependencies)) {
    if (name !== 'aurelia' && !name.startsWith('@aurelia/')) continue;
    const target = catalog.get(name);
    if (target === undefined) {
      throw new Error(`${manifest.name} depends on internal package '${name}', but no local package exists.`);
    }
    if (requirement !== target.manifest.version) {
      throw new Error(
        `${manifest.name} requires ${name}@${requirement}; the checked-out package is ${target.manifest.version}.`,
      );
    }
    internal.push(name);
  }
  return internal.sort((left, right) => left.localeCompare(right));
}

function productionEsmEntry(manifest: PackageManifest, packageRoot: string): string {
  if (typeof manifest.module !== 'string') {
    throw new Error(`${manifest.name} does not declare a built dist ESM module entry.`);
  }
  const moduleEntry = normalizeRelativePackagePath(manifest.module, `${manifest.name} module`);
  if (!moduleEntry.startsWith('dist/esm/')) {
    throw new Error(`${manifest.name} module entry '${manifest.module}' is not a built dist ESM entry.`);
  }
  const exportEntry = rootImportExport(manifest.exports);
  if (exportEntry !== undefined) {
    const normalizedExport = normalizeRelativePackagePath(exportEntry, `${manifest.name} exports.import`);
    if (normalizedExport !== moduleEntry) {
      throw new Error(
        `${manifest.name} module '${moduleEntry}' and production import export '${normalizedExport}' disagree.`,
      );
    }
  }
  assertInside(packageRoot, resolve(packageRoot, moduleEntry), `${manifest.name} module`);
  return moduleEntry;
}

function rootImportExport(exportsValue: unknown): string | undefined {
  if (!isRecord(exportsValue)) return undefined;
  const root = exportsValue['.'];
  if (typeof root === 'string') return root;
  if (!isRecord(root)) return undefined;
  return typeof root.import === 'string' ? root.import : undefined;
}

async function packPackage(
  npm: CommandInvocation,
  source: SourcePackage,
  packsRoot: string,
): Promise<PackedPackage> {
  const result = await command(npm.executable, [...npm.prefixArguments,
    'pack',
    source.directory,
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    packsRoot,
  ], packsRoot);
  const records = parseJson<unknown>(result.stdout, `npm pack ${source.manifest.name}`);
  if (!Array.isArray(records) || records.length !== 1 || !isRecord(records[0])) {
    throw new Error(`npm pack returned an invalid record for ${source.manifest.name}.`);
  }
  const record = records[0] as NpmPackRecord;
  if (record.name !== source.manifest.name || record.version !== source.manifest.version) {
    throw new Error(`npm packed the wrong package for ${source.manifest.name}.`);
  }
  if (
    typeof record.filename !== 'string'
    || basename(record.filename) !== record.filename
    || typeof record.size !== 'number'
    || typeof record.shasum !== 'string'
    || typeof record.integrity !== 'string'
  ) {
    throw new Error(`npm pack omitted archive identity for ${source.manifest.name}.`);
  }
  const archivePath = resolve(packsRoot, record.filename);
  assertInside(packsRoot, archivePath, `${source.manifest.name} archive`);
  const archiveRealPath = await requireFile(archivePath, `${source.manifest.name} archive`);
  assertInside(packsRoot, archiveRealPath, `${source.manifest.name} real archive`);
  const bytes = await readFile(archiveRealPath);
  const sha1 = hash('sha1', bytes);
  const sha512 = hashBase64('sha512', bytes);
  if (record.size !== bytes.byteLength || record.shasum !== sha1 || record.integrity !== `sha512-${sha512}`) {
    throw new Error(`npm archive integrity did not verify for ${source.manifest.name}.`);
  }
  return {
    source,
    fileName: record.filename,
    path: archiveRealPath,
    bytes: bytes.byteLength,
    sha1,
    sha256: sha256(bytes),
    integrity: record.integrity,
  };
}

function npmInvocation(explicitExecutable: string | undefined): CommandInvocation {
  if (explicitExecutable !== undefined) {
    if (process.platform === 'win32' && /\.(?:cmd|bat)$/iu.test(explicitExecutable)) {
      const cli = join(dirname(resolve(explicitExecutable)), 'node_modules', 'npm', 'bin', 'npm-cli.js');
      return { executable: process.execPath, prefixArguments: [cli] };
    }
    return { executable: explicitExecutable, prefixArguments: [] };
  }
  if (process.platform === 'win32') {
    return {
      executable: process.execPath,
      prefixArguments: [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')],
    };
  }
  return { executable: 'npm', prefixArguments: [] };
}

function createInstallManifest(packed: readonly PackedPackage[]): Record<string, unknown> {
  const dependencies: Record<string, string> = {};
  for (const entry of packed) dependencies[entry.source.manifest.name] = `file:../packs/${entry.fileName}`;
  return {
    name: '@aurelia-ls/aot-benchmark-framework-graph',
    private: true,
    version: '0.0.0',
    dependencies,
  };
}

function validatePackageLock(
  lock: PackageLock,
  graphRoot: string,
  installRoot: string,
  packed: readonly PackedPackage[],
): void {
  if (lock.lockfileVersion !== 3 || !isRecord(lock.packages)) {
    throw new Error('Isolated framework installation did not produce an npm v3 package lock.');
  }
  const expectedPaths = new Set<string>();
  for (const entry of packed) {
    const lockPath = `node_modules/${entry.source.manifest.name}`;
    expectedPaths.add(lockPath);
    const lockEntry = lock.packages[lockPath];
    if (
      !isRecord(lockEntry)
      || lockEntry.version !== entry.source.manifest.version
      || lockEntry.integrity !== entry.integrity
      || typeof lockEntry.resolved !== 'string'
      || !lockEntry.resolved.startsWith('file:')
    ) {
      throw new Error(`Package lock does not pin ${entry.source.manifest.name} to its prepared archive.`);
    }
    const resolvedArchive = resolve(installRoot, lockEntry.resolved.slice('file:'.length));
    assertInside(graphRoot, resolvedArchive, `${entry.source.manifest.name} locked archive`);
    if (resolve(resolvedArchive) !== resolve(entry.path)) {
      throw new Error(`Package lock points ${entry.source.manifest.name} at an unexpected archive.`);
    }
  }
  for (const lockPath of Object.keys(lock.packages)) {
    const internalPath = internalPackageNameFromLockPath(lockPath);
    if (internalPath !== undefined && !expectedPaths.has(lockPath)) {
      throw new Error(`Unexpected or nested internal framework package in lock: '${lockPath}'.`);
    }
  }
}

async function validateInstalledPackage(
  installRoot: string,
  packed: PackedPackage,
): Promise<{ readonly entry: string; readonly sha256: string }> {
  const packageRoot = resolve(installRoot, 'node_modules', ...packed.source.manifest.name.split('/'));
  assertInside(installRoot, packageRoot, `${packed.source.manifest.name} install root`);
  const packageRealRoot = await realpath(packageRoot);
  assertInside(installRoot, packageRealRoot, `${packed.source.manifest.name} real install root`);
  const manifestPath = join(packageRealRoot, 'package.json');
  const manifest = readPackageManifest(await readFile(manifestPath, 'utf8'), manifestPath);
  if (manifest.name !== packed.source.manifest.name || manifest.version !== packed.source.manifest.version) {
    throw new Error(`Installed package identity differs for ${packed.source.manifest.name}.`);
  }
  const esmEntry = productionEsmEntry(manifest, packageRealRoot);
  if (esmEntry !== packed.source.esmEntry) {
    throw new Error(`Installed ESM entry differs for ${packed.source.manifest.name}.`);
  }
  const entry = await requireFile(resolve(packageRealRoot, esmEntry), `${manifest.name} installed ESM entry`);
  assertInside(packageRealRoot, entry, `${manifest.name} installed real ESM entry`);
  const installedSha256 = sha256(await readFile(entry));
  if (installedSha256 !== packed.source.esmSha256) {
    throw new Error(`Installed ESM bytes differ from the checked-out build for ${manifest.name}.`);
  }
  return { entry, sha256: installedSha256 };
}

async function assertExactInstalledInternalSet(installRoot: string, expected: ReadonlySet<string>): Promise<void> {
  const actual = new Set<string>();
  const nodeModules = join(installRoot, 'node_modules');
  const aureliaRoot = join(nodeModules, '@aurelia');
  try {
    for (const entry of await readdir(aureliaRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) actual.add(`@aurelia/${entry.name}`);
    }
  } catch (error) {
    if (!hasCode(error, 'ENOENT')) throw error;
  }
  try {
    if ((await stat(join(nodeModules, 'aurelia'))).isDirectory()) actual.add('aurelia');
  } catch (error) {
    if (!hasCode(error, 'ENOENT')) throw error;
  }
  const expectedNames = [...expected].sort((left, right) => left.localeCompare(right));
  const actualNames = [...actual].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `Installed internal package set differs: expected ${expectedNames.join(', ')}, got ${actualNames.join(', ')}.`,
    );
  }
}

async function assertContainedTreeWithoutLinks(root: string): Promise<void> {
  const rootRealPath = await realpath(root);
  const pending = [rootRealPath];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    const currentStat = await lstat(current);
    if (currentStat.isSymbolicLink()) throw new Error(`Isolated framework graph contains a link: '${current}'.`);
    const currentRealPath = await realpath(current);
    assertInside(rootRealPath, currentRealPath, 'isolated framework graph entry');
    if (!currentStat.isDirectory()) continue;
    for (const entry of await readdir(current)) pending.push(join(current, entry));
  }
}

function internalPackageNameFromLockPath(lockPath: string): string | undefined {
  const normalized = toPosix(lockPath);
  if (normalized === 'node_modules/aurelia') return 'aurelia';
  const marker = 'node_modules/@aurelia/';
  const index = normalized.lastIndexOf(marker);
  if (index < 0) return undefined;
  const remainder = normalized.slice(index + marker.length);
  return remainder.length > 0 && !remainder.includes('/') ? `@aurelia/${remainder}` : undefined;
}

function readPackageManifest(text: string, path: string): PackageManifest {
  const value = parseJson<unknown>(text, path);
  if (
    !isRecord(value)
    || typeof value.name !== 'string'
    || typeof value.version !== 'string'
    || (value.module !== undefined && typeof value.module !== 'string')
    || !optionalStringRecord(value.dependencies)
    || !optionalStringRecord(value.optionalDependencies)
  ) {
    throw new Error(`Invalid framework package manifest '${path}'.`);
  }
  return value as unknown as PackageManifest;
}

function optionalStringRecord(value: unknown): boolean {
  return value === undefined
    || (isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string'));
}

function normalizeRelativePackagePath(value: string, label: string): string {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//u, '');
  if (
    normalized.length === 0
    || isAbsolute(normalized)
    || normalized === '..'
    || normalized.startsWith('../')
    || normalized.includes('/../')
  ) {
    throw new Error(`${label} '${value}' escapes its package.`);
  }
  return normalized;
}

async function requireFile(path: string, label: string): Promise<string> {
  let detail;
  try {
    detail = await stat(path);
  } catch (error) {
    if (hasCode(error, 'ENOENT')) throw new Error(`${label} is missing at '${path}'.`, { cause: error });
    throw error;
  }
  if (!detail.isFile()) throw new Error(`${label} is not a file at '${path}'.`);
  return realpath(path);
}

function assertInside(root: string, candidate: string, label: string): void {
  const displacement = relative(resolve(root), resolve(candidate));
  if (displacement === '..' || displacement.startsWith('../') || displacement.startsWith('..\\') || isAbsolute(displacement)) {
    throw new Error(`${label} '${candidate}' is outside '${root}'.`);
  }
}

async function git(root: string, args: readonly string[]): Promise<string> {
  return (await command('git', ['-C', root, ...args], root)).stdout;
}

function command(
  executable: string,
  args: readonly string[],
  cwd: string,
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return new Promise((resolveCommand, rejectCommand) => {
    execFile(executable, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) {
        rejectCommand(new Error(
          `${executable} ${args.join(' ')} failed${stderr.trim().length === 0 ? '' : `: ${stderr.trim()}`}`,
          { cause: error },
        ));
        return;
      }
      resolveCommand({ stdout, stderr });
    });
  });
}

function parseJson<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON from '${label}'.`, { cause: error });
  }
}

function sha256(value: BinaryLike): string {
  return hash('sha256', value);
}

function hash(algorithm: string, value: BinaryLike): string {
  return createHash(algorithm).update(value).digest('hex');
}

function hashBase64(algorithm: string, value: BinaryLike): string {
  return createHash(algorithm).update(value).digest('base64');
}

function toPosix(value: string): string {
  return value.replaceAll('\\', '/');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
