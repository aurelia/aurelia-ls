import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

declare const repoRelativePathBrand: unique symbol;

/** Repository-relative path normalized to forward slashes. */
export type RepoRelativePath = string & { readonly [repoRelativePathBrand]: "repo-relative-path" };

/** Absolute and repository-relative identity for one source path. */
export interface RepoPathIdentity {
  /** Absolute native filesystem path. */
  readonly absolutePath: string;
  /** Repository-relative path normalized to forward slashes. */
  readonly repoPath: RepoRelativePath;
}

/** Process-local normalized path keys shared by source substrate indexes. */
class NormalizedFileKeyCache {
  readonly #keys = new Map<string, string>();

  normalize(fileName: string): string {
    const cached = this.#keys.get(fileName);
    if (cached !== undefined) {
      return cached;
    }
    const normalized = toPosixPath(path.resolve(fileName)).toLowerCase();
    this.#keys.set(fileName, normalized);
    return normalized;
  }
}

const normalizedFileKeys = new NormalizedFileKeyCache();

/** Convert path separators to forward slashes for stable source identities. */
export function toPosixPath(
  /** Path text that may contain platform separators. */
  filePath: string,
): string {
  return filePath.replace(/\\/gu, "/");
}

/** Normalize an absolute path while preserving the host filesystem root. */
export function normalizeAbsolutePath(
  /** Absolute or relative path to normalize. */
  filePath: string,
): string {
  return path.resolve(filePath);
}

/** Return true when a path resolves inside another path. */
export function isPathWithin(
  /** Candidate absolute or relative path. */
  filePath: string,
  /** Root absolute or relative path. */
  rootPath: string,
): boolean {
  const relativePath = path.relative(
    path.resolve(rootPath),
    path.resolve(filePath),
  );
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

/** Walk upward from a directory until the repository workspace marker is found. */
export function findRepoRoot(
  /** Directory to start from. */
  startDirectory: string = process.cwd(),
): string {
  let current = path.resolve(startDirectory);
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find repo root from ${startDirectory}.`);
    }
    current = parent;
  }
}

/** Resolve a repository-relative path against the repository root. */
export function resolveRepoPath(
  /** Absolute repository root. */
  repoRoot: string,
  /** Repository-relative path. */
  repoPath: string,
): string {
  return path.resolve(repoRoot, repoPath);
}

/** Return a stable repository-relative path when the file sits under the repository root. */
export function repoRelativePath(
  /** Absolute repository root. */
  repoRoot: string,
  /** Absolute or relative path to normalize. */
  filePath: string,
): RepoRelativePath | null {
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedFile = path.resolve(filePath);
  const relativePath = path.relative(resolvedRoot, resolvedFile);
  if (relativePath === "") {
    return "" as RepoRelativePath;
  }
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }
  return toPosixPath(relativePath) as RepoRelativePath;
}

/** Return absolute and repository-relative path identity for an in-repository file. */
export function repoPathIdentity(
  /** Absolute repository root. */
  repoRoot: string,
  /** Absolute or relative path to normalize. */
  filePath: string,
): RepoPathIdentity | null {
  const absolutePath = normalizeAbsolutePath(filePath);
  const repoPath = repoRelativePath(repoRoot, absolutePath);
  return repoPath === null ? null : { absolutePath, repoPath };
}

/** Read UTF-8 text from a host path, returning null when the file is not readable. */
export function readTextFileOrNull(fileName: string): string | null {
  try {
    return readFileSync(fileName, "utf8");
  } catch {
    return null;
  }
}

/** Return a case-insensitive absolute path key for source-project maps. */
export function normalizeFileKey(
  /** Absolute or relative source file path. */
  fileName: string,
): string {
  return normalizedFileKeys.normalize(fileName);
}
