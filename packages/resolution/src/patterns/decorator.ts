/**
 * Decorator Pattern Matcher
 *
 * Recognizes Aurelia resources from class decorators:
 * - @customElement('name') or @customElement({ name, bindables, ... })
 * - @customAttribute('name') or @customAttribute({ name, ... })
 * - @valueConverter('name')
 * - @bindingBehavior('name')
 * - @templateController (modifier for custom attributes)
 * - @containerless (modifier for custom elements)
 *
 * This is the highest-priority pattern matcher.
 */

import type {
  BindingBehaviorDef,
  CustomAttributeDef,
  CustomElementDef,
  TextSpan,
  ValueConverterDef,
  TemplateControllerDef,
  ResourceDef,
} from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../analysis/types.js';
import type {
  ClassValue,
  DecoratorApplication,
} from '../analysis/value/types.js';
import {
  extractStringWithSpan,
  extractStringProp,
  extractStringPropWithSpan,
  extractBooleanProp,
  extractStringArrayProp,
  getProperty,
} from '../analysis/value/types.js';
import type { BindableInput } from '../semantics/resource-def.js';
import {
  buildBindableDefs,
  buildBindingBehaviorDef,
  buildCustomAttributeDef,
  buildCustomElementDef,
  buildTemplateControllerDef,
  buildValueConverterDef,
} from '../semantics/resource-def.js';
import {
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalBindableName,
  canonicalAliases,
} from '../util/naming.js';
import {
  applyImplicitPrimary,
  findPrimaryBindable,
  getStaticBindableInputs,
  mergeBindableInputs,
  parseBindablesValue,
} from './bindables.js';

// =============================================================================
// Main Export
// =============================================================================

export interface DecoratorMatchResult {
  resource: ResourceDef | null;
  gaps: AnalysisGap[];
}

/**
 * Match a class against decorator patterns.
 *
 * Looks for @customElement, @customAttribute, @valueConverter, @bindingBehavior
 * decorators and extracts resource metadata.
 *
 * @param cls - The enriched ClassValue to match
 * @returns Match result with resource (or null) and any gaps
 */
export function matchDecorator(cls: ClassValue): DecoratorMatchResult {
  const gaps: AnalysisGap[] = [];

  // Collect metadata from all decorators
  const meta = collectDecoratorMeta(cls.decorators);

  // Check for resource decorators in priority order
  if (meta.element) {
    const resource = buildElementDef(cls, meta, gaps);
    return { resource, gaps };
  }

  if (meta.attribute) {
    const resource = buildAttributeDef(cls, meta, gaps);
    return { resource, gaps };
  }

  if (meta.valueConverter) {
    const resource = buildValueConverterDefFromMeta(cls, meta.valueConverter, gaps);
    return { resource, gaps };
  }

  if (meta.bindingBehavior) {
    const resource = buildBindingBehaviorDefFromMeta(cls, meta.bindingBehavior, gaps);
    return { resource, gaps };
  }

  // No resource decorator found
  return { resource: null, gaps };
}

// =============================================================================
// Metadata Collection
// =============================================================================

interface DecoratorMeta {
  element?: ElementMeta;
  attribute?: AttributeMeta;
  valueConverter?: SimpleResourceMeta;
  bindingBehavior?: SimpleResourceMeta;
  containerless: boolean;
  templateController: boolean;
}

interface ElementMeta {
  name?: string;
  nameSpan?: TextSpan;
  aliases: string[];
  bindables: BindableInput[];
  containerless: boolean;
  template?: string;
  decoratorSpan?: TextSpan;
}

interface AttributeMeta {
  name?: string;
  nameSpan?: TextSpan;
  aliases: string[];
  bindables: BindableInput[];
  isTemplateController: boolean;
  noMultiBindings: boolean;
  defaultProperty?: string;
  decoratorSpan?: TextSpan;
}

interface SimpleResourceMeta {
  name?: string;
  nameSpan?: TextSpan;
  aliases: string[];
  decoratorSpan?: TextSpan;
}

/**
 * Collect metadata from all decorators on a class.
 */
function collectDecoratorMeta(decorators: readonly DecoratorApplication[]): DecoratorMeta {
  const meta: DecoratorMeta = {
    containerless: false,
    templateController: false,
  };

  for (const dec of decorators) {
    switch (dec.name) {
      case 'containerless':
        meta.containerless = true;
        break;

      case 'templateController':
        meta.templateController = true;
        break;

      case 'customElement':
        meta.element = mergeElementMeta(meta.element, parseResourceDecorator(dec));
        break;

      case 'customAttribute':
        meta.attribute = mergeAttributeMeta(meta.attribute, parseResourceDecorator(dec));
        break;

      case 'valueConverter':
        meta.valueConverter = mergeSimpleMeta(meta.valueConverter, parseSimpleDecorator(dec));
        break;

      case 'bindingBehavior':
        meta.bindingBehavior = mergeSimpleMeta(meta.bindingBehavior, parseSimpleDecorator(dec));
        break;
    }
  }

  return meta;
}

