import type {
  ApiSurfaceSnapshot,
  NormalizedPath,
  ResourceCatalog,
  ResourceDef,
  ResourceGraph,
  Semantics,
  SemanticSnapshot,
  TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import type { FileContext, FileFacts } from "../extraction/file-facts.js";
import type { ExportBindingMap } from "../binding/index.js";
import type { AnalysisGap, PartialEvaluationResult } from "../analysis/index.js";
import type { RegistrationAnalysis } from "../registration/types.js";
import type { InlineTemplateInfo, TemplateInfo } from "../templates/types.js";

export const RESOLUTION_STAGES = {
  extract: "21-extract",
  exportBind: "22-export-bind",
  partialEval: "23-partial-eval",
  patterns: "24-patterns",
  semantics: "25-semantics",
  registration: "26-registration",
  graph: "27-graph",
  snapshots: "28-snapshots",
  templates: "29-templates",
} as const;

export type ResolutionStageKey = typeof RESOLUTION_STAGES[keyof typeof RESOLUTION_STAGES];

export const RESOLUTION_STAGE_ORDER: readonly ResolutionStageKey[] = [
  RESOLUTION_STAGES.extract,
  RESOLUTION_STAGES.exportBind,
  RESOLUTION_STAGES.partialEval,
  RESOLUTION_STAGES.patterns,
  RESOLUTION_STAGES.semantics,
  RESOLUTION_STAGES.registration,
  RESOLUTION_STAGES.graph,
  RESOLUTION_STAGES.snapshots,
  RESOLUTION_STAGES.templates,
];

export type PatternMatchOutput = {
  resources: ResourceDef[];
  gaps: AnalysisGap[];
  contexts: Map<NormalizedPath, FileContext>;
};

export interface ResolutionStageOutputs {
  "21-extract": {
    facts: Map<NormalizedPath, FileFacts>;
  };
  "22-export-bind": {
    exportBindings: ExportBindingMap;
  };
  "23-partial-eval": PartialEvaluationResult;
  "24-patterns": PatternMatchOutput;
  "25-semantics": {
    semantics: Semantics;
    catalog: ResourceCatalog;
    syntax: TemplateSyntaxRegistry;
  };
  "26-registration": RegistrationAnalysis;
  "27-graph": ResourceGraph;
  "28-snapshots": {
    semanticSnapshot: SemanticSnapshot;
    apiSurfaceSnapshot: ApiSurfaceSnapshot;
  };
  "29-templates": {
    templates: readonly TemplateInfo[];
    inlineTemplates: readonly InlineTemplateInfo[];
  };
}
