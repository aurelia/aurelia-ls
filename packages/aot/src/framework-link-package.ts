import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export interface AotFrameworkLinkPackageRequest {
  readonly packageRoot: string;
  readonly packageName: string;
  readonly expectedStandardEntrySha256: string;
  readonly expectedManifestSha256: string;
}

export interface AotFrameworkLinkPackageFile {
  readonly resolvedId: string;
  readonly packageRelativePath: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly code: string;
}

export interface AotFrameworkLinkPackageModule extends AotFrameworkLinkPackageFile {
  readonly map: AotFrameworkLinkPackageFile;
}

/** A verified, preloaded package snapshot. Admission of the entire core graph belongs to the linker. */
export interface AotFrameworkLinkPackage {
  readonly packageRoot: string;
  readonly packageName: string;
  readonly version: string;
  readonly manifestSha256: string;
  readonly buildPolicySha256: string;
  readonly sourceSetSha256: string;
  readonly internalDependencies: readonly { readonly name: string; readonly version: string }[];
  readonly standardEntry: AotFrameworkLinkPackageFile;
  readonly linkEntry: string;
  readonly modules: readonly AotFrameworkLinkPackageModule[];
}

export class AotFrameworkLinkPackageError extends Error {
  public override readonly name = 'AotFrameworkLinkPackageError';

  public constructor(public readonly packageName: string, message: string, options?: ErrorOptions) {
    super(`${packageName}: ${message}`, options);
  }
}

interface FileIdentity {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

/**
 * Consume FW-030's published contract, rather than reproducing its build/pack verifier.
 * The caller pins both the manifest and default entry; a self-consistent manifest alone
 * does not establish authority to replace a framework package.
 */
export async function readAotFrameworkLinkPackage(
  request: AotFrameworkLinkPackageRequest,
): Promise<AotFrameworkLinkPackage> {
  try {
    return await new FrameworkLinkPackageReader(request).read();
  } catch (error) {
    if (error instanceof AotFrameworkLinkPackageError) throw error;
    throw new AotFrameworkLinkPackageError(request.packageName, `Cannot read link package: ${String(error)}`, {
      cause: error,
    });
  }
}

class FrameworkLinkPackageReader {
  private packageRoot = '';

  public constructor(private readonly request: AotFrameworkLinkPackageRequest) {}

  public async read(): Promise<AotFrameworkLinkPackage> {
    this.packageRoot = await realpath(this.request.packageRoot);
    const manifest = record(JSON.parse((await this.readBytes('dist/link/manifest.json')).toString('utf8')));
    this.require(manifest.schema === 'aurelia-framework-link-package/v1'
      && manifest.protocol === 'aurelia-framework-link/v1', 'Unsupported link manifest schema or protocol.');
    const { manifestSha256, ...body } = manifest;
    this.require(isHash(manifestSha256) && manifestSha256 === this.request.expectedManifestSha256
      && manifestSha256 === digest(canonicalJson(body)), 'Manifest identity does not match the pinned manifest.');

    const packageIdentity = record(manifest.package);
    const packageBytes = await this.readBytes('package.json');
    this.verifyBytes(packageBytes, {
      path: 'package.json', bytes: packageIdentity.packageJsonBytes, sha256: packageIdentity.packageJsonSha256,
    });
    const packageJson = record(JSON.parse(packageBytes.toString('utf8')));
    this.require(packageIdentity.name === this.request.packageName && packageJson.name === packageIdentity.name
      && typeof packageIdentity.version === 'string' && packageIdentity.version === packageJson.version
      && packageIdentity.sideEffects === false && packageJson.sideEffects === false,
    'Package identity or side-effects contract differs from its manifest.');
    const dependencies = Object.entries(record(packageJson.dependencies ?? {}))
      .filter(([name]) => name.startsWith('@aurelia/'))
      .sort(([a], [b]) => compare(a, b))
      .map(([name, version]) => {
        this.require(typeof version === 'string', `Invalid dependency version for '${name}'.`);
        return { name, version };
      });
    this.require(canonicalJson(dependencies) === canonicalJson(packageIdentity.internalDependencies),
      'Internal dependencies differ from the package manifest.');

    const sourceSet = record(manifest.sourceSet);
    const sources = this.fileList(sourceSet.files);
    this.require(sourceSet.sha256 === digest(canonicalJson(sources)), 'Source-set identity differs from its manifest.');
    await Promise.all(sources.map(async (source) => {
      this.require(source.path.startsWith('src/') && source.path.endsWith('.ts'), 'Invalid source-set path.');
      this.verifyBytes(await this.readBytes(source.path), source);
    }));

    const origin = record(manifest.origin);
    const standardIdentity = this.identity(origin.standardEntry);
    this.require(standardIdentity.path === 'dist/esm/index.mjs'
      && standardIdentity.sha256 === this.request.expectedStandardEntrySha256,
    'Default entry differs from the pinned framework entry.');
    const standardEntry = await this.file(standardIdentity);
    const buildPolicy = record(manifest.buildPolicy);
    const { sha256: buildPolicySha256, ...policyBody } = buildPolicy;
    this.require(isHash(buildPolicySha256) && buildPolicySha256 === digest(canonicalJson(policyBody)),
      'Build-policy identity differs from its manifest.');
    this.require(buildPolicy.name === 'aurelia-framework-link-preserve-modules/v1'
      && buildPolicy.format === 'es' && buildPolicy.preserveModules === true
      && buildPolicy.sourceMaps === 'external-adjacent', 'Unsupported link build policy.');

    this.require(Array.isArray(manifest.modules) && manifest.modules.length > 0, 'Empty or invalid module inventory.');
    const moduleIdentities = this.fileList(manifest.modules);
    const modules = await Promise.all(moduleIdentities.map(async (module, index) => {
      this.require(module.path.endsWith('.mjs'), `Invalid link module '${module.path}'.`);
      const mapIdentity = this.identity(record((manifest.modules as unknown[])[index]).map);
      this.require(mapIdentity.path === `${module.path}.map`, `Non-adjacent map for '${module.path}'.`);
      const [file, map] = await Promise.all([
        this.file(module, 'dist/link/'), this.file(mapIdentity, 'dist/link/'),
      ]);
      this.require(file.code.trimEnd().endsWith(`//# sourceMappingURL=${path.posix.basename(mapIdentity.path)}`),
        `Module '${module.path}' does not name its adjacent map.`);
      const sourceMap = record(JSON.parse(map.code));
      this.require(sourceMap.version === 3 && sourceMap.file === path.posix.basename(module.path)
        && isStringArray(sourceMap.sources) && isStringArray(sourceMap.names)
        && typeof sourceMap.mappings === 'string'
        && (sourceMap.sourceRoot === undefined || typeof sourceMap.sourceRoot === 'string')
        && (sourceMap.sourcesContent === undefined || (Array.isArray(sourceMap.sourcesContent)
          && sourceMap.sourcesContent.length === sourceMap.sources.length
          && sourceMap.sourcesContent.every((value: unknown) => value === null || typeof value === 'string'))),
        `Invalid source-map association for '${module.path}'.`);
      return { ...file, map };
    }));
    const linkIdentity = this.identity(manifest.linkEntry);
    const entry = modules.find((module) => module.packageRelativePath === 'dist/link/index.mjs');
    this.require(linkIdentity.path === 'dist/link/index.mjs' && entry !== undefined
      && entry.bytes === linkIdentity.bytes && entry.sha256 === linkIdentity.sha256,
    'Link entry is absent from, or differs from, the module inventory.');
    const expectedFiles = ['manifest.json', ...modules.flatMap((module) => [
      module.packageRelativePath.slice('dist/link/'.length), module.map.packageRelativePath.slice('dist/link/'.length),
    ])].sort(compare);
    this.require(canonicalJson(await this.listLinkFiles()) === canonicalJson(expectedFiles),
      'Link directory differs from its exhaustive module/map inventory.');

    return {
      packageRoot: this.packageRoot,
      packageName: this.request.packageName,
      version: packageIdentity.version as string,
      manifestSha256: manifestSha256 as string,
      buildPolicySha256: buildPolicySha256 as string,
      sourceSetSha256: sourceSet.sha256 as string,
      internalDependencies: dependencies,
      standardEntry,
      linkEntry: entry!.resolvedId,
      modules,
    };
  }

