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
import { canonicalTypeSystemPath, isTypeSystemPathAtOrUnder } from '../type-system/source-file-path.js';
import { configuredViteOutputRoot } from './generated-output.js';
import type { ProjectCompilerOptionsResult } from './project-compiler-options.js';

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
  readonly outputRoots: ReadonlySet<string>;
  readonly explicitFileNames: ReadonlySet<string>;
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
  compilerOptions?: ProjectCompilerOptionsResult,
): SourceDiscoveryResult {
  if (!host.directoryExists(rootDir)) {
    return new SourceDiscoveryResult(rootDir, [], false, false, options.maxFiles ?? null);
  }
  const configured = compilerOptions?.configuredProjects ?? [];
  const outputRoots = new Set([
    configuredViteOutputRoot(host, rootDir),
    ...configured.flatMap(project => [project.options.outDir, project.options.declarationDir]),
  ].filter((root): root is string => root != null).map(canonicalTypeSystemPath));
  const frame: SourceDiscoveryFrame = {
    host,
    rootDir,
    boundary,
    extensions: options.extensions ?? DEFAULT_SOURCE_EXTENSIONS,
    excludedDirectories: options.excludedDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES,
    outputRoots,
    explicitFileNames: new Set(configured.flatMap(project => project.explicitFileNames)),
    maxFiles: options.maxFiles ?? null,
    admitted: [],
    truncated: false,
  };
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
      admitSourceFileEntry(frame, entryPath);
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
  const child = join(directory, entryName);
  const childKey = frame.outputRoots.size ? canonicalTypeSystemPath(child) : null;
  if (childKey != null && frame.outputRoots.has(childKey)) {
    for (const fileName of frame.explicitFileNames) {
      if (sourceDiscoveryShouldStop(frame)) return;
      if (frame.boundary.contains(fileName)
        && isTypeSystemPathAtOrUnder(canonicalTypeSystemPath(fileName), childKey)
        && frame.host.fileExists(fileName)) {
        admitSourceFileEntry(frame, fileName);
      }
    }
    return;
  }
  if (!entryName.startsWith('.') && !frame.excludedDirectories.has(entryName)) {
    visitSourceDiscoveryDirectory(frame, child);
  }
}

function admitSourceFileEntry(
  frame: SourceDiscoveryFrame,
  absolutePath: string,
): void {
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
