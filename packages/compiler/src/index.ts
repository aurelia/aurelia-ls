// Compiler package public API
//
// This barrel exports the main compilation, parsing, language, and program APIs.
// Import from here rather than deep paths for stability.

// === Prelude ===
export { PRELUDE_TS } from "./prelude.js";

// === Facade ===
export { compileTemplate } from "./facade.js";
export type { TemplateCompilation, TemplateDiagnostics, StageMetaSnapshot } from "./facade.js";

// === Parsing ===
export {
  getExpressionParser,
  rebaseExpressionSpans,
  DEFAULT_SYNTAX,
  // Low-level parsing (for tooling/testing)
  ExpressionParser,
  Scanner,
  TokenType,
  splitInterpolationText,
  AttrSyntax,
  AttributeParser,
  createDefaultSyntax,
  registerBuiltins,
} from "./parsing/index.js";
export type { ExpressionParseContext, IExpressionParser, Token } from "./parsing/index.js";

// === Language / Semantics ===
export { DEFAULT as DEFAULT_SEMANTICS, createSemanticsLookup, buildResourceGraphFromSemantics, materializeResourcesForScope, materializeSemanticsForScope } from "./language/index.js";
export type { Semantics, ResourceGraph, ResourceScope, ResourceScopeId, ResourceCollections, ScopedResources } from "./language/index.js";

// Resource definitions (for resolution package and external tooling)
export type {
  ElementRes,
  AttrRes,
  Bindable,
  ValueConverterSig,
  BindingBehaviorSig,
  ControllerConfig,
  ControllerTrigger,
  ControllerBranches,
  ControllerInjects,
  ControllerName,
  ScopeBehavior,
  DomSchema,
  DomElement,
  DomProp,
  EventSchema,
  Naming,
  TwoWayDefaults,
  TypeRef,
} from "./language/index.js";

// === Synthesis (Overlay) ===
export {
  computeOverlayBaseName,
  overlayFilename,
  overlayPath,
  planOverlay,
  emitOverlay,
  emitMappedExpression,
} from "./synthesis/index.js";
export type {
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
  TemplateQueryFacade,
  TemplateExpressionInfo,
  TemplateBindableInfo,
  TemplateNodeInfo,
  TemplateControllerInfo,
} from "./synthesis/index.js";

// VmReflection and SynthesisOptions are from shared (cross-cutting)
export type { VmReflection, SynthesisOptions } from "./shared/index.js";

// === Synthesis (AOT) ===
export {
  planAot,
  emitAotCode,
  emitTemplate,
  collectNestedTemplateHtml,
  collectNestedTemplateHtmlTree,
  // Constants for transform package
  INSTRUCTION_TYPE,
  BINDING_MODE,
} from "./synthesis/index.js";
export type { InstructionTypeCode, BindingModeValue } from "./synthesis/index.js";
export type {
  TemplateEmitResult,
  TemplateEmitOptions,
  NestedTemplateHtmlNode,
} from "./synthesis/index.js";
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
  PlanAuxExpr,
  PlanExpression,
  PlanScope,
} from "./synthesis/index.js";

// === Analysis ===
export {
  lowerDocument,
  resolveHost,
  bindScopes,
  typecheck,
  // Typecheck configuration
  resolveTypecheckConfig,
  checkTypeCompatibility,
  DEFAULT_TYPECHECK_CONFIG,
  TYPECHECK_PRESETS,
} from "./analysis/index.js";
export type { BuildIrOptions, TypecheckConfig, TypecheckSeverity, BindingContext, TypeCompatibilityResult } from "./analysis/index.js";
export type {
  // Linked semantics (for semantic tokens, etc.)
  LinkedSemanticsModule,
  LinkedTemplate,
  LinkedRow,
  NodeSem,
  LinkedInstruction,
  LinkedPropertyBinding,
  LinkedListenerBinding,
  LinkedHydrateTemplateController,
} from "./analysis/index.js";

// === Shared Infrastructure ===
export { diagnosticSpan, buildExprSpanIndex, exprIdsOf, isInterpolation, primaryExprId } from "./shared/index.js";
export type { CompilerDiagnostic, ExprSpanIndex } from "./shared/index.js";

// === Instrumentation (Tracing) ===
export {
  // Core primitives
  createTrace,
  NOOP_TRACE,
  NOOP_SPAN,
  CompilerAttributes,
  // Utilities
  nowNanos,
  formatDuration,
  // Exporters
  NOOP_EXPORTER,
  ConsoleExporter,
  createConsoleExporter,
  CollectingExporter,
  createCollectingExporter,
  MultiExporter,
  createMultiExporter,
  JSONExporter,
  createJSONExporter,
} from "./shared/index.js";

// === Debug Channels ===
export {
  debug,
  refreshDebugChannels,
  configureDebug,
  isDebugEnabled,
} from "./shared/index.js";
export type { Debug, DebugChannel, DebugData, DebugConfig } from "./shared/index.js";
export type {
  Span,
  SpanEvent,
  AttributeValue,
  AttributeMap,
  ReadonlyAttributeMap,
  CompileTrace,
  TraceExporter,
  CreateTraceOptions,
  CompilerAttributeKey,
  ConsoleExporterOptions,
  JSONExporterOptions,
  SerializedSpan,
  SerializedEvent,
  SerializedTrace,
  TraceSummary,
} from "./shared/index.js";

// === Pipeline ===
export type { StageKey, StageArtifactMeta } from "./pipeline/index.js";

// === Model (Foundation) ===
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
} from "./model/index.js";
export type { SpanLike, SourceSpan, TextSpan, NormalizedPath, SourceFileId, ExprId, FrameId, BindingMode } from "./model/index.js";

// IR types (DOM tree)
export type {
  DOMNode,
  ElementNode,
  TemplateNode,
  TextNode,
  CommentNode,
  BaseNode,
  Attr,
  NodeId,
} from "./model/index.js";

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
  ExprTableEntry,
} from "./model/index.js";

// === Program ===
export * from "./program/index.js";
