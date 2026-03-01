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
} from '../compiler.js';
import type { AnalysisGap } from '../evaluate/types.js';
import { gap } from '../evaluate/types.js';
import type {
  ClassValue,
  DecoratorApplication,
} from '../evaluate/value/types.js';
import {
  extractStringWithSpan,
  extractStringProp,
  extractStringPropWithSpan,
  extractBooleanProp,
  extractStringArrayProp,
  getProperty,
} from '../evaluate/value/types.js';
import type { BindableInput } from '../assemble/resource-def.js';
import {
  buildBindableDefs,
  buildBindingBehaviorDef,
  buildCustomAttributeDef,
  buildCustomElementDef,
  buildTemplateControllerDef,
  buildValueConverterDef,
} from '../assemble/resource-def.js';
import {
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
  canonicalExplicitName,
  canonicalBindableName,
  canonicalAliases,
} from '../util/naming.js';
import {
  getStaticBindableInputs,
  mergeBindableInputs,
  parseBindablesValue,
} from './bindables.js';
import type {
  RecognizedAttributePattern,
  RecognizedBindingCommand,
} from './extensions.js';
import {
  sortAndDedupeAttributePatterns,
  sortAndDedupeBindingCommands,
} from './extensions.js';

// =============================================================================
// Main Export
// =============================================================================

export interface DecoratorMatchResult {
  resource: ResourceDef | null;
  bindingCommands: RecognizedBindingCommand[];
  attributePatterns: RecognizedAttributePattern[];
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
  const bindingCommands = collectBindingCommandRecognitions(cls, gaps);
  const attributePatterns = collectAttributePatternRecognitions(cls, gaps);

  // Collect metadata from all decorators
  const meta = collectDecoratorMeta(cls.decorators);

  // Check for resource decorators in priority order
  if (meta.element) {
    const resource = buildElementDef(cls, meta, gaps);
    return { resource, bindingCommands, attributePatterns, gaps };
  }

  if (meta.attribute) {
    const resource = buildAttributeDef(cls, meta, gaps);
    return { resource, bindingCommands, attributePatterns, gaps };
  }

  if (meta.valueConverter) {
    const resource = buildValueConverterDefFromMeta(cls, meta.valueConverter, gaps);
    return { resource, bindingCommands, attributePatterns, gaps };
  }

  if (meta.bindingBehavior) {
    const resource = buildBindingBehaviorDefFromMeta(cls, meta.bindingBehavior, gaps);
    return { resource, bindingCommands, attributePatterns, gaps };
  }

