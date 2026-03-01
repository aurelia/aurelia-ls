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
  NormalizedPath,
  ResourceKind,
  TextSpan,
  ResourceDef,
} from '../compiler.js';
import type { AnalysisGap } from '../evaluate/types.js';
import { gap } from '../evaluate/types.js';
import type { DefineCall } from '../extract/file-facts.js';
import type { AnalyzableValue, ClassValue } from '../evaluate/value/types.js';
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
import type { BindableInput } from '../assemble/resource-def.js';
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

export interface DefineMatchResult {
  resource: ResourceDef | null;
  bindingCommands: RecognizedBindingCommand[];
  attributePatterns: RecognizedAttributePattern[];
  gaps: AnalysisGap[];
}

interface ResourceDefineMatchResult {
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
  filePath: NormalizedPath,
  classes: readonly ClassValue[] = [],
): DefineMatchResult {
  const gaps: AnalysisGap[] = [];

  // Extract class name from classRef
  const className = extractClassName(defineCall.classRef);
  if (!className) {
    gaps.push(gap(
      `define call at ${defineCall.span.start}`,
      { kind: 'dynamic-value', expression: 'classRef' },
      'The class reference in .define() must be a simple identifier.',
      { file: filePath },
    ));
    return { resource: null, bindingCommands: [], attributePatterns: [], gaps };
  }
  const classValue = findClassValue(className, classes);

  // Dispatch based on resource type
  switch (defineCall.resourceType) {
    case 'CustomElement':
      return toDefineMatchResult(
        buildElementDef(defineCall, className, filePath, gaps, classValue),
      );

    case 'CustomAttribute':
      return toDefineMatchResult(
        buildAttributeDef(defineCall, className, filePath, gaps, classValue),
      );

    case 'ValueConverter':
      return toDefineMatchResult(
        buildValueConverterDefFromDefine(defineCall, className, filePath, gaps),
      );

    case 'BindingBehavior':
      return toDefineMatchResult(
        buildBindingBehaviorDefFromDefine(defineCall, className, filePath, gaps),
      );

    case 'BindingCommand':
      return buildBindingCommandRecognitionFromDefine(defineCall, className, filePath, gaps);

    case 'AttributePattern':
      return buildAttributePatternRecognitionFromDefine(defineCall, className, filePath, gaps);
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
  gaps: AnalysisGap[],
  cls: ClassValue | null
): ResourceDefineMatchResult {
  const def = defineCall.definition;
  const staticBindables = cls ? getStaticBindableInputs(cls) : [];
  const memberBindables = cls?.bindableMembers ?? [];

  // Handle string-only definition: CustomElement.define('my-element', MyClass)
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalElementName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'element', 'custom-element', filePath));
      return { resource: null, gaps };
    }

    const resource = buildCustomElementDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
      bindables: buildBindableDefs(
        mergeBindableInputs(staticBindables, memberBindables),
        filePath,
        defineCall.span,
      ),
      boundary: true,
      containerless: false,
      declarationForm: 'define-call',
    });
    return { resource, gaps };
  }

  // Object definition: CustomElement.define({ name: '...', ... }, MyClass)
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
      { file: filePath },
      { kind: 'custom-element', name: className },
    ));
    return { resource: null, gaps };
  }

  // Extract name
  const nameProp = extractStringPropWithSpan(def, 'name');
  const rawName = nameProp?.value ?? className;
  const name = canonicalElementName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'element', 'custom-element', filePath));
    return { resource: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(def, 'aliases');
  const bindablesProp = getProperty(def, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const mergedBindables = mergeBindableInputs(
    [...staticBindables, ...bindables],
    memberBindables,
  );
  const containerless = extractBooleanProp(def, 'containerless') ?? false;
  const template = extractStringProp(def, 'template');

  const resource = buildCustomElementDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
    aliases: canonicalAliases([...aliases]),
    bindables: buildBindableDefs(mergedBindables, filePath, defineCall.span),
    containerless,
    boundary: true,
    inlineTemplate: template,
    declarationForm: 'define-call',
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
  gaps: AnalysisGap[],
  cls: ClassValue | null
): ResourceDefineMatchResult {
  const def = defineCall.definition;
  const staticBindables = cls ? getStaticBindableInputs(cls) : [];
  const memberBindables = cls?.bindableMembers ?? [];

  // Handle string-only definition
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalAttrName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'attribute', 'custom-attribute', filePath));
      return { resource: null, gaps };
    }

    const resource = buildCustomAttributeDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
      bindables: buildBindableDefs(
        mergeBindableInputs(staticBindables, memberBindables),
        filePath,
        defineCall.span,
      ),
      noMultiBindings: false,
      declarationForm: 'define-call',
    });
    return { resource, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
      { file: filePath },
      { kind: 'custom-attribute', name: className },
    ));
    return { resource: null, gaps };
  }

  // Extract name
  const nameProp = extractStringPropWithSpan(def, 'name');
  const rawName = nameProp?.value ?? className;
  const name = canonicalAttrName(rawName);
  if (!name) {
    gaps.push(invalidNameGap(className, 'attribute', 'custom-attribute', filePath));
    return { resource: null, gaps };
  }

  // Extract metadata
  const aliases = extractStringArrayProp(def, 'aliases');
  const bindablesProp = getProperty(def, 'bindables');
  const bindables = bindablesProp ? parseBindablesValue(bindablesProp) : [];
  const mergedBindables = mergeBindableInputs(
    [...staticBindables, ...bindables],
    memberBindables,
  );
  const isTemplateController = extractBooleanProp(def, 'isTemplateController') ?? false;
  const noMultiBindings = extractBooleanProp(def, 'noMultiBindings') ?? false;
  const defaultProperty = extractStringProp(def, 'defaultProperty');
  const primary = resolvePrimaryName(defaultProperty);
  const bindablesWithPrimary = applyPrimaryBindable(mergedBindables, primary);

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
      declarationForm: 'define-call',
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
    declarationForm: 'define-call',
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
): ResourceDefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition (explicit name — verbatim)
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalExplicitName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'value converter', 'value-converter', filePath));
      return { resource: null, gaps };
    }

    const resource = buildValueConverterDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
      declarationForm: 'define-call',
    });
    return { resource, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
      { file: filePath },
      { kind: 'value-converter', name: className },
    ));
    return { resource: null, gaps };
  }

  // Extract name — explicit from define arg, or camelCase from className
  const nameProp = extractStringPropWithSpan(def, 'name');
  const name = nameProp ? canonicalExplicitName(nameProp.value) : canonicalSimpleName(className);
  if (!name) {
    gaps.push(invalidNameGap(className, 'value converter', 'value-converter', filePath));
    return { resource: null, gaps };
  }

  const resource = buildValueConverterDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
    declarationForm: 'define-call',
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
): ResourceDefineMatchResult {
  const def = defineCall.definition;

  // Handle string-only definition (explicit name — verbatim)
  const stringName = extractStringWithSpan(def);
  if (stringName) {
    const name = canonicalExplicitName(stringName.value);
    if (!name) {
      gaps.push(invalidNameGap(className, 'binding behavior', 'binding-behavior', filePath));
      return { resource: null, gaps };
    }

    const resource = buildBindingBehaviorDef({
      name,
      className,
      file: filePath,
      span: defineCall.span,
      nameSpan: stringName.span,
      declarationForm: 'define-call',
    });
    return { resource, gaps };
  }

  // Object definition
  if (def.kind !== 'object') {
    gaps.push(gap(
      `definition for ${className}`,
      { kind: 'dynamic-value', expression: 'definition object' },
      'The definition in .define() must be an object literal or string.',
      { file: filePath },
      { kind: 'binding-behavior', name: className },
    ));
    return { resource: null, gaps };
  }

  // Extract name — explicit from define arg, or camelCase from className
  const nameProp = extractStringPropWithSpan(def, 'name');
  const name = nameProp ? canonicalExplicitName(nameProp.value) : canonicalSimpleName(className);
  if (!name) {
    gaps.push(invalidNameGap(className, 'binding behavior', 'binding-behavior', filePath));
    return { resource: null, gaps };
  }

  const resource = buildBindingBehaviorDef({
    name,
    className,
    file: filePath,
    span: defineCall.span,
    nameSpan: nameProp?.span,
    declarationForm: 'define-call',
  });

  return { resource, gaps };
}

