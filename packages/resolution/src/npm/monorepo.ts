/**
 * Monorepo Detection and Workspace Resolution
 *
 * Enables cross-package import resolution within monorepos by:
 * 1. Detecting monorepo structure (npm workspaces, lerna, pnpm)
 * 2. Building a map of workspace packages to their source directories
 * 3. Redirecting package imports to source files instead of .d.ts
 *
 * This allows analyzing @aurelia/i18n and having imports like
 * `@aurelia/kernel` resolve to source instead of declaration files.
 */

import { readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { debug } from '@aurelia-ls/compiler';

// =============================================================================
// Types
// =============================================================================

/**
 * Information about a workspace package.
 */
export interface WorkspacePackage {
  /** Package name from package.json (e.g., "@aurelia/kernel") */
  readonly name: string;
  /** Absolute path to package root */
  readonly path: string;
  /** Absolute path to source directory, or null if not found */
  readonly srcDir: string | null;
}

/**
 * Context for monorepo-aware module resolution.
 */
export interface MonorepoContext {
  /** Absolute path to monorepo root (contains workspaces config) */
  readonly root: string;
  /** Map from package name to workspace info */
  readonly packages: ReadonlyMap<string, WorkspacePackage>;
}

/**
 * Result of workspace import resolution.
 *
 * Provides detailed information about why resolution succeeded or failed,
 * enabling better diagnostics and gap reporting.
 */
export type WorkspaceResolutionResult =
  | { readonly kind: 'resolved'; readonly path: string }
  | { readonly kind: 'not-workspace-package'; readonly packageName: string }
  | { readonly kind: 'no-source-dir'; readonly packageName: string; readonly packagePath: string }
  | { readonly kind: 'entry-not-found'; readonly packageName: string; readonly srcDir: string; readonly subpath: string | null };

/**
 * Raw package.json structure (partial).
 */
interface PackageJson {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
}

// =============================================================================
// Detection
// =============================================================================

/**
 * Detect if a package is within a monorepo.
 *
 * Walks up the directory tree looking for:
 * - package.json with `workspaces` field (npm/yarn workspaces)
 * - lerna.json (Lerna monorepo)
 * - pnpm-workspace.yaml (pnpm workspaces)
 *
 * @param packagePath - Path to the package being analyzed
 * @returns MonorepoContext if found, null otherwise
 */
export async function detectMonorepo(packagePath: string): Promise<MonorepoContext | null> {
  const absolutePath = resolve(packagePath);
  let currentDir = dirname(absolutePath);

  // Walk up looking for monorepo root (max 10 levels to prevent infinite loops)
  for (let i = 0; i < 10; i++) {
    const result = await tryDetectMonorepoRoot(currentDir);
    if (result) {
      debug.resolution('monorepo.detected', {
        root: result.root,
        packageCount: result.packages.size,
        packages: [...result.packages.keys()].slice(0, 10),
      });
      return result;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  debug.resolution('monorepo.notDetected', { packagePath });
  return null;
}

/**
 * Try to detect monorepo at a specific directory.
 */
async function tryDetectMonorepoRoot(dir: string): Promise<MonorepoContext | null> {
  // Check for npm/yarn workspaces
  const pkgJsonPath = join(dir, 'package.json');
  if (existsSync(pkgJsonPath)) {
    try {
      const content = await readFile(pkgJsonPath, 'utf-8');
      const pkgJson = JSON.parse(content) as PackageJson;

      if (pkgJson.workspaces) {
        const patterns = normalizeWorkspaces(pkgJson.workspaces);
        if (patterns.length > 0) {
          const packages = await buildWorkspaceMap(dir, patterns);
          return { root: dir, packages };
        }
      }
    } catch {
      // Invalid JSON or read error - continue searching
    }
  }

  // Check for lerna.json
  const lernaPath = join(dir, 'lerna.json');
  if (existsSync(lernaPath)) {
    try {
      const content = await readFile(lernaPath, 'utf-8');
      const lernaConfig = JSON.parse(content) as { packages?: string[] };
      if (lernaConfig.packages) {
        const packages = await buildWorkspaceMap(dir, lernaConfig.packages);
        return { root: dir, packages };
      }
    } catch {
      // Invalid JSON - continue searching
    }
  }

  // Check for pnpm-workspace.yaml
  const pnpmPath = join(dir, 'pnpm-workspace.yaml');
  if (existsSync(pnpmPath)) {
    try {
      const content = await readFile(pnpmPath, 'utf-8');
      // Simple YAML parsing for packages array
      const patterns = parsePnpmWorkspaces(content);
      if (patterns.length > 0) {
        const packages = await buildWorkspaceMap(dir, patterns);
        return { root: dir, packages };
      }
    } catch {
      // Parse error - continue searching
    }
  }

  return null;
}

/**
 * Normalize workspaces field to array of patterns.
 */
function normalizeWorkspaces(workspaces: string[] | { packages?: string[] }): string[] {
  if (Array.isArray(workspaces)) {
    return workspaces;
  }
  return workspaces.packages ?? [];
}

/**
 * Simple parser for pnpm-workspace.yaml.
 * Only extracts the packages array.
 */
function parsePnpmWorkspaces(content: string): string[] {
  const patterns: string[] = [];
  const lines = content.split('\n');

  let inPackages = false;
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'packages:') {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      // Check if we're still in the packages array (indented with -)
      if (trimmed.startsWith('- ')) {
        // Extract the pattern, removing quotes if present
        let pattern = trimmed.slice(2).trim();
        if ((pattern.startsWith('"') && pattern.endsWith('"')) ||
            (pattern.startsWith("'") && pattern.endsWith("'"))) {
          pattern = pattern.slice(1, -1);
        }
        patterns.push(pattern);
      } else if (!trimmed.startsWith('#') && trimmed !== '') {
        // Hit another key, exit packages section
        break;
      }
    }
  }

  return patterns;
}

// =============================================================================
// Workspace Mapping
// =============================================================================

/**
 * Build a map of workspace packages from glob patterns.
 *
 * @param root - Monorepo root directory
 * @param patterns - Workspace glob patterns (e.g., ["packages/*"])
 * @returns Map from package name to WorkspacePackage info
 */
async function buildWorkspaceMap(
  root: string,
  patterns: string[]
): Promise<Map<string, WorkspacePackage>> {
  const result = new Map<string, WorkspacePackage>();

  // Expand globs to find package directories
  const packageDirs = await expandWorkspacePatterns(root, patterns);

  debug.resolution('monorepo.expandedPatterns', {
    root,
    patterns,
    foundDirs: packageDirs.length,
  });

  // Process each package directory
  for (const pkgDir of packageDirs) {
    const pkgJsonPath = join(pkgDir, 'package.json');

    if (!existsSync(pkgJsonPath)) {
      continue;
    }

    try {
      const content = await readFile(pkgJsonPath, 'utf-8');
      const pkgJson = JSON.parse(content) as PackageJson;

      if (!pkgJson.name) {
        continue;
      }

      // Find source directory
      const srcDir = await findSourceDirectory(pkgDir);

      result.set(pkgJson.name, {
        name: pkgJson.name,
        path: pkgDir,
        srcDir,
      });
    } catch {
      // Invalid package.json - skip
    }
  }

  return result;
}

/**
 * Expand workspace glob patterns to absolute directory paths.
 *
 * Handles common workspace patterns:
 * - "packages/*" → all direct subdirectories of packages/
 * - "packages/foo" → specific directory
 * - "apps/*" → all direct subdirectories of apps/
 *
 * Does not handle complex globs like "**" or braces - these are rare
 * in workspace configurations.
 */
async function expandWorkspacePatterns(root: string, patterns: string[]): Promise<string[]> {
  const dirs: string[] = [];

  for (const pattern of patterns) {
    // Handle negation patterns (exclude)
    if (pattern.startsWith('!')) {
      continue;
    }

    // Normalize the pattern (remove trailing slashes)
    const normalizedPattern = pattern.replace(/\/+$/, '');

    // Check if it's a glob pattern (contains *)
    if (normalizedPattern.includes('*')) {
      // Handle "prefix/*" pattern - expand to all subdirectories
      const starIndex = normalizedPattern.indexOf('*');
      const prefix = normalizedPattern.slice(0, starIndex);
      const baseDir = join(root, prefix);

      try {
        const entries = await readdir(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Skip hidden directories and node_modules
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
              continue;
            }
            const candidateDir = join(baseDir, entry.name);
            // Only include directories that have a package.json
            if (existsSync(join(candidateDir, 'package.json'))) {
              dirs.push(candidateDir);
            }
          }
        }
      } catch {
        // Directory doesn't exist - skip
      }
    } else {
      // Direct path (no glob) - just resolve it
      const candidateDir = join(root, normalizedPattern);
      if (existsSync(join(candidateDir, 'package.json'))) {
        dirs.push(candidateDir);
      }
    }
  }

  // Remove duplicates
  return [...new Set(dirs)];
}

