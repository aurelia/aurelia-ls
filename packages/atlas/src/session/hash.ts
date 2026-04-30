import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

/** Options for computing the daemon-compatible build hash. */
export interface BuildHashOptions {
  /** Absolute package root containing package.json and dist. */
  readonly packageRoot: string;
  /** Optional dist directory name under the package root. */
  readonly distDirName?: string;
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