  private identity(value: unknown): FileIdentity {
    const item = record(value);
    this.require(typeof item.path === 'string' && validRelativePath(item.path)
      && Number.isSafeInteger(item.bytes) && (item.bytes as number) >= 0 && isHash(item.sha256),
    'Invalid file identity in the link manifest.');
    return item as unknown as FileIdentity;
  }

  private fileList(value: unknown): FileIdentity[] {
    this.require(Array.isArray(value), 'Invalid file inventory in the link manifest.');
    const files = (value as unknown[]).map((item) => this.identity(item));
    const seen = new Set<string>();
    let previous = '';
    for (const file of files) {
      const insensitive = file.path.toLowerCase();
      this.require(!seen.has(insensitive) && compare(previous, file.path) < 0,
        'File inventory is not canonical or contains duplicate paths.');
      previous = file.path;
      seen.add(insensitive);
    }
    return files;
  }

  private async file(identity: FileIdentity, prefix = ''): Promise<AotFrameworkLinkPackageFile> {
    const packageRelativePath = `${prefix}${identity.path}`;
    const bytes = await this.readBytes(packageRelativePath);
    this.verifyBytes(bytes, identity);
    return {
      resolvedId: path.join(this.packageRoot, packageRelativePath),
      packageRelativePath, bytes: identity.bytes, sha256: identity.sha256, code: bytes.toString('utf8'),
    };
  }

  private verifyBytes(bytes: Buffer, identity: { path: string; bytes: unknown; sha256: unknown }): void {
    this.require(bytes.byteLength === identity.bytes && digest(bytes) === identity.sha256,
      `File '${identity.path}' differs from its manifest identity.`);
  }

  private async readBytes(relativePath: string): Promise<Buffer> {
    this.require(validRelativePath(relativePath), `Invalid package-relative path '${relativePath}'.`);
    const file = await realpath(path.join(this.packageRoot, relativePath));
    const relative = path.relative(this.packageRoot, file);
    this.require(relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative), `File '${relativePath}' escapes its package.`);
    return readFile(file);
  }

  private async listLinkFiles(relativePath = ''): Promise<string[]> {
    const entries = await readdir(path.join(this.packageRoot, 'dist/link', relativePath), { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const name = `${relativePath}${entry.name}`;
      this.require(!entry.isSymbolicLink(), `Link directory contains symbolic link '${name}'.`);
      if (entry.isDirectory()) return this.listLinkFiles(`${name}/`);
      this.require(entry.isFile(), `Link directory contains non-file '${name}'.`);
      return [name];
    }));
    return files.flat().sort(compare);
  }

  private require(condition: unknown, message: string): asserts condition {
    if (!condition) throw new AotFrameworkLinkPackageError(this.request.packageName, message);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object in the link manifest.');
  }
  return value as Record<string, unknown>;
}

function validRelativePath(value: string): boolean {
  return !/[\\:\0]/u.test(value) && value.split('/').every((part) =>
    part !== '' && part !== '.' && part !== '..' && !/[. ]$/u.test(part));
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => compare(left, right)));
  });
}
