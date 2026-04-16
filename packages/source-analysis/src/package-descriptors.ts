import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import type { RepoSession } from './repo-session.js';

export interface PackageDescriptor {
  readonly packageName: string;
  readonly packageDir: string;
  readonly packageJsonPath: string;
  readonly sourceEntrypoint: string | null;
  readonly publicTypesEntrypoint: string | null;
  readonly analysisBasis: 'source' | 'types';
  readonly analysisEntrypoint: string;
}

export function loadPackageDescriptors(
  session: RepoSession,
): readonly PackageDescriptor[] {
  return session
    .listPackageDirs()
    .map((packageDirAbs) => loadPackageDescriptor(session, packageDirAbs))
    .filter((value): value is PackageDescriptor => value !== null);
}

function loadPackageDescriptor(
  session: RepoSession,
  packageDirAbs: string,
): PackageDescriptor | null {
  const packageJsonAbs = join(packageDirAbs, 'package.json');
  if (!existsSync(packageJsonAbs)) return null;

  const packageJson = readJsonFile<Record<string, unknown>>(packageJsonAbs);
  const packageName = typeof packageJson.name === 'string'
    ? packageJson.name
    : toRepoRelative(session, packageDirAbs);
  const packageDir = toRepoRelative(session, packageDirAbs);
  const publicTypesEntrypoint = resolvePublicTypesEntrypoint(session, packageDirAbs, packageJson);
  const sourceEntrypoint = resolveSourceEntrypoint(
    session,
    packageDirAbs,
    packageJson,
    publicTypesEntrypoint,
  );
  const analysisEntrypoint = sourceEntrypoint ?? publicTypesEntrypoint;

  if (!analysisEntrypoint) return null;

  return {
    packageName,
    packageDir,
    packageJsonPath: toRepoRelative(session, packageJsonAbs),
    sourceEntrypoint,
    publicTypesEntrypoint,
    analysisBasis: sourceEntrypoint ? 'source' : 'types',
    analysisEntrypoint,
  };
}

function collectTypesEntrypointCandidates(
  value: unknown,
  candidates: string[],
): void {
  if (!value) return;
  if (typeof value === 'string') {
    if (value.endsWith('.d.ts')) candidates.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTypesEntrypointCandidates(item, candidates);
    return;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.types === 'string') candidates.push(record.types);
    if (record.default) collectTypesEntrypointCandidates(record.default, candidates);
  }
}

function resolvePublicTypesEntrypoint(
  session: RepoSession,
  packageDirAbs: string,
  packageJson: Record<string, unknown>,
): string | null {
  const candidates: string[] = [];
  const exportsField = packageJson.exports;

  if (exportsField && typeof exportsField === 'object') {
    const record = exportsField as Record<string, unknown>;
    const mainExport = record['.'] ?? exportsField;
    collectTypesEntrypointCandidates(mainExport, candidates);
  }

  if (typeof packageJson.types === 'string') candidates.push(packageJson.types);
  if (typeof packageJson.typings === 'string') candidates.push(packageJson.typings);
  candidates.push('dist/types/index.d.ts');

  for (const candidate of candidates) {
    const resolvedPath = resolvePackageFile(session, packageDirAbs, candidate);
    if (resolvedPath) return resolvedPath;
  }

  return null;
}

function resolveSourceEntrypoint(
  session: RepoSession,
  packageDirAbs: string,
  packageJson: Record<string, unknown>,
  publicTypesEntrypoint: string | null,
): string | null {
  const candidates: Array<string | undefined> = [
    typeof packageJson.source === 'string' ? packageJson.source : undefined,
    'src/index.ts',
    'src/index.tsx',
  ];

  if (publicTypesEntrypoint) {
    const derived = publicTypesEntrypoint
      .replace(/^packages\/[^/]+\//, '')
      .replace(/^dist\/types\//, 'src/')
      .replace(/\.d\.ts$/, '.ts');
    candidates.push(derived, derived.replace(/\.ts$/, '.tsx'));
  }

  for (const candidate of candidates) {
    const resolvedPath = resolvePackageFile(session, packageDirAbs, candidate);
    if (resolvedPath) return resolvedPath;
  }

  return null;
}

function resolvePackageFile(
  session: RepoSession,
  packageDirAbs: string,
  candidate: string | undefined,
): string | null {
  if (!candidate) return null;
  const absPath = resolve(packageDirAbs, candidate);
  const relPath = toRepoRelative(session, absPath);
  if (relPath.startsWith('..') || session.isExcludedRepoRelativePath(relPath)) return null;
  return existsSync(absPath) ? relPath : null;
}

function readJsonFile<T>(absPath: string): T {
  return JSON.parse(readFileSync(absPath, 'utf-8')) as T;
}

function toRepoRelative(
  session: RepoSession,
  absPath: string,
): string {
  return relative(session.repoPath, absPath).replace(/\\/g, '/');
}
