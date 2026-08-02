import path from 'node:path';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';

export interface BootPackageManifest {
  readonly [key: string]: unknown;
  readonly name?: unknown;
  readonly workspaces?: unknown;
  readonly dependencies?: unknown;
  readonly peerDependencies?: unknown;
  readonly devDependencies?: unknown;
  readonly optionalDependencies?: unknown;
}

export function readPackageManifest(
  host: SemanticRuntimeProjectInputHost,
  packageRoot: string,
): BootPackageManifest | null {
  const manifestPath = path.join(packageRoot, 'package.json');
  if (!host.fileExists(manifestPath)) {
    return null;
  }
  try {
    const text = host.readFile(manifestPath);
    return text == null ? null : JSON.parse(text) as BootPackageManifest;
  } catch {
    return null;
  }
}

export function readPackageName(host: SemanticRuntimeProjectInputHost, packageRoot: string): string | null {
  const manifest = readPackageManifest(host, packageRoot);
  return typeof manifest?.name === 'string' && manifest.name.length > 0
    ? manifest.name
    : null;
}

export function readPackageWorkspacePatterns(
  manifest: BootPackageManifest | null,
): readonly string[] {
  const workspaces = manifest?.workspaces;
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

export function manifestWorkspacesIncludeProject(
  manifest: BootPackageManifest,
  manifestRoot: string,
  projectRoot: string,
): boolean {
  const patterns = readPackageWorkspacePatterns(manifest);
  if (patterns.length === 0) {
    return false;
  }
  const relativeProjectRoot = normalizePosixPath(path.relative(manifestRoot, projectRoot));
  return relativeProjectRoot.length > 0 && patterns.some((pattern) =>
    workspacePatternMatchesProject(pattern, relativeProjectRoot)
  );
}

function workspacePatternMatchesProject(
  pattern: string,
  relativeProjectRoot: string,
): boolean {
  const normalizedPattern = normalizeWorkspacePattern(pattern);
  return globPatternToRegExp(normalizedPattern).test(relativeProjectRoot);
}

function normalizeWorkspacePattern(pattern: string): string {
  let normalized = normalizePosixPath(pattern).replace(/^\.\//, '');
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function globPatternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') {
        return '(?:[^/]+/)*[^/]+';
      }
      return segment
        .replace(/[\\^$+?.()|[\]{}]/g, '\\$&')
        .replace(/\*/g, '[^/]*');
    })
    .join('/');
  return new RegExp(`^${body}$`);
}

export function hasPackageManifest(host: SemanticRuntimeProjectInputHost, directory: string): boolean {
  return host.fileExists(path.join(directory, 'package.json'));
}

export function safeReadDirectory(host: SemanticRuntimeProjectInputHost, directory: string): readonly string[] {
  return host.readDirectory(directory);
}

export function safeIsDirectory(host: SemanticRuntimeProjectInputHost, directory: string): boolean {
  return host.directoryExists(directory);
}

export function normalizePosixPath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}

export function sameHostPath(left: string, right: string): boolean {
  return canonicalTypeSystemPath(left) === canonicalTypeSystemPath(right);
}

export function isHostPathWithin(fileName: string, rootDir: string): boolean {
  const relativePath = path.relative(path.resolve(rootDir), path.resolve(fileName));
  return (
    relativePath === ''
    || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}
