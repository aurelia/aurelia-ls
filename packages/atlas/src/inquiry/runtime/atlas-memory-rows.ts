import type { Inquiry } from "../inquiry.js";
import {
  inquiryStringListFilter,
  inquiryStringFilter,
  matchesFilterValue,
  queryMatches,
  queryRelevanceScore,
  querySignificantPartialMatches,
} from "./lens-filter-utils.js";
import type {
  AtlasMemoryAnalysis,
  AtlasMemoryComputedStatus,
  AtlasMemoryLiveCheckResult,
  AtlasMemoryRecordRow,
  AtlasMemoryUntrackedProductClassFrontier,
} from "./atlas-memory-contracts.js";
import { atlasMemoryAnchorSearchText } from "./atlas-memory-contracts.js";
import type { AtlasMemoryNextActionRow } from "./atlas-memory-next-actions.js";
import {
  atlasMemoryRecordRowHasAnchorKind,
  atlasMemoryRecordRowHasAuLink,
  atlasMemoryRecordRowHasLens,
  atlasMemoryRecordRowHasLiveCheckKind,
  atlasMemoryRecordRowHasSymbol,
  atlasMemoryRecordRowPathMatches,
  atlasMemoryRepoPathMatches,
} from "./atlas-memory-row-matching.js";

export type AtlasMemoryProjection =
  | "summary"
  | "records"
  | "frontiers"
  | "next"
  | "guidance"
  | "stale"
  | "schema";

/** One frontier row exposed by atlas.memory. */
export type AtlasMemoryFrontierRow =
  | AtlasMemoryTrackedFrontierRow
  | AtlasMemoryUntrackedFrontierRow;

/** Durable memory row that is still live. */
export interface AtlasMemoryTrackedFrontierRow {
  /** Frontier discriminator. */
  readonly kind: "memory-record";
  /** Stable row id. */
  readonly id: string;
  /** Record status. */
  readonly status: AtlasMemoryComputedStatus;
  /** Joined memory row. */
  readonly record: AtlasMemoryRecordRow;
  /** Compact row summary. */
  readonly summary: string;
}

/** Live product pressure without a durable memory record. */
export interface AtlasMemoryUntrackedFrontierRow {
  /** Frontier discriminator. */
  readonly kind: "untracked-product-class";
  /** Stable row id. */
  readonly id: string;
  /** Frontier status. */
  readonly status: "untracked";
  /** Untracked product class frontier. */
  readonly frontier: AtlasMemoryUntrackedProductClassFrontier;
  /** Compact row summary. */
  readonly summary: string;
}

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
  const nextActionPolicy = inquiryStringFilter(inquiry, "nextActionPolicy");
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
    (nextActionPolicy === undefined || memoryRowNextActionPolicy(row) === nextActionPolicy),
  );
  const exactQueryFiltered = query === undefined
    ? structurallyFiltered
    : structurallyFiltered.filter((row) => queryMatches(query, memorySearchText(row)));
  const filtered = query === undefined
    ? exactQueryFiltered
    : memoryQueryExpandedRows(
      structurallyFiltered,
      exactQueryFiltered,
      query,
      memorySearchText,
      memoryRowQueryRelevance,
    );
  return rankMemoryRowsForInquiry(filtered, inquiry);
}

export function filterUntrackedFrontiers(
  rows: readonly AtlasMemoryUntrackedProductClassFrontier[],
  inquiry: Inquiry,
): readonly AtlasMemoryUntrackedProductClassFrontier[] {
  const domains = inquiryStringListFilter(inquiry, "domain");
  const domainMode = memoryDomainFilterMode(inquiry);
  const path = inquiryStringFilter(inquiry, "path");
  const surfaceRole = inquiryStringFilter(inquiry, "surfaceRole");
  const query = inquiryStringFilter(inquiry, "query");
  const structurallyFiltered = rows.filter((row) =>
    memoryDomainsMatch(row.domains, domains, domainMode) &&
    (path === undefined || atlasMemoryRepoPathMatches(row.filePath, path)) &&
    matchesFilterValue(row.surfaceRole, surfaceRole),
  );
  const exactQueryFiltered = query === undefined
    ? structurallyFiltered
    : structurallyFiltered.filter((row) => queryMatches(query, untrackedFrontierSearchText(row)));
  const filtered = query === undefined
    ? exactQueryFiltered
    : memoryQueryExpandedRows(
      structurallyFiltered,
      exactQueryFiltered,
      query,
      untrackedFrontierSearchText,
      untrackedFrontierQueryRelevance,
    );
  return rankUntrackedFrontiersForInquiry(filtered, inquiry);
}

