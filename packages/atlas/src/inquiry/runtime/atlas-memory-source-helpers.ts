import { existsSync } from "node:fs";
import path from "node:path";

import {
  SourceDeclarationKind,
  type SourceDeclarationRow,
  type SourceProject,
} from "../../source/index.js";

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
