import type { SourceFacts } from "../extraction/types.js";
import type { ResolverResult } from "./types.js";
import type { ConventionConfig } from "../conventions/types.js";

/**
 * Resolve resource candidates from file/class naming conventions.
 * This is the lowest-priority resolver.
 *
 * Handles patterns like:
 * - MyCustomElement → custom element "my"
 * - DateFormatValueConverter → value converter "dateFormat"
 * - DebounceBindingBehavior → binding behavior "debounce"
 * - my-element.ts → custom element "my-element"
 *
 * See docs/aurelia-conventions.md for the full specification.
 */
export function resolveFromConventions(
  _facts: SourceFacts,
  _config?: ConventionConfig,
): ResolverResult {
  // TODO: Implement convention-based resolution
  //
  // Algorithm:
  // 1. For each class without decorators or static $au:
  //    a. Check class name suffix (CustomElement, ValueConverter, etc.)
  //    b. Check file name pattern (*.element.ts, etc.)
  //    c. Check if file has paired .html template
  // 2. Apply name transforms based on type
  // 3. Return inferred candidates with confidence: "inferred"
  //
  // Reference: docs/aurelia-conventions.md

  return { candidates: [], diagnostics: [] };
}
