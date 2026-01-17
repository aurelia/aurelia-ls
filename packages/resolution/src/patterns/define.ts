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

import type {
  BindingBehaviorDef,
  CustomAttributeDef,
  CustomElementDef,
  NormalizedPath,
  TextSpan,
  ValueConverterDef,
  TemplateControllerDef,
  ResourceDef,
} from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../analysis/types.js';
import { gap } from '../analysis/types.js';
import type { DefineCall } from '../extraction/file-facts.js';
import type { AnalyzableValue } from '../analysis/value/types.js';
import {
  extractString,
  extractBoolean,
  extractStringWithSpan,
  extractStringProp,
  extractStringPropWithSpan,
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
  canonicalBindableName,
  canonicalAliases,
} from '../util/naming.js';

// =============================================================================
// Main Export
// =============================================================================

export interface DefineMatchResult {
  resource: ResourceDef | null;
  gaps: AnalysisGap[];
}

/**
 * Match a define call to produce a ResourceDef.
 *
 * @param defineCall - The define call from FileFacts.defineCalls
 * @param filePath - File path where the define call is located
 * @returns Match result with resource (or null) and any gaps
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
    return { resource: null, gaps };
  }

  // Dispatch based on resource type
  switch (defineCall.resourceType) {
    case 'CustomElement':
      return buildElementDef(defineCall, className, filePath, gaps);

    case 'CustomAttribute':
      return buildAttributeDef(defineCall, className, filePath, gaps);

    case 'ValueConverter':
      return buildValueConverterDefFromDefine(defineCall, className, filePath, gaps);

    case 'BindingBehavior':
      return buildBindingBehaviorDefFromDefine(defineCall, className, filePath, gaps);
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
// Element Definition Building
// =============================================================================

function buildElementDef(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition: CustomElement.define('my-element', MyClass)
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalElementName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'element'));
      return { resource: null, gaps };
    }

    const resource = buildCustomElementDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
      boundary: true,
      containerless: false,
    });
    return { resource, gaps };
  }

  // Object definition: CustomElement.define({ name: '...', ... }, MyClass)
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { resource: null, gaps };
  }

  // Extract name
  const nameProp = extractStringPropWithSpan(def, 'name');
  const rawName = nameProp?.value ?? className;
  const name = canonicalElementName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'element'));
    return { resource: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(def, 'aliases');
  const bindablesProp = getProperty(def, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const containerless = extractBooleanProp(def, 'containerless') ?? false;
  const template = extractStringProp(def, 'template');

  const resource = buildCustomElementDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(bindables, filePath, defineCall.span),
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
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalAttrName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'attribute'));
      return { resource: null, gaps };
    }

    const resource = buildCustomAttributeDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
      noMultiBindings: false,
    });
    return { resource, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { resource: null, gaps };
  }

  // Extract name
  const nameProp = extractStringPropWithSpan(def, 'name');
  const rawName = nameProp?.value ?? className;
  const name = canonicalAttrName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'attribute'));
    return { resource: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(def, 'aliases');
  const bindablesProp = getProperty(def, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const isTemplateController = extractBooleanProp(def, 'isTemplateController') ?? false;
  const noMultiBindings = extractBooleanProp(def, 'noMultiBindings') ?? false;
  const defaultProperty = extractStringProp(def, 'defaultProperty');
  const primary = resolvePrimaryName(bindables, defaultProperty);
  const bindablesWithPrimary = applyPrimaryBindable(bindables, primary);

  if (isTemplateController) {
    const resource = buildTemplateControllerDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: nameProp?.span,
      aliases: canonicalAliases([...aliases]),
      bindables: buildBindableDefs(bindablesWithPrimary, filePath, defineCall.span),
      noMultiBindings,
    });
    return { resource, gaps };
  }

  const resource = buildCustomAttributeDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(bindablesWithPrimary, filePath, defineCall.span),
    primary,
    noMultiBindings,
  });

  return { resource, gaps };
}

// =============================================================================
// Value Converter Definition Building
// =============================================================================

function buildValueConverterDefFromDefine(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalSimpleName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'value converter'));
      return { resource: null, gaps };
    }

    const resource = buildValueConverterDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
    });
    return { resource, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { resource: null, gaps };
  }

  // Extract name
  const nameProp = extractStringPropWithSpan(def, 'name');
  const rawName = nameProp?.value ?? className;
  const name = canonicalSimpleName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'value converter'));
    return { resource: null, gaps };
  }

  const resource = buildValueConverterDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
  });

  return { resource, gaps };
}

// =============================================================================
// Binding Behavior Definition Building
// =============================================================================

function buildBindingBehaviorDefFromDefine(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[]
): DefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalSimpleName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'binding behavior'));
      return { resource: null, gaps };
    }

    const resource = buildBindingBehaviorDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
    });
    return { resource, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
    ));
    return { resource: null, gaps };
  }

  // Extract name
  const nameProp = extractStringPropWithSpan(def, 'name');
  const rawName = nameProp?.value ?? className;
  const name = canonicalSimpleName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'binding behavior'));
    return { resource: null, gaps };
  }

  const resource = buildBindingBehaviorDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
  });

  return { resource, gaps };
}

// =============================================================================
// Bindables Parsing
// =============================================================================

/**
 * Parse bindables from definition object.
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
        const nameProp = extractStringPropWithSpan(element, 'name');
        if (nameProp) {
          const attrProp = extractStringPropWithSpan(element, 'attribute');
          result.push({
            name: nameProp.value,
            mode: extractBindingModeProp(element, 'mode'),
            primary: extractBooleanProp(element, 'primary'),
            attribute: attrProp?.value,
            attributeSpan: attrProp?.span,
          });
        }
      }
    }
  }

  // Object form: bindables: { prop1: { mode: 'twoWay' }, prop2: {} }
  if (value.kind === 'object') {
    for (const [name, propValue] of value.properties) {
      if (propValue.kind === 'object') {
        const attrProp = extractStringPropWithSpan(propValue, 'attribute');
        result.push({
          name,
          mode: extractBindingModeProp(propValue, 'mode'),
          primary: extractBooleanProp(propValue, 'primary'),
          attribute: attrProp?.value,
          attributeSpan: attrProp?.span,
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

function resolvePrimaryName(
  bindables: BindableInput[],
  defaultProperty: string | undefined,
): string | undefined {
  const canonical = defaultProperty ? canonicalBindableName(defaultProperty) ?? defaultProperty.trim() : undefined;
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

