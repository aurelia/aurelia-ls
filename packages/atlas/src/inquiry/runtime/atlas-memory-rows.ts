import type { Inquiry } from "../inquiry.js";
import {
  inquiryStringListFilter,
  inquiryStringFilter,
  inquiryBooleanFilter,
  queryMatches,
  queryRelevanceScore,
  querySignificantPartialMatches,
} from "./lens-filter-utils.js";
import type {
  AtlasMemoryLiveCheckResult,
  AtlasMemoryRecordRow,
} from "./atlas-memory-contracts.js";
import { atlasMemoryAnchorSearchText } from "./atlas-memory-contracts.js";
import {
  atlasMemoryRecordRowHasAnchorKind,
  atlasMemoryRecordRowHasAuLink,
  atlasMemoryRecordRowHasLens,
  atlasMemoryRecordRowHasLiveCheckKind,
  atlasMemoryRecordRowHasSymbol,
  atlasMemoryRecordRowPathMatches,
} from "./atlas-memory-row-matching.js";

export type AtlasMemoryProjection =
  | "summary"
  | "records"
  | "guidance"
  | "stale"
  | "schema";

export function filterMemoryRows(
  rows: readonly AtlasMemoryRecordRow[],
  inquiry: Inquiry,
): readonly AtlasMemoryRecordRow[] {
  const kind = inquiryStringFilter(inquiry, "kind");
  const status = inquiryStringFilter(inquiry, "status");
  const domains = inquiryStringListFilter(inquiry, "domain");
  const domainMode = memoryDomainFilterMode(inquiry);
  const recordId = inquiryStringFilter(inquiry, "recordId");
  const path = inquiryStringFilter(inquiry, "path");
  const liveCheckKind = inquiryStringFilter(inquiry, "liveCheckKind");
  const anchorKind = inquiryStringFilter(inquiry, "anchorKind");
  const anchorLensId = inquiryStringFilter(inquiry, "anchorLensId");
  const auLinkId = inquiryStringFilter(inquiry, "auLinkId");
  const symbolName = inquiryStringFilter(inquiry, "symbolName");
  const archived = inquiryBooleanFilter(inquiry, "archived");
  const query = inquiryStringFilter(inquiry, "query");
  const structurallyFiltered = rows.filter((row) =>
    (kind === undefined || row.kind === kind) &&
    (status === undefined || row.status === status) &&
    memoryDomainsMatch(row.domains, domains, domainMode) &&
    (recordId === undefined || row.id === recordId) &&
    (path === undefined || atlasMemoryRecordRowPathMatches(row, path)) &&
    (liveCheckKind === undefined || atlasMemoryRecordRowHasLiveCheckKind(row, liveCheckKind)) &&
    (anchorKind === undefined || atlasMemoryRecordRowHasAnchorKind(row, anchorKind)) &&
    (anchorLensId === undefined || atlasMemoryRecordRowHasLens(row, anchorLensId)) &&
    (auLinkId === undefined || atlasMemoryRecordRowHasAuLink(row, auLinkId)) &&
    (symbolName === undefined || atlasMemoryRecordRowHasSymbol(row, symbolName)) &&
    (archived === undefined || (row.record.archived ?? false) === archived),
  );
  if (query === undefined) return structurallyFiltered;
  const matches = structurallyFiltered.map(row => {
    const text = memoryQuerySearchText(row);
    const exact = queryMatches(query, text);
    const score = row.record.archived ? 0 : memoryRowQueryRelevance(row, query);
    const adjacent = score > 0 && querySignificantPartialMatches(query, text);
    return { row, exact, adjacent, score };
  });
  const specific = matches.filter(hit => hit.exact || hit.adjacent);
  const selected = specific.length > 0 ? specific : matches.filter(hit => hit.score > 0);
  return selected
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score)
    .map(hit => hit.row);
}

function memoryDomainFilterMode(inquiry: Inquiry): "any" | "all" {
  return inquiryStringFilter(inquiry, "domainMode") === "any" ? "any" : "all";
}

