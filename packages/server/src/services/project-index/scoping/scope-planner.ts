import {
  buildResourceGraphFromSemantics,
  type ResourceCollections,
  type ResourceGraph,
  type ResourceScope,
  type ResourceScopeId,
  type Semantics,
} from "@aurelia-ls/domain";
import { stableStringify } from "../fingerprint/fingerprint.js";
import type { ScopePlan, ScopePlannerInputs } from "./types.js";

export function planScopes(inputs: ScopePlannerInputs): ScopePlan {
  const semantics = composeSemantics(inputs.baseSemantics, inputs.discoveryResources, inputs.defaultScope);
  const resourceGraph = composeResourceGraph(semantics, inputs.baseSemantics.resources, inputs.discoveryResources);
  const defaultScope = semantics.defaultScope ?? resourceGraph.root ?? null;
  const semanticsWithGraph = { ...semantics, resourceGraph };
  return {
    resourceGraph,
    semantics: semanticsWithGraph,
    defaultScope,
    templateScopes: {},
  };
}

function composeSemantics(
  baseSemantics: Semantics,
  discovered: ResourceCollections,
  defaultScope?: ResourceScopeId | null,
): Semantics {
  const mergedResources = mergeResources(baseSemantics.resources, discovered);
  const semantics: Semantics = {
    ...baseSemantics,
    resources: mergedResources,
  };
  const scope = defaultScope ?? baseSemantics.defaultScope;
  if (scope !== undefined) {
    semantics.defaultScope = scope;
  }
  return semantics;
}

function composeResourceGraph(
  semantics: Semantics,
  baseResources: ResourceCollections,
  discovered: ResourceCollections,
): ResourceGraph {
  const graph = semantics.resourceGraph
    ? cloneResourceGraph(semantics.resourceGraph)
    : buildResourceGraphFromSemantics(semantics);
  const scopeId = semantics.defaultScope ?? graph.root;
  const targetScope = graph.scopes[scopeId] ?? graph.scopes[graph.root];
  const overlay = diffResourceCollections(baseResources, discovered);
  if (!targetScope || isResourceOverlayEmpty(overlay)) {
    return graph;
  }
  targetScope.resources = overlayScopeResources(targetScope.resources, overlay);
  graph.scopes[targetScope.id] = targetScope;
  return graph;
}

function mergeResources(base: ResourceCollections, discovered: ResourceCollections): ResourceCollections {
  return {
    elements: { ...base.elements, ...discovered.elements },
    attributes: { ...base.attributes, ...discovered.attributes },
    controllers: { ...base.controllers, ...discovered.controllers },
    valueConverters: { ...base.valueConverters, ...discovered.valueConverters },
    bindingBehaviors: { ...base.bindingBehaviors, ...discovered.bindingBehaviors },
  };
}

function diffResourceCollections(base: ResourceCollections, overlay: ResourceCollections): Partial<ResourceCollections> {
  const diff: Partial<ResourceCollections> = {};
  const elements = diffRecords(base.elements, overlay.elements);
  if (elements) diff.elements = elements;
  const attributes = diffRecords(base.attributes, overlay.attributes);
  if (attributes) diff.attributes = attributes;
  if (stableStringify(base.controllers) !== stableStringify(overlay.controllers)) {
    diff.controllers = overlay.controllers;
  }
  const valueConverters = diffRecords(base.valueConverters, overlay.valueConverters);
  if (valueConverters) diff.valueConverters = valueConverters;
  const bindingBehaviors = diffRecords(base.bindingBehaviors, overlay.bindingBehaviors);
  if (bindingBehaviors) diff.bindingBehaviors = bindingBehaviors;
  return diff;
}

function diffRecords<T extends Record<string, unknown>>(base: T, overlay: T): T | undefined {
  const additions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overlay)) {
    const baseValue = base[key];
    if (baseValue === undefined) {
      additions[key] = value;
    } else if (stableStringify(baseValue) !== stableStringify(value)) {
      additions[key] = value;
    }
  }
  return Object.keys(additions).length ? (additions as T) : undefined;
}

function cloneResourceGraph(graph: ResourceGraph): ResourceGraph {
  const scopes: Record<ResourceScopeId, ResourceScope> = {};
  for (const [id, scope] of Object.entries(graph.scopes)) {
    scopes[id as ResourceScopeId] = {
      id: scope.id,
      parent: scope.parent,
      ...(scope.label ? { label: scope.label } : {}),
      resources: clonePartialResources(scope.resources),
    };
  }
  return { version: graph.version, root: graph.root, scopes };
}

function clonePartialResources(resources: Partial<ResourceCollections> | undefined): Partial<ResourceCollections> {
  if (!resources) return {};
  const cloned: Partial<ResourceCollections> = {};
  if (resources.elements) cloned.elements = { ...resources.elements };
  if (resources.attributes) cloned.attributes = { ...resources.attributes };
  if (resources.controllers) cloned.controllers = { ...resources.controllers };
  if (resources.valueConverters) cloned.valueConverters = { ...resources.valueConverters };
  if (resources.bindingBehaviors) cloned.bindingBehaviors = { ...resources.bindingBehaviors };
  return cloned;
}

function overlayScopeResources(
  base: Partial<ResourceCollections> | undefined,
  overlay: Partial<ResourceCollections>,
): Partial<ResourceCollections> {
  const next = clonePartialResources(base);
  if (overlay.elements) next.elements = { ...(next.elements ?? {}), ...overlay.elements };
  if (overlay.attributes) next.attributes = { ...(next.attributes ?? {}), ...overlay.attributes };
  if (overlay.controllers) next.controllers = { ...(next.controllers ?? {}), ...overlay.controllers };
  if (overlay.valueConverters) next.valueConverters = { ...(next.valueConverters ?? {}), ...overlay.valueConverters };
  if (overlay.bindingBehaviors) next.bindingBehaviors = { ...(next.bindingBehaviors ?? {}), ...overlay.bindingBehaviors };
  return next;
}

function isResourceOverlayEmpty(resources: Partial<ResourceCollections>): boolean {
  return !resources.elements && !resources.attributes && !resources.controllers && !resources.valueConverters && !resources.bindingBehaviors;
}
