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

import type { NormalizedPath, TextSpan, BindingMode } from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../extraction/types.js';
import type {
  ClassValue,
  DecoratorApplication,
  BindableMember,
  AnalyzableValue,
} from '../npm/value/types.js';
import {
  extractString,
  extractBoolean,
  extractStringArray,
  extractStringProp,
  extractBooleanProp,
  extractStringArrayProp,
  getProperty,
} from '../npm/value/types.js';
import type {
  ResourceAnnotation,
  BindableAnnotation,
  AnnotationEvidence,
} from '../annotation.js';
import {
  elementAnnotation,
  attributeAnnotation,
  valueConverterAnnotation,
  bindingBehaviorAnnotation,
  explicitEvidence,
} from '../annotation.js';
import {
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalAliases,
} from '../util/naming.js';

// =============================================================================
// Main Export
// =============================================================================

export interface DecoratorMatchResult {
  annotation: ResourceAnnotation | null;
  gaps: AnalysisGap[];
}

/**
 * Match a class against decorator patterns.
 *
 * Looks for @customElement, @customAttribute, @valueConverter, @bindingBehavior
 * decorators and extracts resource metadata.
 *
 * @param cls - The enriched ClassValue to match
 * @returns Match result with annotation (or null) and any gaps
 */
export function matchDecorator(cls: ClassValue): DecoratorMatchResult {
  const gaps: AnalysisGap[] = [];

  // Collect metadata from all decorators
  const meta = collectDecoratorMeta(cls.decorators);

  // Check for resource decorators in priority order
  if (meta.element) {
    const annotation = buildElementAnnotation(cls, meta, gaps);
    return { annotation, gaps };
  }

  if (meta.attribute) {
    const annotation = buildAttributeAnnotation(cls, meta, gaps);
    return { annotation, gaps };
  }

  if (meta.valueConverter) {
    const annotation = buildValueConverterAnnotation(cls, meta.valueConverter, gaps);
    return { annotation, gaps };
  }

  if (meta.bindingBehavior) {
    const annotation = buildBindingBehaviorAnnotation(cls, meta.bindingBehavior, gaps);
    return { annotation, gaps };
  }

  // No resource decorator found
  return { annotation: null, gaps };
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
  aliases: string[];
  bindables: BindableConfig[];
  containerless: boolean;
  template?: string;
  decoratorSpan?: TextSpan;
}

interface AttributeMeta {
  name?: string;
  aliases: string[];
  bindables: BindableConfig[];
  isTemplateController: boolean;
  noMultiBindings: boolean;
  decoratorSpan?: TextSpan;
}

interface SimpleResourceMeta {
  name?: string;
  aliases: string[];
  decoratorSpan?: TextSpan;
}

interface BindableConfig {
  name: string;
  mode?: BindingMode;
  primary?: boolean;
  attribute?: string;
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
  aliases: string[];
  bindables: BindableConfig[];
  containerless: boolean;
  isTemplateController: boolean;
  noMultiBindings: boolean;
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
  const stringName = extractString(arg);
  if (stringName !== undefined) {
    result.name = stringName;
    return result;
  }

  // Object argument: @customElement({ name: 'my-element', ... })
  if (arg.kind === 'object') {
    result.name = extractStringProp(arg, 'name');

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
  const stringName = extractString(arg);
  if (stringName !== undefined) {
    result.name = stringName;
    return result;
  }

  // Object argument
  if (arg.kind === 'object') {
    result.name = extractStringProp(arg, 'name');
    const aliasesArr = extractStringArrayProp(arg, 'aliases');
    result.aliases.push(...aliasesArr);
    const alias = extractStringProp(arg, 'alias');
    if (alias) result.aliases.push(alias);
  }

  return result;
}

/**
 * Parse a bindables value (array or object form).
 */
function parseBindablesValue(value: AnalyzableValue): BindableConfig[] {
  const result: BindableConfig[] = [];

  // Array form: bindables: ['prop1', 'prop2'] or bindables: [{ name: 'prop1', mode: 'twoWay' }]
  if (value.kind === 'array') {
    for (const element of value.elements) {
      // String element
      const stringName = extractString(element);
      if (stringName !== undefined) {
        result.push({ name: stringName });
        continue;
      }

      // Object element
      if (element.kind === 'object') {
        const name = extractStringProp(element, 'name');
        if (name) {
          result.push({
            name,
            mode: extractStringProp(element, 'mode') as BindingMode | undefined,
            primary: extractBooleanProp(element, 'primary'),
            attribute: extractStringProp(element, 'attribute'),
          });
        }
      }
    }
  }

  // Object form: bindables: { prop1: { mode: 'twoWay' }, prop2: {} }
  if (value.kind === 'object') {
    for (const [name, propValue] of value.properties) {
      if (propValue.kind === 'object') {
        result.push({
          name,
          mode: extractStringProp(propValue, 'mode') as BindingMode | undefined,
          primary: extractBooleanProp(propValue, 'primary'),
          attribute: extractStringProp(propValue, 'attribute'),
        });
      } else {
        // Just the property name, no config
        result.push({ name });
      }
    }
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
    aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
    bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
    isTemplateController: (existing?.isTemplateController ?? false) || parsed.isTemplateController,
    noMultiBindings: (existing?.noMultiBindings ?? false) || parsed.noMultiBindings,
    decoratorSpan: parsed.span ?? existing?.decoratorSpan,
  };
}

function mergeSimpleMeta(
  existing: SimpleResourceMeta | undefined,
  parsed: SimpleResourceMeta
): SimpleResourceMeta {
  return {
    name: parsed.name ?? existing?.name,
    aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
    decoratorSpan: parsed.decoratorSpan ?? existing?.decoratorSpan,
  };
}

// =============================================================================
// Annotation Building
// =============================================================================

function buildElementAnnotation(
  cls: ClassValue,
  meta: DecoratorMeta,
  gaps: AnalysisGap[]
): ResourceAnnotation | null {
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

  // Merge bindables from decorator and @bindable members
  const bindables = buildBindableAnnotations(elementMeta.bindables, cls.bindableMembers);

  // Build evidence
  const evidence = explicitEvidence('decorator', elementMeta.decoratorSpan);

  return elementAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases(elementMeta.aliases),
    bindables,
    containerless: elementMeta.containerless || meta.containerless,
    boundary: true,
    inlineTemplate: elementMeta.template,
    span: cls.span,
  });
}

