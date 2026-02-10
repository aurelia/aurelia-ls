import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export type SsrHydrationMismatchData = DiagnosticDataBase & {
  runtimeOnly: true;
  reason: string;
};

export type SsrNonSerializableStateData = DiagnosticDataBase & {
  runtimeOnly: true;
  reason: string;
};

export type SsrMissingHooksData = DiagnosticDataBase & {
  runtimeOnly: true;
  hook: string;
};

export const ssrRuntimeDiagnostics = {
  "aurelia/ssr/hydration-mismatch": defineDiagnostic<SsrHydrationMismatchData>({
    category: "ssr",
    status: "proposed",
    defaultSeverity: "error",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["ssr"],
    surfaces: ["ssr", "cli", "vscode-panel"],
    defaultConfidence: "high",
    runtimeOnly: true,
    description: "SSR hydration output does not match the expected DOM.",
    data: {
      required: ["runtimeOnly", "reason"],
    },
  }),
  "aurelia/ssr/non-serializable-state": defineDiagnostic<SsrNonSerializableStateData>({
    category: "ssr",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["ssr"],
    surfaces: ["ssr", "cli", "vscode-panel"],
    defaultConfidence: "high",
    runtimeOnly: true,
    description: "SSR state cannot be serialized safely.",
    data: {
      required: ["runtimeOnly", "reason"],
    },
  }),
  "aurelia/ssr/missing-hooks": defineDiagnostic<SsrMissingHooksData>({
    category: "ssr",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["ssr"],
    surfaces: ["ssr", "cli", "vscode-panel"],
    defaultConfidence: "high",
    runtimeOnly: true,
    description: "SSR required hooks are missing for a component.",
    data: {
      required: ["runtimeOnly", "hook"],
    },
  }),
} as const;
