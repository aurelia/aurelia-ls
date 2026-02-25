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
} from '../compiler.js';
import { debug } from '../compiler.js';
import { sourcedKnown, sourcedValue, unwrapSourced } from "./sourced.js";
import { canonicalAttrName } from "../util/naming.js";

export interface BindableInput {
  readonly name: string;
  readonly attribute?: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly type?: string;
  readonly span?: TextSpan;
  readonly attributeSpan?: TextSpan;
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
  const attributeSpan = bindable.attributeSpan ?? span;
  const mode = bindable.mode;
  const primary = bindable.primary ?? false;
  const attribute = canonicalAttrName(bindable.attribute ?? bindable.name);
  debug.project("bindable.def", {
    name: bindable.name,
    mode,
    primary,
    file,
  });
  return {
    property: sourcedValue(bindable.name, file, span),
    attribute: sourcedValue(attribute, file, attributeSpan),
    mode: sourcedValue(mode, file, span),
    primary: sourcedValue(primary, file, span),
    ...(bindable.type ? { type: sourcedValue(bindable.type, file, span) } : {}),
  };
}

import type { DeclarationForm } from '../compiler.js';

export interface ElementDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly nameSpan?: TextSpan;
  readonly aliases?: readonly string[];
  readonly bindables?: Readonly<Record<string, BindableDef>>;
  readonly containerless?: boolean;
  readonly boundary?: boolean;
  readonly inlineTemplate?: string;
  readonly declarationForm?: DeclarationForm;
}

export interface AttributeDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly nameSpan?: TextSpan;
  readonly aliases?: readonly string[];
  readonly bindables?: Readonly<Record<string, BindableDef>>;
  readonly primary?: string;
  readonly noMultiBindings?: boolean;
  readonly dependencies?: readonly string[];
  readonly declarationForm?: DeclarationForm;
}

export interface TemplateControllerDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly nameSpan?: TextSpan;
  readonly aliases?: readonly string[];
  readonly bindables?: Readonly<Record<string, BindableDef>>;
  readonly noMultiBindings?: boolean;
  readonly declarationForm?: DeclarationForm;
}

export interface SimpleDefInput {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly span?: TextSpan;
  readonly nameSpan?: TextSpan;
  readonly declarationForm?: DeclarationForm;
}

export function buildCustomElementDef(input: ElementDefInput): CustomElementDef {
  return {
    kind: "custom-element",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.nameSpan ?? input.span),
    aliases: (input.aliases ?? []).map((alias) => sourcedValue(alias, input.file, input.span)),
    containerless: sourcedValue(input.containerless ?? false, input.file, input.span),
    shadowOptions: sourcedKnown<{ readonly mode: "open" | "closed" } | undefined>(undefined, input.file, input.span),
    capture: sourcedValue(false, input.file, input.span),
    processContent: sourcedValue(false, input.file, input.span),
    boundary: sourcedValue(input.boundary ?? false, input.file, input.span),
    bindables: input.bindables ?? {},
    dependencies: [],
    ...(input.inlineTemplate ? { inlineTemplate: sourcedValue(input.inlineTemplate, input.file, input.span) } : {}),
    file: input.file,
    ...(input.declarationForm ? { declarationForm: input.declarationForm } : {}),
  };
}

export function buildCustomAttributeDef(input: AttributeDefInput): CustomAttributeDef {
  return {
    kind: "custom-attribute",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.nameSpan ?? input.span),
    aliases: (input.aliases ?? []).map((alias) => sourcedValue(alias, input.file, input.span)),
    noMultiBindings: sourcedValue(input.noMultiBindings ?? false, input.file, input.span),
    ...(input.primary ? { primary: sourcedValue(input.primary, input.file, input.span) } : {}),
    bindables: input.bindables ?? {},
    dependencies: (input.dependencies ?? []).map((dep) => sourcedValue(dep, input.file, input.span)),
    file: input.file,
    ...(input.declarationForm ? { declarationForm: input.declarationForm } : {}),
  };
}

export function buildTemplateControllerDef(input: TemplateControllerDefInput): TemplateControllerDef {
  return {
    kind: "template-controller",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.nameSpan ?? input.span),
    aliases: sourcedValue(input.aliases ?? [], input.file, input.span),
    noMultiBindings: sourcedValue(input.noMultiBindings ?? false, input.file, input.span),
    bindables: input.bindables ?? {},
    file: input.file,
    ...(input.declarationForm ? { declarationForm: input.declarationForm } : {}),
  };
}

export function buildValueConverterDef(input: SimpleDefInput): ValueConverterDef {
  return {
    kind: "value-converter",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.nameSpan ?? input.span),
    file: input.file,
    ...(input.declarationForm ? { declarationForm: input.declarationForm } : {}),
  };
}

export function buildBindingBehaviorDef(input: SimpleDefInput): BindingBehaviorDef {
  return {
    kind: "binding-behavior",
    className: sourcedValue(input.className, input.file, input.span),
    name: sourcedValue(input.name, input.file, input.nameSpan ?? input.span),
    file: input.file,
    ...(input.declarationForm ? { declarationForm: input.declarationForm } : {}),
  };
}

export function resourceDefName(def: ResourceDef): string | null {
  switch (def.kind) {
    case "custom-element":
    case "custom-attribute":
    case "template-controller":
    case "value-converter":
    case "binding-behavior":
      return unwrapSourced(def.name) ?? null;
  }
  return null;
}
