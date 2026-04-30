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
