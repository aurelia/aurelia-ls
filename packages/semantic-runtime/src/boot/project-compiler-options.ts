import path from 'node:path';
import {
  existsSync,
} from 'node:fs';
import ts from 'typescript';
import {
  hasPackageManifest,
  normalizePosixPath,
  readPackageManifest,
  readPackageName,
  readPackageWorkspacePatterns,
  safeIsDirectory,
  safeReadDirectory,
} from './host-files.js';

export interface ProjectCompilerOptionsCacheOverview {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly clearOperations: number;
  readonly clearedEntries: number;
  readonly pathMappingCount: number;
  readonly pathMappingTargetCount: number;
  readonly configDiagnosticCount: number;
  readonly configRootFileCount: number;
}

interface ProjectCompilerOptionsCacheEntry {
  readonly result: ProjectCompilerOptionsResult;
  readonly pathMappingCount: number;
  readonly pathMappingTargetCount: number;
  readonly configDiagnosticCount: number;
  readonly configRootFileCount: number;
}

export interface ProjectCompilerOptionsResult {
  readonly options: ts.CompilerOptions;
  readonly configFilePath: string | null;
  readonly diagnostics: readonly ts.Diagnostic[];
  readonly rootFileNames: readonly string[] | null;
}

const projectCompilerOptionsCache = new Map<string, ProjectCompilerOptionsCacheEntry>();
let projectCompilerOptionsCacheHits = 0;
let projectCompilerOptionsCacheMisses = 0;
let projectCompilerOptionsCacheWrites = 0;
let projectCompilerOptionsCacheClearOperations = 0;
let projectCompilerOptionsCacheClearedEntries = 0;

/** Read compiler options for one boot project, with semantic-runtime defaults and local tsconfig overrides. */
export function buildProjectCompilerOptions(
  rootDir: string,
  discoveryRootDirs: readonly string[] = [],
): ts.CompilerOptions {
  return buildProjectCompilerOptionsResult(rootDir, discoveryRootDirs).options;
}

export function buildProjectCompilerOptionsResult(
  rootDir: string,
  discoveryRootDirs: readonly string[] = [],
): ProjectCompilerOptionsResult {
  const cacheKey = projectCompilerOptionsCacheKey(rootDir, discoveryRootDirs);
  const cached = projectCompilerOptionsCache.get(cacheKey);
  if (cached != null) {
    projectCompilerOptionsCacheHits += 1;
    return cloneProjectCompilerOptionsResult(cached.result);
  }
  projectCompilerOptionsCacheMisses += 1;
  const result = buildProjectCompilerOptionsUncached(rootDir, discoveryRootDirs);
  projectCompilerOptionsCache.set(cacheKey, {
    result: cloneProjectCompilerOptionsResult(result),
    pathMappingCount: Object.keys(result.options.paths ?? {}).length,
    pathMappingTargetCount: pathMappingTargetCount(result.options.paths),
    configDiagnosticCount: result.diagnostics.length,
    configRootFileCount: result.rootFileNames?.length ?? 0,
  });
  projectCompilerOptionsCacheWrites += 1;
  return result;
}

export function readProjectCompilerOptionsCacheOverview(): ProjectCompilerOptionsCacheOverview {
  let pathMappingCount = 0;
  let pathMappingTargetCount = 0;
  let configDiagnosticCount = 0;
  let configRootFileCount = 0;
  for (const entry of projectCompilerOptionsCache.values()) {
    pathMappingCount += entry.pathMappingCount;
    pathMappingTargetCount += entry.pathMappingTargetCount;
    configDiagnosticCount += entry.configDiagnosticCount;
    configRootFileCount += entry.configRootFileCount;
  }
  return {
    entries: projectCompilerOptionsCache.size,
    hits: projectCompilerOptionsCacheHits,
    misses: projectCompilerOptionsCacheMisses,
    writes: projectCompilerOptionsCacheWrites,
    clearOperations: projectCompilerOptionsCacheClearOperations,
    clearedEntries: projectCompilerOptionsCacheClearedEntries,
    pathMappingCount,
    pathMappingTargetCount,
    configDiagnosticCount,
    configRootFileCount,
  };
}

