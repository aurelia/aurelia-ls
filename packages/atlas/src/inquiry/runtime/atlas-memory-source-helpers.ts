import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  SourceDeclarationKind,
  type SourceDeclarationRow,
  type SourceProject,
} from "../../source/index.js";

const trackedRepoPathsByRoot = new Map<string, ReadonlySet<string>>();

/** Normalize a repository-relative path carried by Atlas memory records. */
export function normalizeAtlasMemoryRepoPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//u, "");
}

/** True when a durable memory path is present in the recursive Git index. */
export function atlasMemoryRepoPathExists(
  sourceProject: SourceProject,
  filePath: string,
): boolean {
  const normalizedFilePath = normalizeAtlasMemoryRepoPath(filePath);
  const trackedPaths = trackedRepoPaths(sourceProject.repoRoot);
  if (trackedPaths !== undefined) {
    return trackedPaths.has(normalizedFilePath) ||
      trackedDirectoryExists(trackedPaths, normalizedFilePath);
  }
  return existsSync(path.join(sourceProject.repoRoot, normalizedFilePath));
}

/** True when the admitted TypeScript source project exposes one declaration at a path. */
export function atlasMemorySourceProjectHasDeclaration(
  sourceProject: SourceProject,
  filePath: string,
  symbolName: string,
): boolean {
  const normalizedFilePath = normalizeAtlasMemoryRepoPath(filePath);
  const rows = sourceProject.declarationRows().filter((row) =>
    row.file.repoPath === normalizedFilePath
  );
  if (rows.some((row) =>
    row.file.repoPath === normalizedFilePath && row.name === symbolName,
  )) {
    return true;
  }
  return dottedClassMemberExists(rows, symbolName);
}

function dottedClassMemberExists(
  rows: readonly SourceDeclarationRow[],
  symbolName: string,
): boolean {
  const dot = symbolName.lastIndexOf(".");
  if (dot <= 0 || dot >= symbolName.length - 1) {
    return false;
  }
  const ownerName = symbolName.slice(0, dot);
  const memberName = symbolName.slice(dot + 1);
  const owners = rows.filter((row) =>
    (row.kind === SourceDeclarationKind.Class || row.kind === SourceDeclarationKind.Interface)
    && row.name === ownerName
  );
  return owners.some((owner) =>
    rows.some((row) =>
      memberDeclarationKinds.has(row.kind)
      && row.name === memberName
      && row.span.start >= owner.span.start
      && row.span.end <= owner.span.end
    )
  );
}

const memberDeclarationKinds = new Set<SourceDeclarationKind>([
  SourceDeclarationKind.Method,
  SourceDeclarationKind.Property,
  SourceDeclarationKind.Accessor,
  SourceDeclarationKind.Constructor,
]);

function trackedRepoPaths(repoRoot: string): ReadonlySet<string> | undefined {
  const cached = trackedRepoPathsByRoot.get(repoRoot);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const output = execFileSync(
      "git",
      ["-C", repoRoot, "ls-files", "--recurse-submodules"],
      { encoding: "utf8" },
    );
    const paths = new Set(
      output
        .split(/\r?\n/u)
        .map((entry) => normalizeAtlasMemoryRepoPath(entry))
        .filter((entry) => entry.length > 0),
    );
    trackedRepoPathsByRoot.set(repoRoot, paths);
    return paths;
  } catch {
    return undefined;
  }
}

function trackedDirectoryExists(
  trackedPaths: ReadonlySet<string>,
  filePath: string,
): boolean {
  const prefix = filePath.endsWith("/") ? filePath : `${filePath}/`;
  for (const trackedPath of trackedPaths) {
    if (trackedPath.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}
