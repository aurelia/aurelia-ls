import {
  buildResourceGraphFromSemantics,
  DEFAULT_SEMANTICS,
  prepareSemantics,
  type Bindable,
  type BindableDef,
  type ControllerConfig,
  type CustomAttributeDef,
  type CustomElementDef,
  type BindingBehaviorDef,
  type ResourceDef,
  type TypeRef,
  type ResourceCollections,
  type ResourceGraph,
  type ResourceScope,
  type ResourceScopeId,
  type Semantics,
  type ElementRes,
  type AttrRes,
  type TemplateControllerDef,
  type ValueConverterDef,
  type ValueConverterSig,
  type BindingBehaviorSig,
  type Sourced,
} from "@aurelia-ls/compiler";
import type { RegistrationAnalysis, RegistrationEvidence } from "../registration/types.js";
import { stableStringify } from "../fingerprint/fingerprint.js";
import { unwrapSourced } from "../semantics/sourced.js";

type MutableResourceCollections = {
  elements: Record<string, ElementRes>;
  attributes: Record<string, AttrRes>;
  controllers: Record<string, ControllerConfig>;
  valueConverters: Record<string, ValueConverterSig>;
  bindingBehaviors: Record<string, BindingBehaviorSig>;
};

type MutablePartialResourceCollections = {
  elements?: Record<string, ElementRes>;
  attributes?: Record<string, AttrRes>;
  controllers?: Record<string, ControllerConfig>;
  valueConverters?: Record<string, ValueConverterSig>;
  bindingBehaviors?: Record<string, BindingBehaviorSig>;
};

/**
 * Build a ResourceGraph from registration analysis.
 *
 * Enforces the two-level scope model:
 * - Global scope: resources registered globally (Aurelia.register, container.register)
 * - Local scopes: resources registered locally (static dependencies, decorator deps)
 *
 * Plugin resources (those with `package` field in DEFAULT_SEMANTICS) are only included
 * when the corresponding plugin is activated via registration.activatedPlugins.
 *
 * Note: A resource can have multiple registration sites (both global AND local).
 * This function processes ALL sites, so a resource may appear in multiple scopes.
 */
export function buildResourceGraph(
  registration: RegistrationAnalysis,
  baseSemantics?: Semantics,
  defaultScope?: ResourceScopeId | null,
): ResourceGraph {
  const semantics = prepareSemantics(baseSemantics ?? DEFAULT_SEMANTICS);

  // Build set of activated packages from plugins
  const activatedPackages = new Set<string>();
  for (const plugin of registration.activatedPlugins) {
    activatedPackages.add(plugin.package);
  }

  // Separate sites by scope
  const globalResources = createEmptyCollections();
  const localScopes = new Map<string, { className: string; resources: MutableResourceCollections }>();

  for (const site of registration.sites) {
    // Only process resolved resource references
    if (site.resourceRef.kind !== "resolved") continue;

    const resource = site.resourceRef.resource;

    if (site.scope.kind === "global") {
      // Add to global scope
      addToCollections(globalResources, resource);
    } else {
      // Local scope - use owner path as scope key
      const scopeKey = site.scope.owner;
      let scopeData = localScopes.get(scopeKey);
      if (!scopeData) {
        // Extract class name from evidence if available
        const className = extractClassNameFromEvidence(site.evidence);
        scopeData = { className, resources: createEmptyCollections() };
        localScopes.set(scopeKey, scopeData);
      }
      addToCollections(scopeData.resources, resource, site.alias ?? null);
    }
  }

  // Add orphaned resources to global scope
  // Orphans are declared resources (have decorators, static $au, etc.) that weren't
  // explicitly registered. They should still be usable in templates - the root
  // component (my-app) is never registered, for example.
  for (const orphan of registration.orphans) {
    addToCollections(globalResources, orphan.resource);
  }

  // Build the base graph, filtering out plugin resources that aren't activated
  const fullBaseGraph = semantics.resourceGraph ?? buildResourceGraphFromSemantics(semantics);
  const baseGraph = cloneResourceGraphWithFilter(fullBaseGraph, activatedPackages);
  const scopes: Record<ResourceScopeId, ResourceScope> = { ...baseGraph.scopes };

  // Determine target scope for global resources
  const targetScopeId = defaultScope ?? semantics.defaultScope ?? baseGraph.root;
  const targetScope = scopes[targetScopeId] ?? scopes[baseGraph.root];

  // Add global resources to target scope
  if (targetScope) {
    const overlay = diffResourceCollections(semantics.resources, globalResources);
    if (!isResourceOverlayEmpty(overlay)) {
      scopes[targetScope.id] = {
        id: targetScope.id,
        parent: targetScope.parent,
        ...(targetScope.label ? { label: targetScope.label } : {}),
        resources: overlayScopeResources(targetScope.resources, overlay),
      };
    }
  }

  // Create local scopes for each component with dependencies
  for (const [componentPath, scopeData] of localScopes) {
    const scopeId = `local:${componentPath}` as ResourceScopeId;

    const existing = scopes[scopeId];
    const baseScope: ResourceScope = existing ?? {
      id: scopeId,
      parent: baseGraph.root,
      label: scopeData.className,
      resources: {},
    };

    scopes[scopeId] = {
      id: baseScope.id,
      parent: baseScope.parent,
      ...(baseScope.label ? { label: baseScope.label } : {}),
      resources: overlayScopeResources(baseScope.resources, scopeData.resources),
    };
  }

  return { version: baseGraph.version, root: baseGraph.root, scopes };
}

