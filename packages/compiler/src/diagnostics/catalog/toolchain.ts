import { defineDiagnostic, type DiagnosticDataBase, type DiagnosticStage } from "../types.js";

export type AotEmitFailedData = DiagnosticDataBase & {
  stage: DiagnosticStage;
  reason: string;
};

export type AotMappingCorruptData = DiagnosticDataBase & {
  artifact: string;
  reason: string;
};

export type TransformInvalidOutputData = DiagnosticDataBase & {
  file: string;
  reason: string;
};

export type TransformConflictData = DiagnosticDataBase & {
  file: string;
  reason: string;
};

export const toolchainDiagnostics = {
  "aurelia/aot/emit-failed": defineDiagnostic<AotEmitFailedData>({
    category: "toolchain",
    status: "proposed",
    defaultSeverity: "error",
    impact: "blocking",
    actionability: "manual",
    span: "project",
    stages: ["aot"],
    surfaces: ["cli", "aot"],
    defaultConfidence: "exact",
    description: "AOT emit failed.",
    data: {
      required: ["stage", "reason"],
    },
  }),
  "aurelia/aot/mapping-corrupt": defineDiagnostic<AotMappingCorruptData>({
    category: "toolchain",
    status: "proposed",
    defaultSeverity: "error",
    impact: "blocking",
    actionability: "manual",
    span: "project",
    stages: ["aot"],
    surfaces: ["cli", "aot"],
    defaultConfidence: "exact",
    description: "AOT mapping artifacts are corrupt.",
    data: {
      required: ["artifact", "reason"],
    },
  }),
  "aurelia/transform/invalid-output": defineDiagnostic<TransformInvalidOutputData>({
    category: "toolchain",
    status: "proposed",
    defaultSeverity: "error",
    impact: "blocking",
    actionability: "manual",
    span: "project",
    stages: ["aot"],
    surfaces: ["cli", "aot"],
    defaultConfidence: "exact",
    description: "Transform output is invalid.",
    data: {
      required: ["file", "reason"],
    },
  }),
  "aurelia/transform/conflict": defineDiagnostic<TransformConflictData>({
    category: "toolchain",
    status: "proposed",
    defaultSeverity: "error",
    impact: "blocking",
    actionability: "manual",
    span: "project",
    stages: ["aot"],
    surfaces: ["cli", "aot"],
    defaultConfidence: "high",
    description: "Transform edits conflict and cannot be applied safely.",
    data: {
      required: ["file", "reason"],
    },
  }),
} as const;
