import type {
  BindingBehaviorDef,
  BindableDef,
  BindingMode,
  CustomAttributeDef,
  CustomElementDef,
  ResourceDef,
  TemplateControllerDef,
  ValueConverterDef,
  NormalizedPath,
  TextSpan,
} from "@aurelia-ls/compiler";
import { sourcedValue } from "./sourced.js";

export interface BindableInput {
  readonly name: string;
  readonly attribute?: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly type?: string;
  readonly span?: TextSpan;
}

export function buildBindableDefs(
  bindables: readonly BindableInput[],
  file: NormalizedPath,
  fallbackSpan?: TextSpan,
): Readonly<Record<string, BindableDef>> {
  const defs: Record<string, BindableDef> = {};
  for (const bindable of bindables) {
    defs[bindable.name] = buildBindableDef(bindable, file, fallbackSpan);
  }
  return defs;
}

export function buildBindableDef(
  bindable: BindableInput,
  file: NormalizedPath,
  fallbackSpan?: TextSpan,
): BindableDef {
  const span = bindable.span ?? fallbackSpan;
  const mode = bindable.mode ?? "default";
  const primary = bindable.primary ?? false;
  const attribute = bindable.attribute ?? bindable.name;
  return {
    property: sourcedValue(bindable.name, file, span),
    attribute: sourcedValue(attribute, file, span),
    mode: sourcedValue(mode, file, span),
    primary: sourcedValue(primary, file, span),
    ...(bindable.type ? { type: sourcedValue(bindable.type, file, span) } : {}),
  };
}

export interface ElementDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly aliases?: readonly string[];
  readonly bindables?: Readonly<Record<string, BindableDef>>;
  readonly containerless?: boolean;
  readonly boundary?: boolean;
  readonly inlineTemplate?: string;
}

export interface AttributeDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly aliases?: readonly string[];
  readonly bindables?: Readonly<Record<string, BindableDef>>;
  readonly primary?: string;
  readonly noMultiBindings?: boolean;
}

export interface TemplateControllerDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly aliases?: readonly string[];
  readonly bindables?: Readonly<Record<string, BindableDef>>;
  readonly noMultiBindings?: boolean;
}

export interface SimpleDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
}

export function buildCustomElementDef(input: ElementDefInput): CustomElementDef {
  return {
    kind: "custom-element",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.span),
    aliases: (input.aliases ?? []).map((alias) => sourcedValue(alias, input.file, input.span)),
    containerless: sourcedValue(input.containerless ?? false, input.file, input.span),
    shadowOptions: sourcedValue(undefined, input.file, input.span),
    capture: sourcedValue(false, input.file, input.span),
    processContent: sourcedValue(false, input.file, input.span),
    boundary: sourcedValue(input.boundary ?? false, input.file, input.span),
    bindables: input.bindables ?? {},
    dependencies: [],
    ...(input.inlineTemplate ? { inlineTemplate: sourcedValue(input.inlineTemplate, input.file, input.span) } : {}),
    file: input.file,
  };
}

export function buildCustomAttributeDef(input: AttributeDefInput): CustomAttributeDef {
  return {
    kind: "custom-attribute",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.span),
    aliases: (input.aliases ?? []).map((alias) => sourcedValue(alias, input.file, input.span)),
    noMultiBindings: sourcedValue(input.noMultiBindings ?? false, input.file, input.span),
    ...(input.primary ? { primary: sourcedValue(input.primary, input.file, input.span) } : {}),
    bindables: input.bindables ?? {},
    file: input.file,
  };
}

export function buildTemplateControllerDef(input: TemplateControllerDefInput): TemplateControllerDef {
  return {
    kind: "template-controller",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.span),
    aliases: sourcedValue(input.aliases ?? [], input.file, input.span),
    noMultiBindings: sourcedValue(input.noMultiBindings ?? false, input.file, input.span),
    bindables: input.bindables ?? {},
    file: input.file,
  };
}

export function buildValueConverterDef(input: SimpleDefInput): ValueConverterDef {
  return {
    kind: "value-converter",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.span),
    file: input.file,
  };
}

export function buildBindingBehaviorDef(input: SimpleDefInput): BindingBehaviorDef {
  return {
    kind: "binding-behavior",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.span),
    file: input.file,
  };
}

export function resourceDefName(def: ResourceDef): string | null {
  switch (def.kind) {
    case "custom-element":
    case "custom-attribute":
    case "template-controller":
    case "value-converter":
    case "binding-behavior":
      return def.name.value ?? null;
  }
  return null;
}
