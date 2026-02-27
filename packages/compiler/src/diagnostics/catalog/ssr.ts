import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export type SsrUnsafeAccessData = DiagnosticDataBase & {
  reason?: string;
};

export const ssrDiagnostics = {
  "aurelia/ssr-unsafe-access": defineDiagnostic<SsrUnsafeAccessData>({
    category: "ssr",
    status: "canonical",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "either",
    stages: ["ssr"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "ssr"],
    defaultConfidence: "high",
    description: "Template accesses data or APIs that are unsafe for SSR.",
    data: {
      optional: ["reason"],
    },
  }),
} as const;
