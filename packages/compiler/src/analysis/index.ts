// Analysis public API - template analysis stages
//
// IMPORTANT: Consumers should import from this barrel, not from deep paths.
// This allows internal reorganization without breaking external code.

// Stage 10: Lower (HTML -> IR)
export { lowerDocument, type BuildIrOptions } from "./10-lower/lower.js";

// Meta element extraction (for resolution package)
export { extractMeta, extractTemplateMeta, stripMetaFromHtml } from "./10-lower/meta-extraction.js";

// Stage 20: Resolve (IR -> LinkedSemantics)
export { resolveHost, type ResolveHostOptions } from "./20-resolve/resolve.js";
export type {
  // Module/template structure
  LinkedSemanticsModule,
  LinkedTemplate,
  LinkedRow,
  // Node semantics
  NodeSem,
  ElementResRef,
  DomElementRef,
  AttrResRef,
  // Instruction types
  LinkedInstruction,
  LinkedPropertyBinding,
  LinkedAttributeBinding,
  LinkedStylePropertyBinding,
  LinkedListenerBinding,
  LinkedRefBinding,
  LinkedTextBinding,
  LinkedTranslationBinding,
  LinkedSetAttribute,
  LinkedSetProperty,
  LinkedSetClassAttribute,
  LinkedSetStyleAttribute,
  LinkedHydrateElement,
  LinkedHydrateAttribute,
  LinkedHydrateTemplateController,
  LinkedHydrateLetElement,
  LinkedIteratorBinding,
  LinkedElementBindable,
  LinkedAuxProp,
  IteratorAuxSpec,
  // Target resolution
  TargetSem,
  // Controller resolution
  ControllerSem,
  ControllerBranch,
  // Diagnostics
  SemDiagCode,
  SemDiagnostic,
} from "./20-resolve/types.js";

// Stage 30: Bind (LinkedSemantics -> ScopeModule)
export { bindScopes, type BindScopesOptions } from "./30-bind/bind.js";

// Stage 40: Typecheck (ScopeModule -> TypecheckModule)
export {
  typecheck,
  resolveTypecheckConfig,
  checkTypeCompatibility,
  DEFAULT_TYPECHECK_CONFIG,
  TYPECHECK_PRESETS,
  type TypecheckOptions,
  type TypecheckModule,
  type TypecheckDiagnostic,
  type TypecheckConfig,
  type TypecheckSeverity,
  type BindingContext,
  type TypeCompatibilityResult,
} from "./40-typecheck/typecheck.js";

// Stage 50: Feature usage (LinkedSemantics -> FeatureUsageSet)
export { collectFeatureUsage, type FeatureUsageOptions } from "./50-usage/usage.js";

// Shared analysis utilities
export { buildScopeLookup, type ScopeLookup } from "./shared/scope-lookup.js";
export {
  buildFrameAnalysis,
  typeFromExprAst,
  wrap,
  contextualType,
  projectIteratorLocals,
  type Env,
  type FrameTypingHints,
  type FrameAnalysis,
  type TypeCtx,
} from "./shared/type-analysis.js";
