import type { AtlasMemoryRecordRow } from "./atlas-memory-contracts.js";
import { normalizeAtlasMemoryRepoPath } from "./atlas-memory-source-helpers.js";

/** Match a memory row against a repository-relative path filter. */
export function atlasMemoryRecordRowPathMatches(
  row: AtlasMemoryRecordRow,
  pathFilter: string,
): boolean {
  return (row.record.anchors ?? []).some((anchor) =>
    anchor.kind === "source"
      ? atlasMemoryRepoPathMatches(anchor.filePath, pathFilter)
      : anchor.kind === "doc" || anchor.kind === "fixture"
        ? atlasMemoryRepoPathMatches(anchor.path, pathFilter)
        : false,
  ) || atlasMemoryRepoPathMatches(row.shardPath, pathFilter) ||
  row.liveChecks.some((result) =>
    "filePath" in result.check &&
    result.check.filePath !== undefined &&
    atlasMemoryRepoPathMatches(result.check.filePath, pathFilter),
  );
}

/** Match a memory row against a live-check discriminator. */
export function atlasMemoryRecordRowHasLiveCheckKind(
  row: AtlasMemoryRecordRow,
  liveCheckKind: string,
): boolean {
  return row.liveChecks.some((result) => result.check.kind === liveCheckKind);
}

/** Match a memory row against an anchor discriminator. */
export function atlasMemoryRecordRowHasAnchorKind(
  row: AtlasMemoryRecordRow,
  anchorKind: string,
): boolean {
  return (row.record.anchors ?? []).some((anchor) => anchor.kind === anchorKind);
}

/** Match a memory row against a lens anchor id. */
export function atlasMemoryRecordRowHasLens(
  row: AtlasMemoryRecordRow,
  lensId: string,
): boolean {
  return (row.record.anchors ?? []).some((anchor) =>
    anchor.kind === "lens" && anchor.lensId === lensId,
  );
}

/** Match a memory row against an auLink anchor or live-check id. */
export function atlasMemoryRecordRowHasAuLink(
  row: AtlasMemoryRecordRow,
  auLinkId: string,
): boolean {
  return (row.record.anchors ?? []).some((anchor) =>
    anchor.kind === "auLink" && anchor.linkId === auLinkId,
  ) || row.liveChecks.some((result) =>
    result.check.kind === "auLink-exists" && result.check.linkId === auLinkId,
  );
}

/** Match a memory row against any symbol-bearing anchor or live check. */
export function atlasMemoryRecordRowHasSymbol(
  row: AtlasMemoryRecordRow,
  symbolName: string,
): boolean {
  return (row.record.anchors ?? []).some((anchor) =>
    (anchor.kind === "source" || anchor.kind === "auLink") &&
    anchor.symbolName === symbolName,
  ) || row.liveChecks.some((result) => {
    switch (result.check.kind) {
      case "product-large-class":
      case "atlas-self-class":
        return result.check.className === symbolName;
      case "atlas-self-function":
        return result.check.functionName === symbolName;
      case "atlas-self-variable":
        return result.check.variableName === symbolName;
      case "source-declaration-exists":
        return result.check.symbolName === symbolName;
      case "auLink-exists":
        return result.check.symbolName === symbolName;
      case "source-file-exists":
      case "atlas-self-source-file":
        return false;
    }
  });
}

/** Prefix-style repository path matching used by Atlas memory filters. */
export function atlasMemoryRepoPathMatches(
  repoPath: string,
  pathFilter: string,
): boolean {
  const normalizedPath = normalizeMemoryPathFilter(repoPath);
  const normalizedFilter = normalizeMemoryPathFilter(pathFilter);
  if (normalizedFilter.length === 0) {
    return true;
  }
  return normalizedPath === normalizedFilter ||
    normalizedPath.startsWith(`${normalizedFilter}/`);
}

function normalizeMemoryPathFilter(value: string): string {
  return normalizeAtlasMemoryRepoPath(value).replace(/\/+$/u, "");
}
