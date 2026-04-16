import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { SourceAnalysisPaths } from './config.js';

export type SnapshotKind = 'deps' | 'typerefs' | 'exports';

export interface SnapshotOptions {
  target: string;
  kind: SnapshotKind;
  waitMs: number;
  refreshCommand: string;
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForLockRelease(lockPath: string, waitMs: number): boolean {
  const deadline = Date.now() + waitMs;
  while (existsSync(lockPath)) {
    if (Date.now() >= deadline) return false;
    sleep(100);
  }
  return true;
}

export function waitIfLocked(path: string, waitMs: number): void {
  const lockPath = `${path}.lock`;
  if (!existsSync(lockPath)) return;
  if (!waitForLockRelease(lockPath, waitMs)) {
    throw new Error(
      `LOCK_TIMEOUT: ${lockPath} remained locked for ${waitMs}ms. ` +
      'Stop and escalate to user; do not fallback to stale dated snapshots.',
    );
  }
}

export function resolveCurrentSnapshotPath(
  paths: SourceAnalysisPaths,
  options: SnapshotOptions,
): string {
  const filename = `${options.target}-${options.kind}.json`;
  const currentCandidate = join(paths.snapshotRootPath, filename);
  waitIfLocked(currentCandidate, options.waitMs);

  try {
    const stats = statSync(currentCandidate);
    if (stats.size <= 0) {
      throw new Error('file is empty');
    }
    return currentCandidate;
  } catch (error) {
    const reason = (error as Error).message || 'missing or unreadable file';
    throw new Error(
      `CURRENT_SNAPSHOT_UNAVAILABLE: ${currentCandidate} (${reason}).\n` +
      `Run: ${options.refreshCommand}\n` +
      'Then rerun your query. If this persists, stop and escalate to user.',
    );
  }
}

export function loadJsonSnapshot<T>(path: string, waitMs: number): T {
  waitIfLocked(path, waitMs);
  const raw = readFileSync(path, 'utf-8');
  if (!raw.trim()) throw new Error('file is empty');
  return JSON.parse(raw) as T;
}
