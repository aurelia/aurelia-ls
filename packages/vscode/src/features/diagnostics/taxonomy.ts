import type {
  DiagnosticActionability,
  DiagnosticCategory,
  DiagnosticImpact,
} from "@aurelia-ls/compiler";

export const AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY = "__aurelia" as const;
export const AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA = "diagnostics-taxonomy/1" as const;
export const AURELIA_DIAGNOSTIC_SUMMARY_PREFIX = "Aurelia diagnostics:" as const;

const DIAGNOSTIC_IMPACTS = new Set<DiagnosticImpact>([
  "blocking",
  "degraded",
  "informational",
]);

const DIAGNOSTIC_ACTIONABILITIES = new Set<DiagnosticActionability>([
  "autofix",
  "guided",
  "manual",
  "none",
]);

const DIAGNOSTIC_CATEGORIES = new Set<DiagnosticCategory>([
  "expression",
  "template-syntax",
  "resource-resolution",
  "bindable-validation",
  "meta-imports",
  "policy",
  "gaps",
  "toolchain",
  "ssr",
  "ssg",
  "hmr",
  "project",
  "legacy",
]);

export interface AureliaDiagnosticTaxonomyPayload {
  schema: typeof AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA;
  impact?: DiagnosticImpact;
  actionability?: DiagnosticActionability;
  category?: DiagnosticCategory;
}

export interface MiddlewareDiagnosticLike {
  source?: string;
  message: string;
  data?: unknown;
}

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RecordValue;
}

function asImpact(value: unknown): DiagnosticImpact | undefined {
  return typeof value === "string" && DIAGNOSTIC_IMPACTS.has(value as DiagnosticImpact)
    ? value as DiagnosticImpact
    : undefined;
}

function asActionability(value: unknown): DiagnosticActionability | undefined {
  return typeof value === "string" && DIAGNOSTIC_ACTIONABILITIES.has(value as DiagnosticActionability)
    ? value as DiagnosticActionability
    : undefined;
}

function asCategory(value: unknown): DiagnosticCategory | undefined {
  return typeof value === "string" && DIAGNOSTIC_CATEGORIES.has(value as DiagnosticCategory)
    ? value as DiagnosticCategory
    : undefined;
}

export function readLspDiagnosticTaxonomy(data: unknown): AureliaDiagnosticTaxonomyPayload | null {
  const root = asRecord(data);
  if (!root) return null;
  const namespace = asRecord(root[AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]);
  if (!namespace) return null;
  const diagnostics = asRecord(namespace.diagnostics);
  if (!diagnostics) return null;
  if (diagnostics.schema !== AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA) return null;

  const payload: AureliaDiagnosticTaxonomyPayload = {
    schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
  };

  const impact = asImpact(diagnostics.impact);
  if (impact) payload.impact = impact;

  const actionability = asActionability(diagnostics.actionability);
  if (actionability) payload.actionability = actionability;

  const category = asCategory(diagnostics.category);
  if (category) payload.category = category;

  return payload;
}

export function formatLspDiagnosticTaxonomySummary(payload: AureliaDiagnosticTaxonomyPayload): string | null {
  const segments: string[] = [];
  if (payload.impact) segments.push(`impact=${payload.impact}`);
  if (payload.actionability) segments.push(`actionability=${payload.actionability}`);
  if (payload.category) segments.push(`category=${payload.category}`);
  if (segments.length === 0) return null;
  return `${AURELIA_DIAGNOSTIC_SUMMARY_PREFIX} ${segments.join(" | ")}`;
}

export function applyDiagnosticsUxAugmentation<T extends MiddlewareDiagnosticLike>(
  diagnostics: readonly T[],
): void {
  for (const diagnostic of diagnostics) {
    if (diagnostic.source !== "aurelia") continue;
    const taxonomy = readLspDiagnosticTaxonomy(diagnostic.data);
    if (!taxonomy) continue;
    const summary = formatLspDiagnosticTaxonomySummary(taxonomy);
    if (!summary) continue;
    if (diagnostic.message.includes(summary)) continue;
    diagnostic.message = `${diagnostic.message}\n${summary}`;
  }
}
