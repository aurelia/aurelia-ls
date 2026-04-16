import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SourceAnalysisPaths {
  toolRootPath: string;
  snapshotRootPath: string;
}

export interface SourceAnalysisTargetSelection {
  target: string;
  repoPath?: string;
}

type RefreshMode = 'deps' | 'typerefs' | 'exports' | 'all';

function normalizePath(path: string): string {
  return resolve(path).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function deriveTargetFromRepoPath(repoPath: string): string {
  const repoName = basename(resolve(repoPath));
  const sanitized = repoName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'repo';
}

export function resolveSourceAnalysisTarget(
  options: {
    target?: string;
    repoPath?: string;
  } = {},
): SourceAnalysisTargetSelection {
  const repoPath = options.repoPath
    ? resolve(options.repoPath)
    : resolve(process.cwd());
  const target = options.target ?? deriveTargetFromRepoPath(repoPath);
  return { target, repoPath };
}

export function createRefreshCommand(
  mode: RefreshMode,
  selection: SourceAnalysisTargetSelection,
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

export function createSourceAnalysisPaths(
  moduleUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): SourceAnalysisPaths {
  const toolRootPath = resolveToolRootPath(moduleUrl);
  const snapshotRootPath = env.SOURCE_ANALYSIS_SNAPSHOT_ROOT
    ? resolve(env.SOURCE_ANALYSIS_SNAPSHOT_ROOT)
    : resolve(process.cwd(), '.source-analysis/snapshots');
  return {
    toolRootPath,
    snapshotRootPath,
  };
}
