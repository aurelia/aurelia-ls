import {
  buildResourceGraphFromSemantics,
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
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
  type ScopeCompleteness,
  type ScopeUnresolvedRegistration,
  type ProjectSemantics,
  type ElementRes,
  type AttrRes,
  type TemplateControllerDef,
  type ValueConverterDef,
  type ValueConverterSig,
  type BindingBehaviorSig,
  type Sourced,
  type NormalizedPath,
} from '../compiler.js';
import type {
  RegistrationAnalysis,
  RegistrationEvidence,
  RegistrationSite,
  UnresolvedPattern,
  UnresolvedRegistration,
} from "../register/types.js";
import { stableStringify } from "../fingerprint/fingerprint.js";
import { unwrapSourced } from "../assemble/sourced.js";

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

type LocalScopeData = {
  className: string;
  parentOwner: NormalizedPath | null;
  resources: MutableResourceCollections;
  unresolvedRegistrations: ScopeUnresolvedRegistration[];
};

/**
 * Build a ResourceGraph from registration analysis.
 *
 * Builds parent-chained scopes with explicit boundaries:
 * - Root scope: resources registered globally (Aurelia.register, container.register)
 * - Component-local scopes: resources registered locally (static dependencies, decorator deps)
 * - Optional local-template child scopes: lexical children of their component owner
 *
 * Plugin resources (those with `package` field in BUILTIN_SEMANTICS) are only included
 * when the corresponding plugin is activated via registration.activatedPlugins.
 *
 * Note: A resource can have multiple registration sites (both global AND local).
 * This function processes ALL sites, so a resource may appear in multiple scopes.
 */
