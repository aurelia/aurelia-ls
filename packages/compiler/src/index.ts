// Compiler package public API
//
// This barrel exports the main compilation, parsing, language, and program APIs.
// Import from here rather than deep paths for stability.

// === Prelude ===
export { PRELUDE_TS } from "./prelude.js";

// === Facade ===
export { compileTemplate } from "./facade.js";
export type { TemplateCompilation, TemplateDiagnostics, StageMetaSnapshot } from "./facade.js";

// === AOT Facade (SSR-agnostic) ===
export { compileAot } from "./facade-aot.js";
export type { CompileAotOptions, CompileAotResult } from "./facade-aot.js";

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
  analyzeAttributeName,
  AttributeParser,
  createDefaultSyntax,
  createAttributeParserFromRegistry,
  registerBuiltins,
} from "./parsing/index.js";
export type { AttrCommandSpan, AttrPartSpan, AttributeNameAnalysis, ExpressionParseContext, IExpressionParser, Token } from "./parsing/index.js";

// === Language / Semantics ===
export {
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
  createSemanticsLookup,
  buildResourceCatalog,
  buildResourceGraphFromSemantics,
  materializeResourcesForScope,
  materializeSemanticsForScope,
  buildProjectSnapshot,
  buildSemanticsSnapshot,
  buildSemanticsSnapshotFromProject,
  buildTemplateSyntaxRegistry,
} from "./schema/index.js";
export type {
  SourceLocation,
  Configured,
  Sourced,
  ProjectSemantics,
  MaterializedSemantics,
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ResourceCollections,
  ScopedResources,
  SemanticsLookupOptions,
  LocalImportDef,
  ResourceCatalog,
  CatalogGap,
  CatalogConfidence,
  ProjectSnapshot,
  ProjectSnapshotOptions,
  SemanticsSnapshot,
  TemplateContext,
  SemanticsSnapshotOptions,
  TemplateSyntaxRegistry,
  TemplateSyntaxMatcher,
  TemplateSyntaxEmitter,
  TemplateSyntaxMatchInput,
  TemplateSyntaxMatch,
  TemplateSyntaxEmitInput,
  TemplateSyntaxEmitResult,
  FeatureUsageSet,
  FeatureUsageFlags,
  RegistrationPlan,
  RegistrationScopePlan,
  RegistrationPlanDirective,
  StyleProfile,
  SemanticSnapshot,
  SemanticSymbolSnapshot,
  ApiSurfaceSnapshot,
  ApiSurfaceSymbol,
  ApiSurfaceBindable,
  ResourceDef,
  ResourceDefBase,
  ResourceKind,
  ResourceKindLike,
  CustomElementDef,
  CustomAttributeDef,
  TemplateControllerDef,
  ValueConverterDef,
  BindingBehaviorDef,
  BindableDef,
  ResourceKey,
  SymbolId,
} from "./schema/index.js";

// Resource definitions (for compiler project-semantics and external tooling)
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
  // Binding command configuration
  BindingCommandConfig,
  BindingCommandKind,
  // Attribute pattern configuration
  AttributePatternConfig,
  PatternInterpret,
} from "./schema/index.js";

// Binding command configuration (values)
export {
  BUILTIN_BINDING_COMMANDS,
  getBindingCommandConfig,
  isPropertyBindingCommand,
  getCommandMode,
  // Attribute pattern configuration (values)
  BUILTIN_ATTRIBUTE_PATTERNS,
} from "./schema/index.js";

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
export type { VmReflection, SynthesisOptions, ModuleResolver } from "./shared/index.js";

// === Synthesis (AOT) ===
export {
  planAot,
  emitAotCode,
  emitTemplate,
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
  SerializedProjection,
  SerializedHydrateAttribute,
  SerializedHydrateTemplateController,
  SerializedHydrateLetElement,
  SerializedIteratorBinding,
  SerializedTranslationBinding,
  SerializedAuxBinding,
  SerializedLetBinding,
  SerializedBindable,
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
  linkTemplateSemantics,
  bindScopes,
  typecheck,
  collectFeatureUsage,
  // Typecheck configuration
  resolveTypecheckConfig,
  checkTypeCompatibility,
  DEFAULT_TYPECHECK_CONFIG,
  TYPECHECK_PRESETS,
  // Meta element extraction (for compiler project-semantics)
  extractMeta,
  extractTemplateMeta,
  stripMetaFromHtml,
} from "./analysis/index.js";
export type { BuildIrOptions, FeatureUsageOptions, TypecheckConfig, TypecheckSeverity, BindingContext, TypeCompatibilityResult } from "./analysis/index.js";
export type {
  // Link module (for semantic tokens, etc.)
  LinkModule,
  LinkedTemplate,
  LinkedRow,
  NodeSem,
  LinkedInstruction,
  LinkedPropertyBinding,
  LinkedListenerBinding,
  LinkedHydrateTemplateController,
} from "./analysis/index.js";

// === Project Semantics (Code-driven resource discovery) ===
export * from "./project-semantics/index.js";

// === Shared Infrastructure ===
export { diagnosticSpan, buildExprSpanIndex, exprIdsOf, isInterpolation, primaryExprId } from "./shared/index.js";
export type { CompilerDiagnostic, ExprSpanIndex } from "./shared/index.js";

// === Diagnostics Catalog ===
export * from "./diagnostics/index.js";

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
  getDebugChannel,
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
export { stableHash, stableHashSemantics } from "./pipeline/index.js";

// === Model (Foundation) ===
export {
  spanContainsOffset,
  spanLength,
  intersectSpans,
  normalizeSpan,
  normalizeSpanMaybe,
  narrowestContainingSpan,
  pickNarrowestContaining,
  offsetAtPosition,
  positionAtOffset,
  spanToRange,
  rangeToSpan,
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
  TemplateIR,
  NodeId,
} from "./model/index.js";

// IR types (Template Meta Elements)
export type {
  Located,
  MetaElementBase,
  TemplateMetaIR,
  ImportMetaIR,
  BindableMetaIR,
  ShadowDomMetaIR,
  AliasMetaIR,
  ContainerlessMetaIR,
  CaptureMetaIR,
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
  Identifier,
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
