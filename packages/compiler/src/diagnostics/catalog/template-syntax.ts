import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export type TemplateSyntaxData = DiagnosticDataBase;

export const templateSyntaxDiagnostics = {
  "aurelia/invalid-binding-pattern": defineDiagnostic<TemplateSyntaxData>({
    category: "template-syntax",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["lower", "link", "bind"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "exact",
    aurCodeHints: ["AUR0088", "AUR0089", "AUR0102", "AUR0106", "AUR0713", "AUR0723"],
    description: "Binding pattern is not valid for the declared syntax.",
    data: {
      optional: ["aurCode"],
    },
  }),
  "aurelia/invalid-command-usage": defineDiagnostic<TemplateSyntaxData>({
    category: "template-syntax",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["lower", "link", "bind"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "exact",
    aurCodeHints: ["AUR0704", "AUR0775", "AUR0810", "AUR0813", "AUR0815", "AUR0816", "AUR0821"],
    description: "Binding command usage violates syntax rules.",
    data: {
      optional: ["aurCode"],
    },
  }),
} as const;

export const templateSyntaxFutureDiagnostics = {
  "aurelia/repeat/missing-iterator": defineDiagnostic<TemplateSyntaxData>({
    category: "template-syntax",
    status: "proposed",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["link"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "exact",
    description: "Repeat binding is missing an iterator expression.",
  }),
} as const;
