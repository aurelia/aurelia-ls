import type { Inquiry } from "../inquiry.js";
import type {
  AtlasWorkRoute,
  AtlasWorkRouteAnchor,
  AtlasWorkRouteMatchStrength,
  AtlasWorkRouteRole,
} from "./atlas-work-router-contracts.js";
import { ATLAS_WORK_ROUTES } from "./atlas-work-router-route-catalog.js";
import type { AtlasWorkRouteRow } from "./atlas-work-router-rows.js";
import {
  inquiryLowerStringFilter,
  inquiryStringFilter,
  inquiryStringListFilter,
  queryTokenCoverage,
} from "./lens-filter-utils.js";

export interface AtlasWorkRouterFilters {
  readonly query?: string;
  readonly routeIds: readonly string[];
  readonly relatedTo?: string;
  readonly domains: readonly string[];
  readonly domainMode: "all" | "any";
  readonly role?: string;
  readonly lensId?: string;
  readonly path?: string;
  readonly symbolName?: string;
  readonly auLinkId?: string;
  readonly concept?: string;
  readonly effectKind?: string;
  readonly recipeKey?: string;
  readonly seedUse?: string;
}

export interface ScoredRoute {
  readonly route: AtlasWorkRoute;
  readonly row: AtlasWorkRouteRow;
}

export function atlasWorkRouterFilters(inquiry: Inquiry): AtlasWorkRouterFilters {
  const domainMode = inquiryLowerStringFilter(inquiry, "domainMode");
  return {
    query: inquiryStringFilter(inquiry, "query"),
    routeIds: [
      ...inquiryStringListFilter(inquiry, "routeId"),
      ...inquiryStringListFilter(inquiry, "id"),
    ],
    relatedTo: inquiryStringFilter(inquiry, "relatedTo"),
    domains: inquiryStringListFilter(inquiry, "domain"),
    domainMode: domainMode === "any" ? "any" : "all",
    role: inquiryStringFilter(inquiry, "role"),
    lensId: inquiryStringFilter(inquiry, "lensId"),
    path: inquiryStringFilter(inquiry, "path"),
    symbolName: inquiryStringFilter(inquiry, "symbolName"),
    auLinkId: inquiryStringFilter(inquiry, "auLinkId"),
    concept: inquiryStringFilter(inquiry, "concept"),
    effectKind: inquiryStringFilter(inquiry, "effectKind"),
    recipeKey: inquiryStringFilter(inquiry, "recipeKey"),
    seedUse: inquiryStringFilter(inquiry, "seedUse"),
  };
}

export function emptyAtlasWorkRouterFilters(): AtlasWorkRouterFilters {
  return {
    routeIds: [],
    domains: [],
    domainMode: "all",
  };
}

export function scoredRoutesForFilters(
  filters: AtlasWorkRouterFilters,
): readonly ScoredRoute[] {
  const scoredRoutes = ATLAS_WORK_ROUTES
    .filter((route) => routeMatchesFilters(route, filters))
    .map((route) => scoredRoute(route, filters))
    .sort(compareScoredRoutes);
  return suppressWeakRoutesWhenGrounded(scoredRoutes, filters);
}

