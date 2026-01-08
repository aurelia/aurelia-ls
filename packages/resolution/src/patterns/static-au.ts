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

import type { TextSpan, BindingMode } from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../extraction/types.js';
import type { ClassValue, AnalyzableValue } from '../npm/value/types.js';
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

export interface StaticAuMatchResult {
  annotation: ResourceAnnotation | null;
  gaps: AnalysisGap[];
}

/**
 * Match a class against static $au pattern.
 *
 * Looks for a `static $au` property and extracts resource metadata.
 *
 * @param cls - The enriched ClassValue to match
 * @returns Match result with annotation (or null) and any gaps
 */
export function matchStaticAu(cls: ClassValue): StaticAuMatchResult {
  const gaps: AnalysisGap[] = [];

  // Look for static $au property
  const auValue = cls.staticMembers.get('$au');
  if (!auValue) {
    return { annotation: null, gaps };
  }

  // Must be an object
  if (auValue.kind !== 'object') {
    gaps.push({
      what: `static $au for ${cls.className}`,
      why: { kind: 'dynamic-value', expression: 'static $au' },
      suggestion: 'Ensure static $au is an object literal, not a computed value.',
    });
    return { annotation: null, gaps };
  }

  // Extract type
  const type = extractStringProp(auValue, 'type');
  if (!type) {
    // No type - not an Aurelia resource definition
    return { annotation: null, gaps };
  }

  // Dispatch based on type
  switch (type) {
    case 'custom-element':
      return buildElementAnnotation(cls, auValue, gaps);

    case 'custom-attribute':
      return buildAttributeAnnotation(cls, auValue, gaps);

    case 'value-converter':
      return buildValueConverterAnnotation(cls, auValue, gaps);

    case 'binding-behavior':
      return buildBindingBehaviorAnnotation(cls, auValue, gaps);

    default:
      // Unknown type
      return { annotation: null, gaps };
  }
}

// =============================================================================
// Element Annotation Building
// =============================================================================

function buildElementAnnotation(
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
    return { annotation: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(au, 'aliases');
  const bindablesProp = getProperty(au, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const containerless = extractBooleanProp(au, 'containerless') ?? false;
  const template = extractStringProp(au, 'template');

  const evidence = explicitEvidence('static-au', au.span);

  const annotation = elementAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    bindables,
    containerless,
    boundary: true,
    inlineTemplate: template,
    span: cls.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Attribute Annotation Building
// =============================================================================

function buildAttributeAnnotation(
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
    return { annotation: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(au, 'aliases');
  const bindablesProp = getProperty(au, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const isTemplateController = extractBooleanProp(au, 'isTemplateController') ?? false;
  const noMultiBindings = extractBooleanProp(au, 'noMultiBindings') ?? false;

  // Find primary
  const primary = findPrimaryBindable(bindables);

  const evidence = explicitEvidence('static-au', au.span);

  const annotation = attributeAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    bindables,
    isTemplateController,
    noMultiBindings,
    primary,
    span: cls.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Value Converter Annotation Building
// =============================================================================

function buildValueConverterAnnotation(
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
    return { annotation: null, gaps };
  }

  const aliases = extractStringArrayProp(au, 'aliases');
  const evidence = explicitEvidence('static-au', au.span);

  const annotation = valueConverterAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    span: cls.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Binding Behavior Annotation Building
// =============================================================================

function buildBindingBehaviorAnnotation(
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
    return { annotation: null, gaps };
  }

  const aliases = extractStringArrayProp(au, 'aliases');
  const evidence = explicitEvidence('static-au', au.span);

  const annotation = bindingBehaviorAnnotation(name, cls.className, cls.filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    span: cls.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Bindables Parsing
// =============================================================================

/**
 * Parse bindables from static $au.
 */
function parseBindablesValue(value: AnalyzableValue): BindableAnnotation[] {
  const result: BindableAnnotation[] = [];

  // Array form: bindables: ['prop1', 'prop2'] or bindables: [{ name: 'prop1', mode: 'twoWay' }]
  if (value.kind === 'array') {
    for (const element of value.elements) {
      // String element
      const stringName = extractString(element);
      if (stringName !== undefined) {
        result.push({
          name: stringName,
          evidence: { source: 'analyzed', pattern: 'static-au' },
        });
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
            evidence: { source: 'analyzed', pattern: 'static-au' },
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
          evidence: { source: 'analyzed', pattern: 'static-au' },
        });
      } else {
        result.push({
          name,
          evidence: { source: 'analyzed', pattern: 'static-au' },
        });
      }
    }
  }

  return result;
}

/**
 * Find the primary bindable name.
 */
function findPrimaryBindable(bindables: BindableAnnotation[]): string | undefined {
  for (const b of bindables) {
    if (b.primary) return b.name;
  }
  if (bindables.length === 1) {
    return bindables[0]?.name;
  }
  return undefined;
}
