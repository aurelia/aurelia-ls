// Resolution package public API
//
// This package discovers Aurelia resources in a project and builds a ResourceGraph
// that the domain compiler uses for template compilation.
//
// Architecture:
// - Extraction (Layer 1): AST → SourceFacts
// - Inference (Layer 2): SourceFacts → ResourceCandidate[]
// - Registration (Layer 3): ResourceCandidate[] → RegistrationIntent[]
// - Scope (Layer 4): RegistrationIntent[] → ResourceGraph
//
// See docs/resolution-architecture.md for details.

// === Re-export domain types for convenience ===
export type {
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ResourceCollections,
  ElementRes,
  AttrRes,
  Bindable,
  ValueConverterSig,
  BindingBehaviorSig,
  Semantics,
  NormalizedPath,
} from "@aurelia-ls/domain";

// === Main entry point ===
export { resolve, type ResolutionConfig, type ResolutionResult, type ResolutionDiagnostic, type TemplateInfo, type InlineTemplateInfo } from "./resolve.js";

// === Shared types ===
export type { Logger } from "./types.js";

// === Extraction (Layer 1) ===
export { extractAllFacts, extractSourceFacts } from "./extraction/index.js";
export type {
  SourceFacts,
  ClassFacts,
  DecoratorFact,
  StaticAuFact,
  StaticDependenciesFact,
  BindableMemberFact,
  RegistrationCallFact,
  BindingMode,
} from "./extraction/index.js";

// === Inference (Layer 2) ===
export { createResolverPipeline, resolveFromDecorators, resolveFromStaticAu, resolveFromConventions } from "./inference/index.js";
export type { ResourceCandidate, BindableSpec, ResolverResult, ResolverDiagnostic, ResolverPipeline } from "./inference/index.js";

// === Registration (Layer 3) ===
export { createRegistrationAnalyzer, buildImportGraph } from "./registration/index.js";
export type { RegistrationIntent, RegistrationEvidence, ImportGraph, RegistrationAnalyzer } from "./registration/index.js";

// === Scope (Layer 4) ===
export { buildResourceGraph } from "./scope/index.js";

// === Conventions ===
export type { ConventionConfig, SuffixConfig, FilePatternConfig } from "./conventions/index.js";
export {
  DEFAULT_CONVENTION_CONFIG,
  DEFAULT_SUFFIXES,
  getResourceTypeFromClassName,
  stripResourceSuffix,
} from "./conventions/index.js";

// === Utilities ===
export {
  toKebabCase,
  toCamelCase,
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalBindableName,
  canonicalAliases,
  canonicalPath,
} from "./util/index.js";

// === Fingerprint ===
export { hashObject, stableStringify, normalizeCompilerOptions } from "./fingerprint/index.js";