function routeMatchesFilters(
  route: AtlasWorkRoute,
  filters: AtlasWorkRouterFilters,
): boolean {
  if (filters.routeIds.length > 0 && !filters.routeIds.includes(route.id)) {
    return false;
  }
  if (
    filters.relatedTo !== undefined &&
    route.id !== filters.relatedTo &&
    !route.relatedRouteIds.includes(filters.relatedTo)
  ) {
    return false;
  }
  if (filters.domains.length > 0) {
    const matches = filters.domains.filter((domain) =>
      routeMatchesDomain(route, domain),
    ).length;
    if (filters.domainMode === "all" && matches !== filters.domains.length) {
      return false;
    }
    if (filters.domainMode === "any" && matches === 0) {
      return false;
    }
  }
  if (
    filters.role !== undefined &&
    !route.roles.includes(filters.role as AtlasWorkRouteRole)
  ) {
    return false;
  }
  if (
    filters.lensId !== undefined &&
    !route.anchors.some((anchor) =>
      anchor.kind === "lens" && anchor.lensId === filters.lensId,
    )
  ) {
    return false;
  }
  const path = filters.path;
  if (
    path !== undefined &&
    !route.anchors.some((anchor) => anchorMatchesPath(anchor, path))
  ) {
    return false;
  }
  const symbolName = filters.symbolName;
  if (
    symbolName !== undefined &&
    !route.anchors.some((anchor) => anchorMatchesSymbol(anchor, symbolName))
  ) {
    return false;
  }
  const auLinkId = filters.auLinkId;
  if (
    auLinkId !== undefined &&
    !route.anchors.some((anchor) => anchorMatchesAuLink(anchor, auLinkId))
  ) {
    return false;
  }
  if (
    filters.concept !== undefined &&
    !route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" && anchor.concept === filters.concept,
    )
  ) {
    return false;
  }
  if (
    filters.effectKind !== undefined &&
    !route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" &&
      anchor.effectKind === filters.effectKind,
    )
  ) {
    return false;
  }
  if (
    filters.recipeKey !== undefined &&
    !route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" &&
      anchor.recipeKey === filters.recipeKey,
    )
  ) {
    return false;
  }
  if (
    filters.seedUse !== undefined &&
    !route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" &&
      anchor.seedUse === filters.seedUse,
    )
  ) {
    return false;
  }
  if (filters.query !== undefined) {
    return (
      structuralQueryScore(route, filters.query) > 0 ||
      weakTextQueryScore(route, filters.query) > 0
    );
  }
  return true;
}

function scoredRoute(
  route: AtlasWorkRoute,
  filters: AtlasWorkRouterFilters,
): ScoredRoute {
  const matchedBy: string[] = [];
  let score = 0;
  let exact = false;
  let declared = false;
  let adjacent = false;
  let weak = false;

  if (filters.routeIds.includes(route.id)) {
    score += 10_000;
    exact = true;
    matchedBy.push(`exact routeId ${route.id}`);
  }
  if (filters.relatedTo !== undefined) {
    score += 1_500;
    adjacent = true;
    matchedBy.push(`declared adjacency with ${filters.relatedTo}`);
  }
  for (const domain of filters.domains) {
    const matchKind = routeDomainMatchKind(route, domain);
    if (matchKind !== undefined) {
      score += 900;
      declared = true;
      matchedBy.push(`${matchKind} ${domain}`);
    }
  }
  if (
    filters.role !== undefined &&
    route.roles.includes(filters.role as AtlasWorkRouteRole)
  ) {
    score += 700;
    declared = true;
    matchedBy.push(`role ${filters.role}`);
  }
  for (const anchorMatch of exactAnchorMatches(route, filters)) {
    score += 1_200;
    exact = true;
    matchedBy.push(anchorMatch);
  }
  if (filters.query !== undefined) {
    const structural = structuralQueryScore(route, filters.query);
    const weakText = weakTextQueryScore(route, filters.query);
    if (structural > 0) {
      score += 100 + structural;
      declared = true;
      matchedBy.push(`declared route vocabulary matched query '${filters.query}'`);
    } else if (weakText > 0) {
      score += weakText;
      weak = true;
      matchedBy.push(`weak prose matched query '${filters.query}'`);
    }
  }

  const matchStrength = exact
    ? "exact-structural"
    : declared
      ? "declared-route-term"
      : adjacent
        ? "adjacent-ontology"
        : weak
          ? "weak-text"
          : "catalog-default";

  return {
    route,
    row: {
      id: route.id,
      title: route.title,
      summary: route.summary,
      domains: route.domains,
      roles: route.roles,
      terms: route.terms,
      matchScore: score,
      matchStrength,
      matchedBy: matchedBy.length === 0 ? ["catalog orientation order"] : matchedBy,
      anchorCounts: anchorCounts(route),
      relatedRouteIds: route.relatedRouteIds,
      cautions: route.cautions,
    },
  };
}

