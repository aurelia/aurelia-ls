import type {
  ElementRes,
  LocalImportDef,
  ResourceCollections,
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
  ScopedResources,
  ProjectSemantics,
  MaterializedSemantics,
} from "./types.js";
import {
  buildAttributePatternConfigs,
  buildBindingCommandConfigs,
  buildResourceCollectionsFromSemantics,
  normalizeResourceCollections,
} from "./convert.js";
import { buildResourceCatalog } from "./catalog.js";

export type { ResourceCollections, ResourceGraph, ResourceScope, ResourceScopeId, ScopedResources };

/**
 * Derive a scoped view of resources by walking the graph from root to the
 * requested scope and applying overrides.
 *
 * - When no graph is provided, fall back to the semantics resources as-is.
 * - When a graph is provided, it's authoritative: the graph's root scope
 *   contains the properly filtered base resources (e.g., plugin resources
 *   are only included when the corresponding plugin is activated).
 */
export function materializeResourcesForScope(
  sem: ProjectSemantics,
  graph?: ResourceGraph | null,
  scope?: ResourceScopeId | null,
  localImports?: readonly LocalImportDef[],
): ScopedResources {
  if (graph) {
    // When graph is provided, it's authoritative (includes package-filtered resources)
    const rootScope = graph.scopes[graph.root];
    let acc = rootScope?.resources
      ? partialToFull(rootScope.resources)
      : extractResources(sem);

    // Local overlay: only the requested scope (no ancestor walk)
    const targetScope = scope ?? graph.root;
    if (targetScope && targetScope !== graph.root) {
      const localScope = graph.scopes[targetScope];
      acc = applyOverlay(acc, localScope?.resources);
    }
    return { scope: scope ?? null, resources: applyLocalImports(acc, localImports) };
  }

  // No graph: use semantics resources as-is
  const resources = extractResources(sem);
  return { scope: scope ?? null, resources: applyLocalImports(resources, localImports) };
}

/**
 * Convert partial resources (from a scope overlay) to full resources.
 * Missing categories become empty objects.
 */
function partialToFull(partial: Partial<ResourceCollections>): ResourceCollections {
  return normalizeResourceCollections(partial);
}

/**
 * Extract resource collections from semantics.
 */
function extractResources(sem: ProjectSemantics): ResourceCollections {
  if (sem.resources) return normalizeResourceCollections(sem.resources);
  return buildResourceCollectionsFromSemantics(sem);
}

/**
 * Create semantics with resources materialized for a specific scope.
 *
 * This is the primary integration point between the resolution pipeline and
 * the AOT compiler. It takes base semantics (typically BUILTIN_SEMANTICS),
 * a ResourceGraph from resolution, and an optional scope, then produces
 * complete MaterializedSemantics with properly merged resources.
 */
export function materializeSemanticsForScope(
  baseSem: ProjectSemantics,
  graph?: ResourceGraph | null,
  scope?: ResourceScopeId | null,
  localImports?: readonly LocalImportDef[],
): MaterializedSemantics {
  const { resources } = materializeResourcesForScope(baseSem, graph, scope, localImports);
  const bindingCommands = baseSem.bindingCommands ?? buildBindingCommandConfigs(baseSem);
  const attributePatterns = baseSem.attributePatterns ?? buildAttributePatternConfigs(baseSem);
  const catalogBase = baseSem.catalog;
  const catalog = buildResourceCatalog(
    resources,
    bindingCommands,
    attributePatterns,
    catalogBase ? { gaps: catalogBase.gaps, confidence: catalogBase.confidence } : undefined,
  );
  return {
    ...baseSem,
    resources,
    bindingCommands,
    attributePatterns,
    catalog,
    resourceGraph: graph ?? undefined,
    defaultScope: scope ?? undefined,
  };
}

/**
 * Build a simple single-scope graph from the semantics' resources.
 * Useful for callers that want to standardize on a graph shape even when they
 * do not yet have project-driven scopes.
 */
export function buildResourceGraphFromSemantics(sem: ProjectSemantics): ResourceGraph {
  const root = "root" as ResourceScopeId;
  return {
    version: "aurelia-resource-graph@1",
    root,
    scopes: {
      [root]: {
        id: root,
        parent: null,
        label: "root",
        resources: extractResources(sem),
      },
    },
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

export function applyLocalImports(
  resources: ResourceCollections,
  localImports: readonly LocalImportDef[] | undefined,
): ResourceCollections {
  if (!localImports || localImports.length === 0) {
    return resources;
  }

  const elements: Record<string, ElementRes> = { ...resources.elements };

  for (const local of localImports) {
    const name = local.name.toLowerCase();
    const existing = elements[name];
    const aliases = [
      ...(existing?.aliases ?? []),
      local.alias,
      ...(local.aliases ?? []),
    ].filter((alias): alias is string => !!alias).map(alias => alias.toLowerCase());
    const mergedAliases = Array.from(new Set(aliases));

    if (existing) {
      elements[name] = mergedAliases.length
        ? { ...existing, aliases: mergedAliases }
        : existing;
      continue;
    }

    const bindables = local.bindables ?? {};
    elements[name] = {
      kind: "element",
      name,
      bindables,
      ...(mergedAliases.length ? { aliases: mergedAliases } : {}),
    };
  }

  return {
    ...resources,
    elements,
  };
}
