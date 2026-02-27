/**
 * Package Scanner
 *
 * Detects Aurelia packages and finds their entry points for analysis.
 * Returns AnalysisResult for consistency with the rest of npm-analysis.
 */

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { AnalysisResult, AnalysisGap } from './types.js';
import { success, partial, gap } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Information about a package needed for analysis.
 */
export interface PackageInfo {
  /** Package name from package.json */
  name: string;
  /** Package version */
  version: string;
  /** Absolute path to package root */
  packagePath: string;
  /** Entry points to analyze (resolved to absolute paths) */
  entryPoints: EntryPoint[];
  /** Module format */
  format: 'esm' | 'cjs';
  /** Whether TypeScript source is available */
  hasTypeScriptSource: boolean;
  /** Path to TypeScript source directory (if available) */
  sourceDir?: string;
}

/**
 * An entry point into the package.
 */
export interface EntryPoint {
  /** The export condition or '.' for main */
  condition: string;
  /** Absolute path to the entry file */
  path: string;
  /** Whether this is for types only */
  typesOnly: boolean;
}

/**
 * Raw package.json structure (partial).
 */
interface PackageJson {
  name?: string;
  version?: string;
  type?: 'module' | 'commonjs';
  main?: string;
  module?: string;
  types?: string;
  typings?: string;
  exports?: PackageExports;
  aurelia?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

type PackageExports = string | Record<string, string | PackageExportConditions>;

interface PackageExportConditions {
  types?: string;
  import?: string;
  require?: string;
  default?: string;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Scan a package to determine if it's Aurelia-related and find entry points.
 *
 * @param packagePath - Path to package root (containing package.json)
 * @returns Analysis result with package info or gaps explaining why scanning failed
 */
export async function scanPackage(packagePath: string): Promise<AnalysisResult<PackageInfo | null>> {
  // Try to read package.json
  const pkgJsonPath = join(packagePath, 'package.json');
  let pkgJson: PackageJson;
  let content: string;

  try {
    content = await readFile(pkgJsonPath, 'utf-8');
  } catch (err) {
    // Package directory doesn't exist or package.json missing
    return partial(null, 'manual', [
      gap(
        'package.json',
        { kind: 'package-not-found', packagePath },
        `Package not found at ${packagePath}. Ensure the path is correct and contains a package.json file.`
      ),
    ]);
  }

  try {
    pkgJson = JSON.parse(content) as PackageJson;
  } catch (err) {
    // package.json exists but is invalid JSON
    const parseError = err instanceof Error ? err.message : String(err);
    return partial(null, 'manual', [
      gap(
        'package.json',
        { kind: 'invalid-package-json', path: pkgJsonPath, parseError },
        `Fix the JSON syntax error in ${pkgJsonPath}: ${parseError}`
      ),
    ]);
  }

  // Validate required fields
  const gaps: AnalysisGap[] = [];

  if (!pkgJson.name) {
    gaps.push(gap(
      'package name',
      { kind: 'missing-package-field', field: 'name' },
      'Add a "name" field to package.json.'
    ));
  }

  if (!pkgJson.version) {
    gaps.push(gap(
      'package version',
      { kind: 'missing-package-field', field: 'version' },
      'Add a "version" field to package.json.'
    ));
  }

  // Find entry points
  const { entryPoints, entryPointGaps } = await resolveEntryPoints(packagePath, pkgJson);
  gaps.push(...entryPointGaps);

  // If no entry points defined at all (not just missing files)
  if (!pkgJson.main && !pkgJson.module && !pkgJson.exports) {
    gaps.push(gap(
      'entry points',
      { kind: 'no-entry-points' },
      'Add a "main" or "exports" field to package.json specifying the entry point.'
    ));
  }

  // Check for TypeScript source
  const { hasSource, sourceDir } = await detectTypeScriptSource(packagePath);

  // Determine module format
  const format: 'esm' | 'cjs' = pkgJson.type === 'module' ? 'esm' : 'cjs';

  // Build result
  const info: PackageInfo = {
    name: pkgJson.name ?? 'unknown',
    version: pkgJson.version ?? '0.0.0',
    packagePath,
    entryPoints,
    format,
    hasTypeScriptSource: hasSource,
    sourceDir,
  };

  if (gaps.length > 0) {
    return partial(info, 'partial', gaps);
  }

  return success(info);
}

/**
 * Check if a package is likely Aurelia-related based on dependencies.
 *
 * This is a fast heuristic check. It looks for:
 * - 'aurelia' in dependencies/peerDependencies
 * - Any '@aurelia/*' package in dependencies/peerDependencies
 *
 * @param packagePath - Path to package root
 * @returns true if the package appears to be Aurelia-related
 */
export async function checkIsAureliaPackage(packagePath: string): Promise<boolean> {
  const pkgJsonPath = join(packagePath, 'package.json');

  try {
    const content = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(content) as PackageJson;
    return hasAureliaDependency(pkgJson);
  } catch {
    return false;
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if package.json has any Aurelia-related dependencies.
 *
 * Note: Intentionally excludes devDependencies. A package with Aurelia only
 * in devDeps (e.g., test utilities) doesn't ship Aurelia resources to consumers.
 * We only care about dependencies and peerDependencies which indicate the
 * package provides Aurelia functionality.
 */
function hasAureliaDependency(pkgJson: PackageJson): boolean {
  const packageName = pkgJson.name ?? "";
  if (packageName === "aurelia" || packageName.startsWith("@aurelia/") || packageName.includes("aurelia")) {
    return true;
  }

  if (pkgJson.aurelia !== undefined) {
    return true;
  }

  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.peerDependencies,
  };

  for (const dep of Object.keys(allDeps)) {
    if (dep === 'aurelia' || dep.startsWith('@aurelia/')) {
      return true;
    }
  }

  return false;
}

interface EntryPointResult {
  entryPoints: EntryPoint[];
  entryPointGaps: AnalysisGap[];
}

/**
 * Resolve entry points from package.json main/exports fields.
 * Returns both found entry points and gaps for missing files.
 */
async function resolveEntryPoints(packagePath: string, pkgJson: PackageJson): Promise<EntryPointResult> {
  const entryPoints: EntryPoint[] = [];
  const entryPointGaps: AnalysisGap[] = [];

  /**
   * Try to resolve an entry path, recording a gap if it doesn't exist.
   * Types-only entry points don't produce gaps (they're nice-to-have, not blocking).
   */
  async function tryResolve(specifier: string, condition: string, typesOnly: boolean): Promise<void> {
    const normalized = specifier.replace(/^\.\//, '');
    const fullPath = join(packagePath, normalized);

    try {
      await stat(fullPath);
      entryPoints.push({ condition, path: fullPath, typesOnly });
    } catch {
      // Entry point specified but file doesn't exist (likely unbuilt package)
      // Only report gap for non-types entry points (types are informational)
      if (!typesOnly) {
        entryPointGaps.push(gap(
          `entry point "${specifier}"`,
          { kind: 'entry-point-not-found', specifier, resolvedPath: fullPath },
          `Build the package or ensure ${fullPath} exists.`
        ));
      }
    }
  }

  // Handle modern 'exports' field
  if (pkgJson.exports) {
    const exports = pkgJson.exports;

    if (typeof exports === 'string') {
      // Simple string export: "exports": "./dist/index.js"
      await tryResolve(exports, '.', false);
    } else {
      // Object exports
      for (const [key, value] of Object.entries(exports)) {
        if (typeof value === 'string') {
          // "exports": { ".": "./dist/index.js" }
          await tryResolve(value, key, false);
        } else if (value && typeof value === 'object') {
          // "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }
          const conditions = value;

          // Prefer import over require
          const mainPath = conditions.import ?? conditions.require ?? conditions.default;
          if (mainPath) {
            await tryResolve(mainPath, key, false);
          }

          // Also track types if separate
          if (conditions.types && conditions.types !== mainPath) {
            await tryResolve(conditions.types, `${key}:types`, true);
          }
        }
      }
    }
  }

  // Fall back to legacy 'main' field if no exports or exports didn't yield results
  if (entryPoints.length === 0 && pkgJson.main) {
    await tryResolve(pkgJson.main, '.', false);
  }

  // Also check 'module' field (ESM entry for bundlers)
  if (pkgJson.module) {
    const normalized = pkgJson.module.replace(/^\.\//, '');
    const fullPath = join(packagePath, normalized);

    try {
      await stat(fullPath);
      if (!entryPoints.some(e => e.path === fullPath)) {
        entryPoints.push({ condition: 'module', path: fullPath, typesOnly: false });
      }
    } catch {
      // Module field points to missing file - produce gap for consistency with main/exports
      entryPointGaps.push(gap(
        `module entry "${pkgJson.module}"`,
        { kind: 'entry-point-not-found', specifier: pkgJson.module, resolvedPath: fullPath },
        `Build the package or ensure ${fullPath} exists.`
      ));
    }
  }

  return { entryPoints, entryPointGaps };
}

/**
 * Detect if TypeScript source is available in the package.
 */
async function detectTypeScriptSource(packagePath: string): Promise<{ hasSource: boolean; sourceDir?: string }> {
  // Common source directories
  const sourceDirs = ['src', 'lib', 'source'];

  for (const dir of sourceDirs) {
    const srcPath = join(packagePath, dir);
    try {
      const srcStat = await stat(srcPath);
      if (srcStat.isDirectory()) {
        // Check if it contains .ts files (quick heuristic: check for index.ts)
        const indexTs = join(srcPath, 'index.ts');
        try {
          await stat(indexTs);
          return { hasSource: true, sourceDir: srcPath };
        } catch {
          // No index.ts, but directory exists - still might have source
          // For now, assume yes if src/ directory exists
          return { hasSource: true, sourceDir: srcPath };
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return { hasSource: false };
}

/**
 * Get the source entry point path (e.g., src/index.ts) if available.
 */
export function getSourceEntryPoint(info: PackageInfo): string | null {
  if (!info.hasTypeScriptSource || !info.sourceDir) {
    return null;
  }

  // Try common entry point names
  return join(info.sourceDir, 'index.ts');
}
