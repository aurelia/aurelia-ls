import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AURELIA_USER_DOCS_SNAPSHOT_ROOT,
  type DocsCorpus,
  readDocsCorpusFromFileSystem,
} from '@aurelia-ls/patterns';

let cachedDocsCorpus: DocsCorpus | undefined;

export function readAureliaDocsCorpusForMcp(): DocsCorpus {
  if (cachedDocsCorpus !== undefined) {
    return cachedDocsCorpus;
  }

  const packageRoot = mcpPackageRoot();
  const bundledDocsRoot = path.join(packageRoot, AURELIA_USER_DOCS_SNAPSHOT_ROOT);
  if (fs.existsSync(bundledDocsRoot)) {
    cachedDocsCorpus = readDocsCorpusFromFileSystem(bundledDocsRoot);
    return cachedDocsCorpus;
  }

  const devDocsRoot = path.resolve(packageRoot, '..', '..', 'aurelia', 'docs', 'user-docs');
  if (fs.existsSync(devDocsRoot)) {
    cachedDocsCorpus = readDocsCorpusFromFileSystem(devDocsRoot);
    return cachedDocsCorpus;
  }

  throw new Error([
    'Unable to locate bundled Aurelia docs corpus.',
    `Expected bundled docs at ${bundledDocsRoot}.`,
    `Expected development docs at ${devDocsRoot}.`,
    'Run pnpm --filter @aurelia-ls/mcp release:pack for a packaged build, or keep aurelia/docs/user-docs available in the repository checkout.',
  ].join(' '));
}

export function aureliaDocsIndexResourceValue(): {
  readonly corpusRoot: string;
  readonly markdownDocumentCount: number;
  readonly tools: readonly string[];
  readonly topLevel: readonly { title: string; documentPath?: string; url?: string }[];
} {
  const corpus = readAureliaDocsCorpusForMcp();
  return {
    corpusRoot: corpus.rootDir,
    markdownDocumentCount: corpus.markdownDocuments.filter((document) => document.relativePath !== 'TOC.md').length,
    tools: ['aurelia_docs_search', 'aurelia_docs_fetch'],
    topLevel: corpus.navigation.nodes
      .filter((node) => node.depth === 1)
      .slice(0, 40)
      .map((node) => ({
        title: node.title,
        ...(node.targetPath !== undefined ? { documentPath: node.targetPath } : {}),
        ...(node.targetPath !== undefined ? { url: docsUrlForPath(node.targetPath) } : {}),
      })),
  };
}

function mcpPackageRoot(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.basename(moduleDir) === 'out'
    ? path.dirname(moduleDir)
    : moduleDir;
}

function docsUrlForPath(documentPath: string): string {
  const withoutExtension = documentPath.replace(/\.md$/i, '');
  const routePath = withoutExtension
    .replace(/(?:^|\/)README$/i, '')
    .replace(/\/index$/i, '');
  return `https://docs.aurelia.io/${routePath}`;
}