export function filterFrontiers(
  rows: readonly AtlasMemoryFrontierRow[],
  inquiry: Inquiry,
): readonly AtlasMemoryFrontierRow[] {
  const status = inquiryStringFilter(inquiry, "status");
  const kind = inquiryStringFilter(inquiry, "kind");
  const recordId = inquiryStringFilter(inquiry, "recordId");
  const domains = inquiryStringListFilter(inquiry, "domain");
  const domainMode = memoryDomainFilterMode(inquiry);
  const path = inquiryStringFilter(inquiry, "path");
  const surfaceRole = inquiryStringFilter(inquiry, "surfaceRole");
  const liveCheckKind = inquiryStringFilter(inquiry, "liveCheckKind");
  const anchorKind = inquiryStringFilter(inquiry, "anchorKind");
  const anchorLensId = inquiryStringFilter(inquiry, "anchorLensId");
  const auLinkId = inquiryStringFilter(inquiry, "auLinkId");
  const symbolName = inquiryStringFilter(inquiry, "symbolName");
  const nextActionPolicy = inquiryStringFilter(inquiry, "nextActionPolicy");
  const query = inquiryStringFilter(inquiry, "query");
  const structurallyFiltered = rows.filter((row) =>
    (status === undefined || row.status === status) &&
    (kind === undefined || row.kind === kind || trackedKind(row) === kind) &&
    (recordId === undefined || row.id === recordId) &&
    memoryDomainsMatch(frontierDomains(row), domains, domainMode) &&
    (path === undefined || frontierPathMatches(row, path)) &&
    (surfaceRole === undefined ||
      (row.kind === "untracked-product-class" && row.frontier.surfaceRole === surfaceRole)) &&
    (liveCheckKind === undefined || frontierLiveCheckKindMatches(row, liveCheckKind)) &&
    (anchorKind === undefined || frontierAnchorKindMatches(row, anchorKind)) &&
    (anchorLensId === undefined || frontierAnchorLensIdMatches(row, anchorLensId)) &&
    (auLinkId === undefined || frontierAuLinkIdMatches(row, auLinkId)) &&
    (symbolName === undefined || frontierSymbolNameMatches(row, symbolName)) &&
    (nextActionPolicy === undefined || frontierNextActionPolicy(row) === nextActionPolicy),
  );
  const exactQueryFiltered = query === undefined
    ? structurallyFiltered
    : structurallyFiltered.filter((row) => queryMatches(query, frontierSearchText(row)));
  const filtered = query === undefined
    ? exactQueryFiltered
    : memoryQueryExpandedRows(
      structurallyFiltered,
      exactQueryFiltered,
      query,
      frontierSearchText,
      frontierQueryRelevance,
    );
  return rankFrontiersForInquiry(filtered, inquiry);
}

