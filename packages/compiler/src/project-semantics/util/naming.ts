import { normalizePathForId, type NormalizedPath } from '../compiler.js';

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
 * Canonicalize a convention-derived VC/BB resource name.
 *
 * Applies the acronym-aware camelCase algorithm from @aurelia/kernel
 * (packages/kernel/src/functions.ts baseCase + camelCase callback).
 * This is NOT lcfirst — it handles word boundaries for acronyms:
 * `DateFormat` → `dateFormat`, `JSON` → `json`, `HTMLParser` → `htmlParser`.
 *
 * Only used for convention path (class name → stripped suffix → this function).
 * For explicit names (decorator/define/$au), use canonicalExplicitName().
 */
export function canonicalSimpleName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return aureliaKernelCamelCase(trimmed);
}

/**
 * Preserve an explicitly declared resource name verbatim.
 *
 * When a developer writes `@valueConverter('JSON')` or
 * `ValueConverter.define({ name: 'myVC' })`, the name is used as-is.
 * The runtime's Definition.create() applies no transformation.
 * The naming transform (camelCase/kebabCase) only applies to
 * convention-derived names at build time via plugin-conventions.
 */
export function canonicalExplicitName(value: string): string {
  return value.trim();
}

/**
 * Replicate @aurelia/kernel camelCase (acronym-aware word-boundary algorithm).
 *
 * Character classification: upper/lower/digit/none.
 * Word boundary: uppercase char where prevChar is lower OR nextChar is lower.
 * At boundary: char is uppercased (starts new word).
 * Not at boundary: char is lowercased.
 *
 * Source: packages/kernel/src/functions.ts lines 52-169
 */
function aureliaKernelCamelCase(input: string): string {
  const len = input.length;
  if (len === 0) return input;

  let sep = false;
  let output = '';
  let prevKind = 0; // none
  let curKind = 0;
  let nextChar = input.charAt(0);
  let nextKind = charKind(nextChar);

  for (let i = 0; i < len; i++) {
    prevKind = curKind;
    const curChar = nextChar;
    curKind = nextKind;
    nextChar = input.charAt(i + 1);
    nextKind = charKind(nextChar);

    if (curKind === 0) { // none (separator)
      if (output.length > 0) sep = true;
    } else {
      if (!sep && output.length > 0 && curKind === 2) { // upper
        // Word boundary: uppercase with a lowercase neighbor
        sep = prevKind === 3 || nextKind === 3; // lower
      }
      output += sep ? curChar.toUpperCase() : curChar.toLowerCase();
      sep = false;
    }
  }
  return output;
}

/** Classify a character: 0=none, 1=digit, 2=upper, 3=lower */
function charKind(ch: string): number {
  if (ch === '') return 0;
  if (ch !== ch.toUpperCase()) return 3; // lower
  if (ch !== ch.toLowerCase()) return 2; // upper
  if (ch >= '0' && ch <= '9') return 1; // digit
  return 0; // none (separator)
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
