import { defineDiagnostic, type DiagnosticDataBase } from "../types.js";

export type SsgDynamicRouteData = DiagnosticDataBase & {
  route: string;
  reason: string;
};

export type SsgNonDeterministicData = DiagnosticDataBase & {
  reason: string;
};

export type SsgRenderFailedData = DiagnosticDataBase & {
  reason: string;
};

export const ssgDiagnostics = {
  "aurelia/ssg/dynamic-route": defineDiagnostic<SsgDynamicRouteData>({
    category: "ssg",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["ssg"],
    surfaces: ["ssg", "cli", "vscode-panel"],
    defaultConfidence: "high",
    description: "SSG route cannot be fully determined at build time.",
    data: {
      required: ["route", "reason"],
    },
  }),
  "aurelia/ssg/non-deterministic-data": defineDiagnostic<SsgNonDeterministicData>({
    category: "ssg",
    status: "proposed",
    defaultSeverity: "warning",
    impact: "degraded",
    actionability: "manual",
    span: "project",
    stages: ["ssg"],
    surfaces: ["ssg", "cli", "vscode-panel"],
    defaultConfidence: "partial",
    description: "SSG detected non-deterministic data dependencies.",
    data: {
      required: ["reason"],
    },
  }),
  "aurelia/ssg/render-failed": defineDiagnostic<SsgRenderFailedData>({
    category: "ssg",
    status: "proposed",
    defaultSeverity: "error",
    impact: "blocking",
    actionability: "manual",
    span: "project",
    stages: ["ssg"],
    surfaces: ["ssg", "cli", "vscode-panel"],
    defaultConfidence: "exact",
    description: "SSG rendering failed.",
    data: {
      required: ["reason"],
    },
  }),
} as const;
