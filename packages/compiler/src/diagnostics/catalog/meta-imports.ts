import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export type UnresolvedImportData = DiagnosticDataBase & {
  specifier?: string;
};

export type AliasConflictData = DiagnosticDataBase & {
  name?: string;
};

export type BindableDeclConflictData = DiagnosticDataBase & {
  name?: string;
};

export const metaImportDiagnostics = {
  "aurelia/unresolved-import": defineDiagnostic<UnresolvedImportData>({
    category: "meta-imports",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "guided",
    span: "span",
    stages: ["link"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    description: "Template import could not be resolved.",
    data: {
      optional: ["specifier"],
    },
  }),
  "aurelia/alias-conflict": defineDiagnostic<AliasConflictData>({
    category: "meta-imports",
    status: "canonical",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["link"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    description: "An alias conflicts with another resource or alias.",
    data: {
      optional: ["name"],
    },
  }),
  "aurelia/bindable-decl-conflict": defineDiagnostic<BindableDeclConflictData>({
    category: "meta-imports",
    status: "canonical",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["link"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    description: "Multiple bindable declarations conflict.",
    data: {
      optional: ["name"],
    },
  }),
} as const;
