import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { rolldownVersion, version as viteVersion } from 'vite';

import type {
  HashedFileIdentity,
  Sha256,
  ToolchainIdentity,
  ToolVersionIdentity,
} from './contracts.js';

interface PackageManifest {
  readonly version: string;
  readonly module?: string;
  readonly main?: string;
  readonly exports?: unknown;
}

export async function captureBenchmarkToolchainIdentity(request: {
  readonly packageRoot: string;
  readonly target: string;
  readonly define: Readonly<Record<string, string>>;
  readonly options: unknown;
  readonly browserDriver: ToolVersionIdentity;
}): Promise<ToolchainIdentity> {
  const pluginRoot = await realpath(path.resolve(
    request.packageRoot,
    'node_modules',
    '@aurelia',
    'vite-plugin',
  ));
  const manifest = JSON.parse(
    await readFile(path.join(pluginRoot, 'package.json'), 'utf8'),
  ) as PackageManifest;
  const entry = packageImportEntry(manifest);
  const entryPath = await realpath(path.resolve(pluginRoot, entry));
  return {
    node: process.version,
    vite: { name: 'vite', version: viteVersion },
    rolldown: { name: 'rolldown', version: rolldownVersion },
    // Rolldown owns the OXC final minifier in this Vite generation; no independently versioned JS package is loaded.
    oxc: { name: 'oxc-via-rolldown', version: rolldownVersion },
    browserDriver: request.browserDriver,
    officialConventionsProvider: {
      name: '@aurelia/vite-plugin',
      version: manifest.version,
      entry: await hashedFileIdentity(entryPath, request.packageRoot),
    },
    buildMode: 'production',
    sourceMap: false,
    target: request.target,
    defineSha256: hashJson(request.define),
    optionsSha256: hashJson(request.options),
  };
}

export async function hashedFileIdentity(file: string, relativeTo: string): Promise<HashedFileIdentity> {
  const content = await readFile(file);
  return {
    path: toPosixPath(path.relative(relativeTo, file)),
    bytes: (await stat(file)).size,
    sha256: createHash('sha256').update(content).digest('hex') as Sha256,
  };
}

export function hashJson(value: unknown): Sha256 {
  return createHash('sha256').update(canonicalJson(value)).digest('hex') as Sha256;
}

function canonicalJson(value: unknown): string {
  if (value === undefined) return '"<undefined>"';
  if (value == null || typeof value !== 'object') return JSON.stringify(value) ?? '"<unsupported>"';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
}

function packageImportEntry(manifest: PackageManifest): string {
  const rootExport = typeof manifest.exports === 'object' && manifest.exports != null
    ? (manifest.exports as Record<string, unknown>)['.']
    : null;
  const selected = selectExport(rootExport) ?? manifest.module ?? manifest.main;
  if (typeof selected !== 'string' || !selected.startsWith('./')) {
    throw new Error('@aurelia/vite-plugin has no package-relative ESM entry.');
  }
  return selected;
}

function selectExport(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value == null) return null;
  const row = value as Record<string, unknown>;
  return selectExport(row.import) ?? selectExport(row.default);
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
