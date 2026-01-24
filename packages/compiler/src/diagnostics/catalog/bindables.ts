import {
  defineDiagnostic,
  type DiagnosticBindableOwnerKind,
  type DiagnosticDataBase,
} from "../types.js";

export type BindableInfo = {
  name: string;
  attribute?: string;
  ownerKind?: DiagnosticBindableOwnerKind;
  ownerName?: string;
  ownerFile?: string;
};

export type MissingRequiredBindableData = DiagnosticDataBase & {
  bindable?: Pick<BindableInfo, "name" | "attribute">;
};

export type UnknownBindableData = DiagnosticDataBase & {
  bindable?: BindableInfo;
};

export type DuplicateAttributeData = DiagnosticDataBase;

export const bindableDiagnostics = {
  "aurelia/missing-required-bindable": defineDiagnostic<MissingRequiredBindableData>({
    category: "bindable-validation",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["bind"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    description: "A required bindable is missing.",
    data: {
      optional: ["bindable"],
    },
  }),
  "aurelia/duplicate-attribute": defineDiagnostic<DuplicateAttributeData>({
    category: "bindable-validation",
    status: "canonical",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "span",
    stages: ["bind"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    aurCodeHints: ["AUR0714"],
    description: "The same attribute appears more than once.",
    data: {
      optional: ["aurCode"],
    },
  }),
  "aurelia/unknown-bindable": defineDiagnostic<UnknownBindableData>({
    category: "bindable-validation",
    status: "canonical",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "guided",
    span: "span",
    stages: ["resolve", "bind"],
    surfaces: ["lsp", "vscode-inline", "vscode-panel", "cli", "aot"],
    defaultConfidence: "high",
    aurCode: "AUR0707",
    description: "Attribute does not resolve to a known bindable.",
    data: {
      optional: ["bindable", "aurCode"],
    },
  }),
} as const;