// --- Helper functions ---

function createEmptyCollections(): MutableResourceCollections {
  return {
    elements: {},
    attributes: {},
    controllers: { ...DEFAULT_SEMANTICS.resources.controllers },
    valueConverters: {},
    bindingBehaviors: {},
  };
}

function addToCollections(
  collections: MutableResourceCollections,
  resource: ResourceDef,
  alias?: Sourced<string> | null,
): void {
  const name = unwrapSourced(resource.name);
  if (!name) return;
  const aliasName = alias ? unwrapSourced(alias) : null;
  const aliasKey = aliasName ? aliasName.toLowerCase() : null;
  const nameKey = name.toLowerCase();
  switch (resource.kind) {
    case "custom-element": {
      const entry = resourceToElement(resource);
      collections.elements[name] = entry;
      if (aliasKey && aliasKey !== nameKey) collections.elements[aliasKey] = entry;
      break;
    }
    case "custom-attribute": {
      const entry = resourceToAttribute(resource);
      collections.attributes[name] = entry;
      if (aliasKey && aliasKey !== nameKey) collections.attributes[aliasKey] = entry;
      break;
    }
    case "template-controller": {
      const entry = resourceToTemplateController(resource);
      collections.attributes[name] = entry;
      if (aliasKey && aliasKey !== nameKey) collections.attributes[aliasKey] = entry;
      break;
    }
    case "value-converter":
      collections.valueConverters[name] = resourceToValueConverter(resource);
      break;
    case "binding-behavior":
      collections.bindingBehaviors[name] = resourceToBindingBehavior(resource);
      break;
  }
}

