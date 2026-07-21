import path from 'node:path';
import ts from 'typescript';
import type { ComputationRead } from '../kernel/computation-lifecycle.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import type {
  SemanticRuntimeProjectInputGeneration,
  SemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputReadScope,
} from '../kernel/project-input.js';
import {
  hasPackageManifest,
  normalizePosixPath,
  readPackageManifest,
  readPackageName,
  readPackageWorkspacePatterns,
  safeIsDirectory,
  safeReadDirectory,
} from './host-files.js';

/** Process/toolchain facts that participate in semantic-runtime's effective compiler options. */
export class ProjectCompilerOptionsEnvironment implements ComputationRead {
  readonly domain = 'project-compiler-options-environment';
  readonly readKey = 'project-compiler-options-environment';
  readonly observedRevision: string;

  constructor(
    readonly typeScriptVersion: string,
    readonly useCaseSensitiveFileNames: boolean,
    readonly platform: NodeJS.Platform,
    readonly externalSourceRoots: readonly string[],
  ) {
    this.observedRevision = compilerOptionsEnvironmentRevision(this);
  }

  validate() {
    const currentRevision = readProjectCompilerOptionsEnvironment().observedRevision;
    return {
      isCurrent: currentRevision === this.observedRevision,
      currentRevision,
      changedFacets: currentRevision === this.observedRevision ? [] : ['toolchain-environment'],
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    const current = readProjectCompilerOptionsEnvironment();
    return current.observedRevision === this.observedRevision ? current : null;
  }
}

export class ProjectCompilerOptionsResult {
  readonly revision: string;

  constructor(
    readonly options: ts.CompilerOptions,
    readonly configFilePath: string | null,
    readonly diagnostics: readonly ts.Diagnostic[],
    readonly rootFileNames: readonly string[] | null,
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope,
    readonly environment: ProjectCompilerOptionsEnvironment,
  ) {
    this.revision = projectCompilerOptionsRevision(this);
  }

