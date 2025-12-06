import type {
  AttrRes,
  BindingBehaviorSig,
  Controllers,
  ElementRes,
  Semantics,
  ValueConverterSig,
} from "./registry.js";
import type { Brand } from "../model/identity.js";

export type ResourceScopeId = string & Brand<"ResourceScopeId">;

export interface ResourceCollections {
  elements: Record<string, ElementRes>;
  attributes: Record<string, AttrRes>;
  controllers: Controllers;
  valueConverters: Record<string, ValueConverterSig>;
  bindingBehaviors: Record<string, BindingBehaviorSig>;
}

export interface ResourceScope {
  id: ResourceScopeId;
  parent: ResourceScopeId | null;
  label?: string;
  resources: Partial<ResourceCollections>;
}

export interface ResourceGraph {
  version: "aurelia-resource-graph@1";
  root: ResourceScopeId;
  scopes: Record<ResourceScopeId, ResourceScope>;
}

export interface ScopedResources {
  scope: ResourceScopeId | null;
  resources: ResourceCollections;
}

/**
 * Derive a scoped view of resources by walking the graph from root to the
 * requested scope and applying overrides.
 *
 * - When no graph is provided, fall back to the semantics.resources as-is.
 * - The base semantics.resources act as the implicit root payload; scopes only
 *   need to specify overrides/additions.
 */
export function materializeResourcesForScope(
  sem: Semantics,
  graph?: ResourceGraph | null,
  scope?: ResourceScopeId | null,
): ScopedResources {
  // Base: implicit root (semantics.resources)
  let acc = cloneResources(sem.resources);

  if (graph) {
    // Root overlay from graph (if provided)
    const rootScope = graph.scopes[graph.root];
    acc = applyOverlay(acc, rootScope?.resources);

    // Local overlay: only the requested scope (no ancestor walk)
    const targetScope = scope ?? graph.root;
    if (targetScope && targetScope !== graph.root) {
      const localScope = graph.scopes[targetScope];
      acc = applyOverlay(acc, localScope?.resources);
    }
    return { scope: scope ?? null, resources: acc };
  }

  return { scope: scope ?? null, resources: acc };
}

/**
 * Create semantics with resources materialized for a specific scope.
 *
 * This is the primary integration point between the resolution pipeline and
 * the domain compiler. It takes base semantics (typically DEFAULT_SEMANTICS),
 * a ResourceGraph from resolution, and an optional scope, then produces
 * complete Semantics with properly merged resources.
 *
 * @param baseSem - Base semantics (built-in Aurelia resources)
 * @param graph - ResourceGraph from resolution (contains project resources)
 * @param scope - Scope to materialize (defaults to graph root)
 * @returns Complete Semantics ready for compilation
 *
 * @example
 * ```typescript
 * // After resolution
 * const { resourceGraph } = resolve(program);
 *
 * // Create scope-specific semantics for compilation
 * const semantics = materializeSemanticsForScope(
 *   DEFAULT_SEMANTICS,
 *   resourceGraph,
 *   localScopeId,
 * );
 *
 * // Use with AOT compilation
 * const result = compileWithAot(markup, { semantics });
 * ```
 */
export function materializeSemanticsForScope(
  baseSem: Semantics,
  graph?: ResourceGraph | null,
  scope?: ResourceScopeId | null,
): Semantics {
  const { resources } = materializeResourcesForScope(baseSem, graph, scope);
  return {
    ...baseSem,
    resources,
    resourceGraph: graph ?? null,
    defaultScope: scope ?? null,
  };
}

/**
 * Build a simple single-scope graph from the semantics' resources.
 * Useful for callers that want to standardize on a graph shape even when they
 * do not yet have project-driven scopes.
 */
export function buildResourceGraphFromSemantics(sem: Semantics): ResourceGraph {
  const root: ResourceScopeId = "root" as ResourceScopeId;
  return {
    version: "aurelia-resource-graph@1",
    root,
    scopes: {
      [root]: {
        id: root,
        parent: null,
        label: "root",
        resources: cloneResources(sem.resources),
      },
    },
  };
}

function cloneResources(res: ResourceCollections): ResourceCollections {
  return {
    elements: { ...res.elements },
    attributes: { ...res.attributes },
    controllers: { ...res.controllers },
    valueConverters: { ...res.valueConverters },
    bindingBehaviors: { ...res.bindingBehaviors },
  };
}

function applyOverlay(
  base: ResourceCollections,
  overlay: Partial<ResourceCollections> | undefined,
): ResourceCollections {
  if (!overlay) return base;
  return {
    elements: overlay.elements ? { ...base.elements, ...overlay.elements } : base.elements,
    attributes: overlay.attributes ? { ...base.attributes, ...overlay.attributes } : base.attributes,
    controllers: overlay.controllers ? { ...base.controllers, ...overlay.controllers } : base.controllers,
    valueConverters: overlay.valueConverters ? { ...base.valueConverters, ...overlay.valueConverters } : base.valueConverters,
    bindingBehaviors: overlay.bindingBehaviors ? { ...base.bindingBehaviors, ...overlay.bindingBehaviors } : base.bindingBehaviors,
  };
}
