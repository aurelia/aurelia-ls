// Internal compiler primitives for project-semantics.
// Keeps project-semantics modules decoupled from package-level self-imports.

// === Language / Semantics ===
export {
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
  buildResourceCatalog,
  buildResourceGraphFromSemantics,
  buildTemplateSyntaxRegistry,
} from "../schema/index.js";
export type {
  ApiSurfaceBindable,
  ApiSurfaceSnapshot,
  ApiSurfaceSymbol,
  AttrRes,
  Bindable,
  BindableDef,
  BindingBehaviorDef,
  BindingBehaviorSig,
  CatalogConfidence,
  CatalogGap,
  ControllerConfig,
  CustomAttributeDef,
  CustomElementDef,
  ElementRes,
  FeatureUsageSet,
  RegistrationPlan,
  RegistrationScopePlan,
  ResourceCatalog,
  ResourceCollections,
  ResourceDef,
  ResourceGraph,
  ResourceKind,
  ResourceScope,
  ResourceScopeId,
  SemanticSnapshot,
  SemanticSymbolSnapshot,
  ProjectSemantics,
  MaterializedSemantics,
  SymbolId,
  SourceLocation,
  Sourced,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  TypeRef,
  ValueConverterDef,
  ValueConverterSig,
} from "../schema/index.js";

// === Model / Identity ===
export {
  normalizePathForId,
  toSourceFileId,
} from "../model/index.js";
export type {
  BindingMode,
  ImportMetaIR,
  Located,
  NormalizedPath,
  SourceSpan,
  TextSpan,
} from "../model/index.js";

// === Program primitives ===
export { asDocumentUri } from "../program/index.js";
export type { DocumentUri } from "../program/index.js";

// === Shared Infrastructure ===
export { debug, NOOP_TRACE } from "../shared/index.js";
export type { CompileTrace, CompilerDiagnostic } from "../shared/index.js";

// === Diagnostics ===
export {
  createDiagnosticEmitter,
  diagnosticsByCategory,
  diagnosticsByCategoryFuture,
} from "../diagnostics/index.js";
export type { DiagnosticsCatalog, DiagnosticEmitter, RawDiagnostic } from "../diagnostics/index.js";

// === Analysis (meta extraction) ===
export { extractTemplateMeta } from "../analysis/10-lower/meta-extraction.js";

// === Pipeline / hashing ===
export { stableHash } from "../pipeline/index.js";
