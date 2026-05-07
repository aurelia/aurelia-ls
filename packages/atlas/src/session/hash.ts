import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

import ts from "typescript";

import { defaultSourcePackageDefinitions } from "../source/project.js";

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

/** Compute a cheap epoch hash for TypeScript files admitted into the Atlas source project. */
export function computeSourceEpochHash(
  /** Source epoch hash options. */
  options: SourceEpochHashOptions,
): string {
  const repoRoot = resolve(options.repoRoot);
  const files = new Set<string>();
  for (const definition of defaultSourcePackageDefinitions(repoRoot)) {
    const rootPath = resolve(repoRoot, definition.rootPath);
    const tsconfigPath = resolve(repoRoot, definition.tsconfigPath);
    files.add(tsconfigPath);
    const packageJsonPath = join(rootPath, "package.json");
    if (existsSync(packageJsonPath)) {
      files.add(packageJsonPath);
    }
    for (const fileName of rootFileNamesForTsconfig(rootPath, tsconfigPath)) {
      files.add(fileName);
    }
  }

  const hash = createHash("sha256");
  hash.update("atlas-source-epoch-v1");
  hash.update("\0");
  for (const file of [...files].sort((left, right) => left.localeCompare(right))) {
    hash.update(relative(repoRoot, file).replaceAll("\\", "/"));
    hash.update("\0");
    const stat = safeStat(file);
    if (stat == null) {
      hash.update("missing");
      hash.update("\0");
      continue;
    }
    hash.update(String(stat.size));
    hash.update("\0");
    hash.update(String(stat.mtimeMs));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function rootFileNamesForTsconfig(
  /** Absolute package root. */
  rootPath: string,
  /** Absolute tsconfig path. */
  tsconfigPath: string,
): readonly string[] {
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (read.error !== undefined) {
    return walkFiles(rootPath).filter(isSourceEpochFile);
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    dirname(tsconfigPath),
  );
  return parsed.fileNames
    .map((fileName) => resolve(fileName))
    .filter((fileName) => isPathWithin(fileName, rootPath))
    .sort((left, right) => left.localeCompare(right));
}

function safeStat(
  /** File path to stat. */
  file: string,
): ReturnType<typeof statSync> | null {
  try {
    return statSync(file);
  } catch {
    return null;
  }
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

/** True when a fallback source-epoch walk should include the file. */
function isSourceEpochFile(
  /** Candidate file path. */
  file: string,
): boolean {
  const ext = extname(file);
  return ext === ".ts" || ext === ".tsx" || ext === ".json";
}

function isPathWithin(
  /** Candidate absolute path. */
  file: string,
  /** Root absolute path. */
  root: string,
): boolean {
  const rel = relative(root, file);
  return rel.length === 0 || (!rel.startsWith("..") && !rel.startsWith("/") && !rel.startsWith("\\"));
}
