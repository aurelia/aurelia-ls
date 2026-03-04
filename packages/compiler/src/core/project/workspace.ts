/**
 * Workspace Layout — Project Structure Discovery
 *
 * STATUS: initial implementation (pnpm/npm/yarn workspaces + single package)
 * DEPENDS ON: nothing (pure fs/path operations)
 * CONSUMED BY: core/project/discovery
 *
 * Answers one question: given a workspace root, what source files
 * should be analyzed?
 *
 * The interface (WorkspaceLayout, PackageInfo) is the stable part.
 * The discovery function (resolveWorkspaceLayout) grows over time
 * to support more ecosystem patterns.
 *
 * Currently handles:
 * - package.json "workspaces" field (npm/yarn/pnpm)
 * - pnpm-workspace.yaml
 * - Single-package projects (no workspaces)
 *
 * Future:
 * - nx.json / project.json
 * - turbo.json
 * - lerna.json
 * - Rush
 * - Custom source root configuration
 * - Build tool integration (vite.config, webpack.config)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative, posix } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface PackageInfo {
  /** Package name from package.json (if available). */
  readonly name: string;
  /** Absolute path to the package root. */
  readonly root: string;
  /** Source directories within the package (relative to root).
   *  Defaults to ['src'] if the directory exists. */
  readonly sourceRoots: readonly string[];
}

export interface WorkspaceLayout {
  /** Absolute path to the workspace root. */
  readonly root: string;
  /** Detected workspace type. */
  readonly kind: WorkspaceKind;
  /** Packages in the workspace. For single-package projects, contains one entry. */
  readonly packages: readonly PackageInfo[];
  /** Directory patterns to exclude from analysis (relative basenames).
   *  Applied after source root filtering. */
  readonly excludePatterns: readonly string[];
}

export type WorkspaceKind =
  | 'single-package'
  | 'npm-workspaces'    // package.json "workspaces"
  | 'pnpm-workspaces'   // pnpm-workspace.yaml
  // Future:
  // | 'nx'
  // | 'turbo'
  // | 'lerna'
  // | 'rush'
  ;

// =============================================================================
// Discovery
// =============================================================================

/**
 * Resolve the workspace layout from a root directory.
 *
 * Detection order:
 * 1. pnpm-workspace.yaml (pnpm workspaces)
 * 2. package.json "workspaces" field (npm/yarn workspaces)
 * 3. Single-package fallback
 */
export function resolveWorkspaceLayout(
  root: string,
  options?: WorkspaceOptions,
): WorkspaceLayout {
  const absRoot = resolve(root).replace(/\\/g, '/');
  const exclude = options?.excludePatterns ?? DEFAULT_EXCLUDES;

  // Try pnpm-workspace.yaml
  const pnpmWorkspace = tryPnpmWorkspace(absRoot);
  if (pnpmWorkspace) {
    const packages = resolveWorkspacePackages(absRoot, pnpmWorkspace, exclude);
    return { root: absRoot, kind: 'pnpm-workspaces', packages, excludePatterns: exclude };
  }

  // Try package.json workspaces
  const npmWorkspaces = tryNpmWorkspaces(absRoot);
  if (npmWorkspaces) {
    const packages = resolveWorkspacePackages(absRoot, npmWorkspaces, exclude);
    return { root: absRoot, kind: 'npm-workspaces', packages, excludePatterns: exclude };
  }

  // Single package
  const pkg = readPackageName(absRoot);
  const sourceRoots = detectSourceRoots(absRoot);
  return {
    root: absRoot,
    kind: 'single-package',
    packages: [{ name: pkg, root: absRoot, sourceRoots }],
    excludePatterns: exclude,
  };
}

export interface WorkspaceOptions {
  /** Override default exclude patterns. */
  excludePatterns?: readonly string[];
  /** Override default source root detection. */
  sourceRoots?: readonly string[];
}

// =============================================================================
// File Filtering
// =============================================================================

/**
 * Given a workspace layout and a list of source file paths (e.g. from
 * a ts.Program), return only the files that fall within the layout's
 * source boundaries.
 */
