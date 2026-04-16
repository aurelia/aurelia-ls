/**
 * Regenerate analyzer snapshots. Writes are lock-protected and atomic
 * (temp file + rename) so concurrent readers never see a torn file.
 *
 * Default output: .source-analysis/snapshots/<target>-{deps|typerefs|exports}.json
 * relative to the current working directory. Override with --out-dir or the
 * SNAPSHOT_ROOT environment variable.
 */

import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  createSnapshotPaths,
  getExcludedRepoRelativePrefixesForTarget,
  resolveSnapshotTarget,
} from './snapshot-config.js';

type Mode = 'deps' | 'typerefs' | 'exports' | 'all';
type RefreshableKind = Exclude<Mode, 'all'>;

const PATHS = createSnapshotPaths(import.meta.url);

const rawArgs = process.argv.slice(2);
let mode: Mode = "all";
if (rawArgs[0] === 'deps' || rawArgs[0] === 'typerefs' || rawArgs[0] === 'exports' || rawArgs[0] === 'all') {
  mode = rawArgs.shift() as Mode;
}

function takeOption(name: string): string | undefined {
  const idx = rawArgs.indexOf(name);
  if (idx === -1) return undefined;
  const value = rawArgs[idx + 1];
  if (!value || value.startsWith("--")) {
    process.stderr.write(`Error: ${name} requires a value.\n`);
    process.exit(1);
  }
  rawArgs.splice(idx, 2);
  return value;
}

const targetArg = takeOption('--target');
const repoArg = takeOption('--repo');
const outDirArg = takeOption('--out-dir') ?? PATHS.snapshotRootPath;
const waitMsArg = takeOption('--wait-ms');
const waitMs = waitMsArg ? Number(waitMsArg) : 20000;
const selection = resolveSnapshotTarget({ target: targetArg, repoPath: repoArg });
const target = selection.target;

if (!Number.isFinite(waitMs) || waitMs < 0) {
  process.stderr.write(`Error: --wait-ms must be a non-negative number (got "${waitMsArg}").\n`);
  process.exit(1);
}

if (rawArgs.length > 0) {
  process.stderr.write(`Error: unknown arguments: ${rawArgs.join(" ")}\n`);
  process.exit(1);
}

const selectedRepoPath = selection.repoPath;
if (!selectedRepoPath) {
  process.stderr.write(
    `Error: could not resolve a repo to analyze. Provide --repo <path>.\n`,
  );
  process.exit(1);
}
const repoPath = selectedRepoPath;

const outDir = resolve(outDirArg);
mkdirSync(outDir, { recursive: true });

const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

function acquireLock(lockPath: string, timeoutMs: number): number {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return openSync(lockPath, "wx");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw err;
      if (Date.now() >= deadline) {
        throw new Error(`timeout waiting for lock ${lockPath}`);
      }
      sleep(200);
    }
  }
}

function runGenerator(kind: RefreshableKind): string {
  const generatorPath = kind === 'deps'
    ? resolve(PATHS.toolRootPath, 'out/deps/generate.js')
    : kind === 'typerefs'
      ? resolve(PATHS.toolRootPath, 'out/typerefs/generate.js')
      : resolve(PATHS.toolRootPath, 'out/exports/generate.js');
  const stdout = execFileSync(
    process.execPath,
    [generatorPath, repoPath, target, JSON.stringify(getExcludedRepoRelativePrefixesForTarget(target))],
    {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 256 * 1024 * 1024,
    },
  );

  JSON.parse(stdout);
  return stdout;
}

function refreshOne(kind: RefreshableKind): void {
  const fileName = `${target}-${kind}.json`;
  const outputPath = join(outDir, fileName);
  const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  const lockPath = `${outputPath}.lock`;

  let lockFd: number | undefined;
  try {
    lockFd = acquireLock(lockPath, waitMs);
    const json = runGenerator(kind);
    writeFileSync(tempPath, json, "utf-8");
    renameSync(tempPath, outputPath);

    const size = statSync(outputPath).size;
    process.stdout.write(`Refreshed ${outputPath} (${size} bytes)\n`);
  } finally {
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // best-effort cleanup
      }
    }
    if (lockFd !== undefined) {
      try {
        closeSync(lockFd);
      } finally {
        try {
          unlinkSync(lockPath);
        } catch {
          // best-effort cleanup
        }
      }
    }
  }
}

if (mode === 'all' || mode === 'deps') refreshOne('deps');
if (mode === 'all' || mode === 'typerefs') refreshOne('typerefs');
if (mode === 'all' || mode === 'exports') refreshOne('exports');
