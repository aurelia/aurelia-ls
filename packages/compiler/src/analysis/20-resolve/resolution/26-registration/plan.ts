import type {
  FeatureUsageSet,
  RegistrationPlan,
  RegistrationScopePlan,
  ResourceCollections,
  ResourceGraph,
  ResourceScope,
  ResourceScopeId,
} from '../compiler.js';

export type UsageByScope = Readonly<Record<ResourceScopeId, FeatureUsageSet>>;

export function buildRegistrationPlan(
  resourceGraph: ResourceGraph,
  usageByScope: UsageByScope,
): RegistrationPlan {
  const scopes: Record<ResourceScopeId, RegistrationScopePlan> = {};

  for (const [key, usage] of Object.entries(usageByScope)) {
    const scopeId = key as ResourceScopeId;
    const resources = materializeScopeResources(resourceGraph, scopeId);
    const filtered = filterResources(resources, usage);
    scopes[scopeId] = { scope: scopeId, resources: filtered };
  }

  return { scopes };
}

function materializeScopeResources(graph: ResourceGraph, scopeId: ResourceScopeId): ResourceCollections {
  const rootScope = graph.scopes[graph.root];
  let acc = normalizePartialResources(rootScope?.resources);

  const resolvedScope = graph.scopes[scopeId] ? scopeId : graph.root;
  if (resolvedScope === graph.root) return acc;

  const chain = collectScopeChain(graph, resolvedScope);
  for (const scope of chain) {
    if (scope.id === graph.root) continue;
    acc = overlayResources(acc, scope.resources);
  }
  return acc;
}

function collectScopeChain(graph: ResourceGraph, scopeId: ResourceScopeId): ResourceScope[] {
  const chain: ResourceScope[] = [];
  let current = graph.scopes[scopeId];
  while (current) {
    chain.push(current);
    if (!current.parent) break;
    current = graph.scopes[current.parent];
  }
  return chain.reverse();
}

function normalizePartialResources(resources?: Partial<ResourceCollections>): ResourceCollections {
  return {
    elements: { ...(resources?.elements ?? {}) },
    attributes: { ...(resources?.attributes ?? {}) },
    controllers: { ...(resources?.controllers ?? {}) },
    valueConverters: { ...(resources?.valueConverters ?? {}) },
    bindingBehaviors: { ...(resources?.bindingBehaviors ?? {}) },
  };
}

function overlayResources(
  base: ResourceCollections,
  overlay?: Partial<ResourceCollections>,
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

function filterResources(resources: ResourceCollections, usage: FeatureUsageSet): ResourceCollections {
  return {
    elements: pickByNames(resources.elements, usage.elements),
    attributes: pickByNames(resources.attributes, usage.attributes),
    controllers: pickByNames(resources.controllers, usage.controllers),
    valueConverters: pickByNames(resources.valueConverters, usage.valueConverters),
    bindingBehaviors: pickByNames(resources.bindingBehaviors, usage.bindingBehaviors),
  };
}

function pickByNames<T>(
  record: Readonly<Record<string, T>>,
  names: readonly string[],
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const name of names) {
    const value = record[name];
    if (value) out[name] = value;
  }
  return out;
}
