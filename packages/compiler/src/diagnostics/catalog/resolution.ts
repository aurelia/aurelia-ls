import {
  defineDiagnostic,
  type DiagnosticDataBase,
  type DiagnosticResourceKind,
} from "../types.js";

const RESOLUTION_SURFACES = ["lsp", "vscode-inline", "vscode-panel", "vscode-status", "cli"] as const;

export type ResolutionOrphanData = DiagnosticDataBase & {
  resourceKind: DiagnosticResourceKind;
  name?: string;
  file?: string;
};

export type ResolutionUnanalyzableData = DiagnosticDataBase & {
  patternKind:
    | "function-call"
    | "variable-reference"
    | "conditional"
    | "spread-variable"
    | "property-access"
    | "other";
  detail?: string;
};

export type ResolutionImportFailureData = DiagnosticDataBase & {
  specifier?: string;
  resolvedPath?: string;
  reason?: string;
};

export type ResolutionNotAResourceData = DiagnosticDataBase & {
  specifier?: string;
  name?: string;
  reason?: string;
};

export type ResolutionPluginRequiredData = DiagnosticDataBase & {
  plugin?: string;
  resourceName?: string;
};

export const resolutionDiagnostics = {
  "aurelia/resolution/orphan-element": defineDiagnostic<ResolutionOrphanData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Custom element is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/resolution/orphan-attribute": defineDiagnostic<ResolutionOrphanData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Custom attribute is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/resolution/orphan-value-converter": defineDiagnostic<ResolutionOrphanData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Value converter is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/resolution/orphan-binding-behavior": defineDiagnostic<ResolutionOrphanData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Binding behavior is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/resolution/unanalyzable-function-call": defineDiagnostic<ResolutionUnanalyzableData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a function call that cannot be analyzed.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/resolution/unanalyzable-variable": defineDiagnostic<ResolutionUnanalyzableData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a variable that cannot be traced.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/resolution/unanalyzable-conditional": defineDiagnostic<ResolutionUnanalyzableData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a conditional expression.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/resolution/unanalyzable-spread": defineDiagnostic<ResolutionUnanalyzableData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "partial",
    description: "Registration spreads a variable that cannot be resolved.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/resolution/unanalyzable-property-access": defineDiagnostic<ResolutionUnanalyzableData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a property access that cannot be resolved.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/resolution/unanalyzable-other": defineDiagnostic<ResolutionUnanalyzableData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses an unanalyzable pattern.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/resolution/unresolved-import": defineDiagnostic<ResolutionImportFailureData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "guided",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Could not resolve an import for a registered identifier.",
    data: {
      optional: ["specifier", "resolvedPath", "reason"],
    },
  }),
  "aurelia/resolution/not-a-resource": defineDiagnostic<ResolutionNotAResourceData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "guided",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Identifier resolves to a file but not to a known resource.",
    data: {
      optional: ["specifier", "name", "reason"],
    },
  }),
  "aurelia/resolution/plugin-required": defineDiagnostic<ResolutionPluginRequiredData>({
    category: "resolution",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "guided",
    span: "either",
    stages: ["resolution"],
    surfaces: RESOLUTION_SURFACES,
    defaultConfidence: "high",
    description: "Resource requires a plugin that is not registered.",
    data: {
      optional: ["plugin", "resourceName"],
    },
  }),
} as const;
