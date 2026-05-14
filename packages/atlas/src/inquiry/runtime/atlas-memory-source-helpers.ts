import { existsSync } from "node:fs";
import path from "node:path";

import type { SourceProject } from "../../source/index.js";

/** Normalize a repository-relative path carried by Atlas memory records. */
export function normalizeAtlasMemoryRepoPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//u, "");
}

/** True when a repository-relative path exists in the current checkout. */
export function atlasMemoryRepoPathExists(
  sourceProject: SourceProject,
  filePath: string,
): boolean {
  return existsSync(path.join(sourceProject.repoRoot, filePath));
}

/** True when the admitted TypeScript source project exposes one declaration at a path. */
export function atlasMemorySourceProjectHasDeclaration(
  sourceProject: SourceProject,
  filePath: string,
  symbolName: string,
): boolean {
  const normalizedFilePath = normalizeAtlasMemoryRepoPath(filePath);
  return sourceProject.declarationRows().some((row) =>
    row.file.repoPath === normalizedFilePath && row.name === symbolName,
  );
}