export function clearProjectCompilerOptionsCache(): ProjectCompilerOptionsCacheOverview {
  const clearedEntries = projectCompilerOptionsCache.size;
  projectCompilerOptionsCache.clear();
  projectCompilerOptionsCacheClearOperations += 1;
  projectCompilerOptionsCacheClearedEntries += clearedEntries;
  return readProjectCompilerOptionsCacheOverview();
}

function buildProjectCompilerOptionsUncached(
  rootDir: string,
  discoveryRootDirs: readonly string[],
): ProjectCompilerOptionsResult {
  const defaults = defaultProjectCompilerOptions(rootDir, discoveryRootDirs);
  const configFile = path.join(rootDir, 'tsconfig.json');
  if (!ts.sys.fileExists(configFile)) {
    return {
      options: defaults,
      configFilePath: null,
      diagnostics: [],
      rootFileNames: null,
    };
  }

  const read = ts.readConfigFile(configFile, ts.sys.readFile);
  if (read.error != null || read.config == null) {
    return {
      options: defaults,
      configFilePath: configFile,
      diagnostics: read.error == null ? [] : [read.error],
      rootFileNames: null,
    };
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configFile),
  );
  const effectiveBaseUrl = parsed.options.baseUrl ?? defaults.baseUrl;
  const defaultPaths = parsed.options.baseUrl == null || defaults.baseUrl == null
    ? defaults.paths
    : rebasePathMappings(defaults.paths, defaults.baseUrl, parsed.options.baseUrl);
  const paths = mergePathMappings(defaultPaths, parsed.options.paths);
  const merged = {
    ...defaults,
    ...parsed.options,
    baseUrl: effectiveBaseUrl,
    ...(paths == null ? {} : { paths }),
  };
  if (parsed.options.lib == null) {
    delete merged.lib;
  }
  return {
    options: merged,
    configFilePath: configFile,
    diagnostics: parsed.errors,
    rootFileNames: parsed.fileNames,
  };
}

function projectCompilerOptionsCacheKey(
  rootDir: string,
  discoveryRootDirs: readonly string[],
): string {
  const key = [rootDir, ...discoveryRootDirs]
    .map((entry) => normalizePosixPath(path.resolve(entry)))
    .join('|');
  return process.platform === 'win32' ? key.toLowerCase() : key;
}

function cloneProjectCompilerOptionsResult(
  result: ProjectCompilerOptionsResult,
): ProjectCompilerOptionsResult {
  return {
    options: cloneCompilerOptions(result.options),
    configFilePath: result.configFilePath,
    diagnostics: [...result.diagnostics],
    rootFileNames: result.rootFileNames == null ? null : [...result.rootFileNames],
  };
}

function cloneCompilerOptions(options: ts.CompilerOptions): ts.CompilerOptions {
  const clone: ts.CompilerOptions = { ...options };
  clone.paths = clonePathMappings(options.paths);
  clone.lib = cloneArrayOption(options.lib);
  clone.types = cloneArrayOption(options.types);
  clone.typeRoots = cloneArrayOption(options.typeRoots);
  clone.rootDirs = cloneArrayOption(options.rootDirs);
  clone.moduleSuffixes = cloneArrayOption(options.moduleSuffixes);
  clone.customConditions = cloneArrayOption(options.customConditions);
  return clone;
}

function cloneArrayOption<TValue>(
  value: readonly TValue[] | undefined,
): TValue[] | undefined {
  return value == null ? undefined : [...value];
}

function clonePathMappings(
  paths: ts.CompilerOptions['paths'],
): ts.CompilerOptions['paths'] {
  if (paths == null) {
    return undefined;
  }
  const cloned: Record<string, string[]> = {};
  for (const [specifier, targets] of Object.entries(paths)) {
    cloned[specifier] = [...targets];
  }
  return cloned;
}

function pathMappingTargetCount(
  paths: ts.CompilerOptions['paths'],
): number {
  return Object.values(paths ?? {}).reduce((total, targets) => total + targets.length, 0);
}