export function buildResourceGraph(
  registration: RegistrationAnalysis,
  baseSemantics?: ProjectSemantics,
  defaultScope?: ResourceScopeId | null,
): ResourceGraph {
  const semantics = prepareProjectSemantics(baseSemantics ?? BUILTIN_SEMANTICS);

  // Build set of activated packages from plugins
  const activatedPackages = new Set<string>();
  for (const plugin of registration.activatedPlugins) {
    activatedPackages.add(plugin.package);
  }

  // Separate sites by scope
  const globalResources = createEmptyCollections();
  const globalUnresolved: ScopeUnresolvedRegistration[] = [];
  const localScopes = new Map<NormalizedPath, LocalScopeData>();

  for (const site of registration.sites) {
    if (site.scope.kind === "global") {
      if (site.resourceRef.kind === "resolved") {
        addToCollections(globalResources, site.resourceRef.resource);
      } else {
        globalUnresolved.push(scopeUnresolvedFromSite(site));
      }
      continue;
    }

    // Local scope - owner may be a component or a local-template synthetic owner.
    const scopeKey = site.scope.owner;
    let className = extractClassNameFromEvidence(site.evidence);
    let parentOwner: NormalizedPath | null = null;

    if (site.evidence.kind === "template-import" && site.evidence.localTemplateName) {
      className = localTemplateScopeLabel(site.evidence.className, site.evidence.localTemplateName);
      parentOwner = site.evidence.component;
      ensureLocalScopeEntry(localScopes, site.evidence.component, site.evidence.className, null);
    }

    const scopeData = ensureLocalScopeEntry(localScopes, scopeKey, className, parentOwner);
    if (site.resourceRef.kind === "resolved") {
      addToCollections(scopeData.resources, site.resourceRef.resource, site.alias ?? null);
    } else {
      scopeData.unresolvedRegistrations.push(scopeUnresolvedFromSite(site));
    }
  }

  for (const unresolved of registration.unresolved) {
    const targetOwner = deriveKnownLocalOwner(unresolved, localScopes);
    if (targetOwner) {
      const scopeData = ensureLocalScopeEntry(localScopes, targetOwner, "unknown", null);
      scopeData.unresolvedRegistrations.push(scopeUnresolvedFromAnalysis(unresolved));
    } else {
      globalUnresolved.push(scopeUnresolvedFromAnalysis(unresolved));
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
  const filteredGlobalResources = filterMutableCollectionsByActivatedPackages(globalResources, activatedPackages);

  // Determine target scope for global resources
  const targetScopeId = defaultScope ?? semantics.defaultScope ?? baseGraph.root;
  const targetScope = scopes[targetScopeId] ?? scopes[baseGraph.root];

  // Add global resources to target scope
  if (targetScope) {
    const overlay = diffResourceCollections(semantics.resources, filteredGlobalResources);
    if (!isResourceOverlayEmpty(overlay)) {
      scopes[targetScope.id] = {
        id: targetScope.id,
        parent: targetScope.parent,
        ...(targetScope.label ? { label: targetScope.label } : {}),
        resources: overlayScopeResources(targetScope.resources, overlay),
        ...(targetScope.completeness ? { completeness: targetScope.completeness } : {}),
      };
    }
  }

  // Create local scopes (components first, then local-template child scopes).
  const createLocalScopesPass = (withParentOwner: boolean) => {
    for (const [owner, scopeData] of localScopes) {
      const isChild = scopeData.parentOwner !== null;
      if (withParentOwner !== isChild) continue;

      const scopeId = `local:${owner}` as ResourceScopeId;
      const parentScopeId = scopeData.parentOwner
        ? (`local:${scopeData.parentOwner}` as ResourceScopeId)
        : baseGraph.root;
      const resolvedParent = scopes[parentScopeId] ? parentScopeId : baseGraph.root;

      const existing = scopes[scopeId];
      const baseScope: ResourceScope = existing ?? {
        id: scopeId,
        parent: resolvedParent,
        label: scopeData.className,
        resources: {},
      };

      scopes[scopeId] = {
        id: baseScope.id,
        parent: resolvedParent,
        ...(scopeData.className ? { label: scopeData.className } : {}),
        resources: overlayScopeResources(
          baseScope.resources,
          filterMutableCollectionsByActivatedPackages(scopeData.resources, activatedPackages),
        ),
        ...(baseScope.completeness ? { completeness: baseScope.completeness } : {}),
      };
    }
  };
  createLocalScopesPass(false);
  createLocalScopesPass(true);

  if (globalUnresolved.length > 0) {
    const rootScope = scopes[baseGraph.root];
    if (rootScope) {
      scopes[baseGraph.root] = withScopeUnresolved(rootScope, globalUnresolved);
    }
  }

  for (const [owner, scopeData] of localScopes) {
    if (scopeData.unresolvedRegistrations.length === 0) continue;
    const scopeId = `local:${owner}` as ResourceScopeId;
    const scope = scopes[scopeId];
    if (!scope) continue;
    scopes[scopeId] = withScopeUnresolved(scope, scopeData.unresolvedRegistrations);
  }

  return { version: baseGraph.version, root: baseGraph.root, scopes };
}

// --- Helper functions ---

function createEmptyCollections(): MutableResourceCollections {
  // All resource kinds start with builtins. Previously only controllers were
  // seeded, which caused builtin elements (au-compose, au-slot) and attributes
  // to be absent from scope-materialized resources — a carried-property
  // conservation bug that dropped origin, capture, and other fields.
  return {
    elements: { ...BUILTIN_SEMANTICS.resources.elements },
    attributes: { ...BUILTIN_SEMANTICS.resources.attributes },
    controllers: { ...BUILTIN_SEMANTICS.resources.controllers },
    valueConverters: { ...BUILTIN_SEMANTICS.resources.valueConverters },
    bindingBehaviors: { ...BUILTIN_SEMANTICS.resources.bindingBehaviors },
  };
}

function ensureLocalScopeEntry(
  localScopes: Map<NormalizedPath, LocalScopeData>,
  owner: NormalizedPath,
  className: string,
  parentOwner: NormalizedPath | null,
): LocalScopeData {
  const existing = localScopes.get(owner);
  if (existing) {
    if (!existing.parentOwner && parentOwner) {
      existing.parentOwner = parentOwner;
    }
    if (existing.className === "unknown" && className !== "unknown") {
      existing.className = className;
    }
    return existing;
  }
  const created: LocalScopeData = {
    className,
    parentOwner,
    resources: createEmptyCollections(),
    unresolvedRegistrations: [],
  };
  localScopes.set(owner, created);
  return created;
}

function localTemplateScopeLabel(componentClassName: string, localTemplateName: string): string {
  return `${componentClassName}:${localTemplateName}`;
}

function scopeUnresolvedFromSite(site: RegistrationSite): ScopeUnresolvedRegistration {
  return {
    source: "site",
    reason: site.resourceRef.kind === "unresolved" ? site.resourceRef.reason : "unknown",
    file: fileFromEvidence(site.evidence),
    span: {
      start: site.span.start,
      end: site.span.end,
    },
    ...(site.resourceRef.kind === "unresolved" ? { resourceName: site.resourceRef.name } : {}),
  };
}

function scopeUnresolvedFromAnalysis(unresolved: UnresolvedRegistration): ScopeUnresolvedRegistration {
  return {
    source: "analysis",
    reason: unresolved.reason,
    file: unresolved.file,
    span: {
      start: unresolved.span.start,
      end: unresolved.span.end,
    },
    pattern: { ...unresolvedPatternToRecord(unresolved.pattern) },
  };
}

function unresolvedPatternToRecord(pattern: UnresolvedPattern): Readonly<Record<string, unknown>> {
  return { ...pattern };
}

function withScopeUnresolved(
  scope: ResourceScope,
  unresolved: readonly ScopeUnresolvedRegistration[],
): ResourceScope {
  if (unresolved.length === 0) return scope;
  const existing = scope.completeness?.unresolvedRegistrations ?? [];
  return {
    ...scope,
    completeness: {
      complete: false,
      unresolvedRegistrations: [...existing, ...unresolved],
    },
  };
}

function fileFromEvidence(evidence: RegistrationEvidence): NormalizedPath {
  switch (evidence.kind) {
    case "aurelia-register":
    case "container-register":
    case "plugin":
      return evidence.file;
    case "static-dependencies":
    case "decorator-dependencies":
    case "static-au-dependencies":
      return evidence.component;
    case "template-import":
    case "local-template-definition":
      return evidence.templateFile;
  }
}

function deriveKnownLocalOwner(
  unresolved: UnresolvedRegistration,
  localScopes: ReadonlyMap<NormalizedPath, LocalScopeData>,
): NormalizedPath | null {
  const isTemplateOwnerAmbiguity =
    unresolved.pattern.kind === "other"
    && unresolved.pattern.description === "template-import-owner-ambiguous";
  if (!isTemplateOwnerAmbiguity) {
    return null;
  }

  if (localScopes.has(unresolved.file)) {
    return unresolved.file;
  }

  const sourceMatch = /source file '([^']+)'/i.exec(unresolved.reason);
  if (sourceMatch) {
    const owner = sourceMatch[1] as NormalizedPath;
    if (localScopes.has(owner)) {
      return owner;
    }
  }

  return null;
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
      ...(scope.completeness ? { completeness: cloneScopeCompleteness(scope.completeness) } : {}),
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
      resources: filterResourceCollectionsByActivatedPackages(scope.resources, activatedPackages),
      ...(scope.completeness ? { completeness: cloneScopeCompleteness(scope.completeness) } : {}),
    };
  }
  return { version: graph.version, root: graph.root, scopes };
}

