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
 * 4. Convention (filename/classname matching via CompiledConventionPolicy)
 *
 * Local template (as-custom-element) is template analysis, not
 * project analysis — handled by the template pipeline.
 */

import type { NormalizedPath } from '../../model/identity.js';
import type { AnalyzableValue, ClassValue } from '../../project-semantics/evaluate/value/types.js';
import { extractString, getProperty, getResolvedValue } from '../../project-semantics/evaluate/value/types.js';
import type { EvidenceSource } from '../graph/types.js';
import type { ResourceKindLike } from '../../schema/types.js';
import type { CompiledConventionPolicy } from '../project/conventions.js';
import { compileConventionPolicy } from '../project/conventions.js';

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
// Default convention policy (lazy-initialized)
// =============================================================================

let _defaultPolicy: CompiledConventionPolicy | undefined;

function defaultPolicy(): CompiledConventionPolicy {
  if (!_defaultPolicy) _defaultPolicy = compileConventionPolicy();
  return _defaultPolicy;
}

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
  conventionPolicy?: CompiledConventionPolicy,
  hasPairedTemplate?: boolean,
): RecognizedResource | null {
  if (value.kind !== 'class') return null;

  const policy = conventionPolicy ?? defaultPolicy();

  // Try forms in priority order (most explicit first)
  return recognizeDecorator(value, policy)
    ?? recognizeStaticAu(value, policy)
    ?? (enableConventions && policy.enabled ? recognizeConvention(value, filePath, policy, hasPairedTemplate) : null);
}

// =============================================================================
// Form 1: Decorator Recognition
// =============================================================================

