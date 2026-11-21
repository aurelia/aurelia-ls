import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

import { groupBy } from "../../collections.js";
import {
  memberName,
  memberNodes,
  type SourceDeclarationRow,
  type SourceProject,
} from "../../source/index.js";

/** Sources used together for a single memory read, including the current tracked paths. */
export interface AtlasMemorySources {
  /** Immutable TypeScript source epoch used to verify declarations. */
  readonly project: SourceProject;
  /** Git paths recaptured for this memory read. Undefined when Git is unavailable. */
  readonly trackedPaths: ReadonlySet<string> | undefined;
  /** Declarations grouped by their owning repository path for repeated anchor checks. */
  readonly declarationsByFile: ReadonlyMap<string, readonly SourceDeclarationRow[]>;
}

export function readAtlasMemorySources(project: SourceProject): AtlasMemorySources {
  return {
    project,
    trackedPaths: trackedRepoPaths(project.repoRoot),
    declarationsByFile: groupBy(project.declarationRows(), row => row.file.repoPath),
  };
}

/** Normalize a repository-relative path carried by Atlas memory records. */
export function normalizeAtlasMemoryRepoPath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//u, "");
}

/** Check the working file as well as durable Git membership (including exact path spelling). */
export function atlasMemoryRepoPathExists(
  sources: AtlasMemorySources,
  filePath: string,
): boolean {
  const normalizedFilePath = normalizeAtlasMemoryRepoPath(filePath);
  return existsSync(path.join(sources.project.repoRoot, normalizedFilePath)) && (
    sources.trackedPaths === undefined || sources.trackedPaths.has(normalizedFilePath) ||
    trackedDirectoryExists(sources.trackedPaths, normalizedFilePath)
  );
}

/** Check a declaration against the same owned files used to build the declaration index. */
export function atlasMemoryDeclarationStatus(
  sources: AtlasMemorySources,
  filePath: string,
  symbolName: string,
): "present" | "stale-check" | "out-of-scope" {
  const normalizedFilePath = normalizeAtlasMemoryRepoPath(filePath);
  const rows = sources.declarationsByFile.get(normalizedFilePath) ?? [];
  if (rows.some((row) => row.name === symbolName)) {
    return "present";
  }
  const dot = symbolName.lastIndexOf(".");
  const file = sources.project.readSourceFile(normalizedFilePath);
  if (file && dot > 0 && dot < symbolName.length - 1 &&
    dottedClassMemberExists(file, symbolName.slice(0, dot), symbolName.slice(dot + 1))) {
    return "present";
  }
  return file && sources.project.requiredSourceFileIdentity(file).packageId !== null
    ? "stale-check"
    : "out-of-scope";
}

function dottedClassMemberExists(
  file: ts.SourceFile,
  owner: string,
  member: string,
): boolean {
  function visit(node: ts.Node): true | undefined {
    if ((ts.isClassLike(node) || ts.isInterfaceDeclaration(node)) &&
        node.name?.text === owner && memberNodes(node).some(child => memberName(child) === member)) {
      return true;
    }
    return ts.forEachChild(node, visit);
  }
  return visit(file) === true;
}

function trackedRepoPaths(repoRoot: string): ReadonlySet<string> | undefined {
  try {
    const output = execFileSync(
      "git",
      ["-C", repoRoot, "ls-files", "-z", "--recurse-submodules"],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    return new Set(
      output
        .split("\0")
        .map((entry) => normalizeAtlasMemoryRepoPath(entry))
        .filter((entry) => entry.length > 0),
    );
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