function suppressWeakRoutesWhenGrounded(
  routes: readonly ScoredRoute[],
  filters: AtlasWorkRouterFilters,
): readonly ScoredRoute[] {
  if (filters.query === undefined) {
    return routes;
  }
  const hasGroundedQueryMatch = routes.some((route) =>
    route.row.matchStrength !== "weak-text",
  );
  return hasGroundedQueryMatch
    ? routes.filter((route) => route.row.matchStrength !== "weak-text")
    : routes;
}

function exactAnchorMatches(
  route: AtlasWorkRoute,
  filters: AtlasWorkRouterFilters,
): readonly string[] {
  const matches: string[] = [];
  if (
    filters.lensId !== undefined &&
    route.anchors.some((anchor) =>
      anchor.kind === "lens" && anchor.lensId === filters.lensId,
    )
  ) {
    matches.push(`lens ${filters.lensId}`);
  }
  const path = filters.path;
  if (
    path !== undefined &&
    route.anchors.some((anchor) => anchorMatchesPath(anchor, path))
  ) {
    matches.push(`path ${path}`);
  }
  const symbolName = filters.symbolName;
  if (
    symbolName !== undefined &&
    route.anchors.some((anchor) => anchorMatchesSymbol(anchor, symbolName))
  ) {
    matches.push(`symbol ${symbolName}`);
  }
  const auLinkId = filters.auLinkId;
  if (
    auLinkId !== undefined &&
    route.anchors.some((anchor) => anchorMatchesAuLink(anchor, auLinkId))
  ) {
    matches.push(`auLink ${auLinkId}`);
  }
  if (
    filters.concept !== undefined &&
    route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" && anchor.concept === filters.concept,
    )
  ) {
    matches.push(`corpus concept ${filters.concept}`);
  }
  if (
    filters.effectKind !== undefined &&
    route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" &&
      anchor.effectKind === filters.effectKind,
    )
  ) {
    matches.push(`expected effect ${filters.effectKind}`);
  }
  if (
    filters.recipeKey !== undefined &&
    route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" &&
      anchor.recipeKey === filters.recipeKey,
    )
  ) {
    matches.push(`recipe ${filters.recipeKey}`);
  }
  if (
    filters.seedUse !== undefined &&
    route.anchors.some((anchor) =>
      anchor.kind === "framework-corpus" &&
      anchor.seedUse === filters.seedUse,
    )
  ) {
    matches.push(`fixture seed use ${filters.seedUse}`);
  }
  return matches;
}

function routeMatchesDomain(route: AtlasWorkRoute, domain: string): boolean {
  return routeDomainMatchKind(route, domain) !== undefined;
}

function routeDomainMatchKind(
  route: AtlasWorkRoute,
  domain: string,
): "domain" | "memory domain" | undefined {
  if (route.domains.includes(domain)) {
    return "domain";
  }
  return route.anchors.some((anchor) =>
      anchor.kind === "memory" && anchor.domains.includes(domain)
    )
    ? "memory domain"
    : undefined;
}

function structuralQueryScore(route: AtlasWorkRoute, query: string): number {
  return frameworkErrorCodeQueryScore(route, query) +
    queryCanaryScore(route, query) +
    strictQueryScore(query, [
    {
      weight: 30,
      values: [route.id],
    },
    {
      weight: 18,
      allowSetCoverage: true,
      values: [
        ...route.domains,
        ...route.roles,
        ...route.terms,
      ],
    },
    {
      weight: 12,
      values: route.anchors.flatMap(anchorIdentityValues),
    },
  ]);
}

