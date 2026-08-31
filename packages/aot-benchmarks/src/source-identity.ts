import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type {
  GitObjectId,
  RepositorySourceIdentity,
  Sha256,
} from './contracts.js';

const execFileAsync = promisify(execFile);

export async function captureRepositorySourceIdentity(request: {
  readonly repositoryRoot: string;
  readonly repositoryId: string;
  readonly sourceRoots: readonly string[];
  readonly builtRoots: readonly string[];
  readonly lockFile: string;
}): Promise<RepositorySourceIdentity> {
  const repositoryRoot = path.resolve(request.repositoryRoot);
  const revision = await git(repositoryRoot, ['rev-parse', 'HEAD']) as GitObjectId;
  const tree = await git(repositoryRoot, ['rev-parse', 'HEAD^{tree}']) as GitObjectId;
  const dirtyRows = await git(repositoryRoot, ['status', '--porcelain', '--untracked-files=all']);
  if (dirtyRows.length > 0) {
    throw new Error(`Repository '${request.repositoryId}' is dirty and cannot identify a promoted benchmark run.`);
  }
  const lockPath = path.resolve(repositoryRoot, request.lockFile);
  return {
    repositoryId: request.repositoryId,
    revision,
    tree,
    dirty: false,
    lockSha256: await hashFile(lockPath),
    sourceSha256: await hashTrackedRoots(repositoryRoot, request.sourceRoots),
    builtOutputSha256: await hashFileRoots(repositoryRoot, request.builtRoots),
  };
}

export async function hashTrackedRoots(
  repositoryRoot: string,
  roots: readonly string[],
): Promise<Sha256> {
  const files = await git(repositoryRoot, [
    'ls-files',
    '-z',
    '--',
    ...roots.map(toPosixPath),
  ], false);
  const paths = files.split('\0').filter(Boolean).sort((left, right) => left.localeCompare(right));
  if (paths.length === 0) throw new Error(`Tracked source roots contain no files: ${roots.join(', ')}.`);
  return hashFiles(repositoryRoot, paths);
}

export async function hashFileRoots(
  repositoryRoot: string,
  roots: readonly string[],
): Promise<Sha256> {
  const paths = (await Promise.all(roots.map(root => listFiles(repositoryRoot, root))))
    .flat()
    .sort((left, right) => left.localeCompare(right));
  if (paths.length === 0) throw new Error(`Built output roots contain no files: ${roots.join(', ')}.`);
  return hashFiles(repositoryRoot, paths);
}

async function listFiles(repositoryRoot: string, relativeRoot: string): Promise<string[]> {
  const absoluteRoot = path.resolve(repositoryRoot, relativeRoot);
  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(absoluteRoot, entry.name);
    const relative = toPosixPath(path.relative(repositoryRoot, absolute));
    if (entry.isDirectory()) files.push(...await listFiles(repositoryRoot, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function hashFiles(root: string, files: readonly string[]): Promise<Sha256> {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(toPosixPath(file));
    hash.update('\0');
    hash.update(await readFile(path.resolve(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex') as Sha256;
}

async function hashFile(file: string): Promise<Sha256> {
  return createHash('sha256').update(await readFile(file)).digest('hex') as Sha256;
}

async function git(root: string, args: readonly string[], trim = true): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return trim ? stdout.trim() : stdout;
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
