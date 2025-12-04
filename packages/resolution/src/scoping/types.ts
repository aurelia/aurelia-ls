import type { NormalizedPath, ResourceCollections, ResourceGraph, ResourceScopeId, Semantics } from "@aurelia-ls/domain";

export interface ScopePlannerInputs {
  readonly baseSemantics: Semantics;
  readonly discoveryResources: ResourceCollections;
  readonly defaultScope?: ResourceScopeId | null;
}

export interface ScopePlan {
  readonly resourceGraph: ResourceGraph;
  readonly semantics: Semantics;
  readonly defaultScope: ResourceScopeId | null;
  readonly templateScopes: Record<NormalizedPath, ResourceScopeId>;
}
