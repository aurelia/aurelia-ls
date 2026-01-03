import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/compiler";

/**
 * Convert a string to kebab-case.
 * "MyCustomElement" → "my-custom-element"
 * "XMLParser" → "xml-parser"
 */
export function toKebabCase(value: string): string {
  return value
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Insert hyphen between lowercase and uppercase: "myApp" → "my-App"
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    // Insert hyphen between consecutive capitals and the start of a word: "XMLParser" → "XML-Parser"
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    .toLowerCase();
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
 * Delegates to compiler's normalizePathForId for consistent path handling.
 */
export function canonicalPath(fileName: string): NormalizedPath {
  return normalizePathForId(fileName);
}

/**
 * Extract the base name from a file path (without extension).
 *
 * Examples:
 * - "/src/my-app.ts" → "my-app"
 * - "/src/MyApp.ts" → "MyApp"
 * - "cortex-devices.html" → "cortex-devices"
 * - "/foo/bar/index.ts" → "index"
 */
export function getBaseName(filePath: string): string {
  // Get the file name part (after last / or \)
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;

  // Remove extension
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

/**
 * Check if two names are "kind of same" (match ignoring hyphens).
 * Used for convention matching where class name may differ in casing from file name.
 *
 * Examples:
 * - isKindOfSame("cortex-devices", "CortexDevices") → true
 * - isKindOfSame("my-app", "MyApp") → true
 * - isKindOfSame("foo", "bar") → false
 */
export function isKindOfSame(name1: string, name2: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/-/g, "");
  return normalize(name1) === normalize(name2);
}