export function filterNextActions(
  rows: readonly AtlasMemoryNextActionRow[],
  inquiry: Inquiry,
): readonly AtlasMemoryNextActionRow[] {
  const status = inquiryStringFilter(inquiry, "status");
  const kind = inquiryStringFilter(inquiry, "kind");
  const recordId = inquiryStringFilter(inquiry, "recordId");
  const domains = inquiryStringListFilter(inquiry, "domain");
  const domainMode = memoryDomainFilterMode(inquiry);
  const path = inquiryStringFilter(inquiry, "path");
  const surfaceRole = inquiryStringFilter(inquiry, "surfaceRole");
  const liveCheckKind = inquiryStringFilter(inquiry, "liveCheckKind");
  const anchorKind = inquiryStringFilter(inquiry, "anchorKind");
  const anchorLensId = inquiryStringFilter(inquiry, "anchorLensId");
  const auLinkId = inquiryStringFilter(inquiry, "auLinkId");
  const symbolName = inquiryStringFilter(inquiry, "symbolName");
  const nextActionPolicy = inquiryStringFilter(inquiry, "nextActionPolicy");
  const query = inquiryStringFilter(inquiry, "query");
  const structurallyFiltered = rows.filter((row) =>
    (status === undefined || row.status === status) &&
    (kind === undefined || nextActionKindMatches(row, kind)) &&
    (recordId === undefined || row.record?.id === recordId || row.id === recordId) &&
    memoryDomainsMatch(row.domains, domains, domainMode) &&
    (path === undefined || nextActionPathMatches(row, path)) &&
    (surfaceRole === undefined || nextActionSurfaceRoleMatches(row, surfaceRole)) &&
    (liveCheckKind === undefined || nextActionLiveCheckKindMatches(row, liveCheckKind)) &&
    (anchorKind === undefined || nextActionAnchorKindMatches(row, anchorKind)) &&
    (anchorLensId === undefined || nextActionAnchorLensIdMatches(row, anchorLensId)) &&
    (auLinkId === undefined || nextActionAuLinkIdMatches(row, auLinkId)) &&
    (symbolName === undefined || nextActionSymbolNameMatches(row, symbolName)) &&
    (nextActionPolicy === undefined || nextActionPolicyForRow(row) === nextActionPolicy),
  );
  const exactQueryFiltered = query === undefined
    ? structurallyFiltered
    : structurallyFiltered.filter((row) => queryMatches(query, nextActionSearchText(row)));
  const filtered = query === undefined
    ? exactQueryFiltered
    : memoryQueryExpandedRows(
      structurallyFiltered,
      exactQueryFiltered,
      query,
      nextActionAdjacentSearchText,
      nextActionQueryRelevance,
    );
  return rankNextActionsForInquiry(filtered, inquiry);
}

function memoryQueryExpandedRows<TRow>(
  structurallyFiltered: readonly TRow[],
  exactQueryFiltered: readonly TRow[],
  query: string,
  adjacentSearchText: (row: TRow) => readonly string[],
  relevance: (row: TRow, query: string) => number,
): readonly TRow[] {
  if (exactQueryFiltered.length === 0) {
    const adjacentRows = structurallyFiltered.filter((row) =>
      relevance(row, query) > 0 &&
      querySignificantPartialMatches(query, adjacentSearchText(row)),
    );
    return adjacentRows.length > 0
      ? adjacentRows
      : structurallyFiltered.filter((row) => relevance(row, query) > 0);
  }
  const exactRows = new Set(exactQueryFiltered);
  const adjacentRows = structurallyFiltered.filter((row) =>
    !exactRows.has(row) &&
    relevance(row, query) > 0 &&
    querySignificantPartialMatches(query, adjacentSearchText(row)),
  );
  return [...exactQueryFiltered, ...adjacentRows];
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
  return rows.filter((row) => (row.record.guidance ?? []).length > 0);
}

export function frontierRows(
  analysis: AtlasMemoryAnalysis,
): readonly AtlasMemoryFrontierRow[] {
  return [
    ...liveRows(analysis.records).map((row) => ({
      kind: "memory-record" as const,
      id: row.id,
      status: row.status,
      record: row,
      summary: row.summary,
    })),
    ...analysis.untrackedProductClassFrontiers.map((frontier) => ({
      kind: "untracked-product-class" as const,
      id: frontier.id,
      status: "untracked" as const,
      frontier,
      summary: frontier.summary,
    })),
  ];
}

function liveRows(
  rows: readonly AtlasMemoryRecordRow[],
): readonly AtlasMemoryRecordRow[] {
  return rows.filter((row) =>
    row.status === "active" ||
    row.status === "intentional-live" ||
    row.status === "stale-source" ||
    row.status === "stale-check",
  );
}

function memorySearchText(row: AtlasMemoryRecordRow): readonly string[] {
  return [
    row.id,
    row.kind,
    row.status,
    row.nextActionPolicy ?? "",
    row.record.summary,
    row.record.rationale ?? "",
    ...row.domains,
    ...(row.record.guidance ?? []),
    ...(row.record.anchors ?? []).map(atlasMemoryAnchorSearchText),
    ...row.liveChecks.flatMap(liveCheckSearchText),
  ];
}