export function filterAnalysisFiles(
  layout: WorkspaceLayout,
  allFiles: readonly string[],
): string[] {
  // Build a set of allowed source root prefixes (normalized, forward slashes)
  const allowedPrefixes: string[] = [];
  for (const pkg of layout.packages) {
    for (const srcRoot of pkg.sourceRoots) {
      const prefix = posix.join(pkg.root.replace(/\\/g, '/'), srcRoot);
      allowedPrefixes.push(prefix.endsWith('/') ? prefix : prefix + '/');
    }
  }

  // Build exclude set (basename matching)
  const excludeSet = new Set(layout.excludePatterns);

  return allFiles.filter(f => {
    const normalized = f.replace(/\\/g, '/');

    // Must be under an allowed source root
    const inSourceRoot = allowedPrefixes.some(prefix => normalized.startsWith(prefix));
    if (!inSourceRoot) return false;

    // Must not be in an excluded directory
    const parts = normalized.split('/');
    for (const part of parts) {
      if (excludeSet.has(part)) return false;
    }

    return true;
  });
}

// =============================================================================
// Default Excludes
// =============================================================================

const DEFAULT_EXCLUDES: readonly string[] = [
  '__tests__',
  '__e2e__',
  '__test__',
  'test',
  'tests',
  'spec',
  'specs',
  'examples',
  'example',
  'benchmarks',
  'benchmark',
  'node_modules',
  'dist',
  'out',
  '.git',
];

// =============================================================================
// Workspace Detection Helpers
// =============================================================================

function tryPnpmWorkspace(root: string): string[] | null {
  const yamlPath = join(root, 'pnpm-workspace.yaml');
  if (!existsSync(yamlPath)) return null;

  const content = readFileSync(yamlPath, 'utf8');
  // Simple YAML parsing for the packages field
  // Format: packages:\n  - 'glob'\n  - 'glob'
  const lines = content.split('\n');
  const patterns: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    if (line.startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const match = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/);
      if (match) {
        patterns.push(match[1]!);
      } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('\t')) {
        break; // New top-level key
      }
    }
  }

  return patterns.length > 0 ? patterns : null;
}

function tryNpmWorkspaces(root: string): string[] | null {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (Array.isArray(pkg.workspaces)) return pkg.workspaces;
    if (pkg.workspaces?.packages) return pkg.workspaces.packages;
  } catch {}

  return null;
}

function resolveWorkspacePackages(
  root: string,
  patterns: string[],
  exclude: readonly string[],
): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const excludeSet = new Set(exclude);

  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      // Glob: packages/* → enumerate subdirectories
      const parent = join(root, pattern.slice(0, -2));
      if (!existsSync(parent)) continue;

      for (const entry of readdirSync(parent)) {
        if (excludeSet.has(entry)) continue;
        const pkgDir = join(parent, entry);
        if (!statSync(pkgDir).isDirectory()) continue;
        const name = readPackageName(pkgDir);
        const sourceRoots = detectSourceRoots(pkgDir);
        if (sourceRoots.length > 0) {
          packages.push({ name, root: pkgDir.replace(/\\/g, '/'), sourceRoots });
        }
      }
    } else {
      // Explicit path: packages/kernel
      const pkgDir = join(root, pattern);
      if (!existsSync(pkgDir)) continue;
      const basename = pattern.split('/').pop() || pattern;
      if (excludeSet.has(basename)) continue;
      if (!statSync(pkgDir).isDirectory()) continue;
      const name = readPackageName(pkgDir);
      const sourceRoots = detectSourceRoots(pkgDir);
      if (sourceRoots.length > 0) {
        packages.push({ name, root: pkgDir.replace(/\\/g, '/'), sourceRoots });
      }
    }
  }

  return packages;
}

function readPackageName(dir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    return pkg.name || dir.split('/').pop() || 'unknown';
  } catch {
    return dir.replace(/\\/g, '/').split('/').pop() || 'unknown';
  }
}

function detectSourceRoots(pkgDir: string): string[] {
  // Check common source root conventions
  const candidates = ['src', 'lib', 'source'];
  const roots: string[] = [];

  for (const candidate of candidates) {
    const candidatePath = join(pkgDir, candidate);
    if (existsSync(candidatePath) && statSync(candidatePath).isDirectory()) {
      roots.push(candidate);
    }
  }

  // If no conventional source root found, use the package root itself
  // (for flat packages like some small utilities)
  if (roots.length === 0) {
    // Only if there are .ts files directly in the package
    try {
      const entries = readdirSync(pkgDir);
      if (entries.some(e => e.endsWith('.ts') && !e.endsWith('.d.ts'))) {
        roots.push('.');
      }
    } catch {}
  }

  return roots;
}
