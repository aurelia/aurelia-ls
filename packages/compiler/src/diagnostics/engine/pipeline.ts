import type { DiagnosticDataRecord, DiagnosticSpec, DiagnosticsCatalog } from "../types.js";
import type {
  AggregationContext,
  DiagnosticsPolicyConfig,
  DiagnosticCodeResolver,
  PolicyContext,
  RawDiagnostic,
  RoutingContext,
} from "./types.js";
import type { SurfaceFormatterMap, FormattedDiagnostics } from "./format.js";
import { normalizeDiagnostics } from "./normalize.js";
import { adjustSeverity, type DemotionResult } from "./demotion.js";
import { buildPolicyDiagnostics, resolvePolicy } from "./policy.js";
import { routeDiagnostics } from "./route.js";
import { aggregateDiagnostics } from "./aggregate.js";
import { formatDiagnostics } from "./format.js";

export type DiagnosticsPipelineOptions = {
  readonly catalog: DiagnosticsCatalog;
  readonly resolver: DiagnosticCodeResolver;
  readonly externalSpecsBySource?: Readonly<Record<string, DiagnosticSpec<DiagnosticDataRecord>>>;
  readonly policy?: DiagnosticsPolicyConfig;
  readonly policyContext?: PolicyContext;
  readonly routingContext?: RoutingContext;
  readonly aggregationContext?: AggregationContext;
  readonly formatters?: SurfaceFormatterMap;
};

export type DiagnosticsPipelineResult = {
  readonly normalization: ReturnType<typeof normalizeDiagnostics>;
  readonly demotion: DemotionResult;
  readonly resolved: ReturnType<typeof resolvePolicy>;
  readonly routed: ReturnType<typeof routeDiagnostics>;
  readonly aggregated: ReturnType<typeof aggregateDiagnostics>;
  readonly formatted?: FormattedDiagnostics;
};

export function runDiagnosticsPipeline(
  raw: readonly RawDiagnostic[],
  options: DiagnosticsPipelineOptions,
): DiagnosticsPipelineResult {
  let normalization = normalizeDiagnostics(raw, options.catalog, {
    resolver: options.resolver,
    externalSpecsBySource: options.externalSpecsBySource,
  });
  const policyDiagnostics = buildPolicyDiagnostics(
    normalization.diagnostics,
    options.policy,
    options.policyContext ?? {},
  );
  if (policyDiagnostics.length > 0) {
    const policyNormalization = normalizeDiagnostics(policyDiagnostics, options.catalog, {
      resolver: options.resolver,
      externalSpecsBySource: options.externalSpecsBySource,
    });
    normalization = {
      diagnostics: [...normalization.diagnostics, ...policyNormalization.diagnostics],
      issues: [...normalization.issues, ...policyNormalization.issues],
      dropped: [...normalization.dropped, ...policyNormalization.dropped],
    };
  }

  // Confidence-based severity demotion (F8 demotion table).
  // Applied after normalization (so specs are resolved) and before policy
  // (so user overrides can still promote demoted diagnostics if desired).
  const demotion = adjustSeverity(normalization.diagnostics);

  const resolved = resolvePolicy(
    demotion.diagnostics,
    options.policy,
    options.policyContext ?? {},
  );
  const routed = routeDiagnostics(resolved, options.routingContext);
  const aggregated = aggregateDiagnostics(routed, options.aggregationContext);
  const formatted = options.formatters ? formatDiagnostics(aggregated, options.formatters) : undefined;
  return { normalization, demotion, resolved, routed, aggregated, formatted };
}
