export { compileTemplate, compileTemplateToOverlay } from "./compiler/facade.js";
export { PRELUDE_TS } from "./prelude.js";

export { getExpressionParser } from "./parsers/expression-parser.js";
export { DEFAULT_SYNTAX } from "./compiler/language/syntax.js";
export type { Semantics } from "./compiler/language/registry.js";
export type {
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ResourceCollections,
} from "./compiler/language/resource-graph.js";

export type { VmReflection } from "./compiler/phases/50-plan/overlay/types.js";
export type { TemplateCompilation, TemplateDiagnostics, StageMetaSnapshot } from "./compiler/facade.js";
export type {
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
  TemplateQueryFacade,
  TemplateExpressionInfo,
  TemplateBindableInfo,
  TemplateNodeInfo,
  TemplateControllerInfo,
} from "./contracts.js";
export type { CompilerDiagnostic } from "./compiler/diagnostics.js";

export { compileTemplateToSSR } from "./compiler/facade.js";
export type { SsrPlanModule } from "./compiler/phases/50-plan/ssr/types.js";
export { mapOverlayOffsetToHtml, mapHtmlOffsetToOverlay } from "./compiler/facade.js";
export type { MappingHit } from "./compiler/mapping.js";
export type { StageKey, StageArtifactMeta } from "./compiler/pipeline/engine.js";