function rankMemoryRowsForInquiry(
  rows: readonly AtlasMemoryRecordRow[],
  inquiry: Inquiry,
): readonly AtlasMemoryRecordRow[] {
  const query = inquiryStringFilter(inquiry, "query");
  if (query === undefined) {
    return rows;
  }
  return rows
    .map((row, index) => ({
      row,
      index,
      score: memoryRowQueryRelevance(row, query),
      exact: queryMatches(query, memorySearchText(row)),
    }))
    .sort((left, right) =>
      Number(right.exact) - Number(left.exact) ||
      right.score - left.score ||
      statusRank(right.row.status) - statusRank(left.row.status) ||
      left.index - right.index,
    )
    .map((entry) => entry.row);
}

function rankUntrackedFrontiersForInquiry(
  rows: readonly AtlasMemoryUntrackedProductClassFrontier[],
  inquiry: Inquiry,
): readonly AtlasMemoryUntrackedProductClassFrontier[] {
  const query = inquiryStringFilter(inquiry, "query");
  if (query === undefined) {
    return rows;
  }
  return rows
    .map((row, index) => ({
      row,
      index,
      score: untrackedFrontierQueryRelevance(row, query),
      exact: queryMatches(query, untrackedFrontierSearchText(row)),
    }))
    .sort((left, right) =>
      Number(right.exact) - Number(left.exact) ||
      right.score - left.score ||
      left.index - right.index,
    )
    .map((entry) => entry.row);
}

function rankFrontiersForInquiry(
  rows: readonly AtlasMemoryFrontierRow[],
  inquiry: Inquiry,
): readonly AtlasMemoryFrontierRow[] {
  const query = inquiryStringFilter(inquiry, "query");
  if (query === undefined) {
    return rows;
  }
  return rows
    .map((row, index) => ({
      row,
      index,
      score: frontierQueryRelevance(row, query),
      exact: queryMatches(query, frontierSearchText(row)),
    }))
    .sort((left, right) =>
      Number(right.exact) - Number(left.exact) ||
      right.score - left.score ||
      statusRank(right.row.status) - statusRank(left.row.status) ||
      left.index - right.index,
    )
    .map((entry) => entry.row);
}

function rankNextActionsForInquiry(
  rows: readonly AtlasMemoryNextActionRow[],
  inquiry: Inquiry,
): readonly AtlasMemoryNextActionRow[] {
  const query = inquiryStringFilter(inquiry, "query");
  if (query === undefined) {
    return rows;
  }
  return rows
    .map((row, index) => {
      const score = nextActionQueryRelevance(row, query);
      return {
        index,
        exact: queryMatches(query, nextActionSearchText(row)),
        row: score === 0 ? row : { ...row, rank: row.rank + score },
      };
    })
    .sort((left, right) =>
      Number(right.exact) - Number(left.exact) ||
      right.row.rank - left.row.rank ||
      left.index - right.index,
    )
    .map((entry) => entry.row);
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
    { weight: 500, values: [row.record.rationale ?? "", row.nextActionPolicy ?? ""] },
    { weight: 250, values: row.record.guidance ?? [] },
    { weight: 150, values: row.liveChecks.flatMap(liveCheckSearchText) },
  ]);
}

function nextActionQueryRelevance(
  row: AtlasMemoryNextActionRow,
  query: string,
): number {
  return queryRelevanceScore(query, [
    {
      weight: 1_200,
      values: [
        row.record?.id ?? "",
        row.frontier?.id ?? "",
        row.sampleFrontier?.id ?? "",
        row.issue?.id ?? "",
      ],
    },
    { weight: 1_000, values: row.domains },
    { weight: 900, values: row.record === undefined ? [] : memoryAnchorSearchGroups(row.record) },
    { weight: 800, values: [row.summary, row.record?.summary ?? ""] },
    { weight: 500, values: [row.rationale, row.area ?? "", row.record?.record.rationale ?? "", row.record?.nextActionPolicy ?? ""] },
    { weight: 250, values: row.record?.record.guidance ?? [] },
    {
      weight: 150,
      values: [
        ...(row.record?.liveChecks.flatMap(liveCheckSearchText) ?? []),
        row.frontier?.summary ?? "",
        row.frontier?.className ?? "",
        row.sampleFrontier?.summary ?? "",
        row.sampleFrontier?.className ?? "",
        row.issue?.summary ?? "",
      ],
    },
  ]);
}

