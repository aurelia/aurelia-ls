import {
  defineDiagnostic,
  type DiagnosticDataBase,
  type DiagnosticResourceKind,
} from "../types.js";

const PROJECT_SURFACES = ["lsp", "vscode-inline", "vscode-panel", "vscode-status", "cli"] as const;

export type ProjectOrphanData = DiagnosticDataBase & {
  resourceKind: DiagnosticResourceKind;
  name?: string;
  file?: string;
};

export type ProjectUnanalyzableData = DiagnosticDataBase & {
  patternKind:
    | "function-call"
    | "variable-reference"
    | "conditional"
    | "spread-variable"
    | "property-access"
    | "other";
  detail?: string;
};

export type ProjectImportFailureData = DiagnosticDataBase & {
  specifier?: string;
  resolvedPath?: string;
  reason?: string;
};

export type ProjectNotAResourceData = DiagnosticDataBase & {
  specifier?: string;
  name?: string;
  reason?: string;
};

export type ProjectPluginRequiredData = DiagnosticDataBase & {
  plugin?: string;
  resourceName?: string;
};

export const projectDiagnostics = {
  "aurelia/project/orphan-element": defineDiagnostic<ProjectOrphanData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Custom element is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/project/orphan-attribute": defineDiagnostic<ProjectOrphanData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Custom attribute is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/project/orphan-value-converter": defineDiagnostic<ProjectOrphanData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Value converter is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/project/orphan-binding-behavior": defineDiagnostic<ProjectOrphanData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "informational",
    actionability: "manual",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Binding behavior is declared but never registered.",
    data: {
      required: ["resourceKind"],
      optional: ["name", "file"],
    },
  }),
  "aurelia/project/unanalyzable-function-call": defineDiagnostic<ProjectUnanalyzableData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a function call that cannot be analyzed.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/project/unanalyzable-variable": defineDiagnostic<ProjectUnanalyzableData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a variable that cannot be traced.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/project/unanalyzable-conditional": defineDiagnostic<ProjectUnanalyzableData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a conditional expression.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/project/unanalyzable-spread": defineDiagnostic<ProjectUnanalyzableData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "partial",
    description: "Registration spreads a variable that cannot be resolved.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/project/unanalyzable-property-access": defineDiagnostic<ProjectUnanalyzableData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses a property access that cannot be resolved.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/project/unanalyzable-other": defineDiagnostic<ProjectUnanalyzableData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "partial",
    description: "Registration uses an unanalyzable pattern.",
    data: {
      required: ["patternKind"],
      optional: ["detail"],
    },
  }),
  "aurelia/project/unresolved-import": defineDiagnostic<ProjectImportFailureData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "guided",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Could not resolve an import for a registered identifier.",
    data: {
      optional: ["specifier", "resolvedPath", "reason"],
    },
  }),
  "aurelia/project/not-a-resource": defineDiagnostic<ProjectNotAResourceData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "guided",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Identifier resolves to a file but not to a known resource.",
    data: {
      optional: ["specifier", "name", "reason"],
    },
  }),
  "aurelia/project/plugin-required": defineDiagnostic<ProjectPluginRequiredData>({
    category: "project",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "guided",
    span: "either",
    stages: ["project"],
    surfaces: PROJECT_SURFACES,
    defaultConfidence: "high",
    description: "Resource requires a plugin that is not registered.",
    data: {
      optional: ["plugin", "resourceName"],
    },
  }),
} as const;
