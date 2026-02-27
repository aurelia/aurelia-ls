import { defineDiagnostic, type DiagnosticDataBase, type DiagnosticSymbolKind } from "../types.js";

export type ExprParseErrorData = DiagnosticDataBase & {
  recovery: boolean;
};

export type ExprSymbolNotFoundData = DiagnosticDataBase & {
  symbolKind: DiagnosticSymbolKind;
  name?: string;
};

export type ExprTypeMismatchData = DiagnosticDataBase & {
  expected?: string;
  actual?: string;
};

export const expressionDiagnostics = {
  "aurelia/expr-parse-error": defineDiagnostic<ExprParseErrorData>({
    category: "expression",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["bind"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "exact",
    evidenceRegime: "grammar-deterministic",
    fpRiskTier: "zero",
    recovery: true,
    aurCodeHints: ["AUR0151", "AUR0179"],
    description: "Expression parsing failed and recovery output is non-authoritative.",
    data: {
      required: ["recovery"],
      optional: ["aurCode"],
    },
  }),
  "aurelia/expr-symbol-not-found": defineDiagnostic<ExprSymbolNotFoundData>({
    category: "expression",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "guided",
    span: "span",
    stages: ["link"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    evidenceRegime: "catalog-dependent",
    fpRiskTier: "medium",
    description: "Expression references an unknown symbol.",
    data: {
      required: ["symbolKind"],
      optional: ["name", "aurCode"],
    },
  }),
  "aurelia/expr-type-mismatch": defineDiagnostic<ExprTypeMismatchData>({
    category: "expression",
    status: "canonical",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["typecheck"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    evidenceRegime: "catalog-dependent",
    fpRiskTier: "medium",
    description: "Expression type does not match the expected target type.",
    data: {
      optional: ["expected", "actual"],
    },
  }),
} as const;
