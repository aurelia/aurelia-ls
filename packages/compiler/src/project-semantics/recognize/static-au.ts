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
  CustomAttributeDef,
  CustomElementDef,
  ValueConverterDef,
  TemplateControllerDef,
  ResourceDef,
} from '../compiler.js';
import type { AnalysisGap } from '../evaluate/types.js';
import type { ClassValue, AnalyzableValue } from '../evaluate/value/types.js';
import {
  extractStringWithSpan,
  extractStringProp,
  extractStringPropWithSpan,
  extractBooleanProp,
  extractStringArrayProp,
  getProperty,
} from '../evaluate/value/types.js';
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
  canonicalAliases,
} from '../util/naming.js';
import {
  findPrimaryBindable,
  getStaticBindableInputs,
  mergeBindableInputs,
  parseBindablesValue,
} from './bindables.js';

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
  const nameProp = extractStringPropWithSpan(au, 'name');
  const rawName = nameProp?.value ?? cls.className;
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
  const staticBindables = getStaticBindableInputs(cls);
  const mergedBindables = mergeBindableInputs(
    [...staticBindables, ...bindables],
    cls.bindableMembers,
  );
  const containerless = extractBooleanProp(au, 'containerless') ?? false;
  const template = extractStringProp(au, 'template');

  const resource = buildCustomElementDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: nameProp?.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(mergedBindables, cls.filePath, au.span ?? cls.span),
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
  const nameProp = extractStringPropWithSpan(au, 'name');
  const rawName = nameProp?.value ?? cls.className;
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
  const staticBindables = getStaticBindableInputs(cls);
  const mergedBindables = mergeBindableInputs(
    [...staticBindables, ...bindables],
    cls.bindableMembers,
  );
  const isTemplateController = extractBooleanProp(au, 'isTemplateController') ?? false;
  const noMultiBindings = extractBooleanProp(au, 'noMultiBindings') ?? false;

  // Find primary
  const primary = findPrimaryBindable(mergedBindables);

  if (isTemplateController) {
    const resource = buildTemplateControllerDef({
      name,
      className: cls.className,
      file: cls.filePath,
      span: cls.span,
      nameSpan: nameProp?.span,
      aliases: canonicalAliases([...aliases]),
      bindables: buildBindableDefs(mergedBindables, cls.filePath, au.span ?? cls.span),
      noMultiBindings,
    });
    return { resource, gaps };
  }

  const resource = buildCustomAttributeDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    nameSpan: nameProp?.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(mergedBindables, cls.filePath, au.span ?? cls.span),
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
  const nameProp = extractStringPropWithSpan(au, 'name');
  const rawName = nameProp?.value ?? cls.className;
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
    nameSpan: nameProp?.span,
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
  const nameProp = extractStringPropWithSpan(au, 'name');
  const rawName = nameProp?.value ?? cls.className;
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
    nameSpan: nameProp?.span,
  });

  return { resource, gaps };
}


