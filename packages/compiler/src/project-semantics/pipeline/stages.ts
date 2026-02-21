import type {
  ApiSurfaceSnapshot,
  NormalizedPath,
  ResourceCatalog,
  ResourceDef,
  ResourceGraph,
  ProjectSemantics,
  SemanticSnapshot,
  TemplateSyntaxRegistry,
} from '../compiler.js';
import type { FileContext, FileFacts } from "../extract/file-facts.js";
import type { TemplateFactCollection } from "../extract/template-facts.js";
import type { ExportBindingMap } from "../exports/index.js";
import type { AnalysisGap, PartialEvaluationResult } from "../evaluate/index.js";
import type { RegistrationAnalysis } from "../register/types.js";
import type { InlineTemplateInfo, TemplateInfo } from "../templates/types.js";
import type { DefinitionConvergenceRecord } from "../assemble/build.js";
import type {
  RecognizedAttributePattern,
  RecognizedBindingCommand,
} from "../recognize/pipeline.js";

export const DISCOVERY_STAGES = {
  extract: "extract",
  exports: "exports",
  evaluate: "evaluate",
  recognize: "recognize",
  templateFacts: "templateFacts",
  assemble: "assemble",
  register: "register",
  scope: "scope",
  snapshot: "snapshot",
  templates: "templates",
} as const;

export type DiscoveryStageKey = typeof DISCOVERY_STAGES[keyof typeof DISCOVERY_STAGES];

export const DISCOVERY_STAGE_ORDER: readonly DiscoveryStageKey[] = [
  DISCOVERY_STAGES.extract,
  DISCOVERY_STAGES.exports,
  DISCOVERY_STAGES.evaluate,
  DISCOVERY_STAGES.recognize,
  DISCOVERY_STAGES.templateFacts,
  DISCOVERY_STAGES.assemble,
  DISCOVERY_STAGES.register,
  DISCOVERY_STAGES.scope,
  DISCOVERY_STAGES.snapshot,
  DISCOVERY_STAGES.templates,
];

export type PatternMatchOutput = {
  resources: ResourceDef[];
  bindingCommands: RecognizedBindingCommand[];
  attributePatterns: RecognizedAttributePattern[];
  gaps: AnalysisGap[];
  contexts: Map<NormalizedPath, FileContext>;
};

export interface DiscoveryStageOutputs {
  extract: {
    facts: Map<NormalizedPath, FileFacts>;
  };
  exports: {
    exportBindings: ExportBindingMap;
  };
  evaluate: PartialEvaluationResult;
  recognize: PatternMatchOutput;
  templateFacts: {
    templateFacts: TemplateFactCollection;
  };
  assemble: {
    semantics: ProjectSemantics;
    catalog: ResourceCatalog;
    syntax: TemplateSyntaxRegistry;
    definitionAuthority: readonly ResourceDef[];
    definitionConvergence: readonly DefinitionConvergenceRecord[];
  };
  register: RegistrationAnalysis;
  scope: ResourceGraph;
  snapshot: {
    semanticSnapshot: SemanticSnapshot;
    apiSurfaceSnapshot: ApiSurfaceSnapshot;
  };
  templates: {
    templates: readonly TemplateInfo[];
    inlineTemplates: readonly InlineTemplateInfo[];
  };
}
