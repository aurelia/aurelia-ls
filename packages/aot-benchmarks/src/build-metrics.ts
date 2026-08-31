import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  measureArtifactSet,
  type ArtifactKind,
  type ArtifactSetMetrics,
} from './artifact-metrics.js';
import type { BenchmarkLaneBuild } from './build.js';

export async function measureLaneBuild(build: BenchmarkLaneBuild): Promise<ArtifactSetMetrics> {
  const chunkByFile = new Map(build.chunks.map(chunk => [chunk.fileName, chunk]));
  const initial = transitiveInitialFiles(build.entryFiles, chunkByFile);
  const chunkInputs = await Promise.all(build.chunks.map(async chunk => ({
    path: toPosixPath(chunk.fileName),
    bytes: await readFile(path.join(build.outDir, chunk.fileName)),
    kind: 'javascript' as const,
    initialEager: initial.has(chunk.fileName),
    served: true,
    imports: chunk.imports.map(value => resolveChunkImport(chunk.fileName, value)),
    dynamicImports: chunk.dynamicImports.map(value => resolveChunkImport(chunk.fileName, value)),
  })));
  const assetInputs = await Promise.all(build.assets.map(async asset => ({
    path: toPosixPath(asset.fileName),
    bytes: await readFile(path.join(build.outDir, asset.fileName)),
    kind: artifactKind(asset.fileName),
    initialEager: false,
    served: true,
  })));
  return measureArtifactSet([...chunkInputs, ...assetInputs]);
}

function transitiveInitialFiles(
  entryFiles: readonly string[],
  chunks: ReadonlyMap<string, BenchmarkLaneBuild['chunks'][number]>,
): ReadonlySet<string> {
  const initial = new Set<string>();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (initial.has(file)) continue;
    initial.add(file);
    const chunk = chunks.get(file);
    if (chunk == null) throw new Error(`Initial entry '${file}' is absent from emitted chunks.`);
    queue.push(...chunk.imports.map(value => resolveChunkImport(chunk.fileName, value)));
  }
  return initial;
}

function resolveChunkImport(importer: string, value: string): string {
  const normalized = toPosixPath(value);
  return normalized.startsWith('.')
    ? path.posix.normalize(path.posix.join(path.posix.dirname(toPosixPath(importer)), normalized))
    : normalized;
}

function artifactKind(fileName: string): ArtifactKind {
  if (fileName === 'aurelia-aot-receipt.json') return 'receipt';
  switch (path.extname(fileName).toLowerCase()) {
    case '.js':
    case '.mjs':
      return 'javascript';
    case '.html':
      return 'html';
    case '.css':
      return 'css';
    case '.map':
      return 'map';
    default:
      return 'other';
  }
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
