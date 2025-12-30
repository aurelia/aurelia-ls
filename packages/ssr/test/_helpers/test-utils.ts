/**
 * Shared test utilities for SSR package tests.
 *
 * Consolidates common helpers used across multiple test files to avoid duplication
 * and ensure consistency.
 */

import { JSDOM } from "jsdom";
import { BrowserPlatform } from "@aurelia/platform-browser";

// =============================================================================
// Component Creation
// =============================================================================

/**
 * Creates a component class with the specified state and template.
 * This is the standard pattern for creating test components - they define
 * their own state naturally via class properties.
 */
export function createComponent(name: string, template: string, state: Record<string, unknown> = {}) {
  const ComponentClass = class {
    constructor() {
      Object.assign(this, state);
    }
  } as any;
  ComponentClass.$au = {
    type: "custom-element",
    name,
    template,
  };
  return ComponentClass;
}

// =============================================================================
// String/HTML Helpers
// =============================================================================

/**
 * Count occurrences of a substring in a string.
 * Useful for verifying element counts in HTML output.
 */
export function countOccurrences(str: string, substr: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }
  return count;
}

// =============================================================================
// DOM Query Helpers
// =============================================================================

/**
 * Count elements matching a selector in a host element.
 */
export function countElements(host: Element, selector: string): number {
  return host.querySelectorAll(selector).length;
}

/**
 * Get text content of first element matching selector.
 */
export function getText(host: Element, selector: string): string {
  return host.querySelector(selector)?.textContent ?? "";
}

/**
 * Get array of text content from all elements matching selector.
 */
export function getTexts(host: Element, selector: string): string[] {
  return Array.from(host.querySelectorAll(selector)).map(
    (el) => el.textContent?.trim() ?? ""
  );
}

// =============================================================================
// Hydration Context
// =============================================================================

export interface HydrationContextOptions {
  /** The host element tag/selector. Default: 'div id="app"' */
  hostElement?: string;
  /** Page title. Default: 'Hydration Test' */
  title?: string;
  /** SSR definition to embed in script tag */
  ssrDef?: object;
}

export interface HydrationContext {
  dom: JSDOM;
  window: Window & typeof globalThis;
  document: Document;
  platform: BrowserPlatform;
}

/**
 * Creates a JSDOM environment with SSR HTML pre-loaded.
 * This simulates a browser receiving server-rendered HTML.
 */
export function createHydrationContext(
  ssrHtml: string,
  ssrState: object,
  ssrManifest: object,
  options: HydrationContextOptions = {}
): HydrationContext {
  const {
    hostElement = 'div id="app"',
    title = "Hydration Test",
    ssrDef,
  } = options;

  // Parse host element to get opening and closing tags
  // Use [\w-]+ to match custom element names with hyphens (e.g., "my-app")
  const hostMatch = hostElement.match(/^([\w-]+)(.*)$/);
  const tagName = hostMatch?.[1] ?? "div";
  const attrs = hostMatch?.[2] ?? "";
  const openTag = `<${tagName}${attrs ? " " + attrs.trim() : ""}>`;
  const closeTag = `</${tagName}>`;

  // Build script content
  const scriptContent = [
    `window.__SSR_STATE__ = ${JSON.stringify(ssrState)};`,
    `window.__AU_MANIFEST__ = ${JSON.stringify(ssrManifest)};`,
    ssrDef ? `window.__AU_DEF__ = ${JSON.stringify(ssrDef)};` : "",
  ].filter(Boolean).join("\n    ");

  const html = `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
  ${openTag}${ssrHtml}${closeTag}
  <script>
    ${scriptContent}
  </script>
</body>
</html>`;

  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "dangerously",
  });

  const window = dom.window as unknown as Window & typeof globalThis;
  const document = window.document;
  const platform = new BrowserPlatform(window as any);

  return { dom, window, document, platform };
}

// =============================================================================
// Double Render Detection
// =============================================================================

export interface DoubleRenderResult {
  total: number;
  texts: string[];
  textCounts: Record<string, number>;
  hasDuplicates: boolean;
  duplicates: string[];
}

/**
 * Check for double rendering by searching the ENTIRE document body.
 * Returns detailed information about duplicates found.
 */
export function checkForDoubleRender(
  document: Document,
  selector: string,
  expectedTexts: string[]
): DoubleRenderResult {
  // Query the entire document body, not just a container
  const allElements = document.body.querySelectorAll(selector);
  const texts = Array.from(allElements).map(el => el.textContent?.trim() ?? "");

  // Check if any text appears more than once
  const textCounts: Record<string, number> = {};
  for (const text of texts) {
    textCounts[text] = (textCounts[text] || 0) + 1;
  }

  const duplicates = Object.entries(textCounts)
    .filter(([_, count]) => count > 1)
    .map(([text, count]) => `"${text}" appears ${count} times`);

  return {
    total: allElements.length,
    texts,
    textCounts,
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}
