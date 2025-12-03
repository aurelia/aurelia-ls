// Domain package public API
//
// This barrel exports the main compilation, parsing, language, and program APIs.
// Import from here rather than deep paths for stability.

// === Prelude ===
export { PRELUDE_TS } from "./prelude.js";

// === Compiler (via barrel) ===
// Re-export selected compiler APIs for external consumers.

// Facade
export { compileTemplate } from "./compiler/index.js";
export type { TemplateCompilation, TemplateDiagnostics, StageMetaSnapshot } from "./compiler/index.js";

// Parsing
export { getExpressionParser, rebaseExpressionSpans, DEFAULT_SYNTAX } from "./compiler/index.js";
export type { ExpressionParseContext, IExpressionParser } from "./compiler/index.js";

// Language / Semantics
export { DEFAULT as DEFAULT_SEMANTICS, createSemanticsLookup, buildResourceGraphFromSemantics } from "./compiler/index.js";
export type { Semantics, ResourceGraph, ResourceScope, ResourceScopeId, ResourceCollections } from "./compiler/index.js";

// Synthesis (Overlay)
export {
  computeOverlayBaseName,
  overlayFilename,
  overlayPath,
} from "./compiler/index.js";
export type {
  VmReflection,
  SynthesisOptions,
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
  TemplateQueryFacade,
  TemplateExpressionInfo,
  TemplateBindableInfo,
  TemplateNodeInfo,
  TemplateControllerInfo,
} from "./compiler/index.js";

// Synthesis (AOT) - for build tools
export { planAot, emitAotCode, emitTemplate, collectNestedTemplateHtml } from "./compiler/index.js";
export type { TemplateEmitResult, TemplateEmitOptions } from "./compiler/index.js";
export type {
  AotPlanModule,
  AotPlanOptions,
  AotCodeResult,
  AotEmitOptions,
  SerializedDefinition,
  SerializedInstruction,
  SerializedExpression,
  SerializedPropertyBinding,
  SerializedTextBinding,
  SerializedInterpolation,
  SerializedListenerBinding,
  SerializedRefBinding,
  SerializedSetProperty,
  SerializedSetAttribute,
  SerializedHydrateElement,
  SerializedHydrateAttribute,
  SerializedHydrateTemplateController,
  SerializedHydrateLetElement,
  SerializedIteratorBinding,
  SerializedAuxBinding,
  SerializedLetBinding,
  PlanNode,
  PlanElementNode,
  PlanTextNode,
  PlanCommentNode,
  PlanFragmentNode,
  PlanBinding,
  PlanPropertyBinding,
  PlanAttributeBinding,
  PlanAttributeInterpolation,
  PlanStyleBinding,
  PlanListenerBinding,
  PlanRefBinding,
  PlanTextInterpolation,
  PlanStaticAttr,
  PlanCustomElement,
  PlanCustomAttr,
  PlanController,
  PlanRepeatController,
  PlanIfController,
  PlanWithController,
  PlanSwitchController,
  PlanPromiseController,
  PlanPortalController,
  PlanExpression,
  PlanScope,
} from "./compiler/index.js";

// Analysis (for build tools)
export { lowerDocument, resolveHost, bindScopes } from "./compiler/index.js";
export type { BuildIrOptions } from "./compiler/index.js";

// Shared Infrastructure
export { diagnosticSpan, buildExprSpanIndex, exprIdsOf, isInterpolation, primaryExprId } from "./compiler/index.js";
export type { CompilerDiagnostic, ExprSpanIndex } from "./compiler/index.js";

// Pipeline
export type { StageKey, StageArtifactMeta } from "./compiler/index.js";

// Model (Foundation)
export {
  spanContainsOffset,
  spanLength,
  intersectSpans,
  normalizeSpan,
  normalizeSpanMaybe,
  narrowestContainingSpan,
  pickNarrowestContaining,
  offsetSpan,
  toSourceSpan,
  toSourceLoc,
  idKey,
  idFromKey,
  normalizePathForId,
  toSourceFileId,
  provenanceSpan,
  preferOrigin,
} from "./compiler/index.js";
export type { SpanLike, SourceSpan, TextSpan, NormalizedPath, SourceFileId, ExprId, FrameId, BindingMode } from "./compiler/index.js";

// Expression AST types (for evaluation)
export type {
  AnyBindingExpression,
  IsBindingBehavior,
  IsAssign,
  IsBinary,
  IsLeftHandSide,
  AccessScopeExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  AccessThisExpression,
  PrimitiveLiteralExpression,
  BinaryExpression,
  UnaryExpression,
  ConditionalExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  CallScopeExpression,
  CallMemberExpression,
  CallFunctionExpression,
  Interpolation,
  ForOfStatement,
  TemplateExpression,
  BindingIdentifier,
} from "./compiler/index.js";

// === Program ===
export * from "./program/index.js";
