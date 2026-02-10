import type {
  AttrRes,
  AttributePatternConfig,
  AttributePatternDef,
  Bindable,
  BindableDef,
  BindingBehaviorDef,
  BindingBehaviorSig,
  BindingCommandConfig,
  BindingCommandDef,
  Configured,
  ControllerConfig,
  CustomAttributeDef,
  CustomElementDef,
  ElementRes,
  ResourceCollections,
  ProjectSemantics,
  Sourced,
  TemplateControllerDef,
  TypeRef,
  ValueConverterDef,
  ValueConverterSig,
} from "./types.js";
import { unwrapSourced as unwrapSourcedValue } from "./sourced.js";

export function unwrapConfigured<T>(value: Configured<T> | undefined): T | undefined {
  return value?.value;
}

export function unwrapSourced<T>(value: Sourced<T> | undefined): T | undefined {
  return unwrapSourcedValue(value);
}

export function toTypeRefOptional(typeName: string | undefined): TypeRef | undefined {
  if (!typeName) return undefined;
  const trimmed = typeName.trim();
  if (!trimmed) return undefined;
  if (trimmed === "any") return { kind: "any" };
  if (trimmed === "unknown") return { kind: "unknown" };
  return { kind: "ts", name: trimmed };
}

export function toTypeRef(typeName: string | undefined): TypeRef {
  return toTypeRefOptional(typeName) ?? { kind: "unknown" };
}

export function toBindable(def: BindableDef, fallbackName: string): Bindable {
  const name = unwrapSourced(def.property) ?? fallbackName;
  const attribute = unwrapSourced(def.attribute);
  const mode = unwrapSourced(def.mode);
  const primary = unwrapSourced(def.primary);
  const type = toTypeRefOptional(unwrapSourced(def.type));
  const doc = unwrapSourced(def.doc);

  return {
    name,
    ...(attribute ? { attribute } : {}),
    ...(mode ? { mode } : {}),
    ...(primary !== undefined ? { primary } : {}),
    ...(type ? { type } : {}),
    ...(doc ? { doc } : {}),
  };
}

export function toBindableRecord(defs: Readonly<Record<string, BindableDef>>): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const [key, def] of Object.entries(defs)) {
    const bindable = toBindable(def, key);
    record[bindable.name] = bindable;
  }
  return record;
}

export function findPrimaryBindableName(defs: Readonly<Record<string, BindableDef>>): string | null {
  for (const [key, def] of Object.entries(defs)) {
    const isPrimary = unwrapSourced(def.primary);
    if (isPrimary) return unwrapSourced(def.property) ?? key;
  }
  return null;
}