function recognizeDecorator(
  cls: ClassValue,
  policy: CompiledConventionPolicy,
): RecognizedResource | null {
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

    const name = extractResourceName(config, cls.className, kind, policy);

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

function recognizeStaticAu(
  cls: ClassValue,
  policy: CompiledConventionPolicy,
): RecognizedResource | null {
  const au = cls.staticMembers.get('$au');
  if (!au) return null;

  // Two sub-cases:
  // A) $au is an object literal → try to extract type + name fields
  // B) $au is a function call (e.g., createConfig('oneTime')) → fields not directly available
  // In both cases, the PRESENCE of $au is explicit evidence of resource intent.

  if (au.kind === 'object') {
    // Case A: object literal — try full field extraction
    const typeValue = extractString(getProperty(au, 'type'));
    if (typeValue) {
      // Full $au recognition — type resolved successfully
      let kind = AU_TYPE_KIND_MAP.get(typeValue);
      if (typeValue === 'custom-attribute') {
        const isTc = getProperty(au, 'isTemplateController');
        if (isTc && isTc.kind === 'literal' && isTc.value === true) {
          kind = 'template-controller';
        }
      }
      if (kind) {
        const name = extractResourceName(au, cls.className, kind, policy);
        return {
          kind,
          resourceKey: `${kind}:${name}`,
          name,
          source: { tier: 'analysis-explicit', form: 'static-$au' },
          config: au,
        };
      }
    }

    // Case A fallback: $au is an object but type/name fields couldn't be
    // resolved (imported constants, property access chains, etc.).
    // The $au property IS explicit evidence — use convention for kind/name
    // but preserve the explicit tier. This prevents silent fallthrough to
    // convention creating a separate entry with the wrong name.
    return recognizeStaticAuPartial(cls, au, policy);
  }

  // Case B: $au is not an object (function call, reference, etc.)
  // e.g., static $au = createConfig('oneTime')
  // Still explicit evidence — try convention for kind/name.
  return recognizeStaticAuPartial(cls, au, policy);
}

/**
 * Partial $au recognition: the class has a $au property but we can't
 * fully parse it. Use convention rules for kind + name derivation,
 * but mark as analysis-explicit (not convention) because the $au
 * property IS an explicit declaration of resource intent.
 *
 * Records a gap so provenance consumers know the name was derived,
 * not extracted from the declaration.
 */
function recognizeStaticAuPartial(
  cls: ClassValue,
  au: AnalyzableValue,
  policy: CompiledConventionPolicy,
): RecognizedResource | null {
  // Try to determine kind from class name suffix
  const suffixMatch = policy.matchSuffix(cls.className);
  if (!suffixMatch) return null; // No suffix, no $au type → can't determine kind

  const name = policy.deriveName(cls.className, suffixMatch.kind);
  return {
    kind: suffixMatch.kind,
    resourceKey: `${suffixMatch.kind}:${name}`,
    name,
    source: { tier: 'analysis-explicit', form: 'static-$au-partial' },
    config: au.kind === 'object' ? au : undefined,
  };
}

// =============================================================================
// Form 4: Convention Recognition (via CompiledConventionPolicy)
// =============================================================================

function recognizeConvention(
  cls: ClassValue,
  filePath: NormalizedPath,
  policy: CompiledConventionPolicy,
  hasPairedTemplate?: boolean,
): RecognizedResource | null {
  const className = cls.className;
  const fileBaseName = extractFileBaseName(filePath);

  // Try suffix match via policy — unambiguous signal, no template required
  const suffixMatch = policy.matchSuffix(className);
  if (suffixMatch) {
    const name = policy.deriveName(className, suffixMatch.kind);
    return {
      kind: suffixMatch.kind,
      resourceKey: `${suffixMatch.kind}:${name}`,
      name,
      source: { tier: 'analysis-convention', form: 'convention' },
    };
  }

  // Try file pattern match via policy — configured patterns, no template required
  if (fileBaseName) {
    const fileKind = policy.matchFilePattern(fileBaseName);
    if (fileKind) {
      const name = policy.deriveName(className, fileKind);
      return {
        kind: fileKind,
        resourceKey: `${fileKind}:${name}`,
        name,
        source: { tier: 'analysis-convention', form: 'convention' },
      };
    }
  }

  // No suffix, no file pattern → CE only when:
  // 1. Derived name matches filename (F2 §Form 4), AND
  // 2. A paired HTML template exists in the same directory.
  // Without a template, a class with no resource suffix is just a class —
  // not a custom element. This prevents over-recognition of services
  // (DialogController, HttpClient, Router, etc.) as CEs.
  if (hasPairedTemplate) {
    const candidateName = policy.deriveName(className, 'custom-element');
    if (fileBaseName && candidateName === fileBaseName) {
      return {
        kind: 'custom-element',
        resourceKey: `custom-element:${candidateName}`,
        name: candidateName,
        source: { tier: 'analysis-convention', form: 'convention' },
      };
    }
  }

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
 * Falls back to convention naming from the class name via policy.
 */
function extractResourceName(
  config: AnalyzableValue | undefined,
  className: string,
  kind: ResourceKindLike,
  policy: CompiledConventionPolicy,
): string {
  if (!config) return policy.deriveName(className, kind as any);

  // String arg: @customElement('my-comp')
  if (config.kind === 'literal' && typeof config.value === 'string') {
    return config.value;
  }

  // Object arg: @customElement({ name: 'my-comp' })
  if (config.kind === 'object') {
    const nameValue = extractString(getProperty(config, 'name'));
    if (nameValue) return nameValue;
  }

  return policy.deriveName(className, kind as any);
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
 */
export function recognizeDefineCall(
  value: AnalyzableValue,
  filePath: NormalizedPath,
  classMap: ReadonlyMap<string, ClassValue>,
  conventionPolicy?: CompiledConventionPolicy,
): RecognizedResource | null {
  if (value.kind !== 'call') return null;

  const policy = conventionPolicy ?? defaultPolicy();

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

  // First arg is the config — supports two forms:
  //   X.define({ name: 'foo', ... }, MyClass)  — object config
  //   X.define('foo', MyClass)                 — string shorthand
  const config = value.args[0];
  if (!config) return null;

  // String shorthand: X.define('name', MyClass)
  if (config.kind === 'literal' && typeof config.value === 'string') {
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

    return {
      kind,
      resourceKey: `${kind}:${config.value}`,
      name: config.value,
      source: { tier: 'analysis-explicit', form: 'define' },
      config,
      className: className,
    };
  }

  // Object config: X.define({ name: 'foo', ... }, MyClass)
  // If config is not an object or string (e.g., imported constant reference),
  // we still know a define() call exists — use convention name as fallback
  // with explicit tier + partial form (same principle as $au-partial).
  if (config.kind !== 'object') {
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
    if (className) {
      const name = policy.deriveName(className, kind as any);
      return {
        kind,
        resourceKey: `${kind}:${name}`,
        name,
        source: { tier: 'analysis-explicit', form: 'define-partial' },
        config: undefined,
        className,
      };
    }
    return null;
  }

  // Check for isTemplateController (TC via CustomAttribute.define)
  if (kind === 'custom-attribute') {
    const isTc = getProperty(config, 'isTemplateController');
    if (isTc && isTc.kind === 'literal' && isTc.value === true) {
      kind = 'template-controller';
    }
  }

  // Second arg is the class reference (optional)
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

  const cls = className ? classMap.get(className) : undefined;
  const name = extractResourceName(config, className ?? 'anonymous', kind, policy);

  return {
    kind,
    resourceKey: `${kind}:${name}`,
    name,
    source: { tier: 'analysis-explicit', form: 'define' },
    config,
    className: className ?? cls?.className,
  };
}
