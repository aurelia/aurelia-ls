/**
 * Define Pattern Matcher
 *
 * Recognizes Aurelia resources from imperative `.define()` calls:
 *
 * ```typescript
 * CustomElement.define({ name: 'foo', bindables: [...] }, FooClass)
 * CustomAttribute.define({ name: 'bar' }, BarClass)
 * BindingBehavior.define('state', StateBindingBehavior)
 * ValueConverter.define('json', JsonValueConverter)
 * ```
 *
 * This pattern is common in Aurelia core packages (router, state, etc.)
 * where resources are defined without decorators for efficiency.
 *
 * Unlike class-based matchers, this operates on DefineCall from FileFacts.
 */

import type { NormalizedPath, TextSpan, BindingMode } from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../extraction/types.js';
import { gap } from '../extraction/types.js';
import type { DefineCall } from '../file-facts.js';
import type { AnalyzableValue } from '../npm/value/types.js';
import {
  extractString,
  extractBoolean,
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

export interface DefineMatchResult {
  annotation: ResourceAnnotation | null;
  gaps: AnalysisGap[];
}

/**
 * Match a define call to produce a ResourceAnnotation.
 *
 * @param defineCall - The define call from FileFacts.defineCalls
 * @param filePath - File path where the define call is located
 * @returns Match result with annotation (or null) and any gaps
 */
export function matchDefine(
  defineCall: DefineCall,
  filePath: NormalizedPath
): DefineMatchResult {
  const gaps: AnalysisGap[] = [];

  // Extract class name from classRef
  const className = extractClassName(defineCall.classRef);
  if (!className) {
    gaps.push(gap(
      `define call at ${defineCall.span.start}`,
      { kind: 'dynamic-value', expression: 'classRef' },
      'The class reference in .define() must be a simple identifier.',
    ));
    return { annotation: null, gaps };
  }

  // Dispatch based on resource type
  switch (defineCall.resourceType) {
    case 'CustomElement':
      return buildElementAnnotation(defineCall, className, filePath, gaps);

    case 'CustomAttribute':
      return buildAttributeAnnotation(defineCall, className, filePath, gaps);

    case 'ValueConverter':
      return buildValueConverterAnnotation(defineCall, className, filePath, gaps);

    case 'BindingBehavior':
      return buildBindingBehaviorAnnotation(defineCall, className, filePath, gaps);
  }
}

// =============================================================================
// Class Name Extraction
// =============================================================================

/**
 * Extract the class name from the classRef argument.
 */
function extractClassName(classRef: AnalyzableValue): string | null {
  // Simple identifier: CustomElement.define({...}, MyClass)
  if (classRef.kind === 'reference') {
    return classRef.name;
  }

  // Could also be an import reference
  if (classRef.kind === 'import') {
    return classRef.exportName;
  }

  return null;
}

// =============================================================================
// Element Annotation Building
// =============================================================================

function buildElementAnnotation(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition: CustomElement.define('my-element', MyClass)
  const stringName = extractString(def);
  if (stringName !== undefined) {
    const name = canonicalElementName(stringName);
    if (!name) {
      gaps.push(invalidNameGap(className, 'element'));
      return { annotation: null, gaps };
    }

    const evidence = explicitEvidence('define', defineCall.span);
    const annotation = elementAnnotation(name, className, filePath, evidence, {
      boundary: true,
      containerless: false,
      span: defineCall.span,
    });
    return { annotation, gaps };
  }

  // Object definition: CustomElement.define({ name: '...', ... }, MyClass)
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { annotation: null, gaps };
  }

  // Extract name
  const rawName = extractStringProp(def, 'name') ?? className;
  const name = canonicalElementName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'element'));
    return { annotation: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(def, 'aliases');
  const bindablesProp = getProperty(def, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const containerless = extractBooleanProp(def, 'containerless') ?? false;
  const template = extractStringProp(def, 'template');

  const evidence = explicitEvidence('define', defineCall.span);

  const annotation = elementAnnotation(name, className, filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    bindables,
    containerless,
    boundary: true,
    inlineTemplate: template,
    span: defineCall.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Attribute Annotation Building
// =============================================================================

function buildAttributeAnnotation(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition
  const stringName = extractString(def);
  if (stringName !== undefined) {
    const name = canonicalAttrName(stringName);
    if (!name) {
      gaps.push(invalidNameGap(className, 'attribute'));
      return { annotation: null, gaps };
    }

    const evidence = explicitEvidence('define', defineCall.span);
    const annotation = attributeAnnotation(name, className, filePath, evidence, {
      isTemplateController: false,
      noMultiBindings: false,
      span: defineCall.span,
    });
    return { annotation, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { annotation: null, gaps };
  }

  // Extract name
  const rawName = extractStringProp(def, 'name') ?? className;
  const name = canonicalAttrName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'attribute'));
    return { annotation: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(def, 'aliases');
  const bindablesProp = getProperty(def, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const isTemplateController = extractBooleanProp(def, 'isTemplateController') ?? false;
  const noMultiBindings = extractBooleanProp(def, 'noMultiBindings') ?? false;
  const primary = findPrimaryBindable(bindables);

  const evidence = explicitEvidence('define', defineCall.span);

  const annotation = attributeAnnotation(name, className, filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    bindables,
    isTemplateController,
    noMultiBindings,
    primary,
    span: defineCall.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Value Converter Annotation Building
// =============================================================================

function buildValueConverterAnnotation(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition
  const stringName = extractString(def);
  if (stringName !== undefined) {
    const name = canonicalSimpleName(stringName);
    if (!name) {
      gaps.push(invalidNameGap(className, 'value converter'));
      return { annotation: null, gaps };
    }

    const evidence = explicitEvidence('define', defineCall.span);
    const annotation = valueConverterAnnotation(name, className, filePath, evidence, {
      span: defineCall.span,
    });
    return { annotation, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { annotation: null, gaps };
  }

  // Extract name
  const rawName = extractStringProp(def, 'name') ?? className;
  const name = canonicalSimpleName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'value converter'));
    return { annotation: null, gaps };
  }

  const aliases = extractStringArrayProp(def, 'aliases');
  const evidence = explicitEvidence('define', defineCall.span);

  const annotation = valueConverterAnnotation(name, className, filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    span: defineCall.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Binding Behavior Annotation Building
// =============================================================================

function buildBindingBehaviorAnnotation(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition
  const stringName = extractString(def);
  if (stringName !== undefined) {
    const name = canonicalSimpleName(stringName);
    if (!name) {
      gaps.push(invalidNameGap(className, 'binding behavior'));
      return { annotation: null, gaps };
    }

    const evidence = explicitEvidence('define', defineCall.span);
    const annotation = bindingBehaviorAnnotation(name, className, filePath, evidence, {
      span: defineCall.span,
    });
    return { annotation, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { annotation: null, gaps };
  }

  // Extract name
  const rawName = extractStringProp(def, 'name') ?? className;
  const name = canonicalSimpleName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'binding behavior'));
    return { annotation: null, gaps };
  }

  const aliases = extractStringArrayProp(def, 'aliases');
  const evidence = explicitEvidence('define', defineCall.span);

  const annotation = bindingBehaviorAnnotation(name, className, filePath, evidence, {
    aliases: canonicalAliases([...aliases]),
    span: defineCall.span,
  });

  return { annotation, gaps };
}

// =============================================================================
// Bindables Parsing
// =============================================================================

/**
 * Parse bindables from definition object.
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
          evidence: { source: 'analyzed', pattern: 'define' },
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
            evidence: { source: 'analyzed', pattern: 'define' },
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
          evidence: { source: 'analyzed', pattern: 'define' },
        });
      } else {
        result.push({
          name,
          evidence: { source: 'analyzed', pattern: 'define' },
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

// =============================================================================
// Helpers
// =============================================================================

function invalidNameGap(className: string, resourceType: string): AnalysisGap {
  return gap(
    `resource name for ${className}`,
    { kind: 'invalid-resource-name', className, reason: `Could not derive valid ${resourceType} name from .define() call` },
    `Provide an explicit name in the definition object.`,
  );
}
