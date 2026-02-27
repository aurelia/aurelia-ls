import { defineDiagnostic, type CatalogConfidence, type DiagnosticDataBase } from "../types.js";

export type PolicyGapsData = DiagnosticDataBase & {
  gapCount?: number;
};

export type PolicyConfidenceData = DiagnosticDataBase & {
  min?: CatalogConfidence;
  actual?: CatalogConfidence;
};

export type DiagnosticMappingAmbiguousData = DiagnosticDataBase & {
  rawCode: string;
  candidates: readonly string[];
  reason?: "missing-discriminator";
};

export const policyDiagnostics = {
  "aurelia/policy/gaps": defineDiagnostic<PolicyGapsData>({
    category: "policy",
    status: "canonical",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "project",
    stages: ["project"],
    surfaces: ["vscode-panel", "vscode-status", "cli"],
    defaultConfidence: "partial",
    description: "Analysis gaps exist that may affect correctness.",
    data: {
      optional: ["gapCount"],
    },
  }),
  "aurelia/policy/confidence": defineDiagnostic<PolicyConfidenceData>({
    category: "policy",
    status: "canonical",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "project",
    stages: ["project"],
    surfaces: ["vscode-panel", "vscode-status", "cli"],
    defaultConfidence: "partial",
    description: "Analysis confidence does not meet the configured threshold.",
    data: {
      optional: ["min", "actual"],
    },
  }),
  "aurelia/policy/diagnostic-mapping-ambiguous": defineDiagnostic<DiagnosticMappingAmbiguousData>({
    category: "policy",
    status: "canonical",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "either",
    stages: ["project"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "partial",
    description: "Legacy AU diagnostic mapping could not be resolved unambiguously.",
    data: {
      required: ["rawCode", "candidates"],
      optional: ["reason"],
    },
  }),
} as const;
