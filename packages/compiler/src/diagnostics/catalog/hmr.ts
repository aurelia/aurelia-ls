import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export type HmrOverlayDesyncData = DiagnosticDataBase & {
  reason: string;
};

export type HmrIncompatibleUpdateData = DiagnosticDataBase & {
  reason: string;
};

export type HmrReloadRequiredData = DiagnosticDataBase & {
  reason: string;
};

export const hmrDiagnostics = {
  "aurelia/hmr/overlay-desync": defineDiagnostic<HmrOverlayDesyncData>({
    category: "hmr",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["hmr"],
    surfaces: ["hmr", "vscode-panel", "vscode-status"],
    defaultConfidence: "high",
    description: "HMR overlay is out of sync with source.",
    data: {
      required: ["reason"],
    },
  }),
  "aurelia/hmr/incompatible-update": defineDiagnostic<HmrIncompatibleUpdateData>({
    category: "hmr",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["hmr"],
    surfaces: ["hmr", "vscode-panel", "vscode-status"],
    defaultConfidence: "high",
    description: "HMR update is incompatible with current state.",
    data: {
      required: ["reason"],
    },
  }),
  "aurelia/hmr/reload-required": defineDiagnostic<HmrReloadRequiredData>({
    category: "hmr",
    status: "proposed",
    defaultSeverity: "info",
    impact: "informational",
    actionability: "none",
    span: "project",
    stages: ["hmr"],
    surfaces: ["hmr", "vscode-panel", "vscode-status"],
    defaultConfidence: "high",
    description: "HMR requires a full reload to recover.",
    data: {
      required: ["reason"],
    },
  }),
} as const;
