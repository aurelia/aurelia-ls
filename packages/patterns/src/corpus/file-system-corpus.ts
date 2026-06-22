import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  CorpusFile,
  CorpusFileKind,
  DocsCorpus,
  DuplicateNavigationTarget,
  GitBookNavigation,
  NavigationNode
} from './corpus-types.js';
import { normalizeMarkdownPath, parseMarkdownDocument } from './markdown-parser.js';

export function readDocsCorpusFromFileSystem(rootDir: string): DocsCorpus {
  const absoluteRoot = path.resolve(rootDir);
  const discoveredPaths = discoverFiles(absoluteRoot);
  const files = discoveredPaths.map((relativePath) => readCorpusFile(absoluteRoot, relativePath));
  const markdownPaths = files
    .filter((file) => file.kind === 'markdown')
    .map((file) => file.relativePath)
    .sort();
  const tocPath = markdownPaths.includes('TOC.md') ? 'TOC.md' : undefined;
  const tocText = tocPath !== undefined
    ? fs.readFileSync(path.join(absoluteRoot, tocPath), 'utf8')
    : '';
  const navigation = parseGitBookNavigation(tocText, markdownPaths);
  const nodesByTarget = navigation.nodes.reduce<Map<string, NavigationNode[]>>((map, node) => {
    if (node.targetPath !== undefined) {
      const nodes = map.get(node.targetPath) ?? [];
      nodes.push(node);
      map.set(node.targetPath, nodes);
    }
    return map;
  }, new Map());

  const markdownDocuments = markdownPaths.map((relativePath) => {
    const text = fs.readFileSync(path.join(absoluteRoot, relativePath), 'utf8');
    return parseMarkdownDocument(relativePath, text, nodesByTarget.get(relativePath) ?? []);
  });

  return {
    rootDir: absoluteRoot,
    files,
    markdownDocuments,
    navigation
  };
}

export function parseGitBookNavigation(
  tocText: string,
  markdownPaths: readonly string[]
): GitBookNavigation {
  const markdownPathSet = new Set(markdownPaths);
  const nodes: NavigationNode[] = [];
  const parentStack: { depth: number; title: string }[] = [];
  const targetToNodeIds = new Map<string, string[]>();

  const lines = tocText.split(/\r?\n/);
  for (const [lineIndex, line] of lines.entries()) {
    const match = line.match(/^(\s*)[*-]\s+(?:\[([^\]]+)\]\(([^)]+)\)|(.+))\s*$/);
    if (match === null) {
      continue;
    }

    const depth = Math.floor((match[1] ?? '').replace(/\t/g, '  ').length / 2) + 1;
    const title = (match[2] ?? match[4] ?? '').trim();
    const link = match[3]?.trim();

    while (parentStack.length > 0 && parentStack[parentStack.length - 1]!.depth >= depth) {
      parentStack.pop();
    }

    const parsedTarget = link !== undefined ? parseNavigationTarget(link) : undefined;
    const nodeId = `toc-${nodes.length + 1}`;
    const node: NavigationNode = {
      nodeId,
      order: lineIndex + 1,
      depth,
      title,
      ...(parsedTarget?.targetPath !== undefined ? { targetPath: parsedTarget.targetPath } : {}),
      ...(parsedTarget?.targetAnchor !== undefined ? { targetAnchor: parsedTarget.targetAnchor } : {}),
      parentTitles: parentStack.map((entry) => entry.title)
    };
    nodes.push(node);
    parentStack.push({ depth, title });

    if (node.targetPath !== undefined) {
      const nodeIds = targetToNodeIds.get(node.targetPath) ?? [];
      nodeIds.push(nodeId);
      targetToNodeIds.set(node.targetPath, nodeIds);
    }
  }

  const targetPaths = Array.from(targetToNodeIds.keys()).sort();
  const missingTargets = targetPaths.filter((targetPath) => !markdownPathSet.has(targetPath));
  const duplicateTargets: DuplicateNavigationTarget[] = Array.from(targetToNodeIds.entries())
    .filter(([, nodeIds]) => nodeIds.length > 1)
    .map(([targetPath, nodeIds]) => ({ targetPath, nodeIds }));
  const targetPathSet = new Set(targetPaths);
  const orphanMarkdownPaths = markdownPaths
    .filter((relativePath) => relativePath !== 'TOC.md' && !targetPathSet.has(relativePath))
    .sort();

  return {
    nodes,
    targetPaths,
    missingTargets,
    duplicateTargets,
    orphanMarkdownPaths
  };
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

function readCorpusFile(rootDir: string, relativePath: string): CorpusFile {
  const absolutePath = path.join(rootDir, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    relativePath,
    kind: classifyFileKind(relativePath),
    byteLength: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
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

function parseNavigationTarget(link: string): { targetPath?: string; targetAnchor?: string } {
  if (/^[a-z]+:/i.test(link)) {
    return {};
  }

  const [rawPath, rawAnchor] = link.split('#');
  const normalizedPath = rawPath !== undefined && rawPath.length > 0
    ? normalizeMarkdownPath(path.posix.normalize(rawPath))
    : undefined;
  return {
    ...(normalizedPath !== undefined ? { targetPath: normalizedPath } : {}),
    ...(rawAnchor !== undefined ? { targetAnchor: rawAnchor } : {})
  };
}