function resourceToElement(def: CustomElementDef): ElementRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases
    .map((alias) => unwrapSourced(alias))
    .filter((alias): alias is string => !!alias);
  const containerless = unwrapSourced(def.containerless);
  const shadowOptions = unwrapSourced(def.shadowOptions);
  const capture = unwrapSourced(def.capture);
  const processContent = unwrapSourced(def.processContent);
  const boundary = unwrapSourced(def.boundary);
  const dependencies = def.dependencies
    .map((dep) => unwrapSourced(dep))
    .filter((dep): dep is string => !!dep);
  const className = unwrapSourced(def.className);

  return {
    kind: "element",
    name,
    bindables: bindableDefsToRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(containerless !== undefined ? { containerless } : {}),
    ...(shadowOptions !== undefined ? { shadowOptions } : {}),
    ...(capture !== undefined ? { capture } : {}),
    ...(processContent !== undefined ? { processContent } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
    ...(dependencies.length > 0 ? { dependencies } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToAttribute(def: CustomAttributeDef): AttrRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases
    .map((alias) => unwrapSourced(alias))
    .filter((alias): alias is string => !!alias);
  const primary = unwrapSourced(def.primary) ?? findPrimaryBindableName(def.bindables) ?? undefined;
  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  const className = unwrapSourced(def.className);

  return {
    kind: "attribute",
    name,
    bindables: bindableDefsToRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToTemplateController(def: TemplateControllerDef): AttrRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = (unwrapSourced(def.aliases) ?? []).filter((alias): alias is string => !!alias);
  const primary = findPrimaryBindableName(def.bindables) ?? undefined;
  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  const className = unwrapSourced(def.className);

  return {
    kind: "attribute",
    name,
    bindables: bindableDefsToRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    isTemplateController: true,
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToValueConverter(def: ValueConverterDef): ValueConverterSig {
  const name = unwrapSourced(def.name) ?? "";
  const className = unwrapSourced(def.className);
  return {
    name,
    in: toTypeRef(unwrapSourced(def.fromType)),
    out: toTypeRef(unwrapSourced(def.toType)),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToBindingBehavior(def: BindingBehaviorDef): BindingBehaviorSig {
  const name = unwrapSourced(def.name) ?? "";
  const className = unwrapSourced(def.className);
  return {
    name,
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function toTypeRefOptional(typeName: string | undefined): TypeRef | undefined {
  if (!typeName) return undefined;
  const trimmed = typeName.trim();
  if (!trimmed) return undefined;
  if (trimmed === "any") return { kind: "any" };
  if (trimmed === "unknown") return { kind: "unknown" };
  return { kind: "ts", name: trimmed };
}

function toTypeRef(typeName: string | undefined): TypeRef {
  return toTypeRefOptional(typeName) ?? { kind: "unknown" };
}

function bindableDefsToRecord(bindables: Readonly<Record<string, BindableDef>>): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const [key, def] of Object.entries(bindables)) {
    const name = unwrapSourced(def.property) ?? key;
    const attribute = unwrapSourced(def.attribute);
    const mode = unwrapSourced(def.mode);
    const primary = unwrapSourced(def.primary);
    const type = toTypeRefOptional(unwrapSourced(def.type));
    const doc = unwrapSourced(def.doc);

    const bindable: Bindable = {
      name,
      ...(attribute ? { attribute } : {}),
      ...(mode ? { mode } : {}),
      ...(primary !== undefined ? { primary } : {}),
      ...(type ? { type } : {}),
      ...(doc ? { doc } : {}),
    };

    record[bindable.name] = bindable;
  }
  return record;
}

function findPrimaryBindableName(defs: Readonly<Record<string, BindableDef>>): string | null {
  for (const [key, def] of Object.entries(defs)) {
    const primary = unwrapSourced(def.primary);
    if (primary) return unwrapSourced(def.property) ?? key;
  }
  return null;
}

function diffResourceCollections(base: ResourceCollections, overlay: ResourceCollections): Partial<ResourceCollections> {
  const diff: MutablePartialResourceCollections = {};
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

/**
 * Clone a ResourceGraph, filtering out plugin resources that aren't activated.
 *
 * Resources with a `package` field are only included if their package is in activatedPackages.
 * Resources without a `package` field (core resources) are always included.
 */
function cloneResourceGraphWithFilter(
  graph: ResourceGraph,
  activatedPackages: Set<string>,
): ResourceGraph {
  const scopes: Record<ResourceScopeId, ResourceScope> = {};
  for (const [id, scope] of Object.entries(graph.scopes)) {
    scopes[id as ResourceScopeId] = {
      id: scope.id,
      parent: scope.parent,
      ...(scope.label ? { label: scope.label } : {}),
      resources: filterPartialResources(scope.resources, activatedPackages),
    };
  }
  return { version: graph.version, root: graph.root, scopes };
}

/**
 * Filter resources by activated packages.
 *
 * - Resources without `package` field are always included (core resources).
 * - Resources with `package` field are only included if package is activated.
 */
function filterPartialResources(
  resources: Partial<ResourceCollections> | undefined,
  activatedPackages: Set<string>,
): Partial<ResourceCollections> {
  if (!resources) return {};
  const filtered: MutablePartialResourceCollections = {};

  if (resources.elements) {
    const elements: Record<string, ElementRes> = {};
    for (const [name, el] of Object.entries(resources.elements)) {
      if (!el.package || activatedPackages.has(el.package)) {
        elements[name] = el;
      }
    }
    if (Object.keys(elements).length > 0) {
      filtered.elements = elements;
    }
  }

  if (resources.attributes) {
    const attributes: Record<string, AttrRes> = {};
    for (const [name, attr] of Object.entries(resources.attributes)) {
      if (!attr.package || activatedPackages.has(attr.package)) {
        attributes[name] = attr;
      }
    }
    if (Object.keys(attributes).length > 0) {
      filtered.attributes = attributes;
    }
  }

  // Controllers, value converters, and binding behaviors don't have package field
  // (they're part of StandardConfiguration which is always assumed "on")
  if (resources.controllers) {
    filtered.controllers = { ...resources.controllers };
  }
  if (resources.valueConverters) {
    filtered.valueConverters = { ...resources.valueConverters };
  }
  if (resources.bindingBehaviors) {
    filtered.bindingBehaviors = { ...resources.bindingBehaviors };
  }

  return filtered;
}

function clonePartialResources(resources: Partial<ResourceCollections> | undefined): MutablePartialResourceCollections {
  if (!resources) return {};
  const cloned: MutablePartialResourceCollections = {};
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

/**
 * Extract class name from registration evidence.
 * Local registration evidence types contain the class name of the registering component.
 */
function extractClassNameFromEvidence(evidence: RegistrationEvidence): string {
  if (
    evidence.kind === "static-dependencies" ||
    evidence.kind === "static-au-dependencies" ||
    evidence.kind === "decorator-dependencies" ||
    evidence.kind === "template-import"
  ) {
    return evidence.className;
  }
  return "unknown";
}
