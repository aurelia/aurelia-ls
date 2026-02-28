// Internal compiler primitives for project-semantics.
// Keeps project-semantics modules decoupled from package-level self-imports.

// === Language / Semantics ===
export {
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
  buildTemplateSyntaxRegistry,
} from "../schema/registry.js";
export { buildResourceCatalog } from "../schema/catalog.js";
export { buildResourceGraphFromSemantics } from "../schema/resource-graph.js";
export {
  unwrapSourced,
  stripSourcedNode,
  sanitizeSourcedSnapshotValue,
} from "../schema/sourced.js";
export { isConservativeGap } from "../convergence/confidence.js";
export {
  createResourceSymbolId,
  createLocalSymbolId,
  createBindableSymbolId,
} from "../schema/symbol-id.js";
export type {
  AttrRes,
  Bindable,
  BindableDef,
  BindingBehaviorDef,
  BindingBehaviorSig,
  CatalogGap,
  ControllerConfig,
  CustomAttributeDef,
  CustomElementDef,
  DeclarationForm,
  ElementRes,
  FeatureUsageSet,
  MaterializedSemantics,
  ProjectSemantics,
  RegistrationPlan,
  RegistrationScopePlan,
  ResourceCatalog,
  ResourceCollections,
  ResourceDef,
  ResourceGraph,
  ResourceKind,
  ResourceScope,
  ResourceScopeId,
  ScopeCompleteness,
  ScopeUnresolvedRegistration,
  SourceLocation,
  Sourced,
  SymbolId,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  TypeRef,
  ValueConverterDef,
  ValueConverterSig,
} from "../schema/types.js";
export type {
  CatalogConfidence,
} from "../diagnostics/types.js";
export type {
  ApiSurfaceBindable,
  ApiSurfaceSnapshot,
  ApiSurfaceSymbol,
  SemanticSnapshot,
  SemanticSymbolSnapshot,
} from "../schema/types.js";

// === Model / Identity ===
export {
  normalizePathForId,
  toSourceFileId,
} from "../model/identity.js";
export type { NormalizedPath } from "../model/identity.js";
export type {
  SourceSpan,
  TextSpan,
} from "../model/span.js";
export type {
  BindingMode,
  TemplateMetaIR,
  ImportMetaIR,
  Located,
} from "../model/ir.js";

// === Program primitives ===
export { asDocumentUri } from "../program/primitives.js";
export type { DocumentUri } from "../program/primitives.js";

// === Shared Infrastructure ===
export { debug } from "../shared/debug.js";
export { NOOP_TRACE } from "../shared/trace.js";
export type { CompileTrace } from "../shared/trace.js";
export type { CompilerDiagnostic } from "../shared/diagnostics.js";

// === Diagnostics ===
export { createDiagnosticEmitter } from "../diagnostics/emitter.js";
export type { DiagnosticEmitter } from "../diagnostics/emitter.js";
export type { RawDiagnostic } from "../diagnostics/engine/types.js";
export { diagnosticsByCategory, diagnosticsByCategoryFuture } from "../diagnostics/catalog/index.js";
export type { DiagnosticsCatalog } from "../diagnostics/types.js";

// === Analysis (meta extraction) ===
export { extractTemplateMeta } from "../analysis/10-lower/meta-extraction.js";

// === Pipeline / hashing ===
export { stableHash } from "../pipeline/hash.js";