  readRegisteredInputs(): readonly ComputationRead[] {
    return [this.environment, ...this.inputReadScope.readRegisteredInputs()];
  }
}

interface ProjectCompilerOptionsValues {
  readonly options: ts.CompilerOptions;
  readonly configFilePath: string | null;
  readonly diagnostics: readonly ts.Diagnostic[];
  readonly rootFileNames: readonly string[] | null;
}

/** Read compiler options for one boot project, with semantic-runtime defaults and local tsconfig overrides. */
export function buildProjectCompilerOptionsResult(
  inputGeneration: SemanticRuntimeProjectInputGeneration,
  rootDir: string,
  discoveryRootDirs: readonly string[] = [],
): ProjectCompilerOptionsResult {
  const inputReadScope = inputGeneration.createReadScope('project-compiler-options');
  const environment = readProjectCompilerOptionsEnvironment();
  const values = readProjectCompilerOptions(
    inputReadScope.host,
    rootDir,
    discoveryRootDirs,
    environment,
  );
  return new ProjectCompilerOptionsResult(
    values.options,
    values.configFilePath,
    values.diagnostics,
    values.rootFileNames,
    inputReadScope,
    environment,
  );
}

function readProjectCompilerOptions(
  host: SemanticRuntimeProjectInputHost,
  rootDir: string,
  discoveryRootDirs: readonly string[],
  environment: ProjectCompilerOptionsEnvironment,
): ProjectCompilerOptionsValues {
  const defaults = defaultProjectCompilerOptions(host, rootDir, discoveryRootDirs, environment);
  const configFile = path.join(rootDir, 'tsconfig.json');
  if (!host.fileExists(configFile)) {
    return {
      options: defaults,
      configFilePath: null,
      diagnostics: [],
      rootFileNames: null,
    };
  }

  const read = ts.readConfigFile(configFile, (fileName) => host.readFile(fileName));
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
    {
      useCaseSensitiveFileNames: environment.useCaseSensitiveFileNames,
      readDirectory: (directoryName, extensions, excludes, includes, depth) =>
        [...host.matchFiles(directoryName, extensions, excludes, includes, depth)],
      fileExists: (fileName) => host.fileExists(fileName),
      readFile: (fileName) => host.readFile(fileName),
    },
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

function defaultProjectCompilerOptions(
  host: SemanticRuntimeProjectInputHost,
  rootDir: string,
  discoveryRootDirs: readonly string[],
  environment: ProjectCompilerOptionsEnvironment,
): ts.CompilerOptions {
  const roots = uniqueDiscoveryRoots(rootDir, discoveryRootDirs);
  const paths = {
    ...discoverAureliaTypePaths(host, rootDir, roots),
    ...discoverWorkspacePackageSourcePaths(host, rootDir, roots),
    ...discoverExternalPackageSourcePaths(host, rootDir, environment.externalSourceRoots),
  };
  return {
    allowJs: true,
    allowArbitraryExtensions: true,
    checkJs: false,
    experimentalDecorators: false,
    ...defaultIgnoreDeprecationsOption(environment.typeScriptVersion),
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

function defaultIgnoreDeprecationsOption(typeScriptVersion: string): Pick<ts.CompilerOptions, 'ignoreDeprecations'> {
  const major = Number(typeScriptVersion.split('.')[0] ?? '0');
  return major >= 6
    ? { ignoreDeprecations: '6.0' }
    : {};
}

function discoverAureliaTypePaths(host: SemanticRuntimeProjectInputHost, rootDir: string, discoveryRoots: readonly string[]): Record<string, string[]> {
  const workspaceRoot = firstDiscoveredRoot(discoveryRoots, (candidate) => discoverAureliaCheckoutRoot(host, candidate));
  if (workspaceRoot == null) {
    return {};
  }

  const paths: Record<string, string[]> = {
    ...packageSourcePathsForRoot(host, rootDir, path.join(workspaceRoot, 'aurelia')),
  };
  const packagesRoot = path.join(workspaceRoot, 'aurelia', 'packages');
  for (const packageDir of safeReadDirectory(host, packagesRoot)) {
    const packageRoot = path.join(packagesRoot, packageDir);
    const specifier = readPackageName(host, packageRoot);
    if (specifier == null) {
      continue;
    }
    const absolute = path.join(packageRoot, 'dist', 'types', 'index.d.ts');
    if (!host.fileExists(absolute)) {
      continue;
    }
    paths[specifier] = [normalizePosixPath(path.relative(rootDir, absolute))];
  }

  return paths;
}

function discoverAureliaCheckoutRoot(host: SemanticRuntimeProjectInputHost, rootDir: string): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const typeCandidate = path.join(current, 'aurelia', 'packages', 'kernel', 'dist', 'types', 'index.d.ts');
    const sourceCandidate = path.join(current, 'aurelia', 'packages', 'kernel', 'src', 'index.ts');
    if (host.fileExists(typeCandidate) || host.fileExists(sourceCandidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function discoverWorkspacePackageSourcePaths(host: SemanticRuntimeProjectInputHost, rootDir: string, discoveryRoots: readonly string[]): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (const workspaceRoot of discoveredRoots(discoveryRoots, (candidate) => discoverPackageWorkspaceRoot(host, candidate))) {
    Object.assign(mappings, packageSourcePathsForRoot(host, rootDir, workspaceRoot));
  }
  return mappings;
}

function discoverExternalPackageSourcePaths(
  host: SemanticRuntimeProjectInputHost,
  rootDir: string,
  externalSourceRoots: readonly string[],
): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (const sourceRoot of externalSourceRoots) {
    Object.assign(mappings, packageSourcePathsForRoot(host, rootDir, sourceRoot));
  }
  return mappings;
}

function packageSourcePathsForRoot(host: SemanticRuntimeProjectInputHost, rootDir: string, sourceRoot: string): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (const packageRoot of discoverPackageRootsFromSourceRoot(host, sourceRoot)) {
    const name = readPackageName(host, packageRoot);
    if (name == null) {
      continue;
    }
    const entry = discoverPackageSourceEntry(host, packageRoot);
    if (entry == null) {
      continue;
    }
    mappings[name] = [normalizePosixPath(path.relative(rootDir, entry))];
    const sourceRoot = path.join(packageRoot, 'src');
    if (safeIsDirectory(host, sourceRoot)) {
      mappings[`${name}/*`] = [normalizePosixPath(path.relative(rootDir, path.join(sourceRoot, '*')))];
    }
  }
  return mappings;
}

function discoverPackageRootsFromSourceRoot(host: SemanticRuntimeProjectInputHost, sourceRoot: string): readonly string[] {
  const absoluteRoot = path.resolve(sourceRoot);
  if (!safeIsDirectory(host, absoluteRoot)) {
    return [];
  }
  const manifest = readPackageManifest(host, absoluteRoot);
  if (manifest?.workspaces != null) {
    return discoverWorkspacePackageRoots(host, absoluteRoot);
  }
  return hasPackageManifest(host, absoluteRoot) ? [absoluteRoot] : [];
}

function discoverPackageWorkspaceRoot(host: SemanticRuntimeProjectInputHost, rootDir: string): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const manifest = readPackageManifest(host, current);
    if (manifest?.workspaces != null || host.fileExists(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function discoverWorkspacePackageRoots(host: SemanticRuntimeProjectInputHost, workspaceRoot: string): readonly string[] {
  const manifest = readPackageManifest(host, workspaceRoot);
  const patterns = readPackageWorkspacePatterns(manifest)
    .filter((pattern) => !pattern.startsWith('!'));
  const roots = new Set<string>();
  for (const pattern of patterns) {
    for (const root of packageRootsForWorkspacePattern(host, workspaceRoot, pattern)) {
      roots.add(root);
    }
  }
  return [...roots].sort((left, right) => left.localeCompare(right));
}

function packageRootsForWorkspacePattern(host: SemanticRuntimeProjectInputHost, workspaceRoot: string, pattern: string): readonly string[] {
  const normalized = normalizePosixPath(pattern).replace(/\/+$/, '');
  const wildcardIndex = normalized.indexOf('*');
  if (wildcardIndex < 0) {
    const direct = path.join(workspaceRoot, normalized);
    return hasPackageManifest(host, direct) ? [direct] : [];
  }

  const prefix = normalized.slice(0, wildcardIndex).replace(/\/+$/, '');
  const base = path.join(workspaceRoot, prefix);
  if (!safeIsDirectory(host, base)) {
    return [];
  }
  return safeReadDirectory(host, base)
    .map((entry) => path.join(base, entry))
    .filter((directory) => hasPackageManifest(host, directory));
}

function discoverPackageSourceEntry(host: SemanticRuntimeProjectInputHost, packageRoot: string): string | null {
  for (const candidate of [
    path.join(packageRoot, 'src', 'index.ts'),
    path.join(packageRoot, 'src', 'index.tsx'),
    path.join(packageRoot, 'src', 'index.js'),
    path.join(packageRoot, 'src', 'index.jsx'),
  ]) {
    if (host.fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
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

function readProjectCompilerOptionsEnvironment(): ProjectCompilerOptionsEnvironment {
  const externalSourceRoots = [
    process.env.SEMANTIC_RUNTIME_EXTERNAL_SOURCE_ROOTS,
    process.env.ATLAS_EXTERNAL_SOURCE_ROOTS,
  ].flatMap((value) =>
    value == null || value.trim().length === 0
      ? []
      : value.split(path.delimiter)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
  );
  return new ProjectCompilerOptionsEnvironment(
    ts.version,
    ts.sys.useCaseSensitiveFileNames,
    process.platform,
    externalSourceRoots,
  );
}

function compilerOptionsEnvironmentRevision(environment: ProjectCompilerOptionsEnvironment): string {
  return stableKernelLocalHash(JSON.stringify([
    environment.typeScriptVersion,
    environment.useCaseSensitiveFileNames,
    environment.platform,
    environment.externalSourceRoots,
  ]));
}

function projectCompilerOptionsRevision(result: ProjectCompilerOptionsResult): string {
  return stableKernelLocalHash(JSON.stringify({
    options: stableCompilerOptionsValue(result.options),
    configFilePath: result.configFilePath,
    diagnostics: result.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: diagnostic.category,
      fileName: diagnostic.file?.fileName ?? null,
      start: diagnostic.start ?? null,
      length: diagnostic.length ?? null,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    })),
    rootFileNames: result.rootFileNames,
    inputs: result.readRegisteredInputs().map((read) => [read.readKey, read.observedRevision]),
  }));
}

function stableCompilerOptionsValue(value: unknown, seen: Set<object> = new Set()): unknown {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'undefined') {
    return '[undefined]';
  }
  if (typeof value !== 'object') {
    return `[${typeof value}]`;
  }
  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => stableCompilerOptionsValue(entry, seen));
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'configFile')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableCompilerOptionsValue(entry, seen)]),
    );
  } finally {
    seen.delete(value);
  }
}
