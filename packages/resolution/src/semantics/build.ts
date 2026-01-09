import type {
  BindingBehaviorDef,
  BindableDef,
  BindingMode,
  CustomAttributeDef,
  CustomElementDef,
  ResourceCatalog,
  Semantics,
  SemanticsWithCaches,
  SourceLocation,
  Sourced,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  ValueConverterDef,
  NormalizedPath,
  TextSpan,
} from "@aurelia-ls/compiler";
import { DEFAULT_SEMANTICS, prepareSemantics } from "@aurelia-ls/compiler";
import type { BindableAnnotation, ResourceAnnotation } from "../annotation.js";

export interface SemanticsArtifacts {
  readonly semantics: SemanticsWithCaches;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
}

export function buildSemanticsArtifacts(
  annotations: readonly ResourceAnnotation[],
  baseSemantics?: Semantics,
): SemanticsArtifacts {
  const base = baseSemantics ?? DEFAULT_SEMANTICS;
  const stripped = stripSemanticsCaches(base);

  const elements: Record<string, CustomElementDef> = {};
  const attributes: Record<string, CustomAttributeDef> = {};
  const controllers: Record<string, TemplateControllerDef> = {};
  const valueConverters: Record<string, ValueConverterDef> = {};
  const bindingBehaviors: Record<string, BindingBehaviorDef> = {};

  for (const annotation of annotations) {
    switch (annotation.kind) {
      case "custom-element":
        elements[annotation.name] = toCustomElementDef(annotation);
        break;
      case "custom-attribute":
        attributes[annotation.name] = toCustomAttributeDef(annotation);
        break;
      case "template-controller":
        controllers[annotation.name] = toTemplateControllerDef(annotation);
        break;
      case "value-converter":
        valueConverters[annotation.name] = toValueConverterDef(annotation);
        break;
      case "binding-behavior":
        bindingBehaviors[annotation.name] = toBindingBehaviorDef(annotation);
        break;
    }
  }

  const sem: Semantics = {
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

  const prepared = prepareSemantics(sem);

  const syntax: TemplateSyntaxRegistry = {
    bindingCommands: prepared.bindingCommands,
    attributePatterns: prepared.attributePatterns,
    controllers: prepared.resources.controllers,
  };

  return {
    semantics: prepared,
    catalog: prepared.catalog,
    syntax,
  };
}

function stripSemanticsCaches(base: Semantics): Semantics {
  const {
    resources,
    bindingCommands,
    attributePatterns,
    catalog,
    ...rest
  } = base as SemanticsWithCaches;
  void resources;
  void bindingCommands;
  void attributePatterns;
  void catalog;
  return rest;
}

function toCustomElementDef(annotation: ResourceAnnotation): CustomElementDef {
  if (annotation.kind !== "custom-element") {
    throw new Error(`Expected custom-element, got ${annotation.kind}`);
  }

  const file = annotation.source;
  const span = annotation.span;
  const bindables = buildBindableDefs(annotation.bindables, file, span);

  return {
    kind: "custom-element",
    className: sourced(annotation.className, file, span),
    name: sourced(annotation.name, file, span),
    aliases: annotation.aliases.map((alias) => sourced(alias, file, span)),
    containerless: sourced(annotation.element?.containerless ?? false, file, span),
    shadowOptions: sourced(undefined, file, span),
    capture: sourced(false, file, span),
    processContent: sourced(false, file, span),
    boundary: sourced(annotation.element?.boundary ?? false, file, span),
    bindables,
    dependencies: [],
    file,
  };
}

function toCustomAttributeDef(annotation: ResourceAnnotation): CustomAttributeDef {
  if (annotation.kind !== "custom-attribute") {
    throw new Error(`Expected custom-attribute, got ${annotation.kind}`);
  }

  const file = annotation.source;
  const span = annotation.span;
  const bindables = buildBindableDefs(annotation.bindables, file, span);
  const primary = annotation.attribute?.primary;

  return {
    kind: "custom-attribute",
    className: sourced(annotation.className, file, span),
    name: sourced(annotation.name, file, span),
    aliases: annotation.aliases.map((alias) => sourced(alias, file, span)),
    noMultiBindings: sourced(annotation.attribute?.noMultiBindings ?? false, file, span),
    ...(primary ? { primary: sourced(primary, file, span) } : {}),
    bindables,
    file,
  };
}

function toTemplateControllerDef(annotation: ResourceAnnotation): TemplateControllerDef {
  if (annotation.kind !== "template-controller") {
    throw new Error(`Expected template-controller, got ${annotation.kind}`);
  }

  const file = annotation.source;
  const span = annotation.span;
  const bindables = buildBindableDefs(annotation.bindables, file, span);

  return {
    kind: "template-controller",
    className: sourced(annotation.className, file, span),
    name: sourced(annotation.name, file, span),
    aliases: sourced(annotation.aliases, file, span),
    noMultiBindings: sourced(annotation.attribute?.noMultiBindings ?? false, file, span),
    bindables,
    file,
  };
}

function toValueConverterDef(annotation: ResourceAnnotation): ValueConverterDef {
  if (annotation.kind !== "value-converter") {
    throw new Error(`Expected value-converter, got ${annotation.kind}`);
  }

  const file = annotation.source;
  const span = annotation.span;
  return {
    kind: "value-converter",
    className: sourced(annotation.className, file, span),
    name: sourced(annotation.name, file, span),
    file,
  };
}

function toBindingBehaviorDef(annotation: ResourceAnnotation): BindingBehaviorDef {
  if (annotation.kind !== "binding-behavior") {
    throw new Error(`Expected binding-behavior, got ${annotation.kind}`);
  }

  const file = annotation.source;
  const span = annotation.span;
  return {
    kind: "binding-behavior",
    className: sourced(annotation.className, file, span),
    name: sourced(annotation.name, file, span),
    file,
  };
}

function buildBindableDefs(
  bindables: readonly BindableAnnotation[],
  file: NormalizedPath,
  span?: TextSpan,
): Record<string, BindableDef> {
  const defs: Record<string, BindableDef> = {};
  for (const bindable of bindables) {
    defs[bindable.name] = toBindableDef(bindable, file, span);
  }
  return defs;
}

function toBindableDef(
  bindable: BindableAnnotation,
  file: NormalizedPath,
  span?: TextSpan,
): BindableDef {
  const mode = (bindable.mode ?? "default") as BindingMode;
  const primary = bindable.primary ?? false;
  const attribute = bindable.attribute ?? bindable.name;
  return {
    property: sourced(bindable.name, file, span),
    attribute: sourced(attribute, file, span),
    mode: sourced(mode, file, span),
    primary: sourced(primary, file, span),
    ...(bindable.type ? { type: sourced(bindable.type, file, span) } : {}),
  };
}

function sourced<T>(
  value: T | undefined,
  file: NormalizedPath,
  span?: TextSpan,
): Sourced<T> {
  const location = toSourceLocation(file, span);
  const base = { origin: "source" } as Sourced<T>;
  if (value !== undefined) {
    (base as { value?: T }).value = value;
  }
  if (location) {
    (base as { location?: SourceLocation }).location = location;
  }
  return base;
}

function toSourceLocation(
  file: NormalizedPath,
  span?: TextSpan,
): SourceLocation | undefined {
  if (!span) return undefined;
  return {
    file,
    pos: span.start,
    end: span.end,
  };
}
