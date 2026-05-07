import {
  existsSync,
  readdirSync,
} from 'node:fs';
import {
  extname,
  join,
  relative,
} from 'node:path';
import { SourceLanguage } from '../kernel/address.js';
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
  /** Optional maximum admitted source files before discovery stops. */
  readonly maxFiles?: number | null;
}

/** Infer a coarse source language from the path extension. */
export function inferSourceLanguage(path: string): SourceLanguage {
  switch (extname(path).toLowerCase()) {
    case '.ts':
    case '.tsx':
      return SourceLanguage.TypeScript;
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return SourceLanguage.JavaScript;
    case '.html':
      return SourceLanguage.Html;
    case '.css':
      return SourceLanguage.Css;
    case '.json':
      return SourceLanguage.Json;
    default:
      return SourceLanguage.Unknown;
  }
}

/** Filesystem source discovery used only to admit candidate inputs into the kernel. */
export function discoverSourceFiles(
  rootDir: string,
  options: SourceDiscoveryOptions = {},
): SourceDiscoveryResult {
  const extensions = options.extensions ?? DEFAULT_SOURCE_EXTENSIONS;
  const excludedDirectories = options.excludedDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES;
  const maxFiles = options.maxFiles ?? null;
  const admitted: BootSourceFileInput[] = [];
  if (!existsSync(rootDir)) {
    return new SourceDiscoveryResult(rootDir, admitted, false, false, maxFiles);
  }
  let truncated = false;

  function visit(directory: string): void {
    if (maxFiles != null && admitted.length >= maxFiles) {
      truncated = true;
      return;
    }

    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (maxFiles != null && admitted.length >= maxFiles) {
        truncated = true;
        return;
      }

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !excludedDirectories.has(entry.name)) {
          visit(join(directory, entry.name));
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const absolutePath = join(directory, entry.name);
      if (!extensions.has(extname(absolutePath).toLowerCase())) {
        continue;
      }

      const projectPath = relative(rootDir, absolutePath).replace(/\\/g, '/');
      admitted.push({
        path: projectPath,
        language: inferSourceLanguage(projectPath),
        note: 'Admitted by boot source discovery.',
      });
    }
  }

  visit(rootDir);
  return new SourceDiscoveryResult(rootDir, admitted, true, truncated, maxFiles);
}
