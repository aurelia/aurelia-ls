import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveAnalysisProfile } from './analysis-profile.js';

export interface SnapshotPaths {
  toolRootPath: string;
  snapshotRootPath: string;
}

export interface SnapshotTargetSelection {
  target: string;
  repoPath?: string;
  profileId?: string;
  profilePath?: string | null;
}

type RefreshMode = 'deps' | 'typerefs' | 'exports' | 'all';

function normalizePath(path: string): string {
  return resolve(path).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function deriveSnapshotTargetFromRepoPath(repoPath: string): string {
  const repoName = basename(resolve(repoPath));
  const sanitized = repoName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'repo';
}

export function resolveSnapshotTarget(
  options: {
    target?: string;
    repoPath?: string;
    profilePath?: string;
  } = {},
): SnapshotTargetSelection {
  const profile = resolveAnalysisProfile({
    repoPath: options.repoPath,
    target: options.target,
    profilePath: options.profilePath,
  });
  return {
    target: profile.snapshotTarget,
    repoPath: profile.repoPath,
    profileId: profile.profileId,
    profilePath: profile.profilePath,
  };
}

export function createRefreshCommand(
  mode: RefreshMode,
  selection: SnapshotTargetSelection,
): string {
  const cwdPath = normalizePath(process.cwd());
  const parts = ['pnpm source-analysis', 'refresh', mode, '--target', selection.target];
  if (selection.repoPath && normalizePath(selection.repoPath) !== cwdPath) {
    parts.push('--repo', selection.repoPath);
  }
  return parts.join(' ');
}

export function getExcludedRepoRelativePrefixesForTarget(
  _target: string,
): readonly string[] {
  return [];
}

function resolveToolRootPath(moduleUrl: string): string {
  let currentDir = dirname(fileURLToPath(moduleUrl));
  while (true) {
    if (existsSync(resolve(currentDir, 'package.json'))) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Unable to resolve source-analysis tool root from ${moduleUrl}`);
    }
    currentDir = parentDir;
  }
}

export function createSnapshotPaths(
  moduleUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): SnapshotPaths {
  const toolRootPath = resolveToolRootPath(moduleUrl);
  const snapshotRootPath = env.SNAPSHOT_ROOT
    ? resolve(env.SNAPSHOT_ROOT)
    : resolve(process.cwd(), '.source-analysis/snapshots');
  return {
    toolRootPath,
    snapshotRootPath,
  };
}
