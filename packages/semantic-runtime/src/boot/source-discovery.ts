import {
  extname,
  join,
  relative,
} from 'node:path';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import {
  inferSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import {
  SourceDiscoveryResult,
  type BootSourceFileInput,
} from './frames.js';
import type { AuthoredSourceBoundary } from './source-boundary.js';

const DEFAULT_SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
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
  /** Optional maximum admitted source files before discovery stops. */
  readonly maxFiles?: number | null;
}

interface SourceDiscoveryFrame {
  readonly host: SemanticRuntimeProjectInputHost;
  readonly rootDir: string;
  readonly boundary: AuthoredSourceBoundary;
  readonly extensions: ReadonlySet<string>;
  readonly excludedDirectories: ReadonlySet<string>;
  readonly maxFiles: number | null;
  readonly admitted: BootSourceFileInput[];
  truncated: boolean;
}

/** Filesystem source discovery used only to admit candidate inputs into the kernel. */
export function discoverSourceFiles(
  host: SemanticRuntimeProjectInputHost,
  rootDir: string,
  boundary: AuthoredSourceBoundary,
  options: SourceDiscoveryOptions = {},
): SourceDiscoveryResult {
  const frame: SourceDiscoveryFrame = {
    host,
    rootDir,
    boundary,
    extensions: options.extensions ?? DEFAULT_SOURCE_EXTENSIONS,
    excludedDirectories: options.excludedDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES,
    maxFiles: options.maxFiles ?? null,
    admitted: [],
    truncated: false,
  };
  if (!host.directoryExists(rootDir)) {
    return new SourceDiscoveryResult(rootDir, frame.admitted, false, false, frame.maxFiles);
  }
  visitSourceDiscoveryDirectory(frame, rootDir);
  return new SourceDiscoveryResult(rootDir, frame.admitted, true, frame.truncated, frame.maxFiles);
}

function visitSourceDiscoveryDirectory(frame: SourceDiscoveryFrame, directory: string): void {
  if (sourceDiscoveryShouldStop(frame, directory)) {
    return;
  }

  const entries = [...frame.host.readDirectory(directory)]
    .sort((left, right) => left.localeCompare(right));

  for (const entryName of entries) {
    if (sourceDiscoveryShouldStop(frame)) {
      return;
    }
    const entryPath = join(directory, entryName);
    if (frame.host.directoryExists(entryPath)) {
      visitChildSourceDirectory(frame, directory, entryName);
    } else if (frame.host.fileExists(entryPath)) {
      admitSourceFileEntry(frame, directory, entryName);
    }
  }
}

function sourceDiscoveryShouldStop(frame: SourceDiscoveryFrame, directory: string | null = null): boolean {
  if (directory != null && !frame.boundary.contains(directory)) {
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
