/**
 * Confidence-based severity demotion.
 *
 * Implements the L1 surface-projection demotion table (F8 §Confidence-based
 * severity adjustment). Applied after normalization, before policy overrides.
 *
 * Three evidence regimes determine behavior:
 * - grammar-deterministic: EXEMPT — always fires at full severity
 * - catalog-dependent: FULL demotion table
 * - behavioral-dependent: CAPPED at hint severity
 *
 * The demotion table (fixed, not per-rule configurable):
 *   High confidence:   Error → Error,   Warning → Warning
 *   Medium confidence: Error → Warning, Warning → Information
 *   Low confidence:    Error → Info,     Warning → Suppressed
 */

import type { DiagnosticConfidence, EvidenceRegime } from "../types.js";
import type { DiagnosticSeverity } from "../../model/diagnostics.js";
import type { NormalizedDiagnostic } from "./types.js";

export type DemotionResult = {
  readonly diagnostics: readonly NormalizedDiagnostic[];
  /** Number of diagnostics suppressed by confidence demotion. */
  readonly demotedCount: number;
  /** Number of diagnostics fully suppressed (severity reduced below threshold). */
  readonly suppressedByConfidenceCount: number;
};

/**
 * Apply confidence-based severity demotion to normalized diagnostics.
 * Returns a new array with adjusted severities and suppression markers.
 */
export function adjustSeverity(
  diagnostics: readonly NormalizedDiagnostic[],
): DemotionResult {
  let demotedCount = 0;
  let suppressedByConfidenceCount = 0;

  const result = diagnostics.map((diag): NormalizedDiagnostic => {
    // Already suppressed by status gating — don't process further
    if (diag.suppressed) return diag;

    const regime: EvidenceRegime = diag.spec.evidenceRegime ?? inferRegime(diag);
    const confidence = resolveConfidence(diag);
    const adjustment = computeAdjustment(regime, confidence, diag.severity);

    if (adjustment === "unchanged") return diag;

    if (adjustment === "suppress") {
      suppressedByConfidenceCount++;
      demotedCount++;
      return {
        ...diag,
        suppressed: true,
        suppressionReason: "confidence-demotion",
      };
    }

    // Severity was demoted
    demotedCount++;
    return { ...diag, severity: adjustment };
  });

  return { diagnostics: result, demotedCount, suppressedByConfidenceCount };
}

// ============================================================================
// Internals
// ============================================================================

type AdjustmentResult = DiagnosticSeverity | "suppress" | "unchanged";

/**
 * The fixed demotion table from L1 surface-projection / F8.
 */
function computeAdjustment(
  regime: EvidenceRegime,
  confidence: ConfidenceLevel,
  currentSeverity: DiagnosticSeverity,
): AdjustmentResult {
  // Regime 1: grammar-deterministic — exempt from demotion
  if (regime === "grammar-deterministic") return "unchanged";

  // Regime 3: behavioral-dependent — capped at hint (info)
  if (regime === "behavioral-dependent") {
    if (currentSeverity === "error" || currentSeverity === "warning") {
      return "info";
    }
    return "unchanged";
  }

  // Regime 2: catalog-dependent — full demotion table
  if (confidence === "high") return "unchanged";

  if (confidence === "medium") {
    if (currentSeverity === "error") return "warning";
    if (currentSeverity === "warning") return "info";
    return "unchanged";
  }

  // Low confidence
  if (currentSeverity === "error") return "info";
  if (currentSeverity === "warning") return "suppress";
  return "unchanged";
}

/**
 * Map DiagnosticConfidence to the 3-level model used by the demotion table.
 */
type ConfidenceLevel = "high" | "medium" | "low";

function toConfidenceLevel(confidence: DiagnosticConfidence): ConfidenceLevel {
  switch (confidence) {
    case "exact":
    case "high":
      return "high";
    case "partial":
      return "medium";
    case "low":
    case "manual":
      return "low";
  }
}

/**
 * Resolve the effective confidence for a diagnostic.
 * Per-instance data.confidence overrides spec.defaultConfidence.
 */
function resolveConfidence(diag: NormalizedDiagnostic): ConfidenceLevel {
  const instanceConfidence = diag.data?.confidence as DiagnosticConfidence | undefined;
  const specConfidence = diag.spec.defaultConfidence;
  const raw = instanceConfidence ?? specConfidence ?? "high";
  return toConfidenceLevel(raw);
}

/**
 * Infer evidence regime from diagnostic properties when not explicitly tagged.
 * This is a fallback — all canonical rules should be tagged explicitly.
 */
function inferRegime(diag: NormalizedDiagnostic): EvidenceRegime {
  // Expression parse errors and template syntax are grammar-deterministic
  if (diag.spec.defaultConfidence === "exact") return "grammar-deterministic";
  // Resource resolution and bindable validation are catalog-dependent
  if (diag.spec.category === "resource-resolution") return "catalog-dependent";
  if (diag.spec.category === "bindable-validation") return "catalog-dependent";
  // Default: treat as catalog-dependent (safer than grammar-deterministic)
  return "catalog-dependent";
}
