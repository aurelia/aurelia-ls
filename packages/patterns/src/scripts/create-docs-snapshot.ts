import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAureliaUserDocsSnapshot,
  readGitRevisionForPath
} from '../corpus/docs-snapshot.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const sourceRootDir = path.resolve(process.argv[2] ?? path.join(workspaceRoot, 'aurelia/docs/user-docs'));
const outputRootDir = path.resolve(process.argv[3] ?? path.join(packageRoot, '.release/docs-snapshot-package'));
const sourceRevision = readGitRevisionForPath(sourceRootDir);

const manifest = createAureliaUserDocsSnapshot({
  sourceRootDir,
  outputRootDir,
  ...(sourceRevision !== undefined ? { sourceRevision } : {})
});

process.stdout.write(`${JSON.stringify({
  corpusId: manifest.corpusId,
  outputRootDir,
  sourceRootDir,
  sourceRevision: manifest.source.sourceRevision,
  rootRelativePath: manifest.snapshot.rootRelativePath,
  manifestRelativePath: manifest.snapshot.manifestRelativePath,
  fileCount: manifest.snapshot.fileCount,
  markdownFileCount: manifest.snapshot.markdownFileCount,
  imageFileCount: manifest.snapshot.imageFileCount,
  otherFileCount: manifest.snapshot.otherFileCount,
  totalBytes: manifest.snapshot.totalBytes,
  sha256: manifest.snapshot.sha256
}, null, 2)}\n`);
