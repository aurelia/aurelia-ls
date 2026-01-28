import type {
  DiagnosticOverride,
  DiagnosticsPolicyConfig,
  NormalizedDiagnostic,
  PolicyContext,
  RawDiagnostic,
  ResolvedDiagnostic,
} from "./types.js";
import type { CatalogConfidence } from "../types.js";

export function resolvePolicy(
  diagnostics: readonly NormalizedDiagnostic[],
  policy: DiagnosticsPolicyConfig | undefined,
  context: PolicyContext,
): ResolvedDiagnostic[] {
  if (!policy) return diagnostics.map((diag) => ({ ...diag }));
  return diagnostics.map((diag) => applyPolicy(diag, policy, context));
}

export function buildPolicyDiagnostics(
  diagnostics: readonly NormalizedDiagnostic[],
  policy: DiagnosticsPolicyConfig | undefined,
  context: PolicyContext,
): RawDiagnostic[] {
  if (!policy) return [];
  const entries: RawDiagnostic[] = [];
  const existing = new Set(diagnostics.map((diag) => diag.code));
  const gapCount = context.gapCount ?? 0;

  if (policy.gapSummary && policy.gapSummary.enabled !== false) {
    if (gapCount > 0 && !existing.has("aurelia/policy/gaps")) {
      entries.push({
        code: "aurelia/policy/gaps",
        message: `Policy: ${gapCount} catalog gap(s) reported.`,
        source: "project",
        data: { gapCount },
      });
    }
  }

  if (policy.confidence && !existing.has("aurelia/policy/confidence")) {
    const actual = normalizeConfidence(context.catalogConfidence, gapCount);
    if (isConfidenceBelow(actual, policy.confidence.min)) {
      entries.push({
        code: "aurelia/policy/confidence",
        message: `Policy: catalog confidence '${actual}' below '${policy.confidence.min}'.`,
        source: "project",
        data: { min: policy.confidence.min, actual },
      });
    }
  }

  return entries;
}

function applyPolicy(
  diagnostic: NormalizedDiagnostic,
  policy: DiagnosticsPolicyConfig,
  context: PolicyContext,
): ResolvedDiagnostic {
  const overrides: DiagnosticOverride[] = [];
  if (policy.defaults) overrides.push(policy.defaults);
  const category = diagnostic.spec.category;
  const categoryOverride = policy.categories?.[category];
  if (categoryOverride) overrides.push(categoryOverride);
  const codeOverride = policy.codes?.[diagnostic.code];
  if (codeOverride) overrides.push(codeOverride);
  if (context.surface) {
    const surfaceOverride = policy.surfaces?.[context.surface];
    if (surfaceOverride) overrides.push(surfaceOverride);
  }
  if (context.mode) {
    const modeOverride = policy.modes?.[context.mode];
    if (modeOverride) overrides.push(modeOverride);
  }

  let next: ResolvedDiagnostic = { ...diagnostic };
  for (const override of overrides) {
    if (!override) continue;
    next = applyOverride(next, override, policy);
  }
  return next;
}

function applyOverride(
  diagnostic: ResolvedDiagnostic,
  override: DiagnosticOverride,
  policy: DiagnosticsPolicyConfig,
): ResolvedDiagnostic {
  if (override.severity === "off") {
    if (diagnostic.impact === "blocking" && !policy.allowSuppressBlocking) {
      return diagnostic;
    }
    return { ...diagnostic, suppressed: true, suppressionReason: "policy" };
  }

  return {
    ...diagnostic,
    ...(override.severity ? { severity: override.severity } : {}),
    ...(override.impact ? { impact: override.impact } : {}),
    ...(override.actionability ? { actionability: override.actionability } : {}),
  };
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

const CONFIDENCE_ORDER: Record<CatalogConfidence, number> = {
  conservative: 0,
  partial: 1,
  high: 2,
  complete: 3,
};
