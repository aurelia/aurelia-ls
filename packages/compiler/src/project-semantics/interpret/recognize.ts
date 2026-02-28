/**
 * Resource Recognition — Four Declaration Forms
 *
 * Identifies which evaluation units declare Aurelia 2 resources.
 * Each recognition form produces a RecognizedResource with the
 * resource kind, key, and evidence source.
 *
 * Forms (from F2 declaration-discovery):
 * 1. Decorator (@customElement, @customAttribute, etc.)
 * 2. Static $au (type discriminator)
 * 3. Imperative define() (CustomElement.define(...))
 * 4. Convention (filename/classname matching)
 *
 * Local template (as-custom-element) is template analysis, not
 * project analysis — handled by the template pipeline.
 */

import type { NormalizedPath } from '../../model/identity.js';
import type { AnalyzableValue, ClassValue } from '../evaluate/value/types.js';
import { extractString, getProperty } from '../evaluate/value/types.js';
import type { EvidenceSource } from '../deps/types.js';
import type { ResourceKind } from '../../schema/types.js';

// =============================================================================
// Recognition Result
// =============================================================================

export interface RecognizedResource {
  /** Resource kind (custom-element, custom-attribute, etc.) */
  readonly kind: ResourceKind;
  /** Resource key for the dep graph (e.g., 'custom-element:my-comp') */
  readonly resourceKey: string;
  /** Resource name (e.g., 'my-comp') */
  readonly name: string;
  /** How this resource was recognized */
  readonly source: EvidenceSource;
  /** The declaration form's config value (decorator arg, $au object, define arg) */
  readonly config?: AnalyzableValue;
}

// =============================================================================
// Decorator Name → Resource Kind
// =============================================================================

const DECORATOR_KIND_MAP: ReadonlyMap<string, ResourceKind> = new Map([
  ['customElement', 'custom-element'],
  ['customAttribute', 'custom-attribute'],
  ['templateController', 'template-controller'],
  ['valueConverter', 'value-converter'],
  ['bindingBehavior', 'binding-behavior'],
]);

// =============================================================================
// Static $au Type → Resource Kind
// =============================================================================

const AU_TYPE_KIND_MAP: ReadonlyMap<string, ResourceKind> = new Map([
  ['custom-element', 'custom-element'],
  ['custom-attribute', 'custom-attribute'],
  ['value-converter', 'value-converter'],
  ['binding-behavior', 'binding-behavior'],
]);

// =============================================================================
// Convention Suffix → Resource Kind
// =============================================================================

const SUFFIX_KIND_MAP: ReadonlyMap<string, ResourceKind> = new Map([
  ['CustomElement', 'custom-element'],
  ['CustomAttribute', 'custom-attribute'],
  ['TemplateController', 'template-controller'],
  ['ValueConverter', 'value-converter'],
  ['BindingBehavior', 'binding-behavior'],
]);

// =============================================================================
// Recognition Entry Point
// =============================================================================

/**
 * Attempt to recognize a resource from an evaluated unit.
 * Tries all four forms in priority order.
 * Returns null if the unit does not declare a resource.
 */
export function recognizeResource(
  value: AnalyzableValue,
  unitKey: string,
  filePath: NormalizedPath,
  enableConventions: boolean,
): RecognizedResource | null {
  if (value.kind !== 'class') return null;

  // Try forms in priority order (most explicit first)
  return recognizeDecorator(value)
    ?? recognizeStaticAu(value)
    ?? (enableConventions ? recognizeConvention(value, filePath) : null);
}

// =============================================================================
// Form 1: Decorator Recognition
// =============================================================================

function recognizeDecorator(cls: ClassValue): RecognizedResource | null {
  for (const dec of cls.decorators) {
    const kind = DECORATOR_KIND_MAP.get(dec.name);
    if (!kind) continue;

    // Decorator with string arg: @customElement('my-comp')
    // Decorator with object arg: @customElement({ name: 'my-comp', ... })
    // Decorator with no arg: @valueConverter (name from class)
    const config = dec.args[0];
    const name = extractResourceName(config, cls.className, kind);

    return {
      kind,
      resourceKey: `${kind}:${name}`,
      name,
      source: { tier: 'analysis-explicit', form: 'decorator' },
      config,
    };
  }
  return null;
}

// =============================================================================
// Form 2: Static $au Recognition
// =============================================================================