function cloneScopeCompleteness(completeness: ScopeCompleteness): ScopeCompleteness {
  return {
    complete: completeness.complete,
    unresolvedRegistrations: completeness.unresolvedRegistrations.map((entry) => ({
      ...entry,
      span: { ...entry.span },
      ...(entry.pattern ? { pattern: { ...entry.pattern } } : {}),
    })),
  };
}

function filterResourceCollectionsByActivatedPackages(
  resources: Partial<ResourceCollections> | undefined,
  activatedPackages: Set<string>,
): Partial<ResourceCollections> {
  if (!resources) return {};
  const filtered: MutablePartialResourceCollections = {};

  const elements = filterRecordByActivatedPackages(resources.elements, activatedPackages);
  if (elements) filtered.elements = elements;

  const attributes = filterRecordByActivatedPackages(resources.attributes, activatedPackages);
  if (attributes) filtered.attributes = attributes;

  if (resources.controllers) {
    filtered.controllers = { ...resources.controllers };
  }

  const valueConverters = filterRecordByActivatedPackages(resources.valueConverters, activatedPackages);
  if (valueConverters) filtered.valueConverters = valueConverters;

  const bindingBehaviors = filterRecordByActivatedPackages(resources.bindingBehaviors, activatedPackages);
  if (bindingBehaviors) filtered.bindingBehaviors = bindingBehaviors;

  return filtered;
}

function filterMutableCollectionsByActivatedPackages(
  resources: MutableResourceCollections,
  activatedPackages: Set<string>,
): MutableResourceCollections {
  return {
    elements: filterRecordByActivatedPackages(resources.elements, activatedPackages) ?? {},
    attributes: filterRecordByActivatedPackages(resources.attributes, activatedPackages) ?? {},
    controllers: { ...resources.controllers },
    valueConverters: filterRecordByActivatedPackages(resources.valueConverters, activatedPackages) ?? {},
    bindingBehaviors: filterRecordByActivatedPackages(resources.bindingBehaviors, activatedPackages) ?? {},
  };
}

function filterRecordByActivatedPackages<T extends { package?: string }>(
  records: Readonly<Record<string, T>> | undefined,
  activatedPackages: Set<string>,
): Record<string, T> | undefined {
  if (!records) return undefined;
  const filtered: Record<string, T> = {};
  for (const [name, record] of Object.entries(records)) {
    if (!record.package || activatedPackages.has(record.package)) {
      filtered[name] = record;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
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
    evidence.kind === "template-import" ||
    evidence.kind === "local-template-definition"
  ) {
    return evidence.className;
  }
  return "unknown";
}