  // No resource decorator found
  return { resource: null, bindingCommands, attributePatterns, gaps };
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
// Command and Pattern Recognition
// =============================================================================

function collectBindingCommandRecognitions(
  cls: ClassValue,
  gaps: AnalysisGap[],
): RecognizedBindingCommand[] {
  const recognized: RecognizedBindingCommand[] = [];

  for (const decorator of cls.decorators) {
    if (decorator.name !== 'bindingCommand') {
      continue;
    }

    const nameResult = parseBindingCommandName(decorator);
    if (!nameResult) {
      gaps.push(gap(
        `binding command name for ${cls.className}`,
        { kind: 'dynamic-value', expression: '@bindingCommand(...)' },
        'Use a string literal or object literal with a static "name" property in @bindingCommand.',
        { file: cls.filePath },
      ));
      continue;
    }

    const normalizedName = canonicalExplicitName(nameResult.value);
    if (!normalizedName) {
      gaps.push(gap(
        `binding command name for ${cls.className}`,
        {
          kind: 'invalid-resource-name',
          className: cls.className,
          reason: 'Could not derive valid binding command name from @bindingCommand.',
        },
        'Provide a non-empty command name in @bindingCommand.',
        { file: cls.filePath },
      ));
      continue;
    }

    recognized.push({
      name: normalizedName,
      className: cls.className,
      file: cls.filePath,
      source: 'decorator',
      declarationSpan: decorator.span ?? cls.span,
      nameSpan: nameResult.span,
    });
  }

  return sortAndDedupeBindingCommands(recognized);
}

function collectAttributePatternRecognitions(
  cls: ClassValue,
  gaps: AnalysisGap[],
): RecognizedAttributePattern[] {
  const recognized: RecognizedAttributePattern[] = [];

  for (const decorator of cls.decorators) {
    if (decorator.name !== 'attributePattern') {
      continue;
    }

    if (decorator.args.length === 0) {
      gaps.push(gap(
        `attribute patterns for ${cls.className}`,
        { kind: 'dynamic-value', expression: '@attributePattern(...)' },
        'Provide one or more object literal arguments with static "pattern" and "symbols" strings.',
        { file: cls.filePath },
      ));
      continue;
    }

    for (const arg of decorator.args) {
      if (!arg || arg.kind !== 'object') {
        gaps.push(gap(
          `attribute pattern for ${cls.className}`,
          { kind: 'dynamic-value', expression: '@attributePattern(...)' },
          'Use object literal arguments for @attributePattern definitions.',
          { file: cls.filePath },
        ));
        continue;
      }

      const patternProp = extractStringPropWithSpan(arg, 'pattern');
      const symbolsProp = extractStringPropWithSpan(arg, 'symbols');
      if (!patternProp || !symbolsProp) {
        gaps.push(gap(
          `attribute pattern for ${cls.className}`,
          { kind: 'dynamic-value', expression: '@attributePattern(...)' },
          'Each @attributePattern definition requires static "pattern" and "symbols" string properties.',
          { file: cls.filePath },
        ));
        continue;
      }

      const normalizedPattern = normalizePattern(patternProp.value);
      if (!normalizedPattern) {
        gaps.push(gap(
          `attribute pattern for ${cls.className}`,
          {
            kind: 'invalid-resource-name',
            className: cls.className,
            reason: 'Could not derive valid attribute pattern identity from @attributePattern.',
          },
          'Provide a non-empty "pattern" string in @attributePattern.',
          { file: cls.filePath },
        ));
        continue;
      }

      recognized.push({
        pattern: normalizedPattern,
        symbols: symbolsProp.value.trim(),
        className: cls.className,
        file: cls.filePath,
        source: 'decorator',
        declarationSpan: decorator.span ?? cls.span,
        patternSpan: patternProp.span,
        symbolsSpan: symbolsProp.span,
      });
    }
  }

  return sortAndDedupeAttributePatterns(recognized);
}

function parseBindingCommandName(
  decorator: DecoratorApplication,
): { value: string; span?: TextSpan } | null {
  const firstArg = decorator.args[0];
  if (!firstArg) {
    return null;
  }

  const stringValue = extractStringWithSpan(firstArg);
  if (stringValue) {
    return stringValue;
  }

  if (firstArg.kind === 'object') {
    const nameProp = extractStringPropWithSpan(firstArg, 'name');
    if (nameProp) {
      return nameProp;
    }
  }

  return null;
}

function normalizePattern(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
      resource: { kind: 'custom-element', name: cls.className },
    });
    return null;
  }

  // Merge bindables from decorator, static bindables, and @bindable members
  const staticBindables = getStaticBindableInputs(cls);
  const mergedBindables = mergeBindableInputs(
    [...elementMeta.bindables, ...staticBindables],
    cls.bindableMembers,
  );
  const bindables = [...mergedBindables].sort((a, b) => a.name.localeCompare(b.name));

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
    declarationForm: 'decorator',
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
      resource: { kind: 'custom-attribute', name: cls.className },
    });
    return null;
  }

  // Merge bindables
  const staticBindables = getStaticBindableInputs(cls);
  const mergedBindables = mergeBindableInputs(
    [...attrMeta.bindables, ...staticBindables],
    cls.bindableMembers,
  );
  const bindables = [...mergedBindables].sort((a, b) => a.name.localeCompare(b.name));
  const primary = resolvePrimaryName(attrMeta.defaultProperty);
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
      declarationForm: 'decorator',
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
    declarationForm: 'decorator',
  });
}

function buildValueConverterDefFromMeta(
  cls: ClassValue,
  meta: SimpleResourceMeta,
  gaps: AnalysisGap[]
): ValueConverterDef | null {
  // Explicit name from decorator → verbatim. Class name fallback → camelCase.
  const name = meta.name ? canonicalExplicitName(meta.name) : canonicalSimpleName(cls.className);
  if (!name) {
    gaps.push({
      what: `value converter name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid value converter name' },
      suggestion: `Provide an explicit name in the @valueConverter decorator.`,
      resource: { kind: 'value-converter', name: cls.className },
    });
    return null;
  }

  return buildValueConverterDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: meta.nameSpan,
    declarationForm: 'decorator',
  });
}

function buildBindingBehaviorDefFromMeta(
  cls: ClassValue,
  meta: SimpleResourceMeta,
  gaps: AnalysisGap[]
): BindingBehaviorDef | null {
  // Explicit name from decorator → verbatim. Class name fallback → camelCase.
  const name = meta.name ? canonicalExplicitName(meta.name) : canonicalSimpleName(cls.className);
  if (!name) {
    gaps.push({
      what: `binding behavior name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid binding behavior name' },
      suggestion: `Provide an explicit name in the @bindingBehavior decorator.`,
      resource: { kind: 'binding-behavior', name: cls.className },
    });
    return null;
  }

  return buildBindingBehaviorDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: meta.nameSpan,
    declarationForm: 'decorator',
  });
}

// =============================================================================
// Bindable Building
// =============================================================================

function resolvePrimaryName(
  defaultProperty: string | undefined,
): string {
  const canonical = defaultProperty
    ? canonicalBindableName(defaultProperty) ?? defaultProperty.trim()
    : undefined;
  return canonical ?? 'value';
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
