import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export const legacyDiagnostics = {
  "aurelia/AU1103": defineDiagnostic<DiagnosticDataBase>({
    category: "legacy",
    status: "legacy",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["resolve"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    description: "Legacy AU1103 diagnostic (unknown event).",
    replacement: "aurelia/unknown-event",
  }),
  "aurelia/AU1105": defineDiagnostic<DiagnosticDataBase>({
    category: "legacy",
    status: "legacy",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["resolve"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    description: "Legacy AU1105 diagnostic (repeat missing iterator binding).",
    replacement: "aurelia/repeat/missing-iterator",
  }),
} as const;