function frontierQueryRelevance(
  row: AtlasMemoryFrontierRow,
  query: string,
): number {
  return row.kind === "memory-record"
    ? memoryRowQueryRelevance(row.record, query)
    : untrackedFrontierQueryRelevance(row.frontier, query);
}

function untrackedFrontierQueryRelevance(
  row: AtlasMemoryUntrackedProductClassFrontier,
  query: string,
): number {
  return queryRelevanceScore(query, [
    { weight: 1_200, values: [row.id, row.className] },
    { weight: 1_000, values: row.domains },
    { weight: 900, values: [row.filePath] },
    { weight: 800, values: [row.summary] },
    { weight: 500, values: [row.area, row.surfaceRole, row.surfaceRoleReason] },
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
    }
  });
}

function statusRank(status: AtlasMemoryComputedStatus | "untracked" | "storage-issue"): number {
  switch (status) {
    case "storage-issue":
      return 60;
    case "stale-source":
    case "stale-check":
      return 50;
    case "active":
      return 40;
    case "intentional-live":
      return 30;
    case "reference":
      return 20;
    case "resolved":
      return 10;
    case "untracked":
      return 0;
  }
}

function frontierPathMatches(
  row: AtlasMemoryFrontierRow,
  pathFilter: string,
): boolean {
  return row.kind === "memory-record"
    ? atlasMemoryRecordRowPathMatches(row.record, pathFilter)
    : atlasMemoryRepoPathMatches(row.frontier.filePath, pathFilter);
}

function frontierLiveCheckKindMatches(
  row: AtlasMemoryFrontierRow,
  liveCheckKind: string,
): boolean {
  return row.kind === "memory-record" &&
    atlasMemoryRecordRowHasLiveCheckKind(row.record, liveCheckKind);
}

function frontierAnchorKindMatches(
  row: AtlasMemoryFrontierRow,
  anchorKind: string,
): boolean {
  return row.kind === "memory-record" &&
    atlasMemoryRecordRowHasAnchorKind(row.record, anchorKind);
}

function frontierAnchorLensIdMatches(
  row: AtlasMemoryFrontierRow,
  anchorLensId: string,
): boolean {
  return row.kind === "memory-record" &&
    atlasMemoryRecordRowHasLens(row.record, anchorLensId);
}

function frontierAuLinkIdMatches(
  row: AtlasMemoryFrontierRow,
  auLinkId: string,
): boolean {
  return row.kind === "memory-record" &&
    atlasMemoryRecordRowHasAuLink(row.record, auLinkId);
}

function frontierSymbolNameMatches(
  row: AtlasMemoryFrontierRow,
  symbolName: string,
): boolean {
  return row.kind === "memory-record"
    ? atlasMemoryRecordRowHasSymbol(row.record, symbolName)
    : row.frontier.className === symbolName;
}

function nextActionPathMatches(
  row: AtlasMemoryNextActionRow,
  pathFilter: string,
): boolean {
  return (row.record !== undefined && atlasMemoryRecordRowPathMatches(row.record, pathFilter)) ||
    (row.frontier !== undefined && atlasMemoryRepoPathMatches(row.frontier.filePath, pathFilter)) ||
    (row.sampleFrontier !== undefined &&
      atlasMemoryRepoPathMatches(row.sampleFrontier.filePath, pathFilter));
}

function nextActionLiveCheckKindMatches(
  row: AtlasMemoryNextActionRow,
  liveCheckKind: string,
): boolean {
  return row.record !== undefined &&
    atlasMemoryRecordRowHasLiveCheckKind(row.record, liveCheckKind);
}