export function toElementRes(def: CustomElementDef): ElementRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases
    .map(a => unwrapSourced(a))
    .filter((a): a is string => !!a);

  const containerless = unwrapSourced(def.containerless);
  const shadowOptions = unwrapSourced(def.shadowOptions);
  const capture = unwrapSourced(def.capture);
  const processContent = unwrapSourced(def.processContent);
  const boundary = unwrapSourced(def.boundary);
  const deps = def.dependencies
    .map(d => unwrapSourced(d))
    .filter((d): d is string => !!d);
  const className = unwrapSourced(def.className);
  return {
    kind: "element",
    name,
    bindables: toBindableRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(containerless !== undefined ? { containerless } : {}),
    ...(shadowOptions !== undefined ? { shadowOptions } : {}),
    ...(capture !== undefined ? { capture } : {}),
    ...(processContent !== undefined ? { processContent } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
    ...(deps.length > 0 ? { dependencies: deps } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

export function toAttrRes(def: CustomAttributeDef): AttrRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases
    .map(a => unwrapSourced(a))
    .filter((a): a is string => !!a);
  const primary = unwrapSourced(def.primary) ?? findPrimaryBindableName(def.bindables) ?? undefined;

  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  const className = unwrapSourced(def.className);
  return {
    kind: "attribute",
    name,
    bindables: toBindableRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

export function toTemplateControllerAttrRes(def: TemplateControllerDef): AttrRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = (unwrapSourced(def.aliases) ?? [])
    .filter((a): a is string => !!a);
  const primary = findPrimaryBindableName(def.bindables) ?? undefined;
  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  const className = unwrapSourced(def.className);
  return {
    kind: "attribute",
    name,
    bindables: toBindableRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    isTemplateController: true,
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

export function toControllerConfig(def: TemplateControllerDef): ControllerConfig {
  const name = unwrapSourced(def.name) ?? "";
  const bindables = toBindableRecord(def.bindables);
  const primary = findPrimaryBindableName(def.bindables) ?? "value";
  const semantics = def.semantics;

  const trigger = semantics?.trigger ?? { kind: "value", prop: primary };
  const scope = semantics?.scope ?? "overlay";

  return {
    name,
    trigger,
    scope,
    cardinality: semantics?.cardinality,
    placement: semantics?.placement,
    branches: semantics?.branches,
    linksTo: semantics?.linksTo,
    injects: semantics?.injects,
    tailProps: semantics?.tailProps,
    props: bindables,
  };
}

export function toValueConverterSig(def: ValueConverterDef): ValueConverterSig {
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

export function toBindingBehaviorSig(def: BindingBehaviorDef): BindingBehaviorSig {
  const name = unwrapSourced(def.name) ?? "";
  const className = unwrapSourced(def.className);
  return {
    name,
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

export function toBindingCommandConfig(def: BindingCommandDef): BindingCommandConfig {
  const name = unwrapConfigured(def.name) ?? "";
  const mode = unwrapConfigured(def.mode);
  const capture = unwrapConfigured(def.capture);
  const forceAttribute = unwrapConfigured(def.forceAttribute);
  const pkg = unwrapConfigured(def.package);
  return {
    name,
    kind: unwrapConfigured(def.commandKind) ?? "property",
    ...(mode ? { mode } : {}),
    ...(capture !== undefined ? { capture } : {}),
    ...(forceAttribute ? { forceAttribute } : {}),
    ...(pkg ? { package: pkg } : {}),
  };
}

export function toAttributePatternConfig(def: AttributePatternDef): AttributePatternConfig {
  const pattern = unwrapConfigured(def.pattern) ?? "";
  const symbols = unwrapConfigured(def.symbols) ?? "";
  const interpret = unwrapConfigured(def.interpret) ?? { kind: "target-command" };
  const pkg = unwrapConfigured(def.package);
  return {
    pattern,
    symbols,
    interpret,
    ...(pkg ? { package: pkg } : {}),
  };
}

export function normalizeResourceCollections(resources?: Partial<ResourceCollections>): ResourceCollections {
  return {
    elements: { ...(resources?.elements ?? {}) },
    attributes: { ...(resources?.attributes ?? {}) },
    controllers: { ...(resources?.controllers ?? {}) },
    valueConverters: { ...(resources?.valueConverters ?? {}) },
    bindingBehaviors: { ...(resources?.bindingBehaviors ?? {}) },
  };
}

export function buildResourceCollectionsFromSemantics(sem: ProjectSemantics): ResourceCollections {
  const elements = Object.fromEntries(
    Object.entries(sem.elements).map(([key, def]) => [key, toElementRes(def)]),
  );
  const attributes = Object.fromEntries(
    Object.entries(sem.attributes).map(([key, def]) => [key, toAttrRes(def)]),
  );
  const controllers = Object.fromEntries(
    Object.entries(sem.controllers).map(([key, def]) => [key, toControllerConfig(def)]),
  );

  // Template controllers are modeled as attributes with an explicit flag.
  for (const [key, def] of Object.entries(sem.controllers)) {
    if (!attributes[key]) {
      attributes[key] = toTemplateControllerAttrRes(def);
      continue;
    }
    attributes[key] = { ...attributes[key], isTemplateController: true };
  }

  return {
    elements,
    attributes,
    controllers,
    valueConverters: Object.fromEntries(
      Object.entries(sem.valueConverters).map(([key, def]) => [key, toValueConverterSig(def)]),
    ),
    bindingBehaviors: Object.fromEntries(
      Object.entries(sem.bindingBehaviors).map(([key, def]) => [key, toBindingBehaviorSig(def)]),
    ),
  };
}

export function buildBindingCommandConfigs(sem: ProjectSemantics): Record<string, BindingCommandConfig> {
  return Object.fromEntries(
    Object.entries(sem.commands).map(([key, def]) => [key, toBindingCommandConfig(def)]),
  );
}

export function buildAttributePatternConfigs(sem: ProjectSemantics): AttributePatternConfig[] {
  return sem.patterns.map((def) => toAttributePatternConfig(def));
}
