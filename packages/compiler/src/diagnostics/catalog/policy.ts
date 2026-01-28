import { defineDiagnostic, type CatalogConfidence, type DiagnosticDataBase } from "../types.js";

export type PolicyGapsData = DiagnosticDataBase & {
  gapCount?: number;
};

export type PolicyConfidenceData = DiagnosticDataBase & {
  min?: CatalogConfidence;
  actual?: CatalogConfidence;
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
} as const;
