/**
 * Static $au Pattern Matcher
 *
 * Recognizes Aurelia resources from static $au property:
 *
 * ```typescript
 * class MyElement {
 *   static $au = {
 *     type: 'custom-element',
 *     name: 'my-element',
 *     bindables: ['value', { name: 'items', mode: 'twoWay' }],
 *   };
 * }
 * ```
 *
 * This is the second-priority pattern matcher after decorators.
 */

import type {
  BindingBehaviorDef,
  BindingMode,
  CustomAttributeDef,
  CustomElementDef,
  TextSpan,
  ValueConverterDef,
  TemplateControllerDef,
  ResourceDef,
} from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../analysis/types.js';
import type { ClassValue, AnalyzableValue } from '../analysis/value/types.js';
import {
  extractString,
  extractBoolean,
  extractStringArray,
  extractStringProp,
  extractBindingModeProp,
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
  canonicalAliases,
} from '../util/naming.js';

// =============================================================================
// Main Export
// =============================================================================

export interface StaticAuMatchResult {
  resource: ResourceDef | null;
  gaps: AnalysisGap[];
}

/**
 * Match a class against static $au pattern.
 *
 * Looks for a `static $au` property and extracts resource metadata.
 *
 * @param cls - The enriched ClassValue to match
 * @returns Match result with resource (or null) and any gaps
 */
export function matchStaticAu(cls: ClassValue): StaticAuMatchResult {
  const gaps: AnalysisGap[] = [];

  // Look for static $au property
  const auValue = cls.staticMembers.get('$au');
  if (!auValue) {
    return { resource: null, gaps };
  }

  // Must be an object
  if (auValue.kind !== 'object') {
    gaps.push({
      what: `static $au for ${cls.className}`,
      why: { kind: 'dynamic-value', expression: 'static $au' },
      suggestion: 'Ensure static $au is an object literal, not a computed value.',
    });
    return { resource: null, gaps };
  }

  // Extract type
  const type = extractStringProp(auValue, 'type');
  if (!type) {
    // No type - not an Aurelia resource definition
    return { resource: null, gaps };
  }

  // Dispatch based on type
  switch (type) {
    case 'custom-element':
      return buildElementDef(cls, auValue, gaps);

    case 'custom-attribute':
      return buildAttributeDef(cls, auValue, gaps);

    case 'value-converter':
      return buildValueConverterDefFromAu(cls, auValue, gaps);

    case 'binding-behavior':
      return buildBindingBehaviorDefFromAu(cls, auValue, gaps);

    default:
      // Unknown type
      return { resource: null, gaps };
  }
}

// =============================================================================
// Element Definition Building
// =============================================================================

function buildElementDef(
  cls: ClassValue,
  au: AnalyzableValue,
  gaps: AnalysisGap[]
): StaticAuMatchResult {
  // Derive name
  const rawName = extractStringProp(au, 'name') ?? cls.className;
  const name = canonicalElementName(rawName);
  if (!name) {
    gaps.push({
      what: `element name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid element name from static $au' },
      suggestion: `Provide an explicit name in static $au.`,
    });
    return { resource: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(au, 'aliases');
  const bindablesProp = getProperty(au, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const containerless = extractBooleanProp(au, 'containerless') ?? false;
  const template = extractStringProp(au, 'template');

  const resource = buildCustomElementDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(bindables, cls.filePath, au.span ?? cls.span),
    containerless,
    boundary: true,
    inlineTemplate: template,
  });

  return { resource, gaps };
}

// =============================================================================
// Attribute Definition Building
// =============================================================================

function buildAttributeDef(
  cls: ClassValue,
  au: AnalyzableValue,
  gaps: AnalysisGap[]
): StaticAuMatchResult {
  // Derive name
  const rawName = extractStringProp(au, 'name') ?? cls.className;
  const name = canonicalAttrName(rawName);
  if (!name) {
    gaps.push({
      what: `attribute name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid attribute name from static $au' },
      suggestion: `Provide an explicit name in static $au.`,
    });
    return { resource: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(au, 'aliases');
  const bindablesProp = getProperty(au, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const isTemplateController = extractBooleanProp(au, 'isTemplateController') ?? false;
  const noMultiBindings = extractBooleanProp(au, 'noMultiBindings') ?? false;

  // Find primary
  const primary = findPrimaryBindable(bindables);

  if (isTemplateController) {
    const resource = buildTemplateControllerDef({
      name,
      className: cls.className,
      file: cls.filePath,
      span: cls.span,
      aliases: canonicalAliases([...aliases]),
      bindables: buildBindableDefs(bindables, cls.filePath, au.span ?? cls.span),
      noMultiBindings,
    });
    return { resource, gaps };
  }

  const resource = buildCustomAttributeDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(bindables, cls.filePath, au.span ?? cls.span),
    primary,
    noMultiBindings,
  });

  return { resource, gaps };
}

// =============================================================================
// Value Converter Definition Building
// =============================================================================

function buildValueConverterDefFromAu(
  cls: ClassValue,
  au: AnalyzableValue,
  gaps: AnalysisGap[]
): StaticAuMatchResult {
  // Derive name
  const rawName = extractStringProp(au, 'name') ?? cls.className;
  const name = canonicalSimpleName(rawName);
  if (!name) {
    gaps.push({
      what: `value converter name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid value converter name from static $au' },
      suggestion: `Provide an explicit name in static $au.`,
    });
    return { resource: null, gaps };
  }

  const resource = buildValueConverterDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
  });

  return { resource, gaps };
}

// =============================================================================
// Binding Behavior Definition Building
// =============================================================================

function buildBindingBehaviorDefFromAu(
  cls: ClassValue,
  au: AnalyzableValue,
  gaps: AnalysisGap[]
): StaticAuMatchResult {
  // Derive name
  const rawName = extractStringProp(au, 'name') ?? cls.className;
  const name = canonicalSimpleName(rawName);
  if (!name) {
    gaps.push({
      what: `binding behavior name for ${cls.className}`,
      why: { kind: 'invalid-resource-name', className: cls.className, reason: 'Could not derive valid binding behavior name from static $au' },
      suggestion: `Provide an explicit name in static $au.`,
    });
    return { resource: null, gaps };
  }

  const resource = buildBindingBehaviorDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
  });

  return { resource, gaps };
}

// =============================================================================
// Bindables Parsing
// =============================================================================

/**
 * Parse bindables from static $au.
 */
function parseBindablesValue(value: AnalyzableValue): BindableInput[] {
  const result: BindableInput[] = [];

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
            mode: extractBindingModeProp(element, 'mode'),
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
          mode: extractBindingModeProp(propValue, 'mode'),
          primary: extractBooleanProp(propValue, 'primary'),
          attribute: extractStringProp(propValue, 'attribute'),
        });
      } else {
        result.push({ name });
      }
    }
  }

  return result;
}

/**
 * Find the primary bindable name.
 */
function findPrimaryBindable(bindables: BindableInput[]): string | undefined {
  for (const b of bindables) {
    if (b.primary) return b.name;
  }
  if (bindables.length === 1) {
    return bindables[0]?.name;
  }
  return undefined;
}

