import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CorpusFileKind } from './corpus-types.js';
import { readDocsCorpusFromFileSystem } from './file-system-corpus.js';
import { normalizeMarkdownPath } from './markdown-parser.js';

export const AURELIA_USER_DOCS_CORPUS_ID = 'aurelia-user-docs';
export const AURELIA_USER_DOCS_SNAPSHOT_ROOT = 'docs/aurelia-user-docs';
export const AURELIA_USER_DOCS_MANIFEST_FILE = 'docs/aurelia-user-docs.manifest.json';

export interface DocsSnapshotOptions {
  readonly sourceRootDir: string;
  readonly outputRootDir: string;
  readonly sourceRevision?: string;
  readonly generatedAt?: string;
  readonly clean?: boolean;
}

export interface DocsSnapshotManifest {
  readonly schemaVersion: 1;
  readonly corpusId: typeof AURELIA_USER_DOCS_CORPUS_ID;
  readonly generatedAt: string;
  readonly source: DocsSnapshotSource;
  readonly snapshot: DocsSnapshotSummary;
  readonly files: readonly DocsSnapshotFile[];
}

export interface DocsSnapshotSource {
  readonly sourceRootDir: string;
  readonly sourceRevision?: string;
}

export interface DocsSnapshotSummary {
  readonly rootRelativePath: typeof AURELIA_USER_DOCS_SNAPSHOT_ROOT;
  readonly manifestRelativePath: typeof AURELIA_USER_DOCS_MANIFEST_FILE;
  readonly fileCount: number;
  readonly markdownFileCount: number;
  readonly imageFileCount: number;
  readonly otherFileCount: number;
  readonly totalBytes: number;
  readonly sha256: string;
}

export interface DocsSnapshotFile {
  readonly relativePath: string;
  readonly kind: CorpusFileKind;
  readonly byteLength: number;
  readonly sha256: string;
}

export function createAureliaUserDocsSnapshot(options: DocsSnapshotOptions): DocsSnapshotManifest {
  const sourceRootDir = path.resolve(options.sourceRootDir);
  const outputRootDir = path.resolve(options.outputRootDir);
  const snapshotRootDir = path.join(outputRootDir, AURELIA_USER_DOCS_SNAPSHOT_ROOT);
  const manifestPath = path.join(outputRootDir, AURELIA_USER_DOCS_MANIFEST_FILE);

  if (!fs.existsSync(sourceRootDir)) {
    throw new Error(`Aurelia docs source root does not exist: ${sourceRootDir}`);
  }
  if (!fs.statSync(sourceRootDir).isDirectory()) {
    throw new Error(`Aurelia docs source root is not a directory: ${sourceRootDir}`);
  }

  ensureDirectoryContains(outputRootDir, snapshotRootDir, 'docs snapshot root');
  ensureDirectoryContains(outputRootDir, manifestPath, 'docs snapshot manifest');

  if (options.clean !== false) {
    fs.rmSync(snapshotRootDir, { recursive: true, force: true });
    fs.rmSync(manifestPath, { force: true });
  }

  const relativePaths = discoverFiles(sourceRootDir);
  const files: DocsSnapshotFile[] = [];
  let totalBytes = 0;
  let markdownFileCount = 0;
  let imageFileCount = 0;
  let otherFileCount = 0;
  const aggregateHash = createHash('sha256');

  for (const relativePath of relativePaths) {
    const sourcePath = path.join(sourceRootDir, relativePath);
    const targetPath = path.join(snapshotRootDir, relativePath);
    const bytes = fs.readFileSync(sourcePath);
    const kind = classifyFileKind(relativePath);
    const sha256 = createHash('sha256').update(bytes).digest('hex');

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, bytes);

    totalBytes += bytes.byteLength;
    if (kind === 'markdown') {
      markdownFileCount += 1;
    } else if (kind === 'image') {
      imageFileCount += 1;
    } else {
      otherFileCount += 1;
    }

    aggregateHash.update(relativePath);
    aggregateHash.update('\0');
    aggregateHash.update(String(bytes.byteLength));
    aggregateHash.update('\0');
    aggregateHash.update(sha256);
    aggregateHash.update('\0');

    files.push({
      relativePath,
      kind,
      byteLength: bytes.byteLength,
      sha256
    });
  }

  const manifest: DocsSnapshotManifest = {
    schemaVersion: 1,
    corpusId: AURELIA_USER_DOCS_CORPUS_ID,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: {
      sourceRootDir,
      ...(options.sourceRevision !== undefined ? { sourceRevision: options.sourceRevision } : {})
    },
    snapshot: {
      rootRelativePath: AURELIA_USER_DOCS_SNAPSHOT_ROOT,
      manifestRelativePath: AURELIA_USER_DOCS_MANIFEST_FILE,
      fileCount: files.length,
      markdownFileCount,
      imageFileCount,
      otherFileCount,
      totalBytes,
      sha256: aggregateHash.digest('hex')
    },
    files
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function readBundledAureliaUserDocsCorpus(packageRoot = defaultPackageRoot()) {
  return readDocsCorpusFromFileSystem(path.join(packageRoot, AURELIA_USER_DOCS_SNAPSHOT_ROOT));
}

export function readBundledAureliaUserDocsManifest(packageRoot = defaultPackageRoot()): DocsSnapshotManifest {
  const manifestPath = path.join(packageRoot, AURELIA_USER_DOCS_MANIFEST_FILE);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as DocsSnapshotManifest;
}

export function readGitRevisionForPath(rootDir: string): string | undefined {
  const absoluteRoot = path.resolve(rootDir);
  const revision = runGit(absoluteRoot, ['rev-parse', 'HEAD']);
  if (revision === undefined) {
    return undefined;
  }

  const status = runGit(absoluteRoot, ['status', '--short', '--', '.']);
  return status !== undefined && status.trim().length > 0 ? `${revision}+dirty` : revision;
}

function defaultPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

function discoverFiles(rootDir: string): string[] {
  const results: string[] = [];

  const visit = (absoluteDir: string): void => {
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        results.push(normalizeMarkdownPath(path.relative(rootDir, absolutePath)));
      }
    }
  };

  visit(rootDir);
  return results;
}

function classifyFileKind(relativePath: string): CorpusFileKind {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === '.md') {
    return 'markdown';
  }
  if (extension === '.png' || extension === '.jpg' || extension === '.jpeg' || extension === '.webp') {
    return 'image';
  }
  return 'other';
}

function ensureDirectoryContains(parent: string, child: string, label: string): void {
  const relative = path.relative(parent, child);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing unsafe ${label}: ${child}`);
  }
}

function runGit(cwd: string, args: readonly string[]): string | undefined {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
  if (result.status !== 0) {
    return undefined;
  }
  return result.stdout.trim();
}
