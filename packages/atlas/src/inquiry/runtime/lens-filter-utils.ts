import type { Inquiry } from "../inquiry.js";
import { LocusKind } from "../locus.js";

/** Merge filter fragments while ignoring absent fields instead of overwriting earlier values with `undefined`. */
export function mergeDefinedFilters<TFilters extends object>(
  ...fragments: readonly (TFilters | undefined)[]
): TFilters {
  const merged: Record<string, unknown> = {};
  for (const fragment of fragments) {
    if (fragment === undefined) {
      continue;
    }
    for (const [key, value] of Object.entries(fragment)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged as TFilters;
}

/** Merge subject-level and filter-level records through one domain-specific parser. */
export function readInquiryFilters<TFilters extends object>(
  inquiry: Inquiry,
  filtersFromRecord: (value: unknown) => TFilters,
): TFilters {
  return mergeDefinedFilters(
    filtersFromRecord(inquiry.subject),
    filtersFromRecord(inquiry.filters),
  );
}

/** Copy a non-empty string field from a raw inquiry filter record into a typed filter object fragment. */
export function stringFilter<TFilters extends object>(
  source: Readonly<Record<string, unknown>> | undefined,
  key: keyof TFilters & string,
): object {
  const value = source?.[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

/** Read a typed filter object from a raw record by accepting only the listed string keys. */
export function stringFiltersFromRecord<TFilters extends object>(
  value: unknown,
  keys: readonly (keyof TFilters & string)[],
): TFilters {
  if (value === null || typeof value !== "object") {
    return {} as TFilters;
  }
  const source = value as Record<string, unknown>;
  const filters: Record<string, string> = {};
  for (const key of keys) {
    const field = source[key];
    if (typeof field === "string" && field.length > 0) {
      filters[key] = field;
    }
  }
  return filters as TFilters;
}

/** Read a non-empty string scalar from an inquiry's runtime filters. */
export function inquiryStringFilter(
  inquiry: Inquiry,
  key: string,
): string | undefined {
  const value = inquiry.filters?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Read one or more non-empty strings from a runtime filter; comma-separated strings are accepted for script ergonomics. */
export function inquiryStringListFilter(
  inquiry: Inquiry,
  key: string,
): readonly string[] {
  const value = inquiry.filters?.[key];
  if (typeof value === "string") {
    return stringListFilterValues([value]);
  }
  if (Array.isArray(value)) {
    return stringListFilterValues(value.filter((entry): entry is string => typeof entry === "string"));
  }
  return [];
}

/** Return true when any listed runtime filter carries a non-empty string. */
export function hasAnyInquiryStringFilter(
  inquiry: Inquiry,
  keys: readonly string[],
): boolean {
  return keys.some((key) => inquiryStringFilter(inquiry, key) !== undefined);
}

/** Read a non-empty string scalar and normalize it for case-insensitive matching. */
export function inquiryLowerStringFilter(
  inquiry: Inquiry,
  key: string,
): string | undefined {
  return inquiryStringFilter(inquiry, key)?.toLowerCase();
}

/** Read the package id implied by a package locus or explicit packageId filter. */
export function inquiryPackageIdFilter(inquiry: Inquiry): string | undefined {
  if (inquiry.locus.kind === LocusKind.Package) {
    return inquiry.locus.packageId;
  }
  return inquiryStringFilter(inquiry, "packageId");
}

/** Return true when the query is absent or appears in one of the provided values. */
export function queryMatches(
  query: string | undefined,
  values: readonly string[],
): boolean {
  if (query === undefined) {
    return true;
  }
  const normalized = query.toLowerCase();
  if (values.some((value) => value.toLowerCase().includes(normalized))) {
    return true;
  }

  const queryTokens = normalizedSearchTokens(query);
  if (queryTokens.length === 0) {
    return true;
  }
  const valueTokens = new Set(values.flatMap(normalizedSearchTokens));
  return queryTokens.every((token) => valueTokens.has(token));
}

/** Query token coverage against candidate values, used by lenses that can safely show adjacent partial hits. */
export interface QueryTokenCoverage {
  /** Distinct normalized query tokens after camel-case and punctuation splitting. */
  readonly queryTokenCount: number;
  /** Query tokens present in at least one candidate value. */
  readonly matchedTokenCount: number;
  /** Matched normalized query tokens. */
  readonly matchedTokens: readonly string[];
}

/** Count how many distinct query tokens appear across the candidate values. */
export function queryTokenCoverage(
  query: string | undefined,
  values: readonly string[],
): QueryTokenCoverage {
  const queryTokens = query === undefined ? [] : normalizedSearchTokens(query);
  if (queryTokens.length === 0) {
    return { queryTokenCount: 0, matchedTokenCount: 0, matchedTokens: [] };
  }
  const valueTokens = new Set(values.flatMap(normalizedSearchTokens));
  const matchedTokens = queryTokens.filter((token) => valueTokens.has(token));
  return {
    queryTokenCount: queryTokens.length,
    matchedTokenCount: matchedTokens.length,
    matchedTokens,
  };
}

/** Return true when a row is close enough to an explicit query to be useful as adjacent memory. */
export function querySignificantPartialMatches(
  query: string | undefined,
  values: readonly string[],
): boolean {
  const coverage = queryTokenCoverage(query, values);
  if (coverage.queryTokenCount === 0) {
    return true;
  }
  if (coverage.matchedTokenCount === coverage.queryTokenCount) {
    return true;
  }
  if (coverage.queryTokenCount <= 2) {
    return false;
  }
  return coverage.matchedTokenCount >= Math.max(
    2,
    Math.ceil(coverage.queryTokenCount / 2),
  );
}

/** Weighted text group used when a query should rank exact structural hits before incidental prose hits. */
export interface QueryRelevanceTextGroup {
  /** Relative importance of this text family. */
  readonly weight: number;
  /** Candidate values in this text family. */
  readonly values: readonly string[];
}

/** Score how strongly a query matches grouped text. */
export function queryRelevanceScore(
  query: string | undefined,
  groups: readonly QueryRelevanceTextGroup[],
): number {
  if (query === undefined) {
    return 0;
  }
  const normalized = query.toLowerCase().trim();
  if (normalized.length === 0) {
    return 0;
  }
  const queryTokens = normalizedSearchTokens(query);
  return groups.reduce((score, group) => {
    const values = group.values.filter((value) => value.length > 0);
    if (values.length === 0) {
      return score;
    }
    const lowerValues = values.map((value) => value.toLowerCase());
    if (lowerValues.some((value) => value === normalized)) {
      return score + group.weight * 4;
    }
    if (lowerValues.some((value) => value.includes(normalized))) {
      return score + group.weight * 3;
    }
    if (queryTokens.length === 0) {
      return score;
    }
    const valueTokens = new Set(values.flatMap(normalizedSearchTokens));
    const matchedTokenCount = queryTokens.filter((token) => valueTokens.has(token)).length;
    if (matchedTokenCount === queryTokens.length) {
      return score + group.weight * 2;
    }
    return matchedTokenCount > 0
      ? score + group.weight * (matchedTokenCount / queryTokens.length)
      : score;
  }, 0);
}

/** Match values against the inquiry's `query` filter. */
export function inquiryQueryMatches(
  inquiry: Inquiry,
  values: readonly string[],
): boolean {
  return queryMatches(inquiryStringFilter(inquiry, "query"), values);
}

function stringListFilterValues(values: readonly string[]): readonly string[] {
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

function searchTokens(value: string): readonly string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

function normalizedSearchTokens(value: string): readonly string[] {
  return [...new Set(searchTokens(value).map(normalizedSearchToken))];
}

function normalizedSearchToken(token: string): string {
  const irregular = irregularSearchToken(token);
  if (irregular !== undefined) {
    return irregular;
  }
  if (token.length > 4 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 4 && token.endsWith("sses")) {
    return token.slice(0, -2);
  }
  if (
    token.length > 4 &&
    (token.endsWith("ches") ||
      token.endsWith("shes") ||
      token.endsWith("xes") ||
      token.endsWith("zes"))
  ) {
    return token.slice(0, -2);
  }
  if (
    token.length > 3 &&
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is")
  ) {
    return token.slice(0, -1);
  }
  return token;
}

function irregularSearchToken(token: string): string | undefined {
  switch (token) {
    case "axes":
      return "axis";
    case "analyses":
      return "analysis";
    case "bases":
      return "basis";
    case "indices":
      return "index";
    case "matrices":
      return "matrix";
    default:
      return undefined;
  }
}

/** Return true when an exact scalar filter is absent or equal to the value. */
export function matchesFilterValue<TValue extends boolean | string>(
  value: TValue,
  expected: TValue | undefined,
): boolean {
  return expected === undefined || value === expected;
}

/** Return true when an exact scalar filter is absent or included in a row's value set. */
export function matchesAnyFilterValue(
  values: readonly string[],
  expected: string | undefined,
): boolean {
  return expected === undefined || values.includes(expected);
}

/** Read a finite number scalar from an inquiry's runtime filters. */
export function inquiryNumberFilter(
  inquiry: Inquiry,
  key: string,
): number | undefined {
  const value = inquiry.filters?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Read a boolean scalar from an inquiry's runtime filters. */
export function inquiryBooleanFilter(
  inquiry: Inquiry,
  key: string,
): boolean | undefined {
  const value = inquiry.filters?.[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

/** Read a boolean scalar from an inquiry's runtime filters, using an explicit default. */
export function inquiryBooleanFilterOrDefault(
  inquiry: Inquiry,
  key: string,
  defaultValue: boolean,
): boolean {
  return inquiryBooleanFilter(inquiry, key) ?? defaultValue;
}

/** Copy a non-empty string field from one raw key to one typed target key. */
export function stringField(
  source: Readonly<Record<string, unknown>>,
  sourceKey: string,
  targetKey: string = sourceKey,
): object {
  const value = source[sourceKey];
  return typeof value === "string" && value.length > 0 ? { [targetKey]: value } : {};
}

/** Translate public call-argument filter keys to TypeScript call-site filter keys. */
export function callSiteArgumentFilters(
  source: Readonly<Record<string, unknown>> | undefined,
): Record<string, string> {
  if (source === undefined) {
    return {};
  }
  return {
    ...stringField(source, "callArgumentText", "argumentText"),
    ...stringField(source, "callArgumentSymbolName", "argumentSymbolName"),
    ...stringField(
      source,
      "callArgumentFullyQualifiedName",
      "argumentFullyQualifiedName",
    ),
  };
}

/** Copy a boolean field, accepting either a boolean value or the strings "true"/"false". */
export function booleanField<TFilters extends object>(
  source: Readonly<Record<string, unknown>>,
  key: keyof TFilters,
): object {
  const value = source[key as string];
  if (typeof value === "boolean") {
    return { [key]: value };
  }
  if (value === "true") {
    return { [key]: true };
  }
  if (value === "false") {
    return { [key]: false };
  }
  return {};
}

/** Return a single filter field when a count record contains exactly one key. */
export function singletonRecordFilter(
  values: Readonly<Record<string, number>>,
  key: string,
): Record<string, string> {
  const entries = Object.keys(values);
  return entries.length === 1 ? { [key]: entries[0]! } : {};
}
