import {
  buildResourceGraphFromSemantics,
  DEFAULT_SEMANTICS,
  type Bindable,
  type TypeRef,
  type ResourceCollections,
  type ResourceGraph,
  type ResourceScope,
  type ResourceScopeId,
  type Semantics,
  type ElementRes,
  type AttrRes,
  type ValueConverterSig,
  type BindingBehaviorSig,
} from "@aurelia-ls/domain";
import type { RegistrationIntent } from "../registration/types.js";
import type { ResourceCandidate, BindableSpec } from "../inference/types.js";
import { stableStringify } from "../fingerprint/fingerprint.js";

/**
 * Build a ResourceGraph from registration intents.
 *
 * Enforces the two-level scope model:
 * - Global scope: resources with kind="global" or kind="unknown"
 * - Local scopes: resources with kind="local" (one scope per component)
 */
export function buildResourceGraph(
  intents: readonly RegistrationIntent[],
  baseSemantics?: Semantics,
  defaultScope?: ResourceScopeId | null,
): ResourceGraph {
  const semantics = baseSemantics ?? DEFAULT_SEMANTICS;

  // Separate intents by scope
  const globalResources = createEmptyCollections();
  const localScopes = new Map<string, { className: string; resources: ResourceCollections }>();

  for (const intent of intents) {
    if (intent.kind === "global" || intent.kind === "unknown") {
      // Add to global scope
      addToCollections(globalResources, intent.resource);
    } else if (intent.kind === "local" && intent.scope) {
      // Add to component-local scope
      const scopeKey = intent.scope;
      let scopeData = localScopes.get(scopeKey);
      if (!scopeData) {
        // Find the component class name from evidence
        const depEvidence = intent.evidence.find((e) => e.kind === "static-dependencies");
        const className = depEvidence?.kind === "static-dependencies" ? depEvidence.className : "unknown";
        scopeData = { className, resources: createEmptyCollections() };
        localScopes.set(scopeKey, scopeData);
      }
      addToCollections(scopeData.resources, intent.resource);
    }
  }

  // Build the graph
  const baseGraph = semantics.resourceGraph ?? buildResourceGraphFromSemantics(semantics);
  const graph = cloneResourceGraph(baseGraph);

  // Determine target scope for global resources
  const targetScopeId = defaultScope ?? semantics.defaultScope ?? graph.root;
  let targetScope = graph.scopes[targetScopeId];

  // If target scope doesn't exist, fall back to root
  if (!targetScope) {
    targetScope = graph.scopes[graph.root];
  }

  // Add global resources to target scope
  if (targetScope) {
    const overlay = diffResourceCollections(semantics.resources, globalResources);
    if (!isResourceOverlayEmpty(overlay)) {
      targetScope.resources = overlayScopeResources(targetScope.resources, overlay);
    }
  }

  // Create local scopes for each component with dependencies
  for (const [componentPath, scopeData] of localScopes) {
    const scopeId = `local:${componentPath}` as ResourceScopeId;

    // Check if scope already exists
    if (!graph.scopes[scopeId]) {
      graph.scopes[scopeId] = {
        id: scopeId,
        parent: graph.root,
        label: scopeData.className,
        resources: {},
      };
    }

    // Add local resources
    const localScope = graph.scopes[scopeId];
    if (localScope) {
      localScope.resources = overlayScopeResources(localScope.resources, scopeData.resources);
    }
  }

  return graph;
}

// --- Helper functions ---

function createEmptyCollections(): ResourceCollections {
  return {
    elements: {},
    attributes: {},
    controllers: DEFAULT_SEMANTICS.resources.controllers,
    valueConverters: {},
    bindingBehaviors: {},
  };
}

function addToCollections(collections: ResourceCollections, candidate: ResourceCandidate): void {
  if (candidate.kind === "element") {
    collections.elements[candidate.name] = candidateToElement(candidate);
  } else if (candidate.kind === "attribute") {
    collections.attributes[candidate.name] = candidateToAttribute(candidate);
  } else if (candidate.kind === "valueConverter") {
    collections.valueConverters[candidate.name] = candidateToValueConverter(candidate);
  } else if (candidate.kind === "bindingBehavior") {
    collections.bindingBehaviors[candidate.name] = candidateToBindingBehavior(candidate);
  }
}

function candidateToElement(c: ResourceCandidate): ElementRes {
  return {
    kind: "element",
    name: c.name,
    bindables: bindableSpecsToRecord(c.bindables),
    ...(c.aliases.length > 0 ? { aliases: [...c.aliases] } : {}),
    ...(c.containerless ? { containerless: true } : {}),
    ...(c.boundary ? { boundary: true } : {}),
  };
}

function candidateToAttribute(c: ResourceCandidate): AttrRes {
  return {
    kind: "attribute",
    name: c.name,
    bindables: bindableSpecsToRecord(c.bindables),
    ...(c.aliases.length > 0 ? { aliases: [...c.aliases] } : {}),
    ...(c.primary ? { primary: c.primary } : {}),
    ...(c.isTemplateController ? { isTemplateController: true } : {}),
    ...(c.noMultiBindings ? { noMultiBindings: true } : {}),
  };
}

function candidateToValueConverter(c: ResourceCandidate): ValueConverterSig {
  return {
    name: c.name,
    in: { kind: "unknown" },
    out: { kind: "unknown" },
  };
}

function candidateToBindingBehavior(c: ResourceCandidate): BindingBehaviorSig {
  return { name: c.name };
}

function bindableSpecsToRecord(specs: readonly BindableSpec[]): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const spec of specs) {
    const type: TypeRef = spec.type ? { kind: "ts", name: spec.type } : { kind: "unknown" };
    const bindable: Bindable = {
      name: spec.name,
      type,
    };
    if (spec.mode) {
      bindable.mode = spec.mode;
    }
    record[spec.name] = bindable;
  }
  return record;
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
  return (
    !resources.elements &&
    !resources.attributes &&
    !resources.controllers &&
    !resources.valueConverters &&
    !resources.bindingBehaviors
  );
}
