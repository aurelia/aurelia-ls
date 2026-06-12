import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const requireFromThisModule = createRequire(import.meta.url);

/** Relationship between the TypeScript module used by semantic-runtime and the app workspace's visible TypeScript package. */
export enum TypeSystemTypeScriptVersionRelation {
  /** The analyzer and workspace resolve to the same TypeScript package.json path. */
  SamePackage = 'same-package',
  /** The analyzer and workspace resolve different TypeScript packages with the same version. */
  SameVersionDifferentPackage = 'same-version-different-package',
  /** The workspace TypeScript package was found but has a different version from the analyzer module. */
  DifferentVersion = 'different-version',
  /** No workspace TypeScript package was found by walking upward from the project/workspace roots. */
  WorkspaceNotFound = 'workspace-not-found',
}

export interface TypeSystemTypeScriptPackageSummary {
  readonly version: string;
  readonly packageJsonPath: string | null;
}

export interface TypeSystemTypeScriptEnvironment {
  readonly analyzer: TypeSystemTypeScriptPackageSummary;
  readonly workspace: TypeSystemTypeScriptPackageSummary | null;
  readonly versionRelation: TypeSystemTypeScriptVersionRelation;
}

/** Read the TypeScript compiler environment for this checker epoch without changing module resolution. */
export function readTypeSystemTypeScriptEnvironment(
  projectRootDir: string,
  workspaceRootDir: string,
): TypeSystemTypeScriptEnvironment {
  const analyzer = readAnalyzerTypeScriptPackage();
  const workspace = readWorkspaceTypeScriptPackage(projectRootDir)
    ?? readWorkspaceTypeScriptPackage(workspaceRootDir);
  return {
    analyzer,
    workspace,
    versionRelation: typeScriptVersionRelation(analyzer, workspace),
  };
}

function typeScriptVersionRelation(
  analyzer: TypeSystemTypeScriptPackageSummary,
  workspace: TypeSystemTypeScriptPackageSummary | null,
): TypeSystemTypeScriptVersionRelation {
  if (workspace == null) {
    return TypeSystemTypeScriptVersionRelation.WorkspaceNotFound;
  }
  if (
    analyzer.packageJsonPath != null
    && workspace.packageJsonPath != null
    && normalizeComparablePackagePath(analyzer.packageJsonPath) === normalizeComparablePackagePath(workspace.packageJsonPath)
  ) {
    return TypeSystemTypeScriptVersionRelation.SamePackage;
  }
  return workspace.version === analyzer.version
    ? TypeSystemTypeScriptVersionRelation.SameVersionDifferentPackage
    : TypeSystemTypeScriptVersionRelation.DifferentVersion;
}

function normalizeComparablePackagePath(packageJsonPath: string): string {
  const normalized = readRealPackagePath(packageJsonPath);
  return process.platform === 'win32'
    ? normalized.toLowerCase()
    : normalized;
}

function readRealPackagePath(packageJsonPath: string): string {
  try {
    return realpathSync.native(packageJsonPath);
  } catch {
    return path.resolve(packageJsonPath);
  }
}

function readAnalyzerTypeScriptPackage(): TypeSystemTypeScriptPackageSummary {
  const packageJsonPath = resolveAnalyzerTypeScriptPackageJsonPath();
  const version = packageJsonPath == null
    ? ts.version
    : readPackageJsonVersion(packageJsonPath) ?? ts.version;
  return {
    version,
    packageJsonPath,
  };
}

function resolveAnalyzerTypeScriptPackageJsonPath(): string | null {
  try {
    return requireFromThisModule.resolve('typescript/package.json');
  } catch {
    return null;
  }
}

function readWorkspaceTypeScriptPackage(
  rootDir: string,
): TypeSystemTypeScriptPackageSummary | null {
  const packageJsonPath = findAncestorPackageJson(rootDir, path.join('node_modules', 'typescript', 'package.json'));
  if (packageJsonPath == null) {
    return null;
  }
  const version = readPackageJsonVersion(packageJsonPath);
  return version == null
    ? null
    : {
      version,
      packageJsonPath,
    };
}

function findAncestorPackageJson(
  rootDir: string,
  relativePackageJsonPath: string,
): string | null {
  let current = path.resolve(rootDir);
  while (true) {
    const candidate = path.join(current, relativePackageJsonPath);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function readPackageJsonVersion(packageJsonPath: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { readonly version?: unknown };
    return typeof parsed.version === 'string' && parsed.version.length > 0
      ? parsed.version
      : null;
  } catch {
    return null;
  }
}
