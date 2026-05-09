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
  safeIsDirectory,
  safeReadDirectory,
} from './host-files.js';

/** Read compiler options for one boot project, with semantic-runtime defaults and local tsconfig overrides. */
export function buildProjectCompilerOptions(rootDir: string): ts.CompilerOptions {
  const defaults = defaultProjectCompilerOptions(rootDir);
  const configFile = path.join(rootDir, 'tsconfig.json');
  if (!ts.sys.fileExists(configFile)) {
    return defaults;
  }

  const read = ts.readConfigFile(configFile, ts.sys.readFile);
  if (read.error != null || read.config == null) {
    return defaults;
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
  return {
    ...defaults,
    ...parsed.options,
    baseUrl: effectiveBaseUrl,
    ...(paths == null ? {} : { paths }),
  };
}

function defaultProjectCompilerOptions(rootDir: string): ts.CompilerOptions {
  const paths = {
    ...discoverAureliaTypePaths(rootDir),
    ...discoverWorkspacePackageSourcePaths(rootDir),
    ...discoverExternalPackageSourcePaths(rootDir),
  };
  return {
    allowJs: true,
    allowArbitraryExtensions: true,
    checkJs: false,
    experimentalDecorators: false,
    ignoreDeprecations: '6.0',
    jsx: ts.JsxEmit.Preserve,
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

function discoverAureliaTypePaths(rootDir: string): Record<string, string[]> {
  const workspaceRoot = discoverAureliaCheckoutRoot(rootDir);
  if (workspaceRoot == null) {
    return {};
  }

  const paths: Record<string, string[]> = {};
  for (const pkg of aureliaPackageTypeMappings()) {
    const absolute = path.join(
      workspaceRoot,
      'aurelia',
      'packages',
      pkg.packageDir,
      'dist',
      'types',
      'index.d.ts',
    );
    if (ts.sys.fileExists(absolute)) {
      paths[pkg.specifier] = [normalizePosixPath(path.relative(rootDir, absolute))];
    }
  }

  return paths;
}

function discoverAureliaCheckoutRoot(rootDir: string): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const candidate = path.join(current, 'aurelia', 'packages', 'kernel', 'dist', 'types', 'index.d.ts');
    if (ts.sys.fileExists(candidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function aureliaPackageTypeMappings(): readonly { readonly specifier: string; readonly packageDir: string }[] {
  return [
    { specifier: 'aurelia', packageDir: 'aurelia' },
    { specifier: '@aurelia/expression-parser', packageDir: 'expression-parser' },
    { specifier: '@aurelia/fetch-client', packageDir: 'fetch-client' },
    { specifier: '@aurelia/kernel', packageDir: 'kernel' },
    { specifier: '@aurelia/metadata', packageDir: 'metadata' },
    { specifier: '@aurelia/platform', packageDir: 'platform' },
    { specifier: '@aurelia/platform-browser', packageDir: 'platform-browser' },
    { specifier: '@aurelia/route-recognizer', packageDir: 'route-recognizer' },
    { specifier: '@aurelia/router', packageDir: 'router' },
    { specifier: '@aurelia/runtime', packageDir: 'runtime' },
    { specifier: '@aurelia/runtime-html', packageDir: 'runtime-html' },
    { specifier: '@aurelia/template-compiler', packageDir: 'template-compiler' },
    { specifier: '@aurelia/testing', packageDir: 'testing' },
  ];
}

function discoverWorkspacePackageSourcePaths(rootDir: string): Record<string, string[]> {
  const workspaceRoot = discoverPackageWorkspaceRoot(rootDir);
  if (workspaceRoot == null) {
    return {};
  }

  return packageSourcePathsForRoot(rootDir, workspaceRoot);
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
  const patterns = workspacePatterns(manifest?.workspaces)
    .filter((pattern) => !pattern.startsWith('!'));
  const roots = new Set<string>();
  for (const pattern of patterns) {
    for (const root of packageRootsForWorkspacePattern(workspaceRoot, pattern)) {
      roots.add(root);
    }
  }
  return [...roots].sort((left, right) => left.localeCompare(right));
}

function workspacePatterns(workspaces: unknown): readonly string[] {
  if (Array.isArray(workspaces)) {
    return workspaces.filter((value): value is string => typeof value === 'string');
  }
  if (workspaces != null && typeof workspaces === 'object') {
    const packages = (workspaces as { readonly packages?: unknown }).packages;
    if (Array.isArray(packages)) {
      return packages.filter((value): value is string => typeof value === 'string');
    }
  }
  return [];
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
