/**
 * Plugin-Aware Hint Helpers
 *
 * Provides utilities for generating better error messages when resources
 * are not found but would be available if a plugin were registered.
 *
 * Example: "Unknown element 'au-viewport'. Requires @aurelia/router — register RouterConfiguration."
 */

import type { Semantics, ElementRes, AttrRes } from "@aurelia-ls/compiler";
import { DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
import { getManifestByPackage } from "../plugins/manifests.js";
import type { PluginManifest } from "../plugins/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Information about a plugin that provides a resource.
 */
export interface PluginHint {
  /** The package that provides the resource (e.g., "@aurelia/router") */
  readonly package: string;
  /** The manifest for the plugin (if known), for additional context */
  readonly manifest?: PluginManifest;
  /** Suggested plugin class to register (e.g., "RouterConfiguration") */
  readonly suggestedRegistration?: string;
}

/**
 * Result of looking up a resource for plugin hints.
 */
export type PluginHintResult =
  | { readonly found: true; readonly hint: PluginHint }
  | { readonly found: false };

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Look up an element in shadow semantics to see if it's from a plugin.
 *
 * Use this when an element is not found in the active resource graph
 * to generate a helpful error message.
 *
 * @param elementName - Kebab-case element name (e.g., "au-viewport")
 * @param semantics - Optional semantics to search (defaults to DEFAULT_SEMANTICS)
 * @returns Plugin hint if the element is from a known plugin package
 *
 * @example
 * ```typescript
 * const hint = lookupElementPluginHint("au-viewport");
 * if (hint.found) {
 *   // "au-viewport requires @aurelia/router. Register RouterConfiguration."
 *   const message = `${elementName} requires ${hint.hint.package}. ` +
 *     `Register ${hint.hint.suggestedRegistration}.`;
 * }
 * ```
 */
export function lookupElementPluginHint(
  elementName: string,
  semantics: Semantics = DEFAULT_SEMANTICS,
): PluginHintResult {
  const element = semantics.resources.elements[elementName];
  return resourceToHint(element);
}

/**
 * Look up an attribute in shadow semantics to see if it's from a plugin.
 *
 * Use this when an attribute is not found in the active resource graph
 * to generate a helpful error message.
 *
 * @param attrName - Kebab-case attribute name (e.g., "load", "href")
 * @param semantics - Optional semantics to search (defaults to DEFAULT_SEMANTICS)
 * @returns Plugin hint if the attribute is from a known plugin package
 */
export function lookupAttributePluginHint(
  attrName: string,
  semantics: Semantics = DEFAULT_SEMANTICS,
): PluginHintResult {
  const attr = semantics.resources.attributes[attrName];
  return resourceToHint(attr);
}

/**
 * Format a plugin hint as a user-friendly suggestion message.
 *
 * @param hint - The plugin hint from a lookup
 * @returns Human-readable suggestion (e.g., "Requires @aurelia/router. Register RouterConfiguration.")
 */
export function formatPluginHintMessage(hint: PluginHint): string {
  const parts = [`Requires ${hint.package}.`];

  if (hint.suggestedRegistration) {
    parts.push(`Register ${hint.suggestedRegistration}.`);
  }

  return parts.join(" ");
}

// =============================================================================
// Internal Helpers
// =============================================================================

function resourceToHint(resource: ElementRes | AttrRes | undefined): PluginHintResult {
  if (!resource?.package) {
    return { found: false };
  }

  const manifest = getManifestByPackage(resource.package);
  const hint: PluginHint = {
    package: resource.package,
    manifest: manifest ?? undefined,
    suggestedRegistration: manifest?.exportName,
  };

  return { found: true, hint };
}