// =============================================================================
// Extension Recognition Building
// =============================================================================

function buildBindingCommandRecognitionFromDefine(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[],
): DefineMatchResult {
  const parsed = parseBindingCommandName(defineCall.definition);
  if (!parsed) {
    gaps.push(gap(
      `binding command definition for ${className}`,
      { kind: 'dynamic-value', expression: 'binding-command definition' },
      'BindingCommand.define requires a string or object literal with a static "name" property.',
      { file: filePath },
    ));
    return { resource: null, bindingCommands: [], attributePatterns: [], gaps };
  }

  const name = canonicalExplicitName(parsed.value);
  if (!name) {
    gaps.push(gap(
      `binding command definition for ${className}`,
      {
        kind: 'invalid-resource-name',
        className,
        reason: 'Could not derive valid binding command name from BindingCommand.define.',
      },
      'Provide a non-empty binding command name in BindingCommand.define.',
      { file: filePath },
    ));
    return { resource: null, bindingCommands: [], attributePatterns: [], gaps };
  }

  return {
    resource: null,
    bindingCommands: sortAndDedupeBindingCommands([{
      name,
      className,
      file: filePath,
      source: 'define',
      declarationSpan: defineCall.span,
      nameSpan: parsed.span,
    }]),
    attributePatterns: [],
    gaps,
  };
}