function defaultProjectCompilerOptions(
  rootDir: string,
  discoveryRootDirs: readonly string[],
): ts.CompilerOptions {
  const roots = uniqueDiscoveryRoots(rootDir, discoveryRootDirs);
  const paths = {
    ...discoverAureliaTypePaths(rootDir, roots),
    ...discoverWorkspacePackageSourcePaths(rootDir, roots),
    ...discoverExternalPackageSourcePaths(rootDir),
  };
  return {
    allowJs: true,
    allowArbitraryExtensions: true,
    checkJs: false,
    experimentalDecorators: false,
    ...defaultIgnoreDeprecationsOption(),
    jsx: ts.JsxEmit.Preserve,
    lib: [
      'lib.es2024.d.ts',
      'lib.dom.d.ts',
      'lib.dom.iterable.d.ts',
    ],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.Latest,
    ...(Object.keys(paths).length === 0
      ? {}
      : {
        baseUrl: rootDir,
        paths,
      }),
  };
}

function defaultIgnoreDeprecationsOption(): Pick<ts.CompilerOptions, 'ignoreDeprecations'> {
  const major = Number(ts.versionMajorMinor.split('.')[0] ?? '0');
  return major >= 6
    ? { ignoreDeprecations: '6.0' }
    : {};
}

function discoverAureliaTypePaths(rootDir: string, discoveryRoots: readonly string[]): Record<string, string[]> {
  const workspaceRoot = firstDiscoveredRoot(discoveryRoots, discoverAureliaCheckoutRoot);
  if (workspaceRoot == null) {
    return {};
  }

  const paths: Record<string, string[]> = {
    ...packageSourcePathsForRoot(rootDir, path.join(workspaceRoot, 'aurelia')),
  };
  const packagesRoot = path.join(workspaceRoot, 'aurelia', 'packages');
  for (const packageDir of safeReadDirectory(packagesRoot)) {
    const packageRoot = path.join(packagesRoot, packageDir);
    const specifier = readPackageName(packageRoot);
    if (specifier == null) {
      continue;
    }
    const absolute = path.join(packageRoot, 'dist', 'types', 'index.d.ts');
    if (!ts.sys.fileExists(absolute)) {
      continue;
    }
    paths[specifier] = [normalizePosixPath(path.relative(rootDir, absolute))];
  }

  return paths;
}

function discoverAureliaCheckoutRoot(rootDir: string): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const typeCandidate = path.join(current, 'aurelia', 'packages', 'kernel', 'dist', 'types', 'index.d.ts');
    const sourceCandidate = path.join(current, 'aurelia', 'packages', 'kernel', 'src', 'index.ts');
    if (ts.sys.fileExists(typeCandidate) || ts.sys.fileExists(sourceCandidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function discoverWorkspacePackageSourcePaths(rootDir: string, discoveryRoots: readonly string[]): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (const workspaceRoot of discoveredRoots(discoveryRoots, discoverPackageWorkspaceRoot)) {
    Object.assign(mappings, packageSourcePathsForRoot(rootDir, workspaceRoot));
  }
  return mappings;
}

function discoverExternalPackageSourcePaths(rootDir: string): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (const sourceRoot of externalSourceRoots()) {
    Object.assign(mappings, packageSourcePathsForRoot(rootDir, sourceRoot));
  }
  return mappings;
}

function packageSourcePathsForRoot(rootDir: string, sourceRoot: string): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (const packageRoot of discoverPackageRootsFromSourceRoot(sourceRoot)) {
    const name = readPackageName(packageRoot);
    if (name == null) {
      continue;
    }
    const entry = discoverPackageSourceEntry(packageRoot);
    if (entry == null) {
      continue;
    }
    mappings[name] = [normalizePosixPath(path.relative(rootDir, entry))];
    const sourceRoot = path.join(packageRoot, 'src');
    if (safeIsDirectory(sourceRoot)) {
      mappings[`${name}/*`] = [normalizePosixPath(path.relative(rootDir, path.join(sourceRoot, '*')))];
    }
  }
  return mappings;
}

function discoverPackageRootsFromSourceRoot(sourceRoot: string): readonly string[] {
  const absoluteRoot = path.resolve(sourceRoot);
  if (!safeIsDirectory(absoluteRoot)) {
    return [];
  }
  const manifest = readPackageManifest(absoluteRoot);
  if (manifest?.workspaces != null) {
    return discoverWorkspacePackageRoots(absoluteRoot);
  }
  return hasPackageManifest(absoluteRoot) ? [absoluteRoot] : [];
}

