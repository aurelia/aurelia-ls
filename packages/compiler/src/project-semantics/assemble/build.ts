import type {
  BindingBehaviorDef,
  CatalogConfidence,
  CatalogGap,
  CustomAttributeDef,
  CustomElementDef,
  ResourceCatalog,
  ResourceDef,
  ProjectSemantics,
  MaterializedSemantics,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  ValueConverterDef,
} from '../compiler.js';
import { BUILTIN_SEMANTICS, buildResourceCatalog, prepareProjectSemantics } from '../compiler.js';
import { unwrapSourced } from "./sourced.js";

export interface SemanticsArtifacts {
  readonly semantics: MaterializedSemantics;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
}

export function buildSemanticsArtifacts(
  resources: readonly ResourceDef[],
  baseSemantics?: ProjectSemantics,
  opts?: {
    readonly gaps?: readonly CatalogGap[];
    readonly confidence?: CatalogConfidence;
  },
): SemanticsArtifacts {
  const base = baseSemantics ?? BUILTIN_SEMANTICS;
  const stripped = stripSemanticsCaches(base);

  const elements: Record<string, CustomElementDef> = {};
  const attributes: Record<string, CustomAttributeDef> = {};
  const controllers: Record<string, TemplateControllerDef> = {};
  const valueConverters: Record<string, ValueConverterDef> = {};
  const bindingBehaviors: Record<string, BindingBehaviorDef> = {};

  for (const resource of resources) {
    const name = unwrapSourced(resource.name);
    if (!name) continue;
    switch (resource.kind) {
      case "custom-element":
        elements[name] = resource;
        break;
      case "custom-attribute":
        attributes[name] = resource;
        break;
      case "template-controller":
        controllers[name] = resource;
        break;
      case "value-converter":
        valueConverters[name] = resource;
        break;
      case "binding-behavior":
        bindingBehaviors[name] = resource;
        break;
    }
  }

  const sem: ProjectSemantics = {
    ...stripped,
    elements: { ...base.elements, ...elements },
    attributes: { ...base.attributes, ...attributes },
    controllers: { ...base.controllers, ...controllers },
    valueConverters: { ...base.valueConverters, ...valueConverters },
    bindingBehaviors: { ...base.bindingBehaviors, ...bindingBehaviors },
    commands: base.commands,
    patterns: base.patterns,
    dom: base.dom,
    events: base.events,
    naming: base.naming,
    twoWayDefaults: base.twoWayDefaults,
  };

  const prepared = prepareProjectSemantics(sem);
  const catalog = opts
    ? buildResourceCatalog(prepared.resources, prepared.bindingCommands, prepared.attributePatterns, opts)
    : prepared.catalog;
  const withCatalog: MaterializedSemantics = opts ? { ...prepared, catalog } : prepared;

  const syntax: TemplateSyntaxRegistry = {
    bindingCommands: withCatalog.bindingCommands,
    attributePatterns: withCatalog.attributePatterns,
    controllers: withCatalog.resources.controllers,
  };

  return {
    semantics: withCatalog,
    catalog: withCatalog.catalog,
    syntax,
  };
}

function stripSemanticsCaches(base: ProjectSemantics): ProjectSemantics {
  const {
    resources,
    bindingCommands,
    attributePatterns,
    catalog,
    ...rest
  } = base as MaterializedSemantics;
  void resources;
  void bindingCommands;
  void attributePatterns;
  void catalog;
  return rest;
}
