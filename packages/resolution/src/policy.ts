/**
 * Experimental Policy — Gap/Confidence Diagnostic Control
 *
 * This module provides opt-in diagnostic behavior for gap/confidence reporting.
 * When enabled via entrypoint policy configuration (e.g. Vite options or the
 * integration harness), it:
 *
 * 1. **Gap severity promotion**: Promotes `gap:*` diagnostics to a configured
 *    severity and emits a `policy:gaps` summary diagnostic.
 *
 * 2. **Confidence threshold enforcement**: Emits a `policy:confidence` diagnostic
 *    when catalog confidence falls below a configured minimum.
 *
 * **Behavior is diagnostic-only** — resources are never skipped or excluded.
 * This is intentional for the experimental phase; skip/degrade semantics may
 * be added later if needed.
 *
 * **Not to be confused with `thirdParty.policy`** (type: `ThirdPartyPolicy`),
 * which controls merge strategy for third-party resources (root-scope vs
 * rebuild-graph vs semantics). That is a separate concern.
 *
 * @example
 * ```ts
 * aurelia({
 *   policy: {
 *     gaps: "error",                    // Promote gap diagnostics to errors
 *     confidence: { min: "high" },      // Warn if confidence < high
 *   },
 * })
 * ```
 *
 * @experimental
 * @module
 */

import type { CatalogConfidence, CatalogGap } from "@aurelia-ls/compiler";
import type { ResolutionDiagnostic, ResolutionResult } from "./resolve.js";

export type PolicySeverity = ResolutionDiagnostic["severity"];

export interface ExperimentalPolicy {
  /**
   * Promote gap diagnostics to this severity and emit a policy summary.
   * Omit to leave gap diagnostics untouched.
   */
  gaps?: PolicySeverity;
  /**
   * Enforce a minimum catalog confidence level.
   * When actual confidence is below the threshold, emit a policy diagnostic.
   */
  confidence?: {
    min: CatalogConfidence;
    severity?: PolicySeverity;
  };
}

export function applyResolutionPolicy(
  result: ResolutionResult,
  policy?: ExperimentalPolicy,
): ResolutionResult {
  if (!policy) return result;

  const gapCount = result.catalog.gaps?.length ?? 0;
  const diagnostics = applyPolicyDiagnostics(result.diagnostics, result.catalog, policy, gapCount);

  if (diagnostics === result.diagnostics) {
    return result;
  }
  return { ...result, diagnostics };
}

function applyPolicyDiagnostics(
  diagnostics: readonly ResolutionDiagnostic[],
  catalog: { gaps?: readonly CatalogGap[]; confidence?: CatalogConfidence },
  policy: ExperimentalPolicy,
  gapCount: number,
): readonly ResolutionDiagnostic[] {
  let next = diagnostics;
  let mutated = false;

  if (policy.gaps) {
    const promoted = diagnostics.map((diag) => {
      if (!diag.code.startsWith("gap:")) return diag;
      const severity = promoteSeverity(diag.severity, policy.gaps!);
      if (severity === diag.severity) return diag;
      mutated = true;
      return { ...diag, severity };
    });
    next = promoted;

    if (gapCount > 0 && !next.some((d) => d.code === "policy:gaps")) {
      mutated = true;
      next = [
        ...next,
        {
          code: "policy:gaps",
          message: `Policy: ${gapCount} catalog gap(s) reported.`,
          severity: policy.gaps,
        },
      ];
    }
  }

  if (policy.confidence) {
    const actual = normalizeConfidence(catalog.confidence, gapCount);
    if (isConfidenceBelow(actual, policy.confidence.min)) {
      const severity = policy.confidence.severity ?? policy.gaps ?? "warning";
      if (!next.some((d) => d.code === "policy:confidence")) {
        mutated = true;
        next = [
          ...next,
          {
            code: "policy:confidence",
            message: `Policy: catalog confidence '${actual}' below '${policy.confidence.min}'.`,
            severity,
          },
        ];
      }
    }
  }

  return mutated ? next : diagnostics;
}

function promoteSeverity(
  current: PolicySeverity,
  target: PolicySeverity,
): PolicySeverity {
  if (SEVERITY_ORDER[target] > SEVERITY_ORDER[current]) {
    return target;
  }
  return current;
}

function normalizeConfidence(
  value: CatalogConfidence | undefined,
  gapCount: number,
): CatalogConfidence {
  if (value) return value;
  return gapCount > 0 ? "partial" : "complete";
}

function isConfidenceBelow(
  actual: CatalogConfidence,
  min: CatalogConfidence,
): boolean {
  return CONFIDENCE_ORDER[actual] < CONFIDENCE_ORDER[min];
}

const SEVERITY_ORDER: Record<PolicySeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

const CONFIDENCE_ORDER: Record<CatalogConfidence, number> = {
  conservative: 0,
  partial: 1,
  high: 2,
  complete: 3,
};
