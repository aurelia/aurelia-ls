import path from 'node:path';
import { minimatch } from 'minimatch';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import type { ProjectBootFrame } from './frames.js';
import { canonicalTypeSystemPath, isTypeSystemPathAtOrUnder } from '../type-system/source-file-path.js';

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
  const relative = path.relative(manifestRoot, projectRoot);
  if (patterns.length === 0 || relative === '' || !isHostPathWithin(projectRoot, manifestRoot)) return false;
  const projectPath = normalizePosixPath(relative);
  const include: string[] = [];
  let exclude: string[] = [];
  for (const pattern of patterns) {
    const prefix = pattern.match(/^!+/u)?.[0].length ?? 0;
    const glob = pattern.slice(prefix).replaceAll('\\', '/').replace(/^\.?\/+/u, '').replace(/\/+$/u, '');
    if (prefix % 2 === 1) {
      exclude.push(glob);
    } else {
      // npm allows a later positive workspace pattern to reopen a previously excluded subtree.
      exclude = exclude.filter(negative => !minimatch(glob, negative));
      include.push(glob);
    }
  }
  return !exclude.some(glob => minimatch(projectPath, glob))
    && include.some(glob => minimatch(projectPath, glob) && !exclude.some(negative => minimatch(glob, negative)));
}

/** Closest ancestor package that actually includes the project in its declared workspace. */
export function nearestWorkspaceManifestForProject(project: ProjectBootFrame): { directory: string; manifest: BootPackageManifest } | null {
  const projectRoot = path.resolve(project.rootDir);
  const workspaceRoot = path.resolve(project.workspaceRootDir);
  if (sameHostPath(projectRoot, workspaceRoot)) return null;
  let directory = path.dirname(projectRoot);
  while (isHostPathWithin(directory, workspaceRoot)) {
    const manifest = readPackageManifest(project.inputGeneration.host, directory);
    if (manifest != null && manifestWorkspacesIncludeProject(manifest, directory, projectRoot)) return { directory, manifest };
    if (sameHostPath(directory, workspaceRoot)) break;
    directory = path.dirname(directory);
  }
  return null;
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
  return isTypeSystemPathAtOrUnder(canonicalTypeSystemPath(fileName), canonicalTypeSystemPath(rootDir));
}
