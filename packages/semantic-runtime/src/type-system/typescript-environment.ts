import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const requireFromThisModule = createRequire(import.meta.url);

/** Relationship between the TypeScript module used by semantic-runtime and the app workspace's visible TypeScript package. */
export enum TypeSystemTypeScriptVersionRelation {
  /** The workspace TypeScript package was found and has the same version as the analyzer module. */
  Match = 'match',
  /** The workspace TypeScript package was found but differs from the analyzer module. */
  Mismatch = 'mismatch',
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
    versionRelation: workspace == null
      ? TypeSystemTypeScriptVersionRelation.WorkspaceNotFound
      : workspace.version === analyzer.version
        ? TypeSystemTypeScriptVersionRelation.Match
        : TypeSystemTypeScriptVersionRelation.Mismatch,
  };
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
