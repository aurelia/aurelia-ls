import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/domain";

/**
 * Convert a string to kebab-case.
 * "MyCustomElement" → "my-custom-element"
 */
export function toKebabCase(value: string): string {
  const normalized = value.replace(/[\s_]+/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  return normalized.replace(/-+/g, "-").toLowerCase();
}

/**
 * Convert a string to camelCase.
 * "my-custom-element" → "myCustomElement"
 */
export function toCamelCase(value: string): string {
  return value.replace(/-([a-zA-Z0-9])/g, (_match, captured: string) => captured.toUpperCase());
}

/**
 * Canonicalize an element name (kebab-case).
 */
export function canonicalElementName(value: string): string {
  return toKebabCase(value);
}

/**
 * Canonicalize an attribute name (kebab-case).
 */
export function canonicalAttrName(value: string): string {
  return toKebabCase(value);
}

/**
 * Canonicalize a simple resource name (lowercase, for value converters/behaviors).
 */
export function canonicalSimpleName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Canonicalize a bindable property name (camelCase).
 * Returns null if the value is empty after trimming.
 */
export function canonicalBindableName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/-([a-zA-Z0-9])/g, (_match: string, captured: string) => captured.toUpperCase());
}

/**
 * Canonicalize an array of alias names.
 * Converts to kebab-case, removes duplicates, sorts.
 */
export function canonicalAliases(values: readonly string[]): string[] {
  const canonical = values.map((v) => toKebabCase(v)).filter(Boolean);
  const unique = Array.from(new Set(canonical));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

/**
 * Canonicalize a file path to a NormalizedPath.
 * Delegates to domain's normalizePathForId for consistent path handling.
 */
export function canonicalPath(fileName: string): NormalizedPath {
  return normalizePathForId(fileName);
}