function queryCanaryScore(route: AtlasWorkRoute, query: string): number {
  const canaryQueries = route.queryCanaries?.map((canary) => canary.query) ?? [];
  const normalized = query.toLowerCase().trim();
  if (normalized.length === 0) {
    return 0;
  }
  return canaryQueries.some((canaryQuery) =>
    queryMatchesRouteCanaryPhrase(query, canaryQuery) ||
    canaryQuery.toLowerCase().trim() === normalized,
  )
    ? 220
    : 0;
}

function frameworkErrorCodeQueryScore(route: AtlasWorkRoute, query: string): number {
  if (route.id !== "diagnostics.framework-error-grounding") {
    return 0;
  }
  return firstFrameworkErrorCodeQuery(query) === undefined ? 0 : 160;
}

export function firstFrameworkErrorCodeQuery(query: string): string | undefined {
  return /\bAUR\d{4}\b/iu.exec(query)?.[0]?.toUpperCase();
}

function weakTextQueryScore(route: AtlasWorkRoute, query: string): number {
  return strictQueryScore(query, [
    {
      weight: 2,
      values: [
        route.title,
        route.summary,
        ...route.authority,
        ...route.cautions,
        ...route.nextQuestions,
        ...route.anchors.map((anchor) => anchor.summary),
      ],
    },
  ]);
}

function strictQueryScore(
  query: string,
  groups: readonly {
    readonly weight: number;
    readonly allowSetCoverage?: boolean;
    readonly values: readonly string[];
  }[],
): number {
  const normalized = query.toLowerCase().trim();
  if (normalized.length === 0) {
    return 0;
  }
  const queryCoverage = queryTokenCoverage(query, []);
  const singleTokenQuery = queryCoverage.queryTokenCount === 1;
  return groups.reduce((score, group) => {
    const values = group.values.filter((value) => value.length > 0);
    if (values.length === 0) {
      return score;
    }
    const lowerValues = values.map((value) => value.toLowerCase());
    if (lowerValues.some((value) => value === normalized)) {
      return score + group.weight * 4;
    }
    if (lowerValues.some((value) => queryContainsDistinctRouteValue(query, value))) {
      return score + group.weight * 3;
    }
    if (
      !singleTokenQuery &&
      lowerValues.some((value) => value.includes(normalized))
    ) {
      return score + group.weight * 3;
    }
    const fullyCoveredByOneValue = !singleTokenQuery && values.some((value) =>
      queryCoversExactPhrase(query, value),
    );
    if (fullyCoveredByOneValue) {
      return score + group.weight * 2;
    }
    if (group.allowSetCoverage === true) {
      const coverage = queryTokenCoverage(query, values);
      if (
        coverage.queryTokenCount > 0 &&
        coverage.matchedTokenCount === coverage.queryTokenCount
      ) {
        return score + group.weight;
      }
    }
    return score;
  }, 0);
}

function queryCoversExactPhrase(query: string, phrase: string): boolean {
  const phraseCoverage = queryTokenCoverage(phrase, []);
  if (phraseCoverage.queryTokenCount < 2) {
    return false;
  }
  const coverage = queryTokenCoverage(phrase, [query]);
  return coverage.queryTokenCount > 0 &&
    coverage.matchedTokenCount === coverage.queryTokenCount;
}

function queryContainsDistinctRouteValue(query: string, normalizedValue: string): boolean {
  if (normalizedValue.length === 0) {
    return false;
  }
  const valueCoverage = queryTokenCoverage(normalizedValue, []);
  if (
    valueCoverage.queryTokenCount < 2 &&
    normalizedValue.length < 12
  ) {
    return false;
  }
  return query.toLowerCase().includes(normalizedValue);
}

function queryMatchesRouteCanaryPhrase(query: string, phrase: string): boolean {
  const queryCoverage = queryTokenCoverage(query, [phrase]);
  const phraseCoverage = queryTokenCoverage(phrase, [query]);
  return queryCoverage.queryTokenCount > 0 &&
    queryCoverage.matchedTokenCount === queryCoverage.queryTokenCount &&
    phraseCoverage.queryTokenCount > 0 &&
    phraseCoverage.matchedTokenCount === phraseCoverage.queryTokenCount;
}

