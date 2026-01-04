/**
 * Conversion Functions for Resolution Diagnostics
 *
 * Converts internal data structures (OrphanResource, UnresolvedRegistration)
 * to user-facing ResolutionDiagnostic instances with actionable messages.
 */

import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { OrphanResource, UnresolvedRegistration, UnresolvedPattern } from "../registration/types.js";
import type { ResolutionDiagnostic } from "../resolve.js";
import { getOrphanCode, getUnanalyzableCode } from "./codes.js";

// =============================================================================
// Orphan Conversion
// =============================================================================

/**
 * Patterns for external packages that should be excluded from orphan warnings.
 * Users don't control these resources and can't fix orphan warnings for them.
 */
const EXTERNAL_PACKAGE_PATTERNS = [
  "/node_modules/",
  "/@aurelia/",
  "/aurelia/packages/",
] as const;

/**
 * Check if a resource is from an external package (should be excluded from orphan warnings).
 */
function isExternalPackage(source: NormalizedPath): boolean {
  return EXTERNAL_PACKAGE_PATTERNS.some(pattern => source.includes(pattern));
}

/**
 * Convert orphan resources to diagnostics.
 *
 * Orphans are resources that are declared (have @customElement, etc.) but
 * never registered via Aurelia.register(), dependencies arrays, or plugins.
 *
 * This is often a bug (forgot to register) or intentional dead code.
 *
 * **Note**: Orphans from external packages (@aurelia/*, node_modules) are filtered
 * out as users don't control those resources.
 */
export function orphansToDiagnostics(orphans: readonly OrphanResource[]): ResolutionDiagnostic[] {
  return orphans
    .filter(o => !isExternalPackage(o.resource.source))
    .map(orphanToDiagnostic);
}

function orphanToDiagnostic(orphan: OrphanResource): ResolutionDiagnostic {
  const { resource } = orphan;
  const kindLabel = getKindLabel(resource.kind);

  return {
    code: getOrphanCode(resource.kind),
    message: `${kindLabel} '${resource.name}' (class ${resource.className}) is defined but never registered. ` +
      `Add it to Aurelia.register() or a component's dependencies array.`,
    source: resource.source,
    severity: "warning",
  };
}

/**
 * Get a human-readable label for a resource kind.
 */
function getKindLabel(kind: "element" | "attribute" | "valueConverter" | "bindingBehavior"): string {
  switch (kind) {
    case "element": return "Custom element";
    case "attribute": return "Custom attribute";
    case "valueConverter": return "Value converter";
    case "bindingBehavior": return "Binding behavior";
  }
}

// =============================================================================
// Unresolved Pattern Conversion
// =============================================================================

/**
 * Convert unresolved registration patterns to diagnostics.
 *
 * These are registration patterns that can't be statically analyzed,
 * such as function calls, variable references, and conditionals.
 *
 * These are informational — not errors, just limitations of static analysis.
 *
 * **Note**: Unresolved patterns from external packages (@aurelia/*, node_modules)
 * are filtered out as users don't control those registrations.
 */
export function unresolvedToDiagnostics(unresolved: readonly UnresolvedRegistration[]): ResolutionDiagnostic[] {
  return unresolved
    .filter(u => !isExternalPackage(u.file))
    .map(unresolvedToDiagnostic);
}

function unresolvedToDiagnostic(registration: UnresolvedRegistration): ResolutionDiagnostic {
  const { pattern, file, reason } = registration;

  return {
    code: getUnanalyzableCode(pattern.kind),
    message: formatUnresolvedMessage(pattern, reason),
    source: file,
    severity: "info",
  };
}

/**
 * Format a user-friendly message for an unresolved pattern.
 */
function formatUnresolvedMessage(pattern: UnresolvedPattern, reason: string): string {
  const suggestion = getPatternSuggestion(pattern);
  return suggestion ? `${reason} ${suggestion}` : reason;
}

/**
 * Get a suggestion for how to make a pattern analyzable.
 */
function getPatternSuggestion(pattern: UnresolvedPattern): string | null {
  switch (pattern.kind) {
    case "function-call":
      return `Consider using direct identifiers instead of '${pattern.functionName}()'.`;

    case "variable-reference":
      return `Consider inlining the array contents instead of using variable '${pattern.variableName}'.`;

    case "conditional":
      return "Consider using separate registration calls instead of conditional expressions.";

    case "spread-variable":
      return `Consider using a namespace import (import * as X) instead of spreading variable '${pattern.variableName}'.`;

    case "property-access":
      return "Consider importing the resource directly.";

    case "other":
      return null;
  }
}

// =============================================================================
// Unresolved ResourceRef Conversion (from RegistrationSite)
// =============================================================================

/**
 * Information about an unresolved resource reference.
 * Used to generate diagnostics for RegistrationSites with unresolved resourceRefs.
 */
export interface UnresolvedResourceInfo {
  readonly name: string;
  readonly reason: string;
  readonly file: NormalizedPath;
}

/**
 * Convert unresolved resource references to diagnostics.
 *
 * These are identifiers in registration patterns that we could parse
 * but couldn't resolve to known resources.
 *
 * **Note**: Unresolved refs from external packages (@aurelia/*, node_modules)
 * are filtered out as users don't control those registrations.
 */
export function unresolvedRefsToDiagnostics(refs: readonly UnresolvedResourceInfo[]): ResolutionDiagnostic[] {
  return refs
    .filter(r => !isExternalPackage(r.file))
    .map(refToDiagnostic);
}

function refToDiagnostic(ref: UnresolvedResourceInfo): ResolutionDiagnostic {
  return {
    code: "RES0021", // NOT_A_RESOURCE
    message: ref.reason,
    source: ref.file,
    severity: "warning",
  };
}