function discoverPackageWorkspaceRoot(rootDir: string): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const manifest = readPackageManifest(current);
    if (manifest?.workspaces != null || existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function discoverWorkspacePackageRoots(workspaceRoot: string): readonly string[] {
  const manifest = readPackageManifest(workspaceRoot);
  const patterns = readPackageWorkspacePatterns(manifest)
    .filter((pattern) => !pattern.startsWith('!'));
  const roots = new Set<string>();
  for (const pattern of patterns) {
    for (const root of packageRootsForWorkspacePattern(workspaceRoot, pattern)) {
      roots.add(root);
    }
  }
  return [...roots].sort((left, right) => left.localeCompare(right));
}

function packageRootsForWorkspacePattern(workspaceRoot: string, pattern: string): readonly string[] {
  const normalized = normalizePosixPath(pattern).replace(/\/+$/, '');
  const wildcardIndex = normalized.indexOf('*');
  if (wildcardIndex < 0) {
    const direct = path.join(workspaceRoot, normalized);
    return hasPackageManifest(direct) ? [direct] : [];
  }

  const prefix = normalized.slice(0, wildcardIndex).replace(/\/+$/, '');
  const base = path.join(workspaceRoot, prefix);
  if (!safeIsDirectory(base)) {
    return [];
  }
  return safeReadDirectory(base)
    .map((entry) => path.join(base, entry))
    .filter(hasPackageManifest);
}

function discoverPackageSourceEntry(packageRoot: string): string | null {
  for (const candidate of [
    path.join(packageRoot, 'src', 'index.ts'),
    path.join(packageRoot, 'src', 'index.tsx'),
    path.join(packageRoot, 'src', 'index.js'),
    path.join(packageRoot, 'src', 'index.jsx'),
  ]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function externalSourceRoots(): readonly string[] {
  return [
    process.env.SEMANTIC_RUNTIME_EXTERNAL_SOURCE_ROOTS,
    process.env.ATLAS_EXTERNAL_SOURCE_ROOTS,
  ].flatMap((value) =>
    value == null || value.trim().length === 0
      ? []
      : value.split(path.delimiter)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
  );
}

function uniqueDiscoveryRoots(rootDir: string, discoveryRootDirs: readonly string[]): readonly string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  for (const entry of [rootDir, ...discoveryRootDirs]) {
    const resolved = path.resolve(entry);
    const key = process.platform === 'win32'
      ? normalizePosixPath(resolved).toLowerCase()
      : normalizePosixPath(resolved);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    roots.push(resolved);
  }
  return roots;
}

function firstDiscoveredRoot(
  roots: readonly string[],
  discover: (rootDir: string) => string | null,
): string | null {
  return discoveredRoots(roots, discover)[0] ?? null;
}

function discoveredRoots(
  roots: readonly string[],
  discover: (rootDir: string) => string | null,
): readonly string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    const discovered = discover(root);
    if (discovered == null) {
      continue;
    }
    const key = process.platform === 'win32'
      ? normalizePosixPath(path.resolve(discovered)).toLowerCase()
      : normalizePosixPath(path.resolve(discovered));
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(discovered);
  }
  return result;
}

function mergePathMappings(
  defaults: ts.CompilerOptions['paths'],
  configured: ts.CompilerOptions['paths'],
): ts.CompilerOptions['paths'] {
  if (defaults == null) {
    return configured;
  }
  if (configured == null) {
    return defaults;
  }
  return {
    ...defaults,
    ...configured,
  };
}

function rebasePathMappings(
  mappings: ts.CompilerOptions['paths'],
  fromBaseUrl: string,
  toBaseUrl: string,
): ts.CompilerOptions['paths'] {
  if (mappings == null || path.resolve(fromBaseUrl) === path.resolve(toBaseUrl)) {
    return mappings;
  }
  const rebased: Record<string, string[]> = {};
  for (const [specifier, targets] of Object.entries(mappings)) {
    rebased[specifier] = targets.map((target) =>
      normalizePosixPath(path.relative(toBaseUrl, path.resolve(fromBaseUrl, target)))
    );
  }
  return rebased;
}
