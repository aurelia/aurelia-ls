import type { Inquiry } from "../inquiry.js";
import { LocusKind } from "../locus.js";

/** Merge subject-level and filter-level records through one domain-specific parser. */
export function readInquiryFilters<TFilters>(
  inquiry: Inquiry,
  filtersFromRecord: (value: unknown) => TFilters,
): TFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  } as TFilters;
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
  return values.some((value) => value.toLowerCase().includes(normalized));
}

/** Match values against the inquiry's `query` filter. */
export function inquiryQueryMatches(
  inquiry: Inquiry,
  values: readonly string[],
): boolean {
  return queryMatches(inquiryStringFilter(inquiry, "query"), values);
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
