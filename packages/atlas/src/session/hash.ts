import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

import ts from "typescript";

import { defaultSourcePackageDefinitions, parseSourcePackageConfig } from "../source/project.js";

/** Options for computing the daemon-compatible build hash. */
export interface BuildHashOptions {
  /** Absolute package root containing package.json and dist. */
  readonly packageRoot: string;
  /** Optional dist directory name under the package root. */
  readonly distDirName?: string;
}

/** Options for computing the source epoch that the session daemon keeps hot. */
export interface SourceEpochHashOptions {
  /** Absolute repository root used to resolve source package definitions. */
  readonly repoRoot: string;
}

/** Compute the compatibility hash for a daemon process and its hot source epoch. */
export function computeSessionCompatibilityHash(
  /** Hash input options. */
  options: BuildHashOptions,
): string {
  const packageRoot = resolve(options.packageRoot);
  const repoRoot = resolve(packageRoot, "../..");
  const hash = createHash("sha256");
  hash.update("atlas-session-compatibility-v1");
  hash.update("\0");
  hash.update(computeBuildOutputHash({ ...options, packageRoot }));
  hash.update("\0");
  hash.update(computeSourceEpochHash({ repoRoot }));
  return `sha256:${hash.digest("hex")}`;
}

/** Compute a stable hash of package metadata and compiled build output. */
export function computeBuildOutputHash(
  /** Hash input options. */
  options: BuildHashOptions,
): string {
  const distDir = join(options.packageRoot, options.distDirName ?? "dist");
  if (!existsSync(distDir)) {
    throw new Error(`Cannot compute atlas build hash because ${distDir} does not exist. Build the package first.`);
  }

  const files = [
    join(options.packageRoot, "package.json"),
    ...walkFiles(distDir).filter(isBuildHashFile),
  ].sort((left, right) => left.localeCompare(right));

  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(relative(options.packageRoot, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }

  return `sha256:${hash.digest("hex")}`;
}

/** Identify the admitted source bytes, effective tsconfig settings, and TypeScript version for a new session. */
export function computeSourceEpochHash(
  /** Source epoch hash options. */
  options: SourceEpochHashOptions,
): string {
  const repoRoot = resolve(options.repoRoot);
  const files = new Set<string>();
  const hash = createHash("sha256");
  hash.update(`atlas-source-epoch-v2\0${ts.version}\0`);
  for (const definition of defaultSourcePackageDefinitions(repoRoot)) {
    const rootPath = resolve(repoRoot, definition.rootPath);
    const tsconfigPath = resolve(repoRoot, definition.tsconfigPath);
    files.add(tsconfigPath);
    const packageJsonPath = join(rootPath, "package.json");
    if (existsSync(packageJsonPath)) {
      files.add(packageJsonPath);
    }
    const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (read.error !== undefined) {
      throw new Error(`Cannot compute atlas source epoch hash for ${tsconfigPath}: ${formatDiagnostic(read.error)}`);
    }
    const config = parseSourcePackageConfig(rootPath, tsconfigPath, read.config);
    hash.update(JSON.stringify([definition.id, definition.packageName, config.options,
      config.diagnostics.map((diagnostic) => [diagnostic.code, formatDiagnostic(diagnostic)])]));
    hash.update("\0");
    for (const fileName of config.rootFileNames) {
      files.add(fileName);
    }
  }

  for (const file of [...files].sort((left, right) => left.localeCompare(right))) {
    hash.update(relative(repoRoot, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

/** Recursively list files under a directory in deterministic order. */
function walkFiles(
  /** Directory to traverse. */
  dir: string,
): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir).sort((left, right) => left.localeCompare(right))) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

/** True when a dist file contributes to executable or declared API shape. */
function isBuildHashFile(
  /** Candidate file path. */
  file: string,
): boolean {
  const ext = extname(file);
  return ext === ".js" || ext === ".ts" || ext === ".json";
}

function formatDiagnostic(
  /** TypeScript diagnostic to flatten for error text. */
  diagnostic: ts.Diagnostic,
): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}
