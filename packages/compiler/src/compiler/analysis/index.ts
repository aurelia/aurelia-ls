// Analysis public API - template analysis stages
//
// IMPORTANT: Consumers should import from this barrel, not from deep paths.
// This allows internal reorganization without breaking external code.

// Stage 10: Lower (HTML -> IR)
export { lowerDocument, type BuildIrOptions } from "./10-lower/lower.js";

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
export { bindScopes } from "./30-bind/bind.js";

// Stage 40: Typecheck (ScopeModule -> TypecheckModule)
export { typecheck, type TypecheckOptions, type TypecheckModule, type TypecheckDiagnostic } from "./40-typecheck/typecheck.js";

// Shared analysis utilities
export { buildScopeLookup, type ScopeLookup } from "./shared/scope-lookup.js";
export {
  buildFrameAnalysis,
  typeFromExprAst,
  wrap,
  contextualType,
  projectRepeatLocals,
  type Env,
  type FrameTypingHints,
  type FrameAnalysis,
  type TypeCtx,
} from "./shared/type-analysis.js";