// =============================================================================
// Decorator Argument Parsing
// =============================================================================

interface ParsedResourceDecorator {
  name?: string;
  nameSpan?: TextSpan;
  aliases: string[];
  bindables: BindableInput[];
  containerless: boolean;
  isTemplateController: boolean;
  noMultiBindings: boolean;
  defaultProperty?: string;
  template?: string;
  span?: TextSpan;
}

/**
 * Parse @customElement or @customAttribute decorator arguments.
 */
function parseResourceDecorator(dec: DecoratorApplication): ParsedResourceDecorator {
  const result: ParsedResourceDecorator = {
    aliases: [],
    bindables: [],
    containerless: false,
    isTemplateController: false,
    noMultiBindings: false,
    span: dec.span,
  };

  if (dec.args.length === 0) {
    return result;
  }

  const arg = dec.args[0];
  if (!arg) return result;

  // String argument: @customElement('my-element')
  const stringName = extractStringWithSpan(arg);
  if (stringName) {
    result.name = stringName.value;
    result.nameSpan = stringName.span;
    return result;
  }

  // Object argument: @customElement({ name: 'my-element', ... })
  if (arg.kind === 'object') {
    const nameProp = extractStringPropWithSpan(arg, 'name');
    if (nameProp) {
      result.name = nameProp.value;
      result.nameSpan = nameProp.span;
    }

    // Aliases
    const aliasesArr = extractStringArrayProp(arg, 'aliases');
    result.aliases.push(...aliasesArr);
    const alias = extractStringProp(arg, 'alias');
    if (alias) result.aliases.push(alias);

    // Bindables
    const bindablesProp = getProperty(arg, 'bindables');
    if (bindablesProp) {
      result.bindables = parseBindablesValue(bindablesProp);
    }

    // Flags
    result.containerless = extractBooleanProp(arg, 'containerless') ?? false;
    result.isTemplateController = extractBooleanProp(arg, 'isTemplateController') ??
                                   extractBooleanProp(arg, 'templateController') ?? false;
    result.noMultiBindings = extractBooleanProp(arg, 'noMultiBindings') ?? false;
    result.defaultProperty = extractStringProp(arg, 'defaultProperty');

    // Template
    result.template = extractStringProp(arg, 'template');
  }

  return result;
}

/**
 * Parse @valueConverter or @bindingBehavior decorator arguments.
 */
function parseSimpleDecorator(dec: DecoratorApplication): SimpleResourceMeta {
  const result: SimpleResourceMeta = {
    aliases: [],
    decoratorSpan: dec.span,
  };

  if (dec.args.length === 0) {
    return result;
  }

  const arg = dec.args[0];
  if (!arg) return result;

  // String argument
  const stringName = extractStringWithSpan(arg);
  if (stringName) {
    result.name = stringName.value;
    result.nameSpan = stringName.span;
    return result;
  }

  // Object argument
  if (arg.kind === 'object') {
    const nameProp = extractStringPropWithSpan(arg, 'name');
    if (nameProp) {
      result.name = nameProp.value;
      result.nameSpan = nameProp.span;
    }
    const aliasesArr = extractStringArrayProp(arg, 'aliases');
    result.aliases.push(...aliasesArr);
    const alias = extractStringProp(arg, 'alias');
    if (alias) result.aliases.push(alias);
  }

  return result;
}

// =============================================================================
// Metadata Merging
// =============================================================================

function mergeElementMeta(
  existing: ElementMeta | undefined,
  parsed: ParsedResourceDecorator
): ElementMeta {
  return {
    name: parsed.name ?? existing?.name,
    nameSpan: parsed.nameSpan ?? existing?.nameSpan,
    aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
    bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
    containerless: (existing?.containerless ?? false) || parsed.containerless,
    template: parsed.template ?? existing?.template,
    decoratorSpan: parsed.span ?? existing?.decoratorSpan,
  };
}

function mergeAttributeMeta(
  existing: AttributeMeta | undefined,
  parsed: ParsedResourceDecorator
): AttributeMeta {
  return {
    name: parsed.name ?? existing?.name,
    nameSpan: parsed.nameSpan ?? existing?.nameSpan,
    aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
    bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
    isTemplateController: (existing?.isTemplateController ?? false) || parsed.isTemplateController,
    noMultiBindings: (existing?.noMultiBindings ?? false) || parsed.noMultiBindings,
    defaultProperty: parsed.defaultProperty ?? existing?.defaultProperty,
    decoratorSpan: parsed.span ?? existing?.decoratorSpan,
  };
}

function mergeSimpleMeta(
  existing: SimpleResourceMeta | undefined,
  parsed: SimpleResourceMeta
): SimpleResourceMeta {
  return {
    name: parsed.name ?? existing?.name,
    nameSpan: parsed.nameSpan ?? existing?.nameSpan,
    aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
    decoratorSpan: parsed.decoratorSpan ?? existing?.decoratorSpan,
  };
}

// =============================================================================
// Annotation Building
// =============================================================================