function compareScoredRoutes(left: ScoredRoute, right: ScoredRoute): number {
  return right.row.matchScore - left.row.matchScore ||
    matchStrengthWeight(right.row.matchStrength) -
      matchStrengthWeight(left.row.matchStrength) ||
    left.route.id.localeCompare(right.route.id);
}

export function routeMatchStrengthMeets(
  actual: AtlasWorkRouteMatchStrength,
  minimum: AtlasWorkRouteMatchStrength,
): boolean {
  return matchStrengthWeight(actual) >= matchStrengthWeight(minimum);
}

function matchStrengthWeight(strength: AtlasWorkRouteMatchStrength): number {
  switch (strength) {
    case "exact-structural":
      return 6;
    case "workset-structural":
      return 5;
    case "product-structural":
      return 5;
    case "memory-structural":
      return 5;
    case "declared-route-term":
      return 4;
    case "adjacent-ontology":
      return 3;
    case "catalog-default":
      return 2;
    case "weak-text":
      return 1;
  }
}

function anchorCounts(route: AtlasWorkRoute): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const anchor of route.anchors) {
    counts[anchor.kind] = (counts[anchor.kind] ?? 0) + 1;
  }
  return counts;
}

function anchorMatchesPath(
  anchor: AtlasWorkRouteAnchor,
  path: string,
): boolean {
  switch (anchor.kind) {
    case "source":
      return sourcePathMatches(anchor.filePath, path);
    case "doc":
      return sourcePathMatches(anchor.path, path);
    case "path":
      return sourcePathMatches(anchor.pathPrefix, path);
    default:
      return false;
  }
}

function anchorMatchesSymbol(
  anchor: AtlasWorkRouteAnchor,
  symbolName: string,
): boolean {
  switch (anchor.kind) {
    case "source":
    case "auLink":
      return anchor.symbolName === symbolName;
    case "memory":
      return anchor.symbolName === symbolName;
    default:
      return false;
  }
}

function anchorMatchesAuLink(
  anchor: AtlasWorkRouteAnchor,
  auLinkId: string,
): boolean {
  switch (anchor.kind) {
    case "auLink":
      return anchor.linkId === auLinkId;
    case "memory":
      return anchor.auLinkId === auLinkId;
    default:
      return false;
  }
}

function anchorIdentityValues(anchor: AtlasWorkRouteAnchor): readonly string[] {
  switch (anchor.kind) {
    case "source":
      return [anchor.filePath, anchor.symbolName ?? ""];
    case "lens":
      return [anchor.lensId, anchor.projection ?? ""];
    case "memory":
      return [
        anchor.anchorLensId ?? "",
        anchor.symbolName ?? "",
        anchor.auLinkId ?? "",
      ];
    case "framework-corpus":
      return [
        anchor.projection,
        anchor.concept ?? "",
        anchor.query ?? "",
        anchor.effectKind ?? "",
        anchor.recipeKey ?? "",
        anchor.seedUse ?? "",
      ];
    case "auLink":
      return [anchor.linkId, anchor.symbolName ?? ""];
    case "script":
      return [anchor.command];
    case "doc":
      return [anchor.path, anchor.heading ?? ""];
    case "path":
      return [anchor.pathPrefix];
  }
}

export function sourcePathMatches(candidate: string, requested: string): boolean {
  const normalizedCandidate = normalizeRoutePath(candidate);
  const normalizedRequested = normalizeRoutePath(requested);
  return normalizedCandidate === normalizedRequested ||
    normalizedCandidate.startsWith(`${normalizedRequested}/`) ||
    normalizedRequested.startsWith(`${normalizedCandidate}/`);
}

function normalizeRoutePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "").replace(/\/+$/u, "");
}