function memoryDomainsMatch(
  rowDomains: readonly string[],
  filterDomains: readonly string[],
  mode: "any" | "all",
): boolean {
  if (filterDomains.length === 0) {
    return true;
  }
  return mode === "any"
    ? filterDomains.some((domain) => rowDomains.includes(domain))
    : filterDomains.every((domain) => rowDomains.includes(domain));
}

export function guidanceRows(
  rows: readonly AtlasMemoryRecordRow[],
): readonly AtlasMemoryRecordRow[] {
  return rows.filter((row) => !row.record.archived && (row.record.guidance ?? []).length > 0);
}

function memorySearchText(row: AtlasMemoryRecordRow): readonly string[] {
  return [
    row.id,
    row.kind,
    row.status,
    row.record.summary,
    row.record.rationale ?? "",
    ...row.domains,
    ...(row.record.guidance ?? []),
    ...(row.record.anchors ?? []).map(atlasMemoryAnchorSearchText),
    ...row.liveChecks.flatMap(liveCheckSearchText),
  ];
}

/**
 * Archived records answer free-text queries only through identity fields; an archived body
 * (guidance, rationale, anchors) must not make the record match unrelated queries.
 */
function memoryQuerySearchText(row: AtlasMemoryRecordRow): readonly string[] {
  return row.record.archived
    ? [row.id, row.kind, row.record.summary, ...row.domains]
    : memorySearchText(row);
}

function memoryRowQueryRelevance(
  row: AtlasMemoryRecordRow,
  query: string,
): number {
  return queryRelevanceScore(query, [
    { weight: 1_200, values: [row.id] },
    { weight: 1_000, values: row.domains },
    { weight: 900, values: memoryAnchorSearchGroups(row) },
    { weight: 800, values: [row.summary, row.record.summary] },
    { weight: 500, values: [row.record.rationale ?? ""] },
    { weight: 250, values: row.record.guidance ?? [] },
    { weight: 150, values: row.liveChecks.flatMap(liveCheckSearchText) },
  ]);
}

function memoryAnchorSearchGroups(row: AtlasMemoryRecordRow): readonly string[] {
  return (row.record.anchors ?? []).flatMap((anchor) => {
    switch (anchor.kind) {
      case "source":
        return [anchor.filePath, anchor.symbolName ?? "", anchor.summary ?? ""];
      case "lens":
        return [anchor.lensId, anchor.projection ?? "", anchor.summary ?? ""];
      case "script":
        return [anchor.command, anchor.summary ?? ""];
      case "doc":
        return [anchor.path, anchor.heading ?? "", anchor.summary ?? ""];
      case "fixture":
        return [anchor.path, anchor.scenario ?? "", anchor.summary ?? ""];
      case "auLink":
        return [anchor.linkId, anchor.symbolName ?? "", anchor.summary ?? ""];
      case "external":
        return [anchor.url, anchor.summary ?? ""];
    }
  });
}

function liveCheckSearchText(
  result: AtlasMemoryLiveCheckResult,
): readonly string[] {
  switch (result.check.kind) {
    case "product-large-class":
      return [
        result.check.kind,
        result.check.className,
        result.check.filePath ?? "",
        result.summary,
      ];
    case "source-file-exists":
      return [result.check.kind, result.check.filePath, result.summary];
    case "source-declaration-exists":
      return [
        result.check.kind,
        result.check.filePath,
        result.check.symbolName,
        result.summary,
      ];
    case "atlas-self-source-file":
      return [
        result.check.kind,
        result.check.filePath,
        result.check.moduleShape ?? "",
        result.summary,
      ];
    case "atlas-self-class":
      return [
        result.check.kind,
        result.check.className,
        result.check.filePath ?? "",
        result.summary,
      ];
    case "atlas-self-function":
      return [
        result.check.kind,
        result.check.functionName,
        result.check.filePath ?? "",
        result.summary,
      ];
    case "atlas-self-variable":
      return [
        result.check.kind,
        result.check.variableName,
        result.check.filePath ?? "",
        result.check.initializerKind ?? "",
        result.summary,
      ];
    case "auLink-exists":
      return [
        result.check.kind,
        result.check.linkId,
        result.check.symbolName ?? "",
        result.check.filePath ?? "",
        result.summary,
      ];
  }
}
