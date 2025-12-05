import type { NormalizedPath } from "@aurelia-ls/domain";
import type { BindableSpec } from "./types.js";

/**
 * Metadata extracted from an HTML template.
 */
export interface TemplateMetadata {
  /** Dependencies declared via <import from="..."> */
  readonly imports: readonly TemplateImport[];

  /** Bindables declared via <bindable name="..."> */
  readonly bindables: readonly BindableSpec[];

  /** Aliases declared via <alias name="..."> */
  readonly aliases: readonly string[];

  /** Shadow DOM mode if declared */
  readonly shadowMode?: "open" | "closed";

  /** Whether containerless is declared */
  readonly containerless?: boolean;

  /** Whether capture is declared */
  readonly capture?: boolean;
}

/**
 * Import declared in template via <import from="...">
 */
export interface TemplateImport {
  readonly from: string;
  readonly as?: string;
}

/**
 * Extract metadata from an HTML template.
 *
 * Parses:
 * - <import from="./foo">
 * - <import from="./foo" as="bar">
 * - <require from="./foo">
 * - <bindable name="value" mode="two-way">
 * - <use-shadow-dom>
 * - <containerless>
 * - <alias name="foo">
 * - <capture>
 *
 * See docs/aurelia-conventions.md for the full specification.
 */
export function extractTemplateMetadata(_templatePath: NormalizedPath): TemplateMetadata | null {
  // TODO: Implement HTML parsing for template metadata
  //
  // This requires:
  // 1. Reading the HTML file
  // 2. Parsing to find special elements: import, require, bindable, use-shadow-dom, etc.
  // 3. Extracting their attributes
  //
  // Options for parsing:
  // - Use a simple regex-based approach for these specific tags
  // - Use a proper HTML parser (adds dependency)
  // - Leverage the domain compiler's HTML parsing (if available)

  return null;
}

/**
 * Find the paired HTML template for a TypeScript file.
 * my-element.ts → my-element.html
 */
export function findPairedTemplate(_tsPath: NormalizedPath): NormalizedPath | null {
  // TODO: Implement file pairing logic
  //
  // 1. Replace .ts/.tsx/.js/.jsx extension with .html
  // 2. Check if that file exists
  // 3. Return the path if found

  return null;
}
