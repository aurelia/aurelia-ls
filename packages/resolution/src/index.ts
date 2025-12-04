// Resolution package public API
//
// This package discovers Aurelia resources in a project and builds a ResourceGraph
// that the domain compiler uses for template compilation.

// === Re-export domain types for convenience ===
export type {
  // Resource graph types
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ResourceCollections,
  // Resource definition types
  ElementRes,
  AttrRes,
  Bindable,
  ValueConverterSig,
  BindingBehaviorSig,
} from "@aurelia-ls/domain";

// === Shared types ===
export type { Logger } from "./types.js";

// === Discovery ===
export { runDiscovery, emptyDiscovery } from "./discovery/index.js";
export { runDecoratorDiscovery } from "./discovery/decorator-discovery.js";
export { runConventionDiscovery } from "./discovery/convention-discovery.js";
export { runDiRegistryDiscovery } from "./discovery/di-registry-discovery.js";
export { createEmptyResourceCollections, emptyDiscoveryResult } from "./discovery/shared.js";
export type {
  DiscoveryResult,
  DiscoveredResource,
  DiscoveredElement,
  DiscoveredAttribute,
  DiscoveredValueConverter,
  DiscoveredBindingBehavior,
  ResourceRegistration,
  BindableSpec,
  ResourceOptionParse,
  NameOnlyOptions,
} from "./discovery/types.js";

// === Scoping ===
export { planScopes } from "./scoping/index.js";
export type { ScopePlan, ScopePlannerInputs } from "./scoping/index.js";

// === Fingerprint ===
export { hashObject, stableStringify, normalizeCompilerOptions } from "./fingerprint/index.js";
