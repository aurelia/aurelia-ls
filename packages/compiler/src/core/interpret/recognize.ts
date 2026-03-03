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
import type { AnalyzableValue, ClassValue } from '../../project-semantics/evaluate/value/types.js';
import { extractString, getProperty, getResolvedValue } from '../../project-semantics/evaluate/value/types.js';
import type { EvidenceSource } from '../graph/types.js';
import type { ResourceKindLike } from '../../schema/types.js';

// =============================================================================
// Recognition Result
// =============================================================================

export interface RecognizedResource {
  /** Resource kind (custom-element, custom-attribute, etc.) */
  readonly kind: ResourceKindLike;
  /** Resource key for the dep graph (e.g., 'custom-element:my-comp') */
  readonly resourceKey: string;
  /** Resource name (e.g., 'my-comp') */
  readonly name: string;
  /** How this resource was recognized */
  readonly source: EvidenceSource;
  /** The declaration form's config value (decorator arg, $au object, define arg) */
  readonly config?: AnalyzableValue;
  /** The class name (for define() where the class and the define call are separate units) */
  readonly className?: string;
}

// =============================================================================
// Decorator Name → Resource Kind
// =============================================================================

const DECORATOR_KIND_MAP: ReadonlyMap<string, ResourceKindLike> = new Map([
  ['customElement', 'custom-element'],
  ['customAttribute', 'custom-attribute'],
  ['templateController', 'template-controller'],
  ['valueConverter', 'value-converter'],
  ['bindingBehavior', 'binding-behavior'],
  ['bindingCommand', 'binding-command'],
  ['attributePattern', 'attribute-pattern'],
]);

// =============================================================================
// Static $au Type → Resource Kind
// =============================================================================

const AU_TYPE_KIND_MAP: ReadonlyMap<string, ResourceKindLike> = new Map([
  ['custom-element', 'custom-element'],
  ['custom-attribute', 'custom-attribute'],
  ['value-converter', 'value-converter'],
  ['binding-behavior', 'binding-behavior'],
]);

// =============================================================================
// Convention Suffix → Resource Kind
// =============================================================================

const SUFFIX_KIND_MAP: ReadonlyMap<string, ResourceKindLike> = new Map([
  ['CustomElement', 'custom-element'],
  ['CustomAttribute', 'custom-attribute'],
  ['TemplateController', 'template-controller'],
  ['ValueConverter', 'value-converter'],
  ['BindingBehavior', 'binding-behavior'],
  ['BindingCommand', 'binding-command'],
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

    const config = dec.args[0];

    // attributePattern uses 'pattern' field instead of 'name'
    if (kind === 'attribute-pattern') {
      const name = extractAttributePatternName(config, cls.className);
      return {
        kind,
        resourceKey: `${kind}:${name}`,
        name,
        source: { tier: 'analysis-explicit', form: 'decorator' },
        config,
      };
    }

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

/** Extract name from @attributePattern({ pattern: '...', ... }) */
function extractAttributePatternName(
  config: AnalyzableValue | undefined,
  className: string,
): string {
  if (config?.kind === 'object') {
    const pattern = extractString(getProperty(config, 'pattern'));
    if (pattern) return pattern;
  }
  return className;
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

const SUFFIX_REGEX = /^(.+?)(CustomElement|CustomAttribute|TemplateController|ValueConverter|BindingBehavior|BindingCommand)$/;

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
  kind: ResourceKindLike,
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

// =============================================================================
// Form 3: Imperative define() Recognition
// =============================================================================

/** Maps property access namespace to resource kind: CustomElement.define → 'custom-element' */
const DEFINE_NAMESPACE_MAP: ReadonlyMap<string, ResourceKindLike> = new Map([
  ['CustomElement', 'custom-element'],
  ['CustomAttribute', 'custom-attribute'],
  ['ValueConverter', 'value-converter'],
  ['BindingBehavior', 'binding-behavior'],
  ['BindingCommand', 'binding-command'],
]);

/**
 * Attempt to recognize a define() call from an evaluated expression.
 *
 * Pattern: `CustomElement.define({ name: '...' }, MyClass)`
 * The expression is a CallValue where:
 * - callee is PropertyAccess on a known namespace ('define')
 * - first arg is the config object
 * - second arg (optional) is the class reference
 */
export function recognizeDefineCall(
  value: AnalyzableValue,
  filePath: NormalizedPath,
  classMap: ReadonlyMap<string, ClassValue>,
): RecognizedResource | null {
  if (value.kind !== 'call') return null;

  // callee must be X.define where X is a known namespace
  const callee = value.callee;
  if (callee.kind !== 'propertyAccess' || callee.property !== 'define') return null;

  // base must be a reference to a known namespace (CustomElement, etc.)
  const base = callee.base;
  let namespaceName: string | undefined;
  if (base.kind === 'reference') {
    namespaceName = base.name;
  } else if (base.kind === 'import') {
    namespaceName = base.exportName;
  }
  if (!namespaceName) return null;

  let kind = DEFINE_NAMESPACE_MAP.get(namespaceName);
  if (!kind) return null;

  // First arg is the config
  const config = value.args[0];
  if (!config || config.kind !== 'object') return null;

  // Check for isTemplateController (TC via CustomAttribute.define)
  if (kind === 'custom-attribute') {
    const isTc = getProperty(config, 'isTemplateController');
    if (isTc && isTc.kind === 'literal' && isTc.value === true) {
      kind = 'template-controller';
    }
  }

  // Second arg is the class reference (optional)
  // Follow reference/import chains to find the resolved class
  const classRef = value.args[1];
  let className: string | undefined;
  if (classRef) {
    const resolvedRef = getResolvedValue(classRef);
    if (resolvedRef.kind === 'class') {
      className = resolvedRef.className;
    } else if (classRef.kind === 'reference') {
      className = classRef.name;
    } else if (classRef.kind === 'import') {
      className = classRef.exportName;
    }
  }

  // Look up the class in the file's class map
  const cls = className ? classMap.get(className) : undefined;

  const name = extractResourceName(config, className ?? 'anonymous', kind);

  return {
    kind,
    resourceKey: `${kind}:${name}`,
    name,
    source: { tier: 'analysis-explicit', form: 'define' },
    config,
    className: className ?? cls?.className,
  };
}

/**
 * Derive a resource name from a class name using Aurelia 2 conventions.
 *
 * CE/CA/TC/BC → kebabCase(bareName)
 * VC/BB → camelCase(bareName)
 */
function conventionName(className: string, kind: ResourceKindLike): string {
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
