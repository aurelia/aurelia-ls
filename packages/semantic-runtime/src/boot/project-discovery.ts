import path from 'node:path';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import {
  BootProjectDiscoveryMode,
  type BootProjectInput,
} from './frames.js';
import {
  hasPackageManifest,
  readPackageName,
  safeIsDirectory,
  safeReadDirectory,
  isHostPathWithin,
} from './host-files.js';
import {
  AuthoredSourceBoundary,
  authoredSourceExclusionsWithin,
} from './source-boundary.js';

const DISCOVERY_EXCLUDED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

const MAX_PROJECT_DISCOVERY_DEPTH = 7;

/** Discover boot project frames from package roots without interpreting Aurelia semantics. */
export function discoverBootProjects(
  rootDir: string,
  host: SemanticRuntimeProjectInputHost,
  mode: BootProjectDiscoveryMode | `${BootProjectDiscoveryMode}` = BootProjectDiscoveryMode.PackageTsconfig,
  excludedWorkspaceRoots: readonly string[] = [],
): readonly BootProjectInput[] {
  const absoluteRoot = path.resolve(rootDir);
  const workspaceBoundary = new AuthoredSourceBoundary(absoluteRoot, excludedWorkspaceRoots);
  if (mode === BootProjectDiscoveryMode.SingleRoot) {
    return [{
      rootDir: absoluteRoot,
      excludedSourceRoots: workspaceBoundary.excludedRootDirs,
    }];
  }
  if (mode !== BootProjectDiscoveryMode.PackageTsconfig) {
    throw new Error(`Unknown boot project discovery mode '${String(mode)}'.`);
  }

  const packageRoots = discoverPackageRoots(host, workspaceBoundary);
  const projectRoots = packageRoots.filter((directory) => hasProjectManifest(host, directory));
  if (projectRoots.length === 0) {
    return [{
      rootDir: absoluteRoot,
      excludedSourceRoots: workspaceBoundary.excludedRootDirs,
    }];
  }

  const uniqueRoots = [...new Set(projectRoots.map((root) => path.resolve(root)))]
    .sort((left, right) => left.localeCompare(right));
  const keyCounts = new Map<string, number>();
  return uniqueRoots.map((projectRoot) => {
    const baseKey = projectKeyForRoot(host, absoluteRoot, projectRoot);
    const count = keyCounts.get(baseKey) ?? 0;
    keyCounts.set(baseKey, count + 1);
    const projectKey = count === 0 ? baseKey : `${baseKey}:${count + 1}`;
    const nestedPackageRoots = packageRoots
      .filter((candidate) => candidate !== projectRoot && isHostPathWithin(candidate, projectRoot));
    return {
      rootDir: projectRoot,
      projectKey,
      excludedSourceRoots: [
        ...authoredSourceExclusionsWithin(projectRoot, workspaceBoundary.excludedRootDirs),
        ...nestedPackageRoots,
      ],
    };
  });
}

function discoverPackageRoots(
  host: SemanticRuntimeProjectInputHost,
  boundary: AuthoredSourceBoundary,
): readonly string[] {
  const result: string[] = [];

  function visit(directory: string, depth: number): void {
    if (
      depth > MAX_PROJECT_DISCOVERY_DEPTH
      || !boundary.contains(directory)
      || !host.directoryExists(directory)
    ) {
      return;
    }
    if (hasPackageManifest(host, directory)) {
      result.push(directory);
    }

    for (const entry of safeReadDirectory(host, directory)) {
      if (
        entry.startsWith('.') ||
        DISCOVERY_EXCLUDED_DIRECTORIES.has(entry)
      ) {
        continue;
      }
      const child = path.join(directory, entry);
      if (safeIsDirectory(host, child)) {
        visit(child, depth + 1);
      }
    }
  }

  visit(boundary.rootDir, 0);
  return result;
}

function hasProjectManifest(host: SemanticRuntimeProjectInputHost, directory: string): boolean {
  return host.fileExists(path.join(directory, 'package.json')) && host.fileExists(path.join(directory, 'tsconfig.json'));
}

function projectKeyForRoot(host: SemanticRuntimeProjectInputHost, workspaceRoot: string, projectRoot: string): string {
  return sanitizeProjectKey(readPackageName(host, projectRoot) ?? relativeProjectPath(workspaceRoot, projectRoot));
}

function relativeProjectPath(workspaceRoot: string, projectRoot: string): string {
  const relative = path.relative(workspaceRoot, projectRoot).replace(/\\/g, '/');
  return relative.length === 0 ? path.basename(projectRoot) : relative;
}

function sanitizeProjectKey(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_.:@/-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized.length === 0 ? 'project' : sanitized;
}