function buildElementDef(
  cls: ClassValue,
  meta: DecoratorMeta,
  gaps: AnalysisGap[]
): CustomElementDef | null {
  const elementMeta = meta.element!;

  // Derive name
  const name = canonicalElementName(elementMeta.name ?? cls.className);
  if (!name) {
    gaps.push({
      what: `element name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid element name' },
      suggestion: `Provide an explicit name in the @customElement decorator.`,
    });
    return null;
  }

  // Merge bindables from decorator, static bindables, and @bindable members
  const staticBindables = getStaticBindableInputs(cls);
  const mergedBindables = mergeBindableInputs(
    [...elementMeta.bindables, ...staticBindables],
    cls.bindableMembers,
  );
  const sortedBindables = [...mergedBindables].sort((a, b) => a.name.localeCompare(b.name));
  const bindables = applyImplicitPrimary(sortedBindables);

  return buildCustomElementDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: elementMeta.nameSpan,
    aliases: canonicalAliases(elementMeta.aliases),
    bindables: buildBindableDefs(bindables, cls.filePath, elementMeta.decoratorSpan ?? cls.span),
    containerless: elementMeta.containerless || meta.containerless,
    boundary: true,
    inlineTemplate: elementMeta.template,
  });
}

function buildAttributeDef(
  cls: ClassValue,
  meta: DecoratorMeta,
  gaps: AnalysisGap[]
): CustomAttributeDef | TemplateControllerDef | null {
  const attrMeta = meta.attribute!;

  // Derive name
  const name = canonicalAttrName(attrMeta.name ?? cls.className);
  if (!name) {
    gaps.push({
      what: `attribute name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid attribute name' },
      suggestion: `Provide an explicit name in the @customAttribute decorator.`,
    });
    return null;
  }

  // Merge bindables
  const staticBindables = getStaticBindableInputs(cls);
  const mergedBindables = mergeBindableInputs(
    [...attrMeta.bindables, ...staticBindables],
    cls.bindableMembers,
  );
  const sortedBindables = [...mergedBindables].sort((a, b) => a.name.localeCompare(b.name));
  const bindables = applyImplicitPrimary(sortedBindables);
  const primary = resolvePrimaryName(bindables, attrMeta.defaultProperty);
  const bindablesWithPrimary = applyPrimaryBindable(bindables, primary);
  const isTC = attrMeta.isTemplateController || meta.templateController;

  if (isTC) {
    return buildTemplateControllerDef({
      name,
      className: cls.className,
      file: cls.filePath,
      span: cls.span,
      nameSpan: attrMeta.nameSpan,
      aliases: canonicalAliases(attrMeta.aliases),
      bindables: buildBindableDefs(bindablesWithPrimary, cls.filePath, attrMeta.decoratorSpan ?? cls.span),
      noMultiBindings: attrMeta.noMultiBindings,
    });
  }

  return buildCustomAttributeDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: attrMeta.nameSpan,
    aliases: canonicalAliases(attrMeta.aliases),
    bindables: buildBindableDefs(bindablesWithPrimary, cls.filePath, attrMeta.decoratorSpan ?? cls.span),
    primary,
    noMultiBindings: attrMeta.noMultiBindings,
  });
}

function buildValueConverterDefFromMeta(
  cls: ClassValue,
  meta: SimpleResourceMeta,
  gaps: AnalysisGap[]
): ValueConverterDef | null {
  const name = canonicalSimpleName(meta.name ?? cls.className);
  if (!name) {
    gaps.push({
      what: `value converter name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid value converter name' },
      suggestion: `Provide an explicit name in the @valueConverter decorator.`,
    });
    return null;
  }

  return buildValueConverterDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: meta.nameSpan,
  });
}

function buildBindingBehaviorDefFromMeta(
  cls: ClassValue,
  meta: SimpleResourceMeta,
  gaps: AnalysisGap[]
): BindingBehaviorDef | null {
  const name = canonicalSimpleName(meta.name ?? cls.className);
  if (!name) {
    gaps.push({
      what: `binding behavior name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid binding behavior name' },
      suggestion: `Provide an explicit name in the @bindingBehavior decorator.`,
    });
    return null;
  }

  return buildBindingBehaviorDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: meta.nameSpan,
  });
}

// =============================================================================
// Bindable Building
// =============================================================================

function resolvePrimaryName(
  bindables: BindableInput[],
  defaultProperty: string | undefined,
): string | undefined {
  const canonical = defaultProperty
    ? canonicalBindableName(defaultProperty) ?? defaultProperty.trim()
    : undefined;
  if (canonical) {
    return canonical;
  }
  return findPrimaryBindable(bindables);
}

function applyPrimaryBindable(
  bindables: BindableInput[],
  primary: string | undefined,
): BindableInput[] {
  if (!primary) {
    return bindables;
  }

  let found = false;
  const updated = bindables.map((bindable) => {
    const isPrimary = bindable.name === primary;
    if (isPrimary) {
      found = true;
    }
    return { ...bindable, primary: isPrimary };
  });

  if (!found) {
    updated.push({ name: primary, primary: true });
  }

  return updated;
}

