import {
  existsSync,
  readdirSync,
} from 'node:fs';
import {
  extname,
  isAbsolute,
  join,
  relative,
} from 'node:path';
import {
  inferSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import {
  SourceDiscoveryResult,
  type BootSourceFileInput,
} from './frames.js';

const DEFAULT_SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.html',
  '.css',
  '.json',
]);

const DEFAULT_EXCLUDED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

export interface SourceDiscoveryOptions {
  /** File extensions to admit during boot source discovery. */
  readonly extensions?: ReadonlySet<string>;
  /** Directory names to skip without interpreting config yet. */
  readonly excludedDirectories?: ReadonlySet<string>;
  /** Absolute or root-relative subtrees to skip for this project frame. */
  readonly excludedSubtrees?: ReadonlySet<string>;
  /** Optional maximum admitted source files before discovery stops. */
  readonly maxFiles?: number | null;
}

interface SourceDiscoveryFrame {
  readonly rootDir: string;
  readonly extensions: ReadonlySet<string>;
  readonly excludedDirectories: ReadonlySet<string>;
  readonly excludedSubtrees: ReadonlySet<string>;
  readonly maxFiles: number | null;
  readonly admitted: BootSourceFileInput[];
  truncated: boolean;
}

/** Filesystem source discovery used only to admit candidate inputs into the kernel. */
export function discoverSourceFiles(
  rootDir: string,
  options: SourceDiscoveryOptions = {},
): SourceDiscoveryResult {
  const frame: SourceDiscoveryFrame = {
    rootDir,
    extensions: options.extensions ?? DEFAULT_SOURCE_EXTENSIONS,
    excludedDirectories: options.excludedDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES,
    excludedSubtrees: normalizeExcludedSubtrees(rootDir, options.excludedSubtrees ?? new Set()),
    maxFiles: options.maxFiles ?? null,
    admitted: [],
    truncated: false,
  };
  if (!existsSync(rootDir)) {
    return new SourceDiscoveryResult(rootDir, frame.admitted, false, false, frame.maxFiles);
  }
  visitSourceDiscoveryDirectory(frame, rootDir);
  return new SourceDiscoveryResult(rootDir, frame.admitted, true, frame.truncated, frame.maxFiles);
}

function visitSourceDiscoveryDirectory(frame: SourceDiscoveryFrame, directory: string): void {
  if (sourceDiscoveryShouldStop(frame, directory)) {
    return;
  }

  const entries = readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (sourceDiscoveryShouldStop(frame)) {
      return;
    }
    if (entry.isDirectory()) {
      visitChildSourceDirectory(frame, directory, entry.name);
    } else if (entry.isFile()) {
      admitSourceFileEntry(frame, directory, entry.name);
    }
  }
}

function sourceDiscoveryShouldStop(frame: SourceDiscoveryFrame, directory: string | null = null): boolean {
  if (directory != null && frame.excludedSubtrees.has(normalizeCaseFoldedPath(directory))) {
    return true;
  }
  if (frame.maxFiles != null && frame.admitted.length >= frame.maxFiles) {
    frame.truncated = true;
    return true;
  }
  return false;
}

function visitChildSourceDirectory(
  frame: SourceDiscoveryFrame,
  directory: string,
  entryName: string,
): void {
  if (!entryName.startsWith('.') && !frame.excludedDirectories.has(entryName)) {
    visitSourceDiscoveryDirectory(frame, join(directory, entryName));
  }
}

function admitSourceFileEntry(
  frame: SourceDiscoveryFrame,
  directory: string,
  entryName: string,
): void {
  const absolutePath = join(directory, entryName);
  if (!frame.extensions.has(extname(absolutePath).toLowerCase())) {
    return;
  }
  const projectPath = relative(frame.rootDir, absolutePath).replace(/\\/g, '/');
  frame.admitted.push({
    path: projectPath,
    language: inferSourceLanguage(projectPath),
    role: inferSourceFileRole(projectPath),
    note: 'Admitted by boot source discovery.',
  });
}

function normalizeExcludedSubtrees(rootDir: string, subtrees: ReadonlySet<string>): ReadonlySet<string> {
  const result = new Set<string>();
  for (const subtree of subtrees) {
    result.add(normalizeCaseFoldedPath(isAbsolute(subtree) ? subtree : join(rootDir, subtree)));
  }
  return result;
}

function normalizeCaseFoldedPath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase();
}
