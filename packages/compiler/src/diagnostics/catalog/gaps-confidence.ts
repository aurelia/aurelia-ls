import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

const GAP_SURFACES = ["lsp", "vscode-inline", "vscode-panel", "vscode-status", "cli"] as const;

export type GapDiagnosticData = DiagnosticDataBase & {
  gapKind: string;
};

export const gapDiagnostics = {
  "aurelia/gap/partial-eval": defineDiagnostic<GapDiagnosticData>({
    category: "gaps",
    status: "canonical",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: GAP_SURFACES,
    defaultConfidence: "low",
    description: "Partial evaluation could not resolve a registration pattern.",
    data: {
      required: ["gapKind"],
    },
  }),
  "aurelia/gap/unknown-registration": defineDiagnostic<GapDiagnosticData>({
    category: "gaps",
    status: "canonical",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: GAP_SURFACES,
    defaultConfidence: "low",
    description: "Registration could not be resolved with confidence.",
    data: {
      required: ["gapKind"],
    },
  }),
  "aurelia/gap/cache-corrupt": defineDiagnostic<GapDiagnosticData>({
    category: "gaps",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "either",
    stages: ["project"],
    surfaces: GAP_SURFACES,
    defaultConfidence: "low",
    description: "Analysis cache is corrupt and results are unreliable.",
    data: {
      required: ["gapKind"],
    },
  }),
} as const;