/**
 * Find the source directory for a package.
 * Checks common conventions: src/, lib/, source/
 */
async function findSourceDirectory(packagePath: string): Promise<string | null> {
  const candidates = ['src', 'lib', 'source'];

  for (const candidate of candidates) {
    const candidatePath = join(packagePath, candidate);
    try {
      const stats = await stat(candidatePath);
      if (stats.isDirectory()) {
        // Verify it has an index.ts
        const indexPath = join(candidatePath, 'index.ts');
        if (existsSync(indexPath)) {
          return candidatePath;
        }
        // Still return if it's a directory (might have different entry)
        return candidatePath;
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return null;
}

// =============================================================================
// Resolution
// =============================================================================

/**
 * Resolve a package import to source file path if it's a workspace package.
 *
 * Returns detailed result for gap reporting.
 *
 * @param specifier - Import specifier (e.g., "@aurelia/kernel")
 * @param ctx - Monorepo context
 * @returns Resolution result with path or failure reason
 */
export function resolveWorkspaceImportWithReason(
  specifier: string,
  ctx: MonorepoContext
): WorkspaceResolutionResult {
  // Handle scoped packages and subpath imports
  // e.g., "@aurelia/kernel" or "@aurelia/kernel/something"
  const packageName = getPackageNameFromSpecifier(specifier);
  const subpath = getSubpathFromSpecifier(specifier) || null;

  const pkg = ctx.packages.get(packageName);
  if (!pkg) {
    return { kind: 'not-workspace-package', packageName };
  }

  if (!pkg.srcDir) {
    return { kind: 'no-source-dir', packageName, packagePath: pkg.path };
  }

  // Resolve to source entry point
  if (subpath) {
    // Subpath import: @aurelia/kernel/utilities → src/utilities.ts
    const subpathFile = join(pkg.srcDir, subpath + '.ts');
    if (existsSync(subpathFile)) {
      return { kind: 'resolved', path: subpathFile };
    }
    // Try index.ts in subdirectory
    const subpathIndex = join(pkg.srcDir, subpath, 'index.ts');
    if (existsSync(subpathIndex)) {
      return { kind: 'resolved', path: subpathIndex };
    }
    return { kind: 'entry-not-found', packageName, srcDir: pkg.srcDir, subpath };
  }

  // Main entry point: src/index.ts
  const indexPath = join(pkg.srcDir, 'index.ts');
  if (existsSync(indexPath)) {
    return { kind: 'resolved', path: indexPath };
  }

  return { kind: 'entry-not-found', packageName, srcDir: pkg.srcDir, subpath: null };
}

/**
 * Resolve a package import to source file path if it's a workspace package.
 *
 * Simple wrapper that returns just the path or null.
 *
 * @param specifier - Import specifier (e.g., "@aurelia/kernel")
 * @param ctx - Monorepo context
 * @returns Path to source entry point, or null if not a workspace package
 */
export function resolveWorkspaceImport(
  specifier: string,
  ctx: MonorepoContext
): string | null {
  const result = resolveWorkspaceImportWithReason(specifier, ctx);
  return result.kind === 'resolved' ? result.path : null;
}

/**
 * Extract package name from import specifier.
 * Handles scoped packages (@scope/name) and subpath imports.
 */
function getPackageNameFromSpecifier(specifier: string): string {
  if (specifier.startsWith('@')) {
    // Scoped package: @scope/name or @scope/name/subpath
    const parts = specifier.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return specifier;
  }

  // Unscoped package: name or name/subpath
  const slashIndex = specifier.indexOf('/');
  if (slashIndex !== -1) {
    return specifier.slice(0, slashIndex);
  }
  return specifier;
}

/**
 * Extract subpath from import specifier.
 * Returns empty string if no subpath.
 */
function getSubpathFromSpecifier(specifier: string): string {
  const packageName = getPackageNameFromSpecifier(specifier);
  if (specifier.length > packageName.length) {
    // Has subpath, strip leading slash
    return specifier.slice(packageName.length + 1);
  }
  return '';
}

/**
 * Check if an import specifier is a relative path.
 */
export function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

/**
 * Check if an import specifier looks like a package import.
 * Returns false for relative imports and node: imports.
 */
export function isPackageImport(specifier: string): boolean {
  if (isRelativeImport(specifier)) {
    return false;
  }
  if (specifier.startsWith('node:')) {
    return false;
  }
  // Built-in modules (fs, path, etc.) - common ones
  const builtins = new Set([
    'fs', 'path', 'url', 'util', 'os', 'crypto', 'buffer', 'stream',
    'events', 'http', 'https', 'net', 'dns', 'tls', 'child_process',
    'cluster', 'dgram', 'readline', 'repl', 'vm', 'zlib', 'assert',
    'console', 'constants', 'domain', 'module', 'process', 'punycode',
    'querystring', 'string_decoder', 'sys', 'timers', 'tty', 'v8', 'worker_threads',
  ]);
  const baseName = getPackageNameFromSpecifier(specifier);
  if (builtins.has(baseName)) {
    return false;
  }
  return true;
}
