/**
 * Conversion Functions for Resolution Diagnostics
 *
 * Converts internal data structures (OrphanResource, UnresolvedRegistration)
 * to user-facing ProjectSemanticsDiscoveryDiagnostic instances with actionable messages.
 */

import type { CompilerDiagnostic, DocumentUri, NormalizedPath, RawDiagnostic, SourceSpan } from '../compiler.js';
import {
  asDocumentUri,
  diagnosticsByCategory,
  diagnosticsByCategoryFuture,
  type DiagnosticsCatalog,
} from '../compiler.js';
import type { OrphanResource, UnresolvedRegistration, UnresolvedPattern } from "../register/types.js";
import type { ProjectSemanticsDiscoveryDiagnostic, ProjectSemanticsDiscoveryDiagnosticEmitter } from "../resolve.js";
import { unwrapSourced } from "../assemble/sourced.js";

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
export function orphansToDiagnostics(
  orphans: readonly OrphanResource[],
  emitter: ProjectSemanticsDiscoveryDiagnosticEmitter,
): ProjectSemanticsDiscoveryDiagnostic[] {
  return orphans
    .filter(o => !o.resource.file || !isExternalPackage(o.resource.file))
    .map((orphan) => orphanToDiagnostic(orphan, emitter));
}

function orphanToDiagnostic(orphan: OrphanResource, emitter: ProjectSemanticsDiscoveryDiagnosticEmitter): ProjectSemanticsDiscoveryDiagnostic {
  const { resource } = orphan;
  const kindLabel = getKindLabel(resource.kind);
  const name = unwrapSourced(resource.name) ?? "<unknown>";
  const className = unwrapSourced(resource.className) ?? "<unknown>";
  const code = getOrphanDiagnosticCode(resource.kind);
  const uri = toUri(resource.file ?? orphan.definitionSpan.file);

  const diag = toRawDiagnostic(emitter.emit(code, {
    message: `${kindLabel} '${name}' (class ${className}) is defined but never registered. ` +
      `Add it to Aurelia.register() or a component's dependencies array.`,
    span: orphan.definitionSpan,
    severity: "warning",
    data: {
      resourceKind: resource.kind,
      ...(resource.file ? { file: resource.file } : {}),
      ...(name !== "<unknown>" ? { name } : {}),
    },
  }));
  return withUri(diag, uri);
}

/**
 * Get a human-readable label for a resource kind.
 */
function getKindLabel(kind: "custom-element" | "custom-attribute" | "template-controller" | "value-converter" | "binding-behavior"): string {
  switch (kind) {
    case "custom-element": return "Custom element";
    case "custom-attribute": return "Custom attribute";
    case "template-controller": return "Template controller";
    case "value-converter": return "Value converter";
    case "binding-behavior": return "Binding behavior";
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
export function unresolvedToDiagnostics(
  unresolved: readonly UnresolvedRegistration[],
  emitter: ProjectSemanticsDiscoveryDiagnosticEmitter,
): ProjectSemanticsDiscoveryDiagnostic[] {
  return unresolved
    .filter(u => !isExternalPackage(u.file))
    .map((entry) => unresolvedToDiagnostic(entry, emitter));
}

function unresolvedToDiagnostic(
  registration: UnresolvedRegistration,
  emitter: ProjectSemanticsDiscoveryDiagnosticEmitter,
): ProjectSemanticsDiscoveryDiagnostic {
  const { pattern, file, reason } = registration;
  const code = getUnanalyzableDiagnosticCode(pattern.kind);
  const uri = toUri(file);

  const diag = toRawDiagnostic(emitter.emit(code, {
    message: formatUnresolvedMessage(pattern, reason),
    span: registration.span,
    severity: "info",
    data: {
      patternKind: pattern.kind,
      ...(patternDetail(pattern) ? { detail: patternDetail(pattern)! } : {}),
    },
  }));
  return withUri(diag, uri);
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
  readonly span: SourceSpan;
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
export function unresolvedRefsToDiagnostics(
  refs: readonly UnresolvedResourceInfo[],
  emitter: ProjectSemanticsDiscoveryDiagnosticEmitter,
): ProjectSemanticsDiscoveryDiagnostic[] {
  return refs
    .filter(r => !isExternalPackage(r.file))
    .map((entry) => refToDiagnostic(entry, emitter));
}

function refToDiagnostic(ref: UnresolvedResourceInfo, emitter: ProjectSemanticsDiscoveryDiagnosticEmitter): ProjectSemanticsDiscoveryDiagnostic {
  const uri = toUri(ref.file);
  const diag = toRawDiagnostic(emitter.emit("aurelia/project/not-a-resource", {
    message: ref.reason,
    span: ref.span,
    severity: "warning",
    data: {
      name: ref.name,
      reason: ref.reason,
    },
  }));
  return withUri(diag, uri);
}

const PROJECT_CATALOG = {
  ...diagnosticsByCategoryFuture.project,
  ...diagnosticsByCategory.gaps,
  ...diagnosticsByCategory.policy,
} as const satisfies DiagnosticsCatalog;

type ProjectCode = keyof typeof PROJECT_CATALOG & string;

function withUri(diag: RawDiagnostic, uri?: DocumentUri): ProjectSemanticsDiscoveryDiagnostic {
  return uri ? { ...diag, uri } : diag;
}

function toRawDiagnostic(diag: CompilerDiagnostic): RawDiagnostic {
  const { span, ...rest } = diag;
  return span ? { ...rest, span } : { ...rest };
}

function toUri(file: NormalizedPath | SourceSpan["file"] | undefined): DocumentUri | undefined {
  if (!file) return undefined;
  return asDocumentUri(String(file));
}

function getOrphanDiagnosticCode(kind: OrphanResource["resource"]["kind"]): ProjectCode {
  switch (kind) {
    case "custom-element":
      return "aurelia/project/orphan-element";
    case "custom-attribute":
    case "template-controller":
      return "aurelia/project/orphan-attribute";
    case "value-converter":
      return "aurelia/project/orphan-value-converter";
    case "binding-behavior":
      return "aurelia/project/orphan-binding-behavior";
  }
}

function getUnanalyzableDiagnosticCode(kind: UnresolvedPattern["kind"]): ProjectCode {
  switch (kind) {
    case "function-call":
      return "aurelia/project/unanalyzable-function-call";
    case "variable-reference":
      return "aurelia/project/unanalyzable-variable";
    case "conditional":
      return "aurelia/project/unanalyzable-conditional";
    case "spread-variable":
      return "aurelia/project/unanalyzable-spread";
    case "property-access":
      return "aurelia/project/unanalyzable-property-access";
    case "other":
      return "aurelia/project/unanalyzable-other";
  }
}

function patternDetail(pattern: UnresolvedPattern): string | null {
  switch (pattern.kind) {
    case "function-call":
      return pattern.functionName;
    case "variable-reference":
      return pattern.variableName;
    case "spread-variable":
      return pattern.variableName;
    case "property-access":
      return pattern.expression;
    case "other":
      return pattern.description;
    default:
      return null;
  }
}
