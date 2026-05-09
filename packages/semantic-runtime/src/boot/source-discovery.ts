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
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
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

/** Infer the source's app-world role without interpreting project config yet. */
export function inferSourceFileRole(path: string): SourceFileRole {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const segments = normalized.split('/');
  const baseName = segments.at(-1) ?? normalized;
  const language = inferSourceLanguage(path);

  if (segments.includes('.aurelia-artifacts')) {
    return SourceFileRole.Generated;
  }
  if (isDeclarationFileName(baseName)) {
    return SourceFileRole.Declaration;
  }
  if (isExampleSourcePath(segments, baseName)) {
    return SourceFileRole.ExampleSource;
  }
  if (isTestSourcePath(segments, baseName)) {
    return SourceFileRole.TestSource;
  }
  if (isToolingConfigPath(baseName)) {
    return SourceFileRole.ToolingConfig;
  }
  if (baseName === 'package.json') {
    return SourceFileRole.PackageManifest;
  }

  switch (language) {
    case SourceLanguage.TypeScript:
    case SourceLanguage.JavaScript:
      return SourceFileRole.AppSource;
    case SourceLanguage.Html:
      return SourceFileRole.Template;
    case SourceLanguage.Css:
      return SourceFileRole.Style;
    case SourceLanguage.Json:
      return SourceFileRole.ToolingConfig;
    default:
      return SourceFileRole.Unknown;
  }
}

/** Filesystem source discovery used only to admit candidate inputs into the kernel. */
export function discoverSourceFiles(
  rootDir: string,
  options: SourceDiscoveryOptions = {},
): SourceDiscoveryResult {
  const extensions = options.extensions ?? DEFAULT_SOURCE_EXTENSIONS;
  const excludedDirectories = options.excludedDirectories ?? DEFAULT_EXCLUDED_DIRECTORIES;
  const excludedSubtrees = normalizeExcludedSubtrees(rootDir, options.excludedSubtrees ?? new Set());
  const maxFiles = options.maxFiles ?? null;
  const admitted: BootSourceFileInput[] = [];
  if (!existsSync(rootDir)) {
    return new SourceDiscoveryResult(rootDir, admitted, false, false, maxFiles);
  }
  let truncated = false;

  function visit(directory: string): void {
    if (excludedSubtrees.has(normalizeCaseFoldedPath(directory))) {
      return;
    }
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
        role: inferSourceFileRole(projectPath),
        note: 'Admitted by boot source discovery.',
      });
    }
  }

  visit(rootDir);
  return new SourceDiscoveryResult(rootDir, admitted, true, truncated, maxFiles);
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

function isDeclarationFileName(baseName: string): boolean {
  return baseName.endsWith('.d.ts') || baseName.endsWith('.d.mts') || baseName.endsWith('.d.cts');
}

function isTestSourcePath(segments: readonly string[], baseName: string): boolean {
  return (
    segments.some((segment) =>
      segment === '__tests__' ||
      segment === 'test' ||
      segment === 'tests' ||
      segment === 'spec' ||
      segment === 'specs' ||
      segment === 'e2e'
    ) ||
    /\.(spec|test|e2e|cy)\.[cm]?[tj]sx?$/.test(baseName)
  );
}

function isExampleSourcePath(segments: readonly string[], baseName: string): boolean {
  return (
    segments.some((segment) =>
      segment === 'story' ||
      segment === 'stories' ||
      segment === 'demo' ||
      segment === 'demos'
    ) ||
    /\.(story|stories)\.[cm]?[tj]sx?$/.test(baseName)
  );
}

function isToolingConfigPath(baseName: string): boolean {
  return (
    /^(vite|vitest|webpack|rollup|jest|playwright|karma|tsup|eslint|prettier|postcss|tailwind|babel|commitlint)\.config\./.test(baseName) ||
    /^\.(eslint|prettier|commitlint|babel|stylelint|lintstaged)rc(?:\.[cm]?[jt]s(?:x)?|\.json)?$/.test(baseName) ||
    /^karma\.conf\.[cm]?js$/.test(baseName) ||
    baseName === 'tsconfig.json' ||
    baseName.startsWith('tsconfig.') ||
    baseName === 'jsconfig.json' ||
    baseName === 'nx.json' ||
    baseName === 'turbo.json'
  );
}
