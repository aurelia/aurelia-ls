import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
import type { DocumentUri } from "@aurelia-ls/compiler/program/primitives.js";
import type { WorkspaceLocation } from "./types.js";

export type QueryLocationTier = "meta" | "local" | "resource" | "base";

/**
 * Canonical tier order for cross-feature query results.
 *
 * This order is part of the workspace query contract and is shared by
 * definition/references surfaces to avoid per-feature drift.
 */
export const QUERY_LOCATION_TIER_ORDER: readonly QueryLocationTier[] = [
  "meta",
  "local",
  "resource",
  "base",
];

export interface TieredWorkspaceLocations {
  readonly tier: QueryLocationTier;
  readonly items: readonly WorkspaceLocation[];
}

type RankedLocation = {
  loc: WorkspaceLocation;
  rank: number;
};

/**
 * Merge by span, keeping at most one result per span. Used where multiplicity
 * is not required and tier precedence should collapse overlaps.
 */
export function mergeTieredLocations(
  currentUri: DocumentUri | null,
  lists: readonly TieredWorkspaceLocations[],
): WorkspaceLocation[] {
  const canonicalCurrent = currentUri ? canonicalDocumentUri(currentUri).uri : null;
  const bySpan = new Map<string, RankedLocation>();
  for (const list of lists) {
    const rank = rankForTier(list.tier);
    for (const loc of list.items) {
      const key = spanKey(loc);
      const existing = bySpan.get(key);
      if (!existing || rank < existing.rank || (rank === existing.rank && preferSameRank(loc, existing.loc))) {
        bySpan.set(key, { loc, rank });
      }
    }
  }
  const results = Array.from(bySpan.values());
  results.sort((a, b) => compareByPolicy(a, b, canonicalCurrent));
  return results.map((entry) => entry.loc);
}

/**
 * Merge while preserving symbol multiplicity. Identity-bearing locations
 * (symbol/expr/node ids) win over non-identity locations at the same span.
 */
export function mergeTieredLocationsWithIds(
  currentUri: DocumentUri | null,
  lists: readonly TieredWorkspaceLocations[],
): WorkspaceLocation[] {
  const canonicalCurrent = currentUri ? canonicalDocumentUri(currentUri).uri : null;
  const candidates: RankedLocation[] = [];
  const spanHasIdentity = new Set<string>();

  for (const list of lists) {
    const rank = rankForTier(list.tier);
    for (const loc of list.items) {
      const span = spanKey(loc);
      if (hasIdentity(loc)) spanHasIdentity.add(span);
      candidates.push({ loc, rank });
    }
  }

  const byKey = new Map<string, RankedLocation>();
  for (const candidate of candidates) {
    const { loc, rank } = candidate;
    const span = spanKey(loc);
    const identity = hasIdentity(loc);
    if (!identity && spanHasIdentity.has(span)) continue;
    const key = `${span}:${loc.symbolId ?? ""}:${loc.exprId ?? ""}:${loc.nodeId ?? ""}`;
    const existing = byKey.get(key);
    if (!existing || rank < existing.rank || (rank === existing.rank && preferSameRank(loc, existing.loc))) {
      byKey.set(key, { loc, rank });
    }
  }

  const results = Array.from(byKey.values());
  results.sort((a, b) => compareByPolicy(a, b, canonicalCurrent));
  return results.map((entry) => entry.loc);
}

function rankForTier(tier: QueryLocationTier): number {
  return QUERY_LOCATION_TIER_ORDER.indexOf(tier);
}

function compareByPolicy(
  a: RankedLocation,
  b: RankedLocation,
  currentUri: DocumentUri | null,
): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return compareLocationOrder(a.loc, b.loc, currentUri);
}

function compareLocationOrder(
  a: WorkspaceLocation,
  b: WorkspaceLocation,
  currentUri: DocumentUri | null,
): number {
  if (currentUri) {
    const current = String(currentUri);
    const aCurrent = String(a.uri) === current ? 0 : 1;
    const bCurrent = String(b.uri) === current ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
  }
  const uriDelta = String(a.uri).localeCompare(String(b.uri));
  if (uriDelta !== 0) return uriDelta;
  const startDelta = a.span.start - b.span.start;
  if (startDelta !== 0) return startDelta;
  const endDelta = a.span.end - b.span.end;
  if (endDelta !== 0) return endDelta;
  const symbolDelta = String(a.symbolId ?? "").localeCompare(String(b.symbolId ?? ""));
  if (symbolDelta !== 0) return symbolDelta;
  const exprDelta = String(a.exprId ?? "").localeCompare(String(b.exprId ?? ""));
  if (exprDelta !== 0) return exprDelta;
  return String(a.nodeId ?? "").localeCompare(String(b.nodeId ?? ""));
}

function hasIdentity(loc: WorkspaceLocation): boolean {
  return !!(loc.symbolId || loc.exprId || loc.nodeId);
}

function spanKey(loc: WorkspaceLocation): string {
  return `${loc.uri}:${loc.span.start}:${loc.span.end}`;
}

function preferSameRank(next: WorkspaceLocation, current: WorkspaceLocation): boolean {
  const nextIdentity = hasIdentity(next);
  const currentIdentity = hasIdentity(current);
  // At identical rank, keep the identity-bearing location so downstream
  // reference grouping stays stable.
  if (nextIdentity !== currentIdentity) return nextIdentity;
  return compareLocationOrder(next, current, null) < 0;
}