function buildAttributePatternRecognitionFromDefine(
  defineCall: DefineCall,
  className: string,
  filePath: NormalizedPath,
  gaps: AnalysisGap[],
): DefineMatchResult {
  const recognized: RecognizedAttributePattern[] = [];
  const definitions = parseAttributePatternDefinitions(defineCall.definition);
  if (definitions.length === 0) {
    gaps.push(gap(
      `attribute pattern definition for ${className}`,
      { kind: 'dynamic-value', expression: 'attribute-pattern definition' },
      'AttributePattern.define requires object literal definitions with static "pattern" and "symbols" strings.',
      { file: filePath },
    ));
    return { resource: null, bindingCommands: [], attributePatterns: [], gaps };
  }

  for (const definition of definitions) {
    const pattern = normalizePattern(definition.pattern.value);
    if (!pattern) {
      gaps.push(gap(
        `attribute pattern definition for ${className}`,
        {
          kind: 'invalid-resource-name',
          className,
          reason: 'Could not derive valid attribute pattern identity from AttributePattern.define.',
        },
        'Provide a non-empty "pattern" string in AttributePattern.define.',
        { file: filePath },
      ));
      continue;
    }

    recognized.push({
      pattern,
      symbols: definition.symbols.value.trim(),
      className,
      file: filePath,
      source: 'define',
      declarationSpan: defineCall.span,
      patternSpan: definition.pattern.span,
      symbolsSpan: definition.symbols.span,
    });
  }

  return {
    resource: null,
    bindingCommands: [],
    attributePatterns: sortAndDedupeAttributePatterns(recognized),
    gaps,
  };
}

function parseBindingCommandName(
  definition: AnalyzableValue,
): { value: string; span?: TextSpan } | null {
  const stringName = extractStringWithSpan(definition);
  if (stringName) {
    return stringName;
  }

  if (definition.kind === 'object') {
    const nameProp = extractStringPropWithSpan(definition, 'name');
    if (nameProp) {
      return nameProp;
    }
  }

  return null;
}

function parseAttributePatternDefinitions(
  definition: AnalyzableValue,
): Array<{
  pattern: { value: string; span?: TextSpan };
  symbols: { value: string; span?: TextSpan };
}> {
  const parsed: Array<{
    pattern: { value: string; span?: TextSpan };
    symbols: { value: string; span?: TextSpan };
  }> = [];

  const definitions = definition.kind === 'array'
    ? definition.elements
    : [definition];

  for (const item of definitions) {
    if (!item || item.kind !== 'object') {
      continue;
    }

    const pattern = extractStringPropWithSpan(item, 'pattern');
    const symbols = extractStringPropWithSpan(item, 'symbols');
    if (!pattern || !symbols) {
      continue;
    }

    parsed.push({ pattern, symbols });
  }

  return parsed;
}

function normalizePattern(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDefineMatchResult(result: ResourceDefineMatchResult): DefineMatchResult {
  return {
    ...result,
    bindingCommands: [],
    attributePatterns: [],
  };
}

function resolvePrimaryName(
  defaultProperty: string | undefined,
): string {
  const canonical = defaultProperty ? canonicalBindableName(defaultProperty) ?? defaultProperty.trim() : undefined;
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

// =============================================================================
// Helpers
// =============================================================================

function invalidNameGap(
  className: string,
  resourceType: string,
  resourceKind: ResourceKind,
  filePath: NormalizedPath,
): AnalysisGap {
  return gap(
    `resource name for ${className}`,
    { kind: 'invalid-resource-name', className, reason: `Could not derive valid ${resourceType} name from .define() call` },
    'Provide an explicit name in the definition object.',
    { file: filePath },
    { kind: resourceKind, name: className },
  );
}

function findClassValue(
  className: string,
  classes: readonly ClassValue[],
): ClassValue | null {
  for (const cls of classes) {
    if (cls.className === className) {
      return cls;
    }
  }
  return null;
}