function buildAttributeAnnotation(
  cls: ClassValue,
  meta: DecoratorMeta,
  gaps: AnalysisGap[]
): ResourceAnnotation | null {
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
  const bindables = buildBindableAnnotations(attrMeta.bindables, cls.bindableMembers);
  const primary = findPrimaryBindable(bindables);

  // Build evidence
  const evidence = explicitEvidence('decorator', attrMeta.decoratorSpan);
  const isTC = attrMeta.isTemplateController || meta.templateController;

  return attributeAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases(attrMeta.aliases),
    bindables,
    isTemplateController: isTC,
    noMultiBindings: attrMeta.noMultiBindings,
    primary,
    span: cls.span,
  });
}

function buildValueConverterAnnotation(
  cls: ClassValue,
  meta: SimpleResourceMeta,
  gaps: AnalysisGap[]
): ResourceAnnotation | null {
  const name = canonicalSimpleName(meta.name ?? cls.className);
  if (!name) {
    gaps.push({
      what: `value converter name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid value converter name' },
      suggestion: `Provide an explicit name in the @valueConverter decorator.`,
    });
    return null;
  }

  const evidence = explicitEvidence('decorator', meta.decoratorSpan);

  return valueConverterAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases(meta.aliases),
    span: cls.span,
  });
}

function buildBindingBehaviorAnnotation(
  cls: ClassValue,
  meta: SimpleResourceMeta,
  gaps: AnalysisGap[]
): ResourceAnnotation | null {
  const name = canonicalSimpleName(meta.name ?? cls.className);
  if (!name) {
    gaps.push({
      what: `binding behavior name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid binding behavior name' },
      suggestion: `Provide an explicit name in the @bindingBehavior decorator.`,
    });
    return null;
  }

  const evidence = explicitEvidence('decorator', meta.decoratorSpan);

  return bindingBehaviorAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases(meta.aliases),
    span: cls.span,
  });
}

// =============================================================================
// Bindable Building
// =============================================================================

/**
 * Build bindable annotations from decorator config and @bindable members.
 */
function buildBindableAnnotations(
  fromDecorator: BindableConfig[],
  fromMembers: readonly BindableMember[]
): BindableAnnotation[] {
  const merged = new Map<string, BindableAnnotation>();

  // First, add decorator bindables
  for (const config of fromDecorator) {
    merged.set(config.name, {
      name: config.name,
      mode: config.mode,
      primary: config.primary,
      attribute: config.attribute,
      evidence: { source: 'analyzed', pattern: 'decorator' },
    });
  }

  // Then merge with @bindable members (can add type info)
  for (const member of fromMembers) {
    const existing = merged.get(member.name);

    // Extract mode/primary from @bindable(...) args if present
    let mode: BindingMode | undefined = existing?.mode;
    let primary: boolean | undefined = existing?.primary;

    if (member.args.length > 0) {
      const arg = member.args[0];
      if (arg?.kind === 'object') {
        mode = mode ?? extractStringProp(arg, 'mode') as BindingMode | undefined;
        primary = primary ?? extractBooleanProp(arg, 'primary');
      }
    }

    merged.set(member.name, {
      name: member.name,
      mode,
      primary,
      attribute: existing?.attribute,
      type: member.type,
      evidence: { source: 'analyzed', pattern: 'decorator' },
    });
  }

  // Sort by name for deterministic output
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find the primary bindable name.
 */
function findPrimaryBindable(bindables: BindableAnnotation[]): string | undefined {
  // Explicit primary
  for (const b of bindables) {
    if (b.primary) return b.name;
  }

  // Single bindable is implicitly primary
  if (bindables.length === 1) {
    return bindables[0]?.name;
  }

  return undefined;
}
