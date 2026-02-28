import type { CatalogGap } from "../schema/types.js";

/**
 * Result of per-resource confidence derivation.
 *
 * `level` is the policy-facing signal — consumers use it for routing decisions.
 * `reason` is the "show your work" signal — a short human-readable explanation
 * the developer can verify.
 */
export interface ResourceConfidenceResult {
  readonly level: "exact" | "high" | "partial" | "low";
  readonly reason: string;
}

/**
 * Derive per-resource confidence from gap state and provenance origin.
 *
 * This is a pure function: same gaps and origin always produce the same result.
 * It does not depend on engine state, template compilation, or workspace context.
 *
 * Classification:
 * - No gaps + builtin/config origin → exact (authoritative declaration)
 * - No gaps + source origin → high (analysis succeeded)
 * - Non-conservative gaps only → partial (analytical limits on specific patterns)
 * - Any conservative gap → low (structural failure, data unreliable)
 */
export function deriveResourceConfidence(
  gaps: readonly CatalogGap[],
  origin?: "builtin" | "config" | "source",
): ResourceConfidenceResult {
  if (gaps.length === 0) {
    if (origin === "builtin") {
      return { level: "exact", reason: "builtin resource" };
    }
    if (origin === "config") {
      return { level: "exact", reason: "declared via configuration" };
    }
    return { level: "high", reason: "source analysis completed, no gaps" };
  }

  const hasConservative = gaps.some((gap) => isConservativeGap(gap.kind));
  const uniqueKinds = [...new Set(gaps.map((gap) => gap.kind))];
  const kindSummary = uniqueKinds.join(", ");
  const gapLabel = gaps.length === 1 ? "1 gap" : `${gaps.length} gaps`;

  if (hasConservative) {
    return {
      level: "low",
      reason: `${gapLabel} including structural: ${kindSummary}`,
    };
  }

  return {
    level: "partial",
    reason: `${gapLabel}: ${kindSummary}`,
  };
}

/**
 * Classify whether a gap kind represents a structural/conservative failure.
 *
 * Conservative gaps indicate environments where analysis could not proceed
 * reliably — package structure failures, import resolution failures, format
 * and parse failures. Non-conservative gaps indicate specific patterns the
 * analyzer couldn't resolve but where surrounding analysis is trustworthy.
 */
export function isConservativeGap(kind: string): boolean {
  switch (kind) {
    // Package structure failures: analysis could not proceed reliably.
    case "package-not-found":
    case "invalid-package-json":
    case "missing-package-field":
    case "entry-point-not-found":
    case "no-entry-points":
    case "complex-exports":
    case "workspace-no-source-dir":
    case "workspace-entry-not-found":
    // Import/resolution failures.
    // falls through
    case "unresolved-import":
    case "circular-import":
    case "external-package":
    // Format/parse failures.
    // falls through
    case "unsupported-format":
    case "no-source":
    case "minified-code":
    case "parse-error":
    case "analysis-failed":
      return true;
    default:
      return false;
  }
}