function recognizeStaticAu(cls: ClassValue): RecognizedResource | null {
  const au = cls.staticMembers.get('$au');
  if (!au || au.kind !== 'object') return null;

  // $au must have a type field: { type: 'custom-element', ... }
  const typeValue = extractString(getProperty(au, 'type'));
  if (!typeValue) return null;

  // Handle template-controller: CA type with isTemplateController flag
  let kind = AU_TYPE_KIND_MAP.get(typeValue);
  if (typeValue === 'custom-attribute') {
    const isTc = getProperty(au, 'isTemplateController');
    if (isTc && isTc.kind === 'literal' && isTc.value === true) {
      kind = 'template-controller';
    }
  }
  if (!kind) return null;

  const name = extractResourceName(au, cls.className, kind);

  return {
    kind,
    resourceKey: `${kind}:${name}`,
    name,
    source: { tier: 'analysis-explicit', form: 'static-$au' },
    config: au,
  };
}

// =============================================================================
// Form 4: Convention Recognition
// =============================================================================

const SUFFIX_REGEX = /^(.+?)(CustomElement|CustomAttribute|TemplateController|ValueConverter|BindingBehavior)$/;

function recognizeConvention(
  cls: ClassValue,
  filePath: NormalizedPath,
): RecognizedResource | null {
  const className = cls.className;
  const fileBaseName = extractFileBaseName(filePath);

  // Try suffix match first
  const suffixMatch = SUFFIX_REGEX.exec(className);
  if (suffixMatch) {
    const bareName = suffixMatch[1]!;
    const suffix = suffixMatch[2]!;
    const kind = SUFFIX_KIND_MAP.get(suffix);
    if (kind) {
      const name = conventionName(bareName, kind);
      return {
        kind,
        resourceKey: `${kind}:${name}`,
        name,
        source: { tier: 'analysis-convention', form: 'convention' },
      };
    }
  }

  // No suffix → CE only when the derived name matches the filename.
  // F2 §Form 4: "Only the first exported class whose convention name
  // matches the filename name."
  const candidateName = conventionName(className, 'custom-element');
  if (fileBaseName && candidateName === fileBaseName) {
    return {
      kind: 'custom-element',
      resourceKey: `custom-element:${candidateName}`,
      name: candidateName,
      source: { tier: 'analysis-convention', form: 'convention' },
    };
  }

  // No match — this class is not a resource by convention
  return null;
}

/**
 * Extract the base filename without extension from a normalized path.
 * e.g., '/src/my-component.ts' → 'my-component'
 */
function extractFileBaseName(filePath: NormalizedPath): string | null {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
  const dotIdx = fileName.lastIndexOf('.');
  return dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract resource name from a config value (decorator arg or $au object).
 * Falls back to convention naming from the class name.
 */
function extractResourceName(
  config: AnalyzableValue | undefined,
  className: string,
  kind: ResourceKind,
): string {
  if (!config) return conventionName(className, kind);

  // String arg: @customElement('my-comp')
  if (config.kind === 'literal' && typeof config.value === 'string') {
    return config.value;
  }

  // Object arg: @customElement({ name: 'my-comp' })
  if (config.kind === 'object') {
    const nameValue = extractString(getProperty(config, 'name'));
    if (nameValue) return nameValue;
  }

  return conventionName(className, kind);
}

/**
 * Derive a resource name from a class name using Aurelia 2 conventions.
 *
 * CE/CA/TC/BC → kebabCase(bareName)
 * VC/BB → camelCase(bareName)
 */
function conventionName(className: string, kind: ResourceKind): string {
  // Strip known suffixes
  const suffixMatch = SUFFIX_REGEX.exec(className);
  const bareName = suffixMatch ? suffixMatch[1]! : className;

  switch (kind) {
    case 'value-converter':
    case 'binding-behavior':
      return camelCase(bareName);
    default:
      return kebabCase(bareName);
  }
}

/**
 * Simple kebab-case conversion from PascalCase.
 * Handles acronyms: 'JSONParser' → 'json-parser'
 */
function kebabCase(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Simple camelCase conversion from PascalCase.
 * Handles acronyms: 'JSONParser' → 'jsonParser'
 */
function camelCase(name: string): string {
  if (name.length === 0) return name;
  // If entire name is uppercase, lowercase all
  if (name === name.toUpperCase()) return name.toLowerCase();
  // Lowercase the leading uppercase run
  let i = 0;
  while (i < name.length - 1 && name[i] === name[i]!.toUpperCase() && name[i] !== name[i]!.toLowerCase()) {
    i++;
  }
  if (i <= 1) return name[0]!.toLowerCase() + name.slice(1);
  // Multi-char uppercase run: lowercase all but last (which starts next word)
  return name.slice(0, i - 1).toLowerCase() + name.slice(i - 1);
}