function nextActionAnchorKindMatches(
  row: AtlasMemoryNextActionRow,
  anchorKind: string,
): boolean {
  return row.record !== undefined &&
    atlasMemoryRecordRowHasAnchorKind(row.record, anchorKind);
}

function nextActionAnchorLensIdMatches(
  row: AtlasMemoryNextActionRow,
  anchorLensId: string,
): boolean {
  return row.record !== undefined &&
    atlasMemoryRecordRowHasLens(row.record, anchorLensId);
}

function nextActionAuLinkIdMatches(
  row: AtlasMemoryNextActionRow,
  auLinkId: string,
): boolean {
  return row.record !== undefined &&
    atlasMemoryRecordRowHasAuLink(row.record, auLinkId);
}

function nextActionSymbolNameMatches(
  row: AtlasMemoryNextActionRow,
  symbolName: string,
): boolean {
  return (row.record !== undefined && atlasMemoryRecordRowHasSymbol(row.record, symbolName)) ||
    row.frontier?.className === symbolName ||
    row.sampleFrontier?.className === symbolName;
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

function frontierSearchText(row: AtlasMemoryFrontierRow): readonly string[] {
  if (row.kind === "memory-record") {
    return memorySearchText(row.record);
  }
  return untrackedFrontierSearchText(row.frontier);
}

function untrackedFrontierSearchText(row: AtlasMemoryUntrackedProductClassFrontier): readonly string[] {
  return [
    row.id,
    row.className,
    row.filePath,
    row.area,
    row.surfaceRole,
    row.surfaceRoleReason,
    row.summary,
    ...row.domains,
  ];
}

function frontierDomains(row: AtlasMemoryFrontierRow): readonly string[] {
  return row.kind === "memory-record"
    ? row.record.domains
    : row.frontier.domains;
}

function frontierNextActionPolicy(row: AtlasMemoryFrontierRow): string | undefined {
  return row.kind === "memory-record" ? memoryRowNextActionPolicy(row.record) : undefined;
}

function memoryRowNextActionPolicy(row: AtlasMemoryRecordRow): string | undefined {
  return row.nextActionPolicy;
}

function nextActionPolicyForRow(row: AtlasMemoryNextActionRow): string | undefined {
  if (row.record !== undefined) {
    return memoryRowNextActionPolicy(row.record);
  }
  return undefined;
}

function nextActionKindMatches(
  row: AtlasMemoryNextActionRow,
  kind: string,
): boolean {
  return row.kind === kind ||
    row.record?.kind === kind ||
    (row.frontier !== undefined && kind === "untracked-product-class") ||
    (row.sampleFrontier !== undefined && kind === "untracked-product-class");
}

function nextActionSurfaceRoleMatches(
  row: AtlasMemoryNextActionRow,
  surfaceRole: string,
): boolean {
  return row.frontier?.surfaceRole === surfaceRole ||
    row.sampleFrontier?.surfaceRole === surfaceRole;
}

function nextActionSearchText(row: AtlasMemoryNextActionRow): readonly string[] {
  return [
    row.kind,
    row.status,
    row.summary,
    row.rationale,
    row.area ?? "",
    ...(row.record === undefined ? [] : memorySearchText(row.record)),
    ...(row.frontier === undefined ? [] : [
      row.frontier.id,
      row.frontier.className,
      row.frontier.filePath,
      row.frontier.area,
      row.frontier.surfaceRole,
      row.frontier.surfaceRoleReason,
      row.frontier.summary,
    ]),
    ...(row.sampleFrontier === undefined ? [] : [
      row.sampleFrontier.id,
      row.sampleFrontier.className,
      row.sampleFrontier.filePath,
      row.sampleFrontier.area,
      row.sampleFrontier.surfaceRole,
      row.sampleFrontier.surfaceRoleReason,
      row.sampleFrontier.summary,
    ]),
    row.issue?.summary ?? "",
    ...row.domains,
  ];
}

function nextActionAdjacentSearchText(row: AtlasMemoryNextActionRow): readonly string[] {
  return nextActionSearchText(row);
}

function trackedKind(row: AtlasMemoryFrontierRow): string {
  return row.kind === "memory-record" ? row.record.kind : row.kind;
}
