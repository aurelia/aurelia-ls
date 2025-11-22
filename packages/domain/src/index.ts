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
export {
  mappingSegments,
  pickMappingSegment,
  shrinkSpanToMapping,
  type MappingSegmentPair,
  type MappingHit,
} from "./compiler/mapping.js";
export {
  buildExprSpanIndex,
  exprIdsOf,
  isInterpolation,
  primaryExprId,
  type ExprSpanIndex,
} from "./compiler/expr-utils.js";
export type { StageKey, StageArtifactMeta } from "./compiler/pipeline/engine.js";
export {
  spanContainsOffset,
  spanLength,
  intersectSpans,
  normalizeSpan,
  narrowestContainingSpan,
  pickNarrowestContaining,
  offsetSpan,
  toSourceSpan,
  toSourceLoc,
  type SpanLike,
  type SourceSpan,
  type TextSpan,
} from "./compiler/model/span.js";
export {
  idKey,
  idFromKey,
  normalizePathForId,
  toSourceFileId,
  type NormalizedPath,
  type SourceFileId,
} from "./compiler/model/identity.js";
export { diagnosticSpan } from "./compiler/diagnostics.js";
export { provenanceSpan, preferOrigin } from "./compiler/model/origin.js";
